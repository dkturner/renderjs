'use strict';

var Primitives = (function () {

function augment(obj, props) {
    if (obj instanceof Array) {
        if (!(props instanceof Array))
            throw {error: 'expecting array object'};
        return obj.concat(props);
    }
    for (var k in props) {
        if (typeof obj[k] != 'object')
            obj[k] = props[k];
        else
            obj[k] = augment(obj[k], props[k]);
    }
    return obj;
}

var ddX = 0.525731112119133606;
var ddZ = 0.850650808352039932;
var dodecVertices = [
    [-ddX, 0, ddZ], [ddX, 0, ddZ], [-ddX, 0, -ddZ], [ddX, 0, -ddZ],
    [0, ddZ, ddX], [0, ddZ, -ddX], [0, -ddZ, ddX], [0, -ddZ, -ddX],
    [ddZ, ddX, 0], [-ddZ, ddX, 0], [ddZ, -ddX, 0], [-ddZ, -ddX, 0]
];
var dodecFaces = [
    [0, 1, 4], [0, 4, 9], [9, 4, 5], [4, 8, 5], [4, 1, 8],
    [8, 1, 10], [8, 10, 3], [5, 8, 3], [5, 3, 2], [2, 3, 7],
    [7, 3, 10], [7, 10, 6], [7, 6, 11], [11, 6, 0], [0, 6, 1],
    [6, 10, 1], [9, 11, 0], [9, 2, 11], [9, 5, 2], [7, 11, 2]
];
var mappings = Geometry.Maps;

function findOrAddVertex(mesh, v, n, t) {
    for (var i = 0; i < mesh.vertices.length; ++ i) {
        var v2 = mesh.vertices[i];
        var n2 = mesh.normals[i];
        var t2 = mesh.texCoords[i];
        if (v[0] == v2[0] && v[1] == v2[1] && v[2] == v2[2]
        && n[0] == n2[0] && n[1] == n2[1] && n[2] == n2[2]
        && t[0] == t2[0] && t[1] == t2[1])
            return i;
    }
    mesh.vertices.push(v);
    mesh.normals.push(n);
    mesh.texCoords.push(t);
    return i;
}

var Primitives = {
    cube: function (properties, options) {
        var texCoords;
        options = options || {};
        if (options.projection == 'square') {
            texCoords = [
                [0.333, 0.667], [0.667, 0.667], [0.667, 0.333], [0.333, 0.333],
                [0.000, 0.667], [0.333, 0.667], [0.333, 0.333], [0.000, 0.333],
                [0.667, 0.667], [1.000, 0.667], [1.000, 0.333], [0.667, 0.333],
                [0.333, 0.333], [0.667, 0.333], [0.667, 0.000], [0.333, 0.000],
                [0.333, 1.000], [0.667, 1.000], [0.667, 0.667], [0.333, 0.667],
                [0.000, 0.333], [0.333, 0.333], [0.333, 0.000], [0.000, 0.000]
            ];
        } else {
            texCoords = [
                [0.50,0.75], [0.75,0.50], [0.50,0.25], [0.25,0.50],
                [0.25,1.00], [0.50,0.75], [0.25,0.50], [0.00,0.75],
                [0.75,0.50], [1.00,0.25], [0.75,0.00], [0.50,0.25],
                [0.25,0.50], [0.50,0.25], [0.25,0.00], [0.00,0.25],
                [0.75,1.00], [1.00,0.75], [0.75,0.50], [0.50,0.75],
                [1.00,1.25], [1.25,1.00], [1.00,0.75], [0.75,1.00]
            ];
        }
        return augment({
            mesh: {
                vertices: [
                    [-0.5,-0.5, 0.5], [ 0.5,-0.5, 0.5], [ 0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], // front (+Z)
                    [-0.5,-0.5,-0.5], [-0.5,-0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5,-0.5], // left
                    [ 0.5,-0.5, 0.5], [ 0.5,-0.5,-0.5], [ 0.5, 0.5,-0.5], [ 0.5, 0.5, 0.5], // right
                    [-0.5, 0.5, 0.5], [ 0.5, 0.5, 0.5], [ 0.5, 0.5,-0.5], [-0.5, 0.5,-0.5], // top
                    [-0.5,-0.5,-0.5], [ 0.5,-0.5,-0.5], [ 0.5,-0.5, 0.5], [-0.5,-0.5, 0.5], // bottom
                    [ 0.5,-0.5,-0.5], [-0.5,-0.5,-0.5], [-0.5, 0.5,-0.5], [ 0.5, 0.5,-0.5]  // back
                ],
                texCoords: texCoords,
                texture: 'loadingtexture.png',
                faces: [
                    [0,1,2],[2,3,0], [4,5,6],[6,7,4], [8,9,10],[10,11,8],
                    [12,13,14],[14,15,12], [16,17,18],[18,19,16], [20,21,22],[22,23,20]
                ],
            }
        }, properties);
    },
    sphere: function (properties, options) {
        options = options || {};
        options.targetTriangles = options.targetTriangles || 320;
        options.projection = options.projection || mappings.Polar;
        if (typeof options.projection == 'string') {
            switch (options.projection) {
                case 'polar':
                    options.projection = mappings.Polar;
                    break;
                case 'hammer':
                case 'hammerAitoff':
                    options.projection = mappings.HammerAitoff;
                    break;
                case 'mercator':
                    options.projection = mappings.Mercator;
                    break;
            }
        }
        function mid(v1, v2) {
            var x = v1[0] + v2[0];
            var y = v1[1] + v2[1];
            var z = v1[2] + v2[2];
            var len = Math.sqrt(x*x + y*y + z*z);
            return [x/len,y/len,z/len];
        }
        function subdivide(v1, v2, v3, d) {
            if (d >= s) {
                var texCoords = options.projection.getTextureCoordinates(v1, v2, v3);
                var i1 = findOrAddVertex(mesh, v1, v1, texCoords[0]);
                var i2 = findOrAddVertex(mesh, v2, v2, texCoords[1]);
                var i3 = findOrAddVertex(mesh, v3, v3, texCoords[2]);
                mesh.faces.push([i1, i2, i3]);
            } else {
                var v12 = mid(v1, v2);
                var v23 = mid(v2, v3);
                var v31 = mid(v3, v1);
                subdivide(v1, v12, v31, d + 1);
                subdivide(v2, v23, v12, d + 1);
                subdivide(v3, v31, v23, d + 1);
                subdivide(v12, v23, v31, d + 1);
            }
        }
        // This tessellation produces t = 20 * 4^s triangles, where s is the number of subdivisions.
        var s = Math.round(Math.log(options.targetTriangles/20)/Math.log(4)) |0;
        var mesh = { vertices: [], normals: [], texCoords: [], faces: [], texture: 'loadingtexture.png' };
        for (var i = 0; i < dodecFaces.length; ++ i) {
            subdivide(
                dodecVertices[dodecFaces[i][0]],
                dodecVertices[dodecFaces[i][1]],
                dodecVertices[dodecFaces[i][2]], 0);
        }
        return augment({
            mesh: mesh
        }, properties);
    },
    disc: function (properties, options) {
        var options = options || {};
        var n = (options.numTriangles || 24)|0;
        var vertices = [];
        var faces = [];
        var normals = [];
        var texCoords = [];
        vertices.push([0,0,0]);
        normals.push([0,0,1]);
        texCoords.push([0.5,0.5]);
        for (var i = 0; i < n; ++ i) {
            var x = Math.cos(i*2*Math.PI/n);
            var y = Math.sin(i*2*Math.PI/n);
            vertices.push([x, y, 0]);
            normals.push([0,0,1]);
            texCoords.push([(x+1)/2, 1-(y+1)/2]);
            if (i > 0)
                faces.push([0,i,i+1]);
        }
        faces.push([0,i,1]);
        return augment({
            mesh: {
                vertices: vertices,
                normals: normals,
                texCoords: texCoords,
                faces: faces,
                texture: 'loadingtexture.png'
            }
        }, properties);
    }
};

return Primitives;
})();