'use strict';

var Geometry = (function () {
    function Vector3(x, y, z) {
        if (x != undefined && y == undefined && z == undefined) {
            this.x = x.x || x[0];
            this.y = x.y || x[1];
            this.z = x.z || x[2];
        } else {
            this.x = +(x||0);
            this.y = +(y||0);
            this.z = +(z||0);
        }
    }
    Object.defineProperty(Vector3.prototype, 0, { get: function () { return this.x; },
        set: function (x) { this.x = x; } });
    Object.defineProperty(Vector3.prototype, 1, { get: function () { return this.y; },
        set: function (y) { this.y = y; } });
    Object.defineProperty(Vector3.prototype, 2, { get: function () { return this.z; },
        set: function (z) { this.z = z; } });
    Object.defineProperty(Vector3.prototype, 'length', {
        get: function() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        },
        set: function(newLength) {
            var currentLength = this.length;
            this.x *= newLength / currentLength;
            this.y *= newLength / currentLength;
            this.z *= newLength / currentLength;
        }
    });
    Object.defineProperty(Vector3.prototype, 'direction', {
        get: function() {
            var length = this.length;
            return new Vector3(this.x / length, this.y / length, this.z / length);
        },
        set: function(newDirection) {
            var currentLength = this.length;
            var newDirectionLength = newDirection.length;
            this.x = newDirection.x * currentLength / newDirectionLength;
            this.y = newDirection.y * currentLength / newDirectionLength;
            this.z = newDirection.z * currentLength / newDirectionLength;
        }
    });
    Object.defineProperty(Vector3.prototype, 'reverse', {
        get: function () {
            return new Vector3(-this.x, -this.y, -this.z);
        }
    });
    Vector3.prototype.multiply = function (s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    Vector3.prototype.dot = function (other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }
    Vector3.dot = function (v1, v2) {
        return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
    }
    Vector3.prototype.colinearWith = function (that) {
        var l1 = Vector3.dot(this, this);
        var l2 = Vector3.dot(that, that);
        var s = l1*l2;
        var t = Vector3.dot(this, that);
        return t*t - s < 2.38e-7;
    }
    Vector3.prototype.add = function (other) {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
        return this;
    }
    Vector3.add = function (v1, v2) {
        return new Vector3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }
    Vector3.prototype.subtract = function (other) {
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;
        return this;
    }
    Vector3.subtract = function (v1, v2) {
        return new Vector3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }
    Vector3.prototype.cross = function (other) {
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.y,
            this.x * other.y - this.y * other.x);
    }

    function Complex(re, im) {
        if (typeof re != 'undefined' && (re instanceof Complex || re.length == 2)) {
            this.re = re[0];
            this.im = re[1];
        } else {
            this.re = +(re || 0);
            this.im = +(im || 0);
        }
    }
    Object.defineProperty(Complex.prototype, '0', { get: function() { return this.re; } });
    Object.defineProperty(Complex.prototype, '1', { get: function() { return this.im; } });
    Complex.add = function (a, b) {
        if (a instanceof Complex) {
            if (b instanceof Complex)
                return new Complex(a.re + b.re, a.im + b.im);
            else
                return new Complex(a.re + b, a.im);
        } else {
            if (b instanceof Complex)
                return new Complex(a + b.re, b.im);
            else
                return new Complex(a + b, 0);
        }
    }
    Complex.sub = function (a, b) {
        if (a instanceof Complex) {
            if (b instanceof Complex)
                return new Complex(a.re - b.re, a.im - b.im);
            else
                return new Complex(a.re - b, a.im);
        } else {
            if (b instanceof Complex)
                return new Complex(a - b.re, b.im);
            else
                return new Complex(a - b, 0);
        }
    }
    Complex.mul = function (a, b) {
        if (a instanceof Complex) {
            if (b instanceof Complex)
                return new Complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
            else
                return new Complex(a.re * b, a.im * b);
        } else {
            if (b instanceof Complex)
                return new Complex(a * b.re, a * b.im);
            else
                return new Complex(a * b, 0);
        }
    }
    Complex.div = function (a, b) {
        if (a instanceof Complex) {
            if (b instanceof Complex) {
                // a / b === ab* / bb*, and bb* is the square of the magnitude which is always real
                var invmag =  1.0 / (b.re*b.re + b.im*b.im);
                return new Complex((a.re*b.re + a.im*b.im) * invmag, (a.im*b.re - a.re*b.im) * invmag);
            } else {
                return new Complex(a.re / b, a.im / b);
            }
        } else {
            if (b instanceof Complex) {
                var invmag = 1.0 / (b.re*b.re + b.im*b.im);
                return new Complex(a*b.re * invmag, -a * b.im * invmag);
            } else {
                return new Complex(a / b, 0);
            }
        }
    }

    function sameSign() {
        // IE doesn't support Math.sign....
        var sign = arguments[0] < 0 ? -1 : arguments[0] == 0 ? 0 : 1;
        for (var i = 1; i < arguments.length; ++ i)
            if ((arguments[i] < 0 ? -1 : arguments[i] == 0 ? 0 : 1) != sign)
                return false;
        return true;
    }

    var Maps = {
        Polar: {
            // The simple polar-coordinates projection everybody knows about - latitude and longitude are mapped directly to the
            // texture coordinates.  This means that the poles are stretched (a single point becomes a whole row in the texture),
            // and generally you can expect both area and angular distortions.  However, it is very simple.  We define it so that
            // u = 0.5 is longitude 0, so that Greenwich is in the middle of the map if it's a map of the earth :-).  v = 0 is the
            // North pole and v = 1 is the South.
            project: function (x, y, z) {
                if (y == undefined && z == undefined) {
                    y = x[1];
                    z = x[2];
                    x = x[0];
                }
                var len = Math.sqrt(x*x + y*y + z*z);
                var v = Math.acos(y/len) / Math.PI;
                var u = Math.atan2(x, z) / (2*Math.PI) + 0.5;
                return [u, v];
            },
            getTextureCoordinates: function(v1, v2, v3) {
                var coords = [ Maps.Polar.project(v1), Maps.Polar.project(v2), Maps.Polar.project(v3) ];
                if ((v1[2] < 0 || v2[2] < 0 || v3[2] < 0) && !sameSign(v1[0], v2[0], v3[0])) {
                    // handle wrapping around the date line
                    if (v1[0] < 0)
                        coords[0][0] += 1;
                    if (v2[0] < 0)
                        coords[1][0] += 1;
                    if (v3[0] < 0)
                        coords[2][0] += 1;
                }
                // sort out the poles, where u is technically undefined (so we make it an average of the other two vertices' u)
                if (v1[1] == 1 || v1[1] == -1) {
                    coords[0][0] = (coords[1][0] + coords[2][0])/2;
                    coords[0][1] = v1[1] == 1 ? 0 : 1;
                } else if (v2[1] == 1 || v2[1] == -1) {
                    coords[1][0] = (coords[0][0] + coords[2][0])/2;
                    coords[1][1] = v2[1] == 1 ? 0 : 1;
                } else if (v3[1] == 1 || v3[1] == -1) {
                    coords[2][0] = (coords[0][0] + coords[1][0])/2;
                    coords[2][1] = v3[1] == 1 ? 0 : 1;
                }
                return coords;
            }
        },
        Mercator: {
            // A conformal (angle-preserving) map dating from 1569.  Here because it's popular, not because it's
            // technically good.  Useful though if you wish to preserve angles, e.g. you when you have a regular
            // grid on the sphere.
            project: function (x, y, z) {
                if (y == undefined && z == undefined) {
                    y = x[1];
                    z = x[2];
                    x = x[0];
                }
                var len = Math.sqrt(x*x + y*y + z*z);
                var lat, lon;
                lat = Math.asin(y/len);
                lon = Math.atan2(x, z);
                var u = lon/(2*Math.PI) + 0.5
                var v = 0.5 - Math.log(Math.tan((lat + Math.PI/2)/2)) / (2*Math.PI);
                return [u, v];
            },
            getTextureCoordinates: function (v1, v2, v3) {
                var coords = [ Maps.Mercator.project(v1), Maps.Mercator.project(v2), Maps.Mercator.project(v3) ];
                if ((v1[2] < 0 || v2[2] < 0 || v3[2] < 0) && !sameSign(v1[0], v2[0], v3[0])) {
                    // handle wrapping around the date line
                    if (v1[0] < 0)
                        coords[0][0] += 1;
                    if (v2[0] < 0)
                        coords[1][0] += 1;
                    if (v3[0] < 0)
                        coords[2][0] += 1;
                }
                // sort out the poles, where u is technically undefined (so we make it an average of the other two vertices' u)
                if (v1[1] == 1 || v1[1] == -1) {
                    coords[0][0] = (coords[1][0] + coords[2][0])/2;
                    coords[0][1] = v1[1] == 1 ? 0 : 1;
                } else if (v2[1] == 1 || v2[1] == -1) {
                    coords[1][0] = (coords[0][0] + coords[2][0])/2;
                    coords[1][1] = v2[1] == 1 ? 0 : 1;
                } else if (v3[1] == 1 || v3[1] == -1) {
                    coords[2][0] = (coords[0][0] + coords[1][0])/2;
                    coords[2][1] = v3[1] == 1 ? 0 : 1;
                }
                return coords;
            }
        },
        HammerAitoff: {
            // Hammer-Aitoff is an area-preserving projection of the sphere onto a plane.  Useful where small angular
            // distortions are not a problem, but changes to the size of shapes in the texture are.  One of the main
            // properties here is that the "effective resolution" of the texture is nearly the same everywhere (for
            // all points within the projection, that is).  There can be large distortions around the date line, so
            // this is best used for front-facing spheres.  The earth is a good candidate because the date line happens
            // to mostly pass through ocean.  This is good for preserving the texture around the poles, but it will
            // look blurry at the equator and downright distorted if the texture has a lot of straight edges.
            project: function (x, y, z, outer) {
                if (y == undefined && z == undefined) {
                    y = x[1];
                    z = x[2];
                    x = x[0];
                }
                var len = Math.sqrt(x*x + y*y + z*z);
                var lat, lon;
                lat = Math.asin(y/len);
                lon = Math.atan2(x, z);
                if (outer && lon < 0) {
                    // Same projection, but reflect the point to the "outside" of the projection, i.e. the corners of
                    // the texture. This is needed when triangles straddle the edge of the projection space.  Naive
                    // mapping would point one of the points on the opposite side of the texture to the other two.
                    // There is also a pathological case where a triangle straddles a pole.  In this case, you can get
                    // texture points that are maximally distant from each other, i.e. the triangle covers almost a
                    // third of the texture.
                    lon = lon + 2*Math.PI;
                }
                var zn = Math.sqrt(1 + Math.cos(lat)*Math.cos(lon/2));
                var xn = Math.cos(lat)*Math.sin(lon/2)/zn;
                var yn = Math.sin(lat)/zn;
                return [(xn+1)/2, (1-yn)/2];
            },
            getTextureCoordinates: function (v1, v2, v3) {
                var coords = [ Maps.HammerAitoff.project(v1), Maps.HammerAitoff.project(v2), Maps.HammerAitoff.project(v3) ];
                if (!sameSign(v1[0], v2[0], v3[0])) {
                    // check if this is the pathological case where the triangle straddles the polar axis
                    var y1 = v1[0] * (v2[2] - v1[2]) - v1[2] * (v2[0] - v1[0]);
                    var y2 = v2[0] * (v3[2] - v2[2]) - v2[2] * (v3[0] - v2[0]);
                    var y3 = v3[0] * (v1[2] - v3[2]) - v3[2] * (v1[0] - v3[0]);
                    var straddles = (y1 < 0 && y2 < 0 && y3 < 0) || (y1 >= 0 && y2 >= 0 && y3 >= 0)
                        || (v1[0] == 0 && v1[2] == 0) || (v2[0] == 0 && v2[2] == 0) || (v3[0] == 0 && v3[2] == 0);
                    if (straddles) {
                        //var coords2 = [Maps.HammerAitoff.project(v1[0],v1[1],v1[2],true),Maps.HammerAitoff.project(v2[0],v2[1],v2[2],true),Maps.HammerAitoff.project(v3[0],v3[1],v3[2],true)];
                        //if (coords2[0][0] != coords[0][0] || coords2[0][1] != coords[0][1] || coords2[1][0] != coords[1][0] || coords2[1][1] != coords[1][1] || coords2[2][0] != coords[2][0] || coords2[2][1] != coords[0][1]) {
                        //    console.log('foo?');
                        //}
                        //coords[0] = coords[1] = coords[2] = [0.6,0.5];
                    } else if (v1[2] < 0 || v2[2] < 0 || v3[2] < 0) {
                        // handle wrapping around the date line
                        if (v1[0] == 0) {
                            if (v2[0] < 0)
                                coords[1] = Maps.HammerAitoff.project(v2[0], v2[1], v2[2], true);
                            if (v3[0] < 0)
                                coords[2] = Maps.HammerAitoff.project(v3[0], v3[1], v3[2], true);
                        }
                        if (v2[0] == 0) {
                            if (v1[0] < 0)
                                coords[0] = Maps.HammerAitoff.project(v1[0], v1[1], v1[2], true);
                            if (v3[0] < 0)
                                coords[2] = Maps.HammerAitoff.project(v3[0], v3[1], v3[2], true);
                        }
                        if (v3[0] == 0) {
                            if (v1[0] < 0)
                                coords[0] = Maps.HammerAitoff.project(v1[0], v1[1], v1[2], true);
                            if (v2[0] < 0)
                                coords[1] = Maps.HammerAitoff.project(v2[0], v2[1], v2[2], true);
                        }
                    }
                }
                var d1 = Math.sqrt((coords[1][0] - coords[2][0])*(coords[1][0]-coords[2][0]) + (coords[1][1]-coords[2][1])*(coords[1][1]-coords[2][1]));
                var d2 = Math.sqrt((coords[0][0] - coords[2][0])*(coords[0][0]-coords[2][0]) + (coords[0][1]-coords[2][1])*(coords[0][1]-coords[2][1]));
                var d3 = Math.sqrt((coords[0][0] - coords[1][0])*(coords[0][0]-coords[1][0]) + (coords[0][1]-coords[1][1])*(coords[0][1]-coords[1][1]));
                if (d1 > 0.5 || d2 > 0.5 || d3 > 0.5) {
                    console.log(d1 + ',' + d2 + ',' + d3);
                }
                return coords;
            }
        }
    }
    function getNeighbours(mesh) {
        var map = [];
        for (var i = 0; i < mesh.vertices.length; ++ i)
            map.push([]);
        for (var i = 0; i < mesh.faces.length; ++ i) {
            if (map[mesh.faces[i][0]].indexOf(mesh.faces[i][1]) < 0)
                map[mesh.faces[i][0]].push(mesh.faces[i][1]);
            if (map[mesh.faces[i][1]].indexOf(mesh.faces[i][2]) < 0)
                map[mesh.faces[i][1]].push(mesh.faces[i][2]);
            if (map[mesh.faces[i][2]].indexOf(mesh.faces[i][0]) < 0)
                map[mesh.faces[i][2]].push(mesh.faces[i][0]);
            if (map[mesh.faces[i][1]].indexOf(mesh.faces[i][0]) < 0)
                map[mesh.faces[i][1]].push(mesh.faces[i][0]);
            if (map[mesh.faces[i][0]].indexOf(mesh.faces[i][2]) < 0)
                map[mesh.faces[i][0]].push(mesh.faces[i][2]);
            if (map[mesh.faces[i][2]].indexOf(mesh.faces[i][1]) < 0)
                map[mesh.faces[i][2]].push(mesh.faces[i][1]);
        }
        return map;
    }

    function averageNormals(normals) {
        // we can assume all the normals are unit length, so arithmetic averaging followed by normalization works
        var x = 0;
        var y = 0;
        var z = 0;
        for (var i = 0; i < normals.length; ++ i) {
            x = x + normals[i][0];
            y = y + normals[i][1];
            z = z + normals[i][2];
        }
        var len = Math.sqrt(x*x+y*y+z*z);
        if (len == 0) // oops, the result is degenerate, e.g. if two opposite-facing faces use the same vertex
            return [0,0,1];
        return [x/len, y/len, z/len];
    }

    function computeNormals(mesh) {
        var n = [];
        for (var i = 0; i < mesh.vertices.length; ++ i)
            n.push([]);
        for (var i = 0; i < mesh.faces.length; ++ i) {
            var v1 = mesh.vertices[mesh.faces[i][0]];
            var v2 = mesh.vertices[mesh.faces[i][1]];
            var v3 = mesh.vertices[mesh.faces[i][2]];
            // face normal is (v2 - v1) x (v3 - v2) (right-hand rule, anticlockwise points)
            var a_x = v2[0] - v1[0], a_y = v2[1] - v1[1], a_z = v2[2] - v1[2];
            var b_x = v3[0] - v2[0], b_y = v3[1] - v2[1], b_z = v3[2] - v2[2];
            var n_x = a_y*b_z - a_z*b_y;
            var n_y = a_z*b_x - a_x*b_z;
            var n_z = a_x*b_y - a_y*b_x;
            var len = Math.sqrt(n_x*n_x + n_y*n_y + n_z*n_z);
            var normal = [n_x/len, n_y/len, n_z/len];
            n[mesh.faces[i][0]].push(normal);
            n[mesh.faces[i][1]].push(normal);
            n[mesh.faces[i][2]].push(normal);
        }
        for (var i = 0; i < n.length; ++ i) {
            if (n[i].length == 0) // unreferenced vertex, assign it a random normal (how about z^?)
                n[i] = [0,0,1];
            else if (n[i].length == 1)
                n[i] = n[i][0];
            else
                n[i] = averageNormals(n[i]);
        }
        return n;
    }

    function getProjectiveTangents(n, dx, duv) {
        var prlen_t = dx[0]*n[0] + dx[1]*n[1] + dx[2]*n[2];
        var uvlen = Math.sqrt(duv[0]*duv[0] + duv[1]*duv[1]);
        // project onto the plane with normal n
        var dx_n = [
            dx[0]/uvlen - n[0]*prlen_t,
            dx[1]/uvlen - n[1]*prlen_t,
            dx[2]/uvlen - n[2]*prlen_t
        ];
        // rotate so that duv_n lies along the u axis
        var angle = Math.atan2(duv[1], duv[0]);
        var cos_p = Math.cos(-angle);
        var sin_p = Math.sin(-angle);
        var r = [-n[0], -n[1], -n[2]];
        var rxry = r[0]*r[1], rxrz = r[0]*r[2], ryrz = r[1]*r[2];
        var du = new Vector3(
            dx_n[0] + (dx_n[0]*r[0]*r[0] + dx_n[1]*rxry + dx_n[2]*rxrz - dx_n[0])*(1 - cos_p)
                    + (dx_n[2]*r[1] - dx_n[1]*r[2]) * sin_p,
            dx_n[1] + (dx_n[1]*r[1]*r[1] + dx_n[0]*rxry + dx_n[2]*ryrz - dx_n[1])*(1 - cos_p)
                    + (dx_n[0]*r[2] - dx_n[2]*r[0]) * sin_p,
            dx_n[1] + (dx_n[2]*r[2]*r[2] + dx_n[0]*rxrz + dx_n[1]*ryrz - dx_n[2])*(1 - cos_p)
                    + (dx_n[0]*r[1] - dx_n[1]*r[0]) * sin_p
        );
        // dv is the cross product of n with du (right-handed system assumed), scaled appropriately
        var dv = n.cross(du).multiply(duv[0] == 0 ? duv[1] : Math.abs(duv[1] / duv[0]));
        return [du, dv];
    }

    function getLengyelTangents(n, Q1, s1, t1, Q2, s2, t2) {
        // Lengyel, Eric. "Computing Tangent Space Basis Vectors for an Arbitrary
        // Mesh". Terathon Software 3D Graphics Library, 2001.
        // http://www.terathon.com/code/tangent.html
        var q = s1*t2 - s2*t1;
        if (q == 0) {
            // A special case; the triangle spans a straight line in the texture
            // space (this can happen with things like polar maps). Fall back to the
            // cross-product method used for vertices with a single neighbour.
            // We should probably use the shorter vector to minimize error, but then
            // we would have to remember to deal with the opposite-handedness.
            return getProjectiveTangents(n, Q1, [s1, t1]);
        }
        q = 1 / q;
        var du = [
            q*(t2*Q1[0] - t1*Q2[0]),
            q*(t2*Q1[1] - t1*Q2[1]),
            q*(t2*Q1[2] - t1*Q2[2])
        ];
        var dv = [
            q*(s1*Q2[0] - s2*Q1[0]),
            q*(s1*Q2[1] - s2*Q1[1]),
            q*(s1*Q2[2] - s2*Q1[2])
        ];
        return [du, dv];
    }

    function findClosestNeighbour(x0, vertices) {
        var shortestIndex = null;
        var shortestDSq = null;
        var shortestDx = null;
        for (var i = 0; i < vertices.length; ++ i) {
            var dx = vertices[i][0] - x0[0];
            var dy = vertices[i][1] - x0[1];
            var dz = vertices[i][2] - x0[2];
            var dSq = dx*dx + dy*dy + dz*dz;
            if (shortestIndex === null || dSq < shortestDSq) {
                shortestIndex = i;
                shortestDSq = dSq;
                shortestDx = [dx, dy, dz];
            }
        }
        return {
            index: shortestIndex,
            vertex: vertices[i],
            dx: shortestDx,
            lendXSq: shortestDSq
        };
    }

    function findPerpendicular(dx0, dx) {
        var bestIndex = null;
        var bestCosT = null;
        var sumSqDx0 = 0;
        for (var i = 0; i < dx0.length; ++ i)
            sumSqDx0 += dx0[i] * dx0[i];
        for (var i = 0; i < dx.length; ++ i) {
            var dotProduct = 0;
            var lenSq = 0;
            for (var j = 0; j < dx0.length; ++ j) {
                dotProduct += dx[i][j] * dx0[j];
                lenSq += dx[i][j] * dx[i][j];
            }
            var cosT = dotProduct / Math.sqrt(lenSq*sumSqDx0);
            if (bestIndex === null || Math.abs(cosT) < Math.abs(bestCosT)) {
                bestIndex = i;
                bestCosT = cosT;
            }
        }
        return {
            index: bestIndex,
            dx: dx[bestIndex],
            cosT: bestCosT
        };
    }

    function getLeastSquaresTangents(vertices, texCoords, neighbours, x0, uv0, n, matrixStack) {
        // Estimate du and dv as best we can, using a least squares regression on
        // the u, v coordinates of the edges. We weight the neighbours' error terms
        // by the inverse-square of distance (because a small delta is a more accurate
        // reflection of the derivative). The rest is linear algebra.  It is assumed
        // in this method that the normal is of length 1.
        if (neighbours.length < 3)
            throw {error: 'require at least 3 neighbours to use least-squares'};
        if (neighbours.length == 3) {
            // Detect the very likely case that one of the dx's is colinear
            // with the sum of the other two, as happens in the faces of a
            // square, for example. In this case, we actually only have two
            // independent axes, and so we fall back on Lengyel's method.
            var dx1 = new Vector3(vertices[neighbours[0]]).subtract(x0);
            var dx2 = new Vector3(vertices[neighbours[1]]).subtract(x0);
            var dx3 = new Vector3(vertices[neighbours[2]]).subtract(x0);
            var duv1 = [ texCoords[neighbours[0]][0] - uv0[0],
                         texCoords[neighbours[0]][1] - uv0[1]];
            var duv2 = [ texCoords[neighbours[1]][0] - uv0[0],
                         texCoords[neighbours[1]][1] - uv0[1]];
            var duv3 = [ texCoords[neighbours[2]][0] - uv0[0],
                         texCoords[neighbours[2]][1] - uv0[1]];
            if (new Vector3(dx1).add(dx2).colinearWith(dx3))
                return getLengyelTangents(n, dx1, duv1[0], duv1[1],
                                             dx2, duv2[0], duv2[1]);
             if (new Vector3(dx2).add(dx3).colinearWith(dx1))
                return getLengyelTangents(n, dx2, duv2[0], duv2[1],
                                             dx3, duv3[0], duv3[1]);
             if (new Vector3(dx3).add(dx1).colinearWith(dx2))
                return getLengyelTangents(n, dx3, duv3[0], duv3[1],
                                             dx1, duv1[0], duv1[1]);
        }
        if (neighbours.length == 4) {
            // Possibly two of the vectors are colinear with the other two; this
            // is another common case arising in tessellations of planes.
            var dx1 = new Vector3(vertices[neighbours[0]]).subtract(x0);
            var dx2 = new Vector3(vertices[neighbours[1]]).subtract(x0);
            var dx3 = new Vector3(vertices[neighbours[2]]).subtract(x0);
            var dx4 = new Vector3(vertices[neighbours[3]]).subtract(x0);
            var duv1 = [ texCoords[neighbours[0]][0] - uv0[0],
                         texCoords[neighbours[0]][1] - uv0[1]];
            var duv2 = [ texCoords[neighbours[1]][0] - uv0[0],
                         texCoords[neighbours[1]][1] - uv0[1]];
            var duv3 = [ texCoords[neighbours[2]][0] - uv0[0],
                         texCoords[neighbours[2]][1] - uv0[1]];
            var duv4 = [ texCoords[neighbours[3]][0] - uv0[0],
                         texCoords[neighbours[3]][1] - uv0[1]];
            if (dx1.colinearWith(dx2) &&  dx3.colinearWith(dx4))
                return getLengyelTangents(n, dx1, duv1[0], duv1[1],
                                             dx3, duv3[0], duv3[1]);
            if (dx1.colinearWith(dx3) &&  dx2.colinearWith(dx4)
            || dx1.colinearWith(dx4) &&  dx2.colinearWith(dx3))
                return getLengyelTangents(n, dx1, duv1[0], duv1[1],
                                             dx2, duv2[0], duv2[1]);
        }
        // More than four neighbours means we *may* have three independent axes
        // to work with, in which case there is a least-squares solution.  Let's
        // find out...
        var m = matrixStack || new MatrixStack();
        var x2 = 0, y2 = 0, z2 = 0, xy = 0, xz = 0, yz = 0;
        var uvec = [0, 0, 0], vvec = [0, 0, 0];
        for (var j = 0; j < neighbours.length; ++ j) {
            var x1 = vertices[neighbours[j]];
            var s = [x1[0] - x0[0], x1[1] - x0[1], x1[2] - x0[2]];
            var invlen2 = 1 / Math.sqrt(s[0]*s[0] + s[1]*s[1] + s[2]*s[2]);
            x2 += s[0]*s[0] * invlen2;
            y2 += s[1]*s[1] * invlen2;
            z2 += s[2]*s[2] * invlen2;
            xy += s[0]*s[1] * invlen2;
            xz += s[0]*s[2] * invlen2;
            yz += s[1]*s[2] * invlen2;
            var uv = texCoords[neighbours[j]];
            uvec[0] += uv[0] * s[0] * invlen2;
            uvec[1] += uv[0] * s[1] * invlen2;
            uvec[2] += uv[0] * s[2] * invlen2;
            vvec[0] += uv[1] * s[0] * invlen2;
            vvec[1] += uv[1] * s[1] * invlen2;
            vvec[2] += uv[1] * s[2] * invlen2;
        }
        m.loadRowMajor([
            [ x2 ,  xy ,  xz ,  0 ],
            [ xy ,  y2 ,  yz ,  0 ],
            [ xz ,  yz ,  z2 ,  0 ],
            [ 0  ,  0  ,  0  ,  1 ]
        ]);
        if (m.invert()) {
            uvec = m.transform(uvec);
            vvec = m.transform(vvec);
        } else {
            // The upper-left 3x3 matrix has rank < 3, which means we're missing at least one axis.  We shall have
            // to use either Lengyel's method or the projective method.  First, we need to find an orthonormal basis.
            var S = m.getBasisAndNullSpace();
            if (S.nulls.length == 3) {
                // The neighbourhood is degenerate (all neighbours share the same point).
                uvec = [0,0,0];
                vvec = [0,0,0];
            } else if (S.nulls.length == 2) {
                // The neighbours are colinear, so we need to use the projective method.  Pick the smallest edge,
                // since this will be closest to the true (du, dv).
                var closest = findClosestNeighbour(x0, neighbours.map(function (i) { return vertices[i]; }));
                var dUV = [
                    texCoords[neighbours[closest.index]][0] - uv0[0],
                    texCoords[neighbours[closest.index]][1] - uv0[1]
                ];
                return getProjectiveTangents(n, closest.dx, dUV);
            } else if(S.nulls.length == 1) {
                // The matrices are in the plane perpendicular to S.nulls[0].  We need to find a pair whose
                // image in (u, v) space is nearly perpendicular.  It would help if one of these was the
                // closest neighbour, so we start by optimistically assuming that the closest neighbour has a
                // nearly-perpendicular friend.
                var dx = neighbours.map(function (i) { return vertices[i]; });
                var dUV = neighbours.map(function (i) {
                    return [ texCoords[i][0] - uv0[0], texCoords[i][1] - uv0[1] ];
                });
                var closest = findClosestNeighbour(x0, dx);
                var perp = findPerpendicular(dUV[closest.index], dUV);
                var bestI = closest.index;
                var bestJ = perp.index;
                var bestCosT = perp.cosT;
                if (Math.abs(perp.cosT) > 0.7071) {
                    // Not particularly good, it's within 45 degrees.  See if we can do better with another pair.
                    for (var i = 0; i < neighbours.length; ++i) {
                       if (i == closest.index || i == perp.index)
                           continue;
                       var uvi = [texCoords[neighbours[i]][0] - uv0[0], texCoords[neighbours[i][1]] - uv0[1]];
                       var lenSqI = uvi[0]*uvi[0] + uvi[1]*uvi[1];
                       for (var  j = i + 1; j < neighbours.length; ++ j) {
                           if (j == closest.index || j == perp.index)
                               continue;
                           var uvj = [texCoords[neighbours[j]][0] - uv0[0], texCoords[neighbours[j][1]] - uv0[1]];
                           var lenSqJ = uvj[0]*uvj[0] + uvj[1]*uvj[1];
                           var cosT = (uvi[0]*uvj[0] + uvi[1]*uvj[1]) / Math.sqrt(lenSqI*lenSqJ);
                           if (Math.abs(cosT) < Math.abs(bestCosT)) {
                               bestI = i;
                               bestJ = j;
                               bestCosT = cosT;
                           }
                       }
                    }
                }
                return getLengyelTangents(n,
                    dx[bestI], dUV[bestI][0], dUV[bestI][1],
                    dx[bestJ], dUV[bestJ][0], dUV[bestJ][1]);
            } else {
                // Can't be 0 nulls since the matrix is singular, and there can't be 4
                // because we provided w as a basis vector, so....??
                throw {error: 'That was sure unexpected!'};
            }
        }

        // The resulting u, v vectors aren't necessarily in the plane of the
        // normal, so we have to project them.
        var d = n[0]*uvec[0] + n[1]*uvec[1] + n[2]*uvec[2];
        uvec[0] -= d*n[0]; uvec[1] -= d*n[1]; uvec[2] -= d*n[2];
        var d = n[0]*vvec[0] + n[1]*vvec[1] + n[2]*vvec[2];
        vvec[0] -= d*n[0]; vvec[1] -= d*n[1]; vvec[2] -= d*n[2];
        // They aren't necessarily orthogonal either, but that's a feature, not a bug.
        return [uvec, vvec];
    }

    function computeTangentSpace(mesh, normals, normalized) {
        if (typeof normals == 'undefined')
            normals = mesh.normals;
        var vertexNeighbours = getNeighbours(mesh);
        var m = new MatrixStack();
        var tangents = [];
        for (var i = 0; i < vertexNeighbours.length; ++ i) {
            if (vertexNeighbours[i].length == 0) {
                // tangent space is undefined
                tangents.push([[0,0,0], [0,0,0]]);
                continue;
            }
            var x0 = new Vector3(mesh.vertices[i]);
            var n = new Vector3(normals[i]);
            var uv0 = mesh.texCoords[i];
            if (vertexNeighbours[i].length == 1) {
                // this can happen if the vertex is part of a line mesh
                var x1 = mesh.vertices[vertexNeighbours[i][0]];
                var uv1 = mesh.texCoords[vertexNeighbours[i][0]];
                var dx = [ x1[0] - x0[0], x1[1] - x0[1], x1[2] - x0[2] ];
                var duv = [ uv1[0] - uv0[0], uv1[1] - uv0[1] ];
                tangents.push(getProjectiveTangents(n, dx, duv));
            } else if (vertexNeighbours[i].length == 2) {
                // This vertex is part of one triangle only; we use Lengyel's method.
                var uv1 = mesh.texCoords[vertexNeighbours[i][0]];
                var uv2 = mesh.texCoords[vertexNeighbours[i][0]];
                var s1 = uv1[0] - uv0[0], t1 = uv1[1] - uv0[1];
                var s2 = uv2[0] - uv0[0], t2 = uv2[1] - uv0[1];
                var Q1 = new Vector3(mesh.vertices[vertexNeighbours[i][0]]).subtract(x0);
                var Q2 = new Vector3(mesh.vertices[vertexNeighbours[i][1]]).subtract(x0);
                tangents.push(getLengyelTangents(n, Q1, s1, t1, Q2, s2, t2));
            } else {
                tangents.push(getLeastSquaresTangents(
                    mesh.vertices, mesh.texCoords, vertexNeighbours[i],
                    x0, mesh.texCoords[i], n, m));
            }
        }
        if (normalized) {
            for (var i = 0; i < tangents.length; ++ i) {
                var x = tangents[i][0][0];
                var y = tangents[i][0][1];
                var z = tangents[i][0][2];
                var u = Math.sqrt(x*x + y*y + z*z);
                if (u != 0)
                    tangents[i][0] = [ x/u, y/u, z/u ];
                var x = tangents[i][1][0];
                var y = tangents[i][1][1];
                var z = tangents[i][1][2];
                var u = Math.sqrt(x*x + y*y + z*z);
                if (u != 0)
                    tangents[i][1] = [ x/u, y/u, z/u ];
            }
        }
        return tangents;
    }

    return {
        Vector3: Vector3,
        Maps: Maps,
        Complex: Complex,
        computeNormals: computeNormals,
        computeTangentSpace: computeTangentSpace,
    }
})();