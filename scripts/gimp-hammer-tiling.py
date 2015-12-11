#!/usr/bin/env python
# Adapted from samples by Jose F. Maldonado: http://registry.gimp.org/node/28124

from gimpfu import *
from math import sqrt, atan, asin, cos, sin, pi

sqrt2 = sqrt(2)

def hammer_reproject(x, y):
    '''Takes a coordinate in the range (-1,-1), (1, 1) and reprojects it so that it falls within
    the Hammer-Aitoff projection.

    Returns: (x, y) being the reprojected point.'''
    if (x == -1 or x == 1) and (y == -1 or y == 1):
        return (0, 0)
    z2 = 1 - x*x/2 - y*y/2
    if 2*z2 - 1 == 0:
        return (x, y)
    z = sqrt(z2)
    lon = 2*atan(sqrt2 * x * z / (2*z2 - 1))
    t = sqrt2 * y * z
    if t < -1:
        lat = -pi/2
    elif t > 1:
        lat = pi/2
    else:
        lat = asin(t)
    z2 = 1 + cos(lat)*cos(lon/2)
    if z2 == 0:
        # Ouch - this pixel is right on the border.  We nudge it just a little closer to the center.
        z2 = 0.0001
    z = sqrt(z2)
    x2, y2 = cos(lat)*sin(lon/2)/z, sin(lat)/z
    if (x2-x)*(x2-x) + (y2-y)*(y2-y) < 0.000001:
        return x, y
    return x2, y2

def hammer_tiling(img, layer) :
    '''Tiles an image for use in a Hammer-Aitoff spherical projection
    
    Parameters:
    img : image The current image.
    layer : layer The layer of the image that is selected.
    '''
    gimp.progress_init("Mapping " + layer.name + "...")
    pdb.gimp_image_undo_group_start(img)

    pos = 0
    for i in range(len(img.layers)):
        if(img.layers[i] == layer):
            pos = i

    # Create a new layer to save the results (otherwise is not possible to undo the operation).
    newLayer = layer.copy()
    img.add_layer(newLayer, -1)

    # Perform the reprojection
    try:
        tn = int(layer.width / 64)
        if(layer.width % 64 > 0):
            tn += 1
        tm = int(layer.height / 64)
        if(layer.height % 64 > 0):
            tm += 1
        du = 2.0/layer.width
        dv = 2.0/layer.height
        def getPixel(x, y):
            i = int(x / 64)
            j = int(y / 64)
            u = int(x) - i*64
            v = int(y) - j*64
            tile = layer.get_tile(False, j, i)
            return tile[u, v]
        # Iterate over the tiles.
        for i in range(tn):
            for j in range(tm):
                gimp.progress_update(float(i*tm + j) / float(tn*tm))
                uv0 = (2.0*i*64/layer.width-1, 2.0*j*64/layer.height-1)
                uv1 = (uv0[0]+63*du, uv0[1]+63*dv)
                uv2 = (uv0[0], uv0[1]+63*dv)
                uv3 = (uv0[0]+63*du, uv0[1])
                if hammer_reproject(*uv0)==uv0 and hammer_reproject(*uv1)==uv1 \
                and hammer_reproject(*uv2)==uv2 and hammer_reproject(*uv3)==uv3:
                    continue  # this tile is wholly within the projection
                dstTile = newLayer.get_tile(False, j, i)
                for x in range(dstTile.ewidth):
                    for y in range(dstTile.eheight):
                        u, v = uv0[0]+x*du, uv0[1]+y*dv
                        u2, v2 = hammer_reproject(u, v)
                        if u2 == u and v2 == v:
                            continue
                        x2, y2 = (u2 + 1)*layer.width / 2, (v2 + 1)*layer.height / 2
                        pixel = getPixel(x2, y2)
                        dstTile[x,y] = pixel

        # Update the new layer.
        newLayer.flush()
        newLayer.merge_shadow(True)
        newLayer.update(0, 0, newLayer.width, newLayer.height)

        layerName = layer.name
        img.remove_layer(layer)
        newLayer.name = layerName
    except Exception as err:
        gimp.message("Unexpected error: " + str(err))

    # Close the undo group.
    pdb.gimp_image_undo_group_end(img)

    # End progress.
    pdb.gimp_progress_end()

register(
    "python_fu_hammer_tile",
    "Tile a texture map using the Hammer-Aitoff projection.",
    "This script assumes that the image contains a maximal ellipse, the contents of which is a Hammer projection of "
    "a sphere's texture.  It will overwrite the outside of the ellipse with contents from the inside, such that "
    "the texture is tileable from the point of view of a rendering engine.",
    "David Turner",
    "",
    "",
    "<Image>/Filters/Map/Projections/Hammer tiling",
    "*",
    [],
    [],
    hammer_tiling)

main()
