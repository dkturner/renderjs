'use strict';

var Shader = (function () {

function Shader(gl, vertexProgram, fragmentProgram) {
    function makeUniformName(name, prefix) {
        return (prefix || 'u') + name[0].toUpperCase() + name.substring(1);
    }

    var program = gl.createProgram();
    var shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexProgram);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw {message: 'invalid vertex shader', reason: gl.getShaderInfoLog(shader)};
    var warnings = gl.getShaderInfoLog(shader);
    if (warnings)
        console.log(warnings);
    gl.attachShader(program, shader);
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragmentProgram);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw {message: 'invalid fragment shader', reason: gl.getShaderInfoLog(shader)};
    warnings = gl.getShaderInfoLog(shader);
    if (warnings)
        console.log(warnings);
    gl.attachShader(program, shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw {message: 'program filed to link', reason: gl.getProgramInfoLog (program)};

    this.glProgram = program;

    this.use = function () {
        gl.useProgram(this.glProgram);
    }

    this.registerFlag = function(name, initValue) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var bValue = initValue;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return bValue;
                },
                set: function (value) {
                    bValue = value;
                    gl.uniform1i(loc, value ? 1 : 0);
                    return bValue;
                }
            });
            if (initValue)
                gl.uniform1i(loc, 1);
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.registerVertexAttrib = function(name, type, size) {
        var loc = gl.getAttribLocation(program, makeUniformName(name, 'a'));
        var value;
        if (loc >= 0) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                    if (value) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, value);
                        gl.vertexAttribPointer(loc, size, type, false, 0, 0);
                        gl.enableVertexAttribArray(loc);
                    } else {
                        gl.disableVertexAttribArray(loc);
                    }
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no attribute ' + makeUniformName(name, 'a'));
        }
    }

    this.setSampler = function (name, textureUnit) {
        var loc = gl.getUniformLocation(program, name);
        gl.useProgram(this.glProgram);
        gl.uniform1i(loc, textureUnit);
    }

    this.registerUniformMatrix = function (name) {
        var uName = makeUniformName(name);
        var loc = gl.getUniformLocation(program, uName);
        var invLoc = gl.getUniformLocation(program, uName + 'Inverse');
        var value;
        if (loc || invLoc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                    if (loc)
                        gl.uniformMatrix4fv(loc, false, value.getData());
                    if (invLoc) {
                        value.push();
                        value.invert();
                        gl.uniformMatrix4fv(invLoc, false, value.getData());
                        value.pop();
                    }
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + uName);
        }
    }

    this.registerUniformInt = function (name) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var value;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                    gl.uniform1i(loc, value);
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.registerUniformFloat = function (name) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var value;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                    gl.uniform1f(loc, value);
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.registerUniformComplex = function (name, initVal) {
        var uniformName = makeUniformName(name);
        var locRe = gl.getUniformLocation(program, uniformName + '.Re');
        var locIm = gl.getUniformLocation(program, uniformName + '.Im');
        var value = new Geometry.Complex(initVal);
        if (locRe) {
            Object.defineProperty(this, name, {
                get: function () {
                    if (value.Im == 0.0)
                        return value.re;
                    else
                        return value;
                },
                set: function (newRe, newIm) {
                    value = new Geometry.Complex(newRe, newIm);
                    gl.uniform1f(locRe, value.re);
                    gl.uniform1f(locIm, value.im);
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.registerUniformFloat3 = function (name) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var value;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function () {
                    if (typeof arguments[1] == 'undefined')
                        value = [arguments[0][0], arguments[0][1], arguments[0][2]];
                    else
                        value = [arguments[0], arguments[1], arguments[2]];
                    gl.uniform3f(loc, value[0], value[1], value[2]);
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.registerUniformFloat4 = function (name) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var value;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function () {
                    if (typeof arguments[1] == 'undefined')
                        value = [arguments[0][0], arguments[0][1], arguments[0][2], arguments[0][3]];
                    else
                        value = [arguments[0], arguments[1], arguments[2], arguments[3]];
                    gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.registerUniformFloat3Array = function (name) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var value;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                    if (value.length == 0)
                        return value;
                    if (typeof value[0][0] != 'undefined') {
                        var array = new Float32Array(3*value.length);
                        var j = 0;
                        for (var i = 0; i < value.length; ++ i) {
                            array[j++] = value[i][0];
                            array[j++] = value[i][1];
                            array[j++] = value[i][2];
                        }
                        gl.uniform3fv(loc, array);
                    } else {
                        gl.uniform3fv(loc, value);
                    }
                    return value;
                }
            });
        } else {
            console.log('WARNING: shader has no uniform ' + makeUniformName(name));
        }
    }

    this.setUniform2f = function (uniformName, x, y) {
        var loc = gl.getUniformLocation(program, uniformName);
        if (loc) {
            gl.useProgram(program);
            gl.uniform2f(loc, x, y);
        }
    }
}

return Shader;

})();