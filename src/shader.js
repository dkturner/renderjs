'use strict';

(function (window) {

function Shader(gl, vertexProgram, fragmentProgram) {
    function makeUniformName(name, prefix) {
        return (prefix || 'u') + name[0].toUpperCase() + name.substring(1);
    }

    var program = gl.createProgram();
    var shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexProgram);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw {message: 'invalid shader', reason: gl.getShaderInfoLog(shader)};
    var warnings = gl.getShaderInfoLog(shader);
    if (warnings)
        console.log(warnings);
    gl.attachShader(program, shader);
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragmentProgram);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw {message: 'invalid shader', reason: gl.getShaderInfoLog(shader)};
    warnings = gl.getShaderInfoLog(shader);
    if (warnings)
        console.log(warnings);
    gl.attachShader(program, shader);
    gl.linkProgram(program);

    this.glProgram = program;
    this.flags = {};

    this.use = function () {
        gl.useProgram(this.glProgram);
    }

    this.registerFlag = function(name, initValue) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var bValue = initValue;
        if (loc) {
            Object.defineProperty(this.flags, name, {
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

    this.registerUniformMatrix = function (name) {
        var loc = gl.getUniformLocation(program, makeUniformName(name));
        var value;
        if (loc) {
            Object.defineProperty(this, name, {
                get: function () {
                    return value;
                },
                set: function (newValue) {
                    value = newValue;
                    gl.uniformMatrix4fv(loc, false, value.getData());
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

window.Shader = Shader;

})(window);