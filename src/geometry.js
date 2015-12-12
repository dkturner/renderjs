'use strict';

var Geometry = (function () {
    function Vector3(x, y, z) {
        if (x != undefined && y == undefined && z == undefined) {
            this.x = x.x || x[0];
            this.y = x.y || y[1];
            this.z = x.z || z[1];
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
    Vector3.prototype.dot = function (other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
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

    function Rotation(angle, x, y, z) {
        this.angle = +(angle || 0);
        this.axis = new Vector3(x, y, z);
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

    return {
        Vector3: Vector3,
        Maps: Maps
    }
})();