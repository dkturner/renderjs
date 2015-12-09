'use strict';

(function (window) {

function Renderer(gl, width, height, resources) {
    function render(time) {
        if (!running)
            return;
        if (sysTime0 == undefined) {
            sysTime0 = time;
            renderTime0 = renderer.time;
        }
        renderer.time = (time - sysTime0) / 1000 + renderTime0;
        model.identity();
        currentProgram.cameraMatrix = camera;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (var i = 0; i < nodes.length; ++ i)
            renderNode(currentProgram, nodes[i], time);
        renderer.frameCount++;

        requestAnimationFrame(render);
    }

    function prepareRender() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        currentProgram.use();
        currentProgram.viewportMatrix = viewport;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function renderAt(time) {
        prepareRender();
        model.identity();
        currentProgram.cameraMatrix = camera;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (var i = 0; i < nodes.length; ++ i)
            renderNode(currentProgram, nodes[i], time);
        renderer.frameCount++;
    }

    function createEvaluator(fArg) {
        if (typeof fArg == 'number')
            return function () { return fArg; };
        return Parser.createEvaluator(fArg, function (parameter) {
            if (parameter == '$time')
                return function () { return renderer.time; };
            return function () {
                var param = renderer.parameters[parameter];
                if (typeof param == 'function')
                    return param(renderer.time);
                if (typeof param == 'number')
                    return param;
                return 0.0;
            }
        })
    }

    function compose(f1, f2) {
        return function () {
            f1.apply(this, arguments);
            f2.apply(this, arguments);
        };
    }

    function createTransformFunction(transform) {
        if (transform[0] == 'rotate') {
            var angle = createEvaluator(transform[1]);
            var x = createEvaluator(transform[2]);
            var y = createEvaluator(transform[3]);
            var z = createEvaluator(transform[4]);
            return function (matrix) {
                matrix.rotate(angle(), [x(), y(), z()]);
            }
        } else if (transform[0] == 'translate') {
            var x = createEvaluator(transform[1]);
            var y = createEvaluator(transform[2]);
            var z = createEvaluator(transform[3]);
            return function (matrix) {
                matrix.translate(x(), y(), z());
            }
        } else if (transform[0] == 'scale') {
            var x = createEvaluator(transform[1]);
            var y = createEvaluator(transform[2]);
            var z = createEvaluator(transform[3]);
            return function (matrix) {
                matrix.scale(x(), y(), z());
            }
        } else {
            throw {error:'unsupported transform', reason: transform};
        }
    }

    function drawTriangleElements(mesh, program) {
        program.vertexPosition = mesh.vertexBuffer;
        program.vertexNormal = mesh.normalBuffer;
        program.textureCoord = mesh.texCoords;
        if (mesh.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.faceBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.faceCount, gl.UNSIGNED_SHORT, 0);
    }

    function createRenderData(node) {
        var result = {};
        if (node.mesh) {
            result.mesh = {};
            result.mesh.vertexBuffer = unpackBuffer(node.mesh.vertices, 3);
            if (node.mesh.texture) {
                result.mesh.texture = loadingTexture;
                resources.texture(node.mesh.texture).then (function (texture) {
                    result.mesh.texture = texture;
                    repaintRequired();
                });
            }
            var normals = node.mesh.normals;
            if (!normals)
                normals = computeNormals(node.mesh);
            result.mesh.normalBuffer = unpackBuffer(normals, 3);
            if (node.mesh.texCoords)
                result.mesh.texCoords = unpackBuffer(node.mesh.texCoords, 2);
            if (node.mesh.mode == 'strip') {
                throw {error: 'mesh mode not supported', reason: node.mesh.mode};
            } else if (node.mesh.faces) {
                result.mesh.faceBuffer = unpackBuffer(node.mesh.faces, 3, gl.UNSIGNED_SHORT, gl.ELEMENT_ARRAY_BUFFER);
                result.mesh.faceCount = 3 * node.mesh.faces.length;
                result.mesh.draw = drawTriangleElements;
            } else {
                // TODO: drawArray
            }
            if (node.transform) {
                var fn = undefined;
                for (var i = 0; i < node.transform.length; ++ i) {
                    var fn2 = createTransformFunction(node.transform[i]);
                    if (fn)
                        fn = compose(fn, fn2);
                    else
                        fn = fn2;
                }
                result.transform = fn;
            }
        }
        node.__renderData = result;
        if (node.children) {
            for (var i = 0; i < node.children.length; ++ i)
                createRenderData(node.children[i]);
        }
        return result;
    }

    function releaseRenderData(node) {
        var data = node.__renderData;
        if (data) {
            if (data.mesh) {
                gl.deleteBuffer(data.mesh.vertexBuffer);
                // TODO!!
            }
        }
        if (node.children) {
            for (var i = 0; i < node.children.length; ++ i)
                releaseRenderData(node.children[i]);
        }
    }

    function beginWireframe() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, preprocessed.framebuffer);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }

    function endWireframe() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        wireframePostprocProgram.use();
        wireframePostprocProgram.perspective = viewport;
        wireframePostprocProgram.vertexPosition = wireframePostprocProgram.vertices;
        wireframePostprocProgram.textureCoord = wireframePostprocProgram.texCoords;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, preprocessed.texture);
        gl.enable(gl.BLEND);
        //gl.disable(gl.DEPTH_TEST);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disable(gl.BLEND);
        //gl.enable(gl.DEPTH_TEST);
        currentProgram.use();
    }

    function renderNode(program, node, time) {
        var data = node.__renderData || createRenderData(node);
        if (data.transform) {
            model.push();
            data.transform(model);
        }
        if (data.mesh) {
            program.modelMatrix = model;
            if (program.flags.wireframe)
                beginWireframe();
            data.mesh.draw(data.mesh, program);
            if (program.flags.wireframe)
                endWireframe();
        }
        if (node.children) {
            for (var i = 0; i < node.children.length; ++ i) {
                renderNode(node.children[i]);
            }
        }
        if (data.transform)
            model.pop();
    }

    function unpackBuffer(buffer, size, type, target) {
        type = type || gl.FLOAT;
        target = target || gl.ARRAY_BUFFER;
        var array;
        if (type == gl.FLOAT)
            array = new Float32Array(buffer.length * size);
        else if (type == gl.UNSIGNED_SHORT)
            array = new Uint16Array(buffer.length * size);
        else
            throw {error:'unknown buffer type', reason:type};
        var k = 0;
        for (var i = 0; i < buffer.length; ++ i)
            for (var j = 0; j < size; ++ j)
                array[k++] = buffer[i][j];
        var glBuf = gl.createBuffer();
        gl.bindBuffer(target, glBuf);
        gl.bufferData(target, array, gl.STATIC_DRAW);
        return glBuf;
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

    function createFramebuffer() {
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        fb.width = width;
        fb.height = height;
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        var ren = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, ren);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, ren);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return {
            framebuffer: fb,
            texture: tex,
            renderbuffer: ren
        };
    }

    function repaintRequired() {
        // TODO
    }

    function orThrowError(error) {
        console.log('ERROR: ' + error.message);
        if (error.reason)
            console.log(error.reason);
        throw error;
    }

    resources.createCache('texture', function (url) {
        return resources.image(url).then (function (img) {
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            return texture;
        });
    });

    // Private variables
    var renderer = this;
    this.gl = gl;
    this.resources = resources;
    var running;
    var sysTime0, renderTime0;
    var nodes = [];
    var textures = {};
    var renderFlags = {};
    var pendingResources = [];
    var vertexPosition;
    var vertexNormal;
    var textureCoordinate;
    var preprocessed;
    var standardProgram;
    var wireframePostprocProgram;
    var currentProgram;
    var loadingTexture;
    var model = new MatrixStack();
    var camera = new MatrixStack();
    var viewport = new MatrixStack();

    // Initialization
    var extFragDepth = gl.getExtension('EXT_frag_depth');
    var ready = resources.all({
        'std-vertex.es2': resources.file,
        'std-fragment.es2': resources.file,
        'wfm-vertex.es2': resources.file,
        'wfm-fragment.es2': resources.file,
        'loadingtexture.jpg': resources.image,
    }).then(function (data) {
        standardProgram = new Shader(gl, data['std-vertex.es2'], data['std-fragment.es2']);
        standardProgram.registerFlag('wireframe');
        standardProgram.registerVertexAttrib('vertexPosition', gl.FLOAT, 3);
        standardProgram.registerVertexAttrib('vertexNormal', gl.FLOAT, 3);
        standardProgram.registerVertexAttrib('textureCoord', gl.FLOAT, 2);
        standardProgram.registerUniformMatrix('modelMatrix');
        standardProgram.registerUniformMatrix('cameraMatrix');
        standardProgram.registerUniformMatrix('viewportMatrix');

        wireframePostprocProgram = new Shader(gl, data['wfm-vertex.es2'], data['wfm-fragment.es2']);
        wireframePostprocProgram.registerVertexAttrib('vertexPosition', gl.FLOAT, 2);
        wireframePostprocProgram.registerVertexAttrib('textureCoord', gl.FLOAT, 2);
        wireframePostprocProgram.registerUniformMatrix('perspective');
        wireframePostprocProgram.setUniform2f('uViewportSize', width, height);
        wireframePostprocProgram.vertices = unpackBuffer([[-1,-1],[1,-1],[1,1],[1,1],[-1,1],[-1,-1]], 2);
        wireframePostprocProgram.texCoords = unpackBuffer([[0,1],[1,1],[1,0],[1,0],[0,0],[0,1]], 2);

        currentProgram = standardProgram;

        loadingTexture = data['loadingtexture.jpg'];

        return true;
    });

    preprocessed = createFramebuffer();
    viewport.perspective(60, +width/+height, 1, 100);
    camera.translate(0, 0, -5);

    // Public interface
    this.time = 0; // in seconds
    this.parameters = {};
    this.frameCount = 0;
    this.start = function () {
        ready.then(function() {
            prepareRender();
            running = true;
            sysTime0 = undefined;
            requestAnimationFrame(render);
        }, orThrowError);
    }
    this.stop = function () {
        running = false;
    }
    this.renderAt = function (time) {
        ready.then(function () {
            renderAt(time);
        }, orThrowError);
    }
    this.addNode = function (node) {
        nodes.push(node);
        createRenderData(node);
    }
    this.removeNode = function (node) {
        var idx = nodes.indexOf(node);
        if (idx >= 0) {
            nodes.splice(idx, 1);
            releaseRenderData(node);
        }
    }
}

function combinePath(base, path) {
    if (path.substring(0, 1) == '/' || path.indexOf('://') >= 0 || path.substring(0, 5) == 'data:')
        return path;
    if (base.length > 0 && base.substring(base.length - 1, 0) != '/')
        return base + '/' + path;
    return base + path;
}

function Resources(resourcePath) {
    resourcePath = resourcePath || '';
    var self = this;
    var pendingResources = [];
    this.resourcePath = resourcePath;
    this.createCache = function(type, factory) {
        var cache = {};
        this[type] = function (arg) {
            return new Promise(function (resolve, reject) {
                var cached = cache[arg];
                if (cached != undefined) {
                    resolve(cached);
                } else {
                    try {
                        var result = factory(arg);
                        if (result instanceof Promise || typeof result.then == 'function') {
                            pendingResources.push(result);
                            if (pendingResources.length == 1)
                                self.onresourcesloading();
                            result.then(function (value) {
                                cache[arg] = value;
                                pendingResources.splice(pendingResources.indexOf(result), 1);
                                if (pendingResources.length == 0)
                                    self.onresourcesloaded();
                                resolve(value);
                            }, reject);
                        } else {
                            cache[arg] = result;
                            resolve(result);
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        };
        this[type].set = function (src, data) {
            cache[src] = data;
        }
    }
    this.all = function (resourceMap) {
        var promiseArray = [];
        for (var key in resourceMap) {
            var value = resourceMap[key];
            if (typeof value == 'function')
                promiseArray.push(value(key));
            else
                promiseArray.push(value);
        }
        return Promise.all(promiseArray).then(function (resourceArray) {
            var valueMap = {};
            var i = 0;
            for (key in resourceMap)
                valueMap[key] = resourceArray[i++];
            return valueMap;
        });
    }
    Object.defineProperty(this, 'pendingResourceCount', {
        get: function () {
            return this.pendingResources.length;
        }
    });
    this.createCache('image', function (url) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function() { resolve(img); };
            img.onerror = reject;
            img.src = combinePath(self.resourcePath, url);
        });
    });
    this.createCache('file', function (url) {
        return $.get(combinePath(self.resourcePath, url));
    });
    this.onresourcesloading =
    this.onresourcesloaded = function () {};
}

window.createRenderer = function (canvas, resourcePath) {
    return new Promise(function (resolve, reject) {
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl)
            return reject('no webgl');
        var resources = new Resources(resourcePath);
        // the comment below is used by the build system
        //!EMBED resources: loadingtexture.jpg, std-vertex.es2, std-fragment.es2, wfm-vertex.es2, wfm-fragment.es2
        resources.all({
            'loadingtexture.jpg': resources.image,
            'std-vertex.es2': resources.file,
            'std-fragment.es2': resources.file,
            'wfm-vertex.es2': resources.file,
            'wfm-fragment.es2': resources.file,
        }).then(function(preloaded) {
            try {
                var renderer = new Renderer(gl, canvas.width, canvas.height, resources);
                resolve(renderer);
            } catch (error) {
                reject(error);
            }
        });
    });
}

})(window);