#!/usr/bin/env python
# Adapted from samples by Jose F. Maldonado: http://registry.gimp.org/node/28124

from gimpfu import *
from math import sqrt, atan, asin, cos, sin, pi

sqrt2 = sqrt(2)

def hammer_project(lat, lon):
    z2 = 1 + cos(lat)*cos(lon/2)
    z = sqrt(z2)
    x, y = cos(lat)*sin(lon/2)/z, sin(lat)/z
    return (x+1)/2, (y+1)/2

def hammer_unproject(x, y):
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
    return lat, lon


def polar_to_hammer(img, layer) :
    '''Converts an image from a polar projection (latitude and longitude directly mapped to texture u,v) to a
    Hammer-Aitoff projection.

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

    # Perform the projection
    try:
        tn = int(layer.width / 64)
        if(layer.width % 64 > 0):
            tn += 1
        tm = int(layer.height / 64)
        if(layer.height % 64 > 0):
            tm += 1
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
                dstTile = newLayer.get_tile(False, j, i)
                for x in range(dstTile.ewidth):
                    for y in range(dstTile.eheight):
                        v, u = 2 * ((j*64.0+y)/layer.height - 0.5), 2 * ((i*64.0+x)/layer.width - 0.5)
                        lat, lon = hammer_unproject(u, v)
                        srcX, srcY = (lon/(2*pi)+0.5)*layer.width, (lat/pi+0.5)*layer.height
                        pixel = getPixel(srcX, srcY)
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
    "python_fu_polar_to_hammer",
    "Convert a texture using polar projection to one using Hammer projection.",
    "",
    "David Turner",
    "",
    "",
    "<Image>/Filters/Map/Projections/Polar-to-Hammer",
    "*",
    [],
    [],
    polar_to_hammer)

main()
