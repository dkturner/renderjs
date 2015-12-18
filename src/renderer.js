'use strict';

var createRenderer = (function () {

function Renderer(gl, width, height, resources) {
    function renderTimer(sysTime) {
        if (!renderer.running && !animationsInProgress)
            return;
        if (sysTime0 == undefined) {
            sysTime0 = sysTime;
            renderTime0 = renderer.time;
        }
        renderer.time = (sysTime - sysTime0) / 1000 + renderTime0;
        render(renderer.time);
        requestAnimationFrame(renderTimer);
    }

    function renderAt(time) {
        prepareRender();
        render(time);
        renderer.frameCount++;
    }

    function prepareRender() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        currentProgram.use();
        currentProgram.viewportMatrix = viewport;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function render(time) {
        model.identity();
        cameraPosition = cameraToModel.transform(0, 0, 0);
        currentProgram.cameraMatrix = modelToCamera;
        currentProgram.cameraPosition = cameraPosition;
        lights = gatherLights();
        currentProgram.numberOfLights = lights.types.length;
        currentProgram.lightPositions = lights.positions;
        currentProgram.lightColors = lights.colors;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderNodeList(currentProgram, rootNodes, time);
        renderer.frameCount++;
    }

    function gatherLights() {
        // TODO: occlusion
        var types = [];
        var positions = [];
        var colors = [];
        lightsMatrix.identity();
        function addLights(data) {
            if (data.transform && (data.lights || data.childrenWithLights)) {
                lightsMatrix.push();
                data.transform(lightsMatrix);
            }
            if (data.lights) {
                for (var i = 0; i < data.lights.length; ++ i) {
                    var light = data.lights[i];
                    types.push(light.type);
                    var pos = lightsMatrix.transform(light.position[0](), light.position[1](), light.position[2]());
                    positions.push(pos[0]); positions.push(pos[1]); positions.push(pos[2]);
                    if (light.color) {
                        colors.push(light.color[0]()); colors.push(light.color[1]()); colors.push(light.color[2]());
                    } else {
                        colors.push(1.0); colors.push(1.0); colors.push(1.0);
                    }
                }
            }
            if (data.childrenWithLights) {
                for (var i = 0; i < data.childrenWithLights.length; ++ i)
                    addLights(data.childrenWithLights[i]);
            }
            if (data.transform && (data.lights || data.childrenWithLights))
                lightsMatrix.pop();
        }
        for (var i = 0; i < rootNodes.length; ++ i)
            addLights(getRenderData(rootNodes[i]));
        return {
            types: types,
            positions: positions,
            colors: colors
        };
    }

    function createEvaluator(fArg) {
        if (typeof fArg == 'number')
            return function () { return fArg; };
        if (typeof fArg == 'boolean')
            return function () { return fArg ? 1.0 : 0.0; }
        return Parser.createEvaluator(fArg, function (parameter) {
            if (parameter == '$time')
                return function () { return renderer.time; };
            return function () {
                var param = renderer.parameters[parameter];
                if (typeof param == 'function')
                    return param(renderer.time);
                if (typeof param == 'number')
                    return param;
                if (typeof param == 'boolean')
                    return param ? 1.0 : 0.0;
                return 0.0;
            }
        }, parserBuiltins)
    }

    function compose(f1, f2) {
        return function () {
            f1.apply(this, arguments);
            f2.apply(this, arguments);
        };
    }

    function bind(f, arg1) {
        return function() {
            var args = [arg1];
            for (var i = 0; i < arguments.length; ++ i)
                args.push(arguments[i]);
            f.apply(this, args);
        }
    }

    function createTransformFunction(transform) {
        if (typeof transform == 'string') {
            if (transform.length == 0)
                return function () { };
            if (transform[0] == '#') {
                var nodeId = transform.substring(1);
                return bind(function (nodeId, m) {
                    var node = nodesById[nodeId];
                    if (node) {
                        var x = renderer.getTransform(node);
                        m.push();
                        m.load(x);
                        m.mul();
                    }
                }, nodeId);
            } else {
                var paramName = transform;
                return bind(function (paramName, m) {
                    var value = renderer.parameters[paramName];
                    if (value) {
                        if (typeof value == 'function')
                            value = value(renderer.time);
                        m.push();
                        m.load(value);
                        m.mul();
                    }
                }, paramName);
            }
        }
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
        if (mesh.normalMap) {
            program.normalMapping = true;
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, mesh.normalMap);
            program.uVector = mesh.tangentSpace.u;
            program.vVector = mesh.tangentSpace.v;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.faceBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.faceCount, gl.UNSIGNED_SHORT, 0);
        if (mesh.normalMap) {
            program.normalMapping = false;
            program.uVector = null;
            program.vVector = null; // turn these off
        }
    }

    function getRenderData(node) {
        return node.__renderData || (node.__renderData = createRenderData(node));
    }

    function registerBuiltInShaderData(program) {
        program.registerVertexAttrib('vertexPosition', gl.FLOAT, 3);
        program.registerVertexAttrib('vertexNormal', gl.FLOAT, 3);
        program.registerVertexAttrib('textureCoord', gl.FLOAT, 2);
        program.registerVertexAttrib('uVector', gl.FLOAT, 3);
        program.registerVertexAttrib('vVector', gl.FLOAT, 3);
        program.registerUniformMatrix('modelMatrix');
        program.registerUniformMatrix('cameraMatrix');
        program.registerUniformMatrix('viewportMatrix');
        program.registerUniformFloat3('cameraPosition');
        program.registerUniformInt('numberOfLights');
        program.registerUniformFloat3Array('lightPositions');
        program.registerUniformFloat3Array('lightColors');
    }

    function createCustomShader(shader, files) {
        var oldProgram = currentProgram;
        try {
            var program = new Shader(renderer.gl, files[shader.vertex], files[shader.fragment]);
            program.use();
            registerBuiltInShaderData(program);
            if (shader.uniforms) {
                for (var k in shader.uniforms) {
                    var type, defValue;
                    if (typeof shader.uniforms[k] == 'string')
                        type = shader.uniforms[k], defValue = undefined;
                    else
                        type = shader.uniforms[k].type, defValue = shader.uniforms[k].default;
                    switch (type) {
                        case 'mat4':
                            program.registerUniformMatrix(k);
                            break;
                        case 'int':
                        case 'bool':
                            program.registerUniformInt(k);
                            break;
                        case 'float':
                            program.registerUniformFloat(k);
                            break;
                        case 'complex':
                            program.registerUniformComplex(k);
                            defValue = new Complex(defValue);
                            break;
                        case 'vec3':
                            program.registerUniformFloat3(k);
                            break;
                        case 'vec3[]':
                            program.registerUniformFloat3Array(k);
                            break;
                        default:
                            renderer.onerror({error: 'unsupported uniform type', reason: type});
                            continue;
                    }
                    if (typeof defValue != undefined)
                        program[k] = defValue;
                }
            }
            if (shader.attributes) {
                for (var k in shader.attributes) {
                    var type, size = shader.attributes[k].size | 0;
                    switch (shader.attributes[k].type) {
                        case 'float':  type = gl.FLOAT; break;
                        case 'int':    type = gl.INT; break;
                        case 'double': type = gl.DOUBLE; break;
                        case 'uint':   type = gl.UNSIGNED_INT; break;
                        case 'short':  type = gl.SHORT; break;
                        case 'ushort': type = gl.UNSIGNED_SHORT; break;
                        default:
                            renderer.onerror({
                                error: 'unsupported vertex attribute type',
                                reason: shader.attributes[k].type});
                            continue;
                    }
                    program.registerVertexAttrib(k, size, type);
                }
            }
            return program;
        } catch (x) {
            renderer.onerror(x);
        } finally {
            currentProgram = oldProgram;
            currentProgram.use();
        }
    }

    function createRenderData(node) {
        var result = {};
        if (node.id)
            nodesById[node.id] = node;
        if (node.mesh) {
            result.mesh = {};
            result.mesh.vertexBuffer = unpackBuffer(node.mesh.vertices, 3);
            if (node.mesh.texture) {
                result.mesh.texture = loadingTexture;
                resources.texture(node.mesh.texture).then(function (texture) {
                    result.mesh.texture = texture;
                    repaintRequired();
                });
            }
            var normals = node.mesh.normals;
            if (!normals)
                normals = Geometry.computeNormals(node.mesh);
            result.mesh.normalBuffer = unpackBuffer(normals, 3);
            if (node.mesh.texCoords) {
                result.mesh.texCoords = unpackBuffer(node.mesh.texCoords, 2);
                if (node.mesh.normalMap) {
                    result.mesh.normalMap = null;
                    resources.texture(node.mesh.normalMap).then(function (texture) {
                        result.mesh.normalMap = texture;
                        repaintRequired();
                    });
                    if (!node.mesh.tangentSpace) {
                        var t = Geometry.computeTangentSpace(node.mesh, normals, true);
                        result.mesh.tangentSpace = {
                            u: unpackBuffer(t, 3, gl.FLOAT, gl.ARRAY_BUFFER, 1, 0, 0),
                            v: unpackBuffer(t, 3, gl.FLOAT, gl.ARRAY_BUFFER, 1, 0, 1),
                        };
                    } else {
                        result.mesh.tangentSpace = {
                            u: unpackBuffer(node.mesh.tangentSpace.u, 3),
                            v: unpackBuffer(node.mesh.tangentSpace.v, 3),
                        };
                    }
                }
            }
            if (node.mesh.mode == 'strip') {
                throw {error: 'mesh mode not supported', reason: node.mesh.mode};
            } else if (node.mesh.faces) {
                result.mesh.faceBuffer = unpackBuffer(node.mesh.faces, 3, gl.UNSIGNED_SHORT, gl.ELEMENT_ARRAY_BUFFER);
                result.mesh.faceCount = 3 * node.mesh.faces.length;
                result.mesh.draw = drawTriangleElements;
            } else {
                // TODO: drawArray
            }
        }
        if (node.transform) {
            if (typeof node.transform == 'string') {
                result.transform = createTransformFunction(node.transform);
            } else {
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
        if (node.shader) {
            if (node.shader.vertex && node.shader.fragment) {
                var downloads = {}
                downloads[node.shader.vertex] = renderer.resources.file;
                downloads[node.shader.fragment] = renderer.resources.file;
                renderer.resources.all(downloads).then(function (files) {
                    result.program = createCustomShader(node.shader, files);
                });
                if (node.shader.textureUnits)
                    result.textureUnits = node.shader.textureUnits;
            }
            if (node.shader.parameters) {
                result.uniforms = result.uniforms || {}
                for (var k in node.shader.parameters)
                    result.uniforms[k] = createEvaluator(node.shader.parameters[k]);
            }
        }
        if (node.material) {
            result.uniforms = result.uniforms || {};
            for (var k in node.material)
                result.uniforms[k] = createEvaluator(node.material[k]);
        }
        if (node.flags) {
            result.flags = {};
            result.uniforms = result.uniforms || {};
            for (var k in node.flags) {
                var value = node.flags[k];
                var evaluator = createEvaluator(value);
                result.flags[k] = evaluator;
                result.uniforms[k] = evaluator;
            }
        }
        if (node.lights) {
            result.lights = node.lights.map(function (light) {
                var type = light.type;
                if (type == 'point')
                    type = 1;
                return {
                    type: type,
                    position: [
                        createEvaluator(light.position[0]),
                        createEvaluator(light.position[1]),
                        createEvaluator(light.position[2]),
                    ],
                    color: [
                        createEvaluator(light.color[0]),
                        createEvaluator(light.color[1]),
                        createEvaluator(light.color[2]),
                    ],
                }
            });
            var d = result;
            for (var p = node.parent; p && p.__renderData; p = p.parent) {
                p.__renderData.childrenWithLights = p.__renderData.childrenWithLights || [];
                p.__renderData.childrenWithLights.push(d);
                d = p.__renderData;
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
        if (node.id && nodesById[node.id] === node)
            delete nodesById[node.id];
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

    function makeEdgeList(mesh) {
        // currently this assumes triangles
        var edges = new Uint16Array(mesh.faces.length * 3 * 2);
        for (var i = 0; i < mesh.faces.length; ++ i) {
            edges[6*i+0] = mesh.faces[i][0];
            edges[6*i+1] = mesh.faces[i][1];
            edges[6*i+2] = mesh.faces[i][1];
            edges[6*i+3] = mesh.faces[i][2];
            edges[6*i+4] = mesh.faces[i][2];
            edges[6*i+5] = mesh.faces[i][0];
        }
        var glBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edges, gl.STATIC_DRAW);
        return glBuf;
    }

    function renderEdges(program, node, data) {
        var wasWireframe = program.wireframe;
        if (!data.mesh.edgeList)
            data.mesh.edgeList = makeEdgeList(node.mesh);
        program.renderEdges = true;
        program.vertexPosition = data.mesh.vertexBuffer;
        program.vertexNormal = data.mesh.normalBuffer;
        program.textureCoord = data.mesh.texCoords;
        program.wireframe = false;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.mesh.edgeList);
        gl.drawElements(gl.LINES, data.mesh.faceCount*2, gl.UNSIGNED_SHORT, 0);
        program.renderEdges = false;
        program.wireframe = wasWireframe;
    }

    function renderNodeList(program, nodes, time) {
        for (var i = 0; i < nodes.length; ++ i) {
            if (!nodes[i].flags || !nodes[i].flags.wireframe)  // TODO: this should use the evaluated version
                renderNode(program, nodes[i], time);
        }
        for (var i = 0; i < nodes.length; ++ i) {
            if (nodes[i].flags && nodes[i].flags.wireframe)
                renderNode(program, nodes[i], time);
        }
    }

    function renderNode(program, node, time) {
        var data = getRenderData(node);
        var oldUniforms = null;
        var oldProgram = null;
        var shouldRenderEdges = data.flags && data.flags.renderEdges && data.flags.renderEdges();
        if (data.program) {
            oldProgram = program;
            program = data.program;
            program.use();
            // set standard uniforms
            program.cameraMatrix = oldProgram.cameraMatrix;
            program.viewportMatrix = oldProgram.viewportMatrix;
            // program.modelMatrix = model;  // this will be set later
            program.numberOfLights = lights.types.length;
            program.lightPositions = lights.positions;
            program.lightColors = lights.colors;
        }
        if (data.uniforms) {
            oldUniforms = {};
            for (var k in data.uniforms) {
                var evaluator = data.uniforms[k];
                oldUniforms[k] = program[k];
                program[k] = evaluator();
            }
        }
        // TODO: vertex attrib bindings
        if (data.transform) {
            model.push();
            data.transform(model);
        }
        if (data.mesh) {
            program.modelMatrix = model;
            if (program.wireframe) {
                if (shouldRenderEdges)
                    renderEdges(program, node, data);
                beginWireframe();
            }
            data.mesh.draw(data.mesh, program);
            if (program.wireframe)
                endWireframe();
            if (!program.wireframe && shouldRenderEdges)
                renderEdges(program, node, data);
        }
        if (node.children)
            renderNodeList(program, node.children, time);
        if (data.transform)
            model.pop();
        if (oldUniforms) {
            for (var k in oldUniforms)
                program[k] = oldUniforms[k];
        }
        if (oldProgram) {
            oldProgram.use();
        }
    }

    function unpackBuffer(buffer, size, type, target, stride, offset, interior) {
        type = type || gl.FLOAT;
        target = target || gl.ARRAY_BUFFER;
        stride = stride || 1;
        offset = offset|0;
        var array;
        var numElements = (buffer.length - offset)/stride | 0;
        if (type == gl.FLOAT)
            array = new Float32Array(numElements * size);
        else if (type == gl.UNSIGNED_SHORT)
            array = new Uint16Array(numElements * size);
        else
            throw {error:'unknown buffer type', reason:type};
        var k = 0;
        if (typeof interior == 'undefined') {
            for (var i = offset; i < buffer.length; i += stride)
                for (var j = 0; j < size; ++ j)
                    array[k++] = buffer[i][j];
        } else {
            for (var i = offset; i < buffer.length; i += stride)
                for (var j = 0; j < size; ++ j)
                    array[k++] = buffer[i][interior][j];
        }
        var glBuf = gl.createBuffer();
        gl.bindBuffer(target, glBuf);
        gl.bufferData(target, array, gl.STATIC_DRAW);
        return glBuf;
    }

    function createFramebuffer(floatTexture) {
        floatTexture = floatTexture && extensions.floatTexture;
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        fb.width = width;
        fb.height = height;
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (floatTexture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
        else
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

    function beginRendering() {
        ready.then(function() {
            prepareRender();
            sysTime0 = undefined;
            requestAnimationFrame(renderTimer);
        }, orThrowError);
    }

    function startAnimation() {
        ++animationsInProgress;
        if (animationsInProgress == 1 && !renderer.running)
            beginRendering();
    }

    function endAnimation() {
        --animationsInProgress;
    }

    var parserBuiltins = {
        smooth: {
            minArgs: 3,
            factory: function (smoothingFunction, duration, input) {
                var interpolatorGenerator;
                smoothingFunction = smoothingFunction && smoothingFunction() || 'ease';
                if (typeof smoothingFunction == 'string') {
                    var bez = Bezier[smoothingFunction];
                    interpolatorGenerator = function (dur) {
                        return function (t) {
                            return bez(t, dur);
                        }
                    }
                } else {
                    interpolatorGenerator = function (dur) {
                        return function (t) {
                            return Bezier.cubicBezier(arguments[0](), arguments[1](), arguments[2](), arguments[3], t, dur);
                        }
                    }
                    duration = arguments[4];
                    input = arguments[5];
                }
                var lastDuration = undefined;
                var interpolator = undefined;
                var lastValue = undefined;
                var baseValue = undefined;
                var targetValue = undefined;
                var baseTime = undefined;
                var endTime = undefined;
                var source = input;
                var durationFactor = 1.0;
                return function () {
                    var x = source();
                    if (lastValue == undefined)
                        lastValue = x;
                    if (lastValue != x) {
                        var d = +duration();
                        if (d != lastDuration) {
                            lastDuration = d;
                            interpolator = interpolatorGenerator(d);
                        }
                        var t;
                        if (endTime != undefined)
                            t = (endTime - renderer.Time) / (endTime - baseTime);
                        if (endTime != undefined && t > 0.01 && t < 0.99) {
                            // we're currently animating, need to smoothly switch targets
                            var t_r = renderer.time;
                            var newEndTime = t_r + d;
                            var dt = newEndTime - endTime;
                            var newBaseTime = t_r * (t_r + dt - endTime) / (t_r - endTime);
                            var i_oldB = interpolator(t_r - baseTime);
                            var i_newB = interpolator(t_r - newBaseTime);
                            var newBaseValue = (i_oldB * (targetValue - baseValue) + baseValue - i_newB * x) / (1 - i_newB);
                            durationFactor = d / (newEndTime - newBaseTime);
                            targetValue = x;
                            baseTime = newBaseTime;
                            endTime = newEndTime;
                            baseValue = newBaseValue;
                        } else {
                            if (endTime == undefined)
                                startAnimation();
                            durationFactor = 1.0;
                            baseValue = lastValue;
                            baseTime = renderer.time;
                            endTime = baseTime + d;
                            targetValue = x;
                        }
                        lastValue = x;
                    }
                    if (endTime == undefined)
                        return x;
                    if (endTime <= renderer.time) {
                        baseTime = endTime = targetValue = undefined;
                        endAnimation();
                        return x;
                    }
                    if (baseTime > renderer.time) {
                        console.log('nothing to see here');
                    }
                    return baseValue + (targetValue - baseValue) * interpolator((renderer.time - baseTime) * durationFactor);
                }
            }
        }
    };

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
    var sysTime0, renderTime0;
    var rootNodes = [];
    var nodesById = {};
    var textures = {};
    var renderFlags = {};
    var pendingResources = [];
    var lights = [];
    var lightsMatrix = new MatrixStack();
    var preprocessed;
    var standardProgram;
    var wireframePostprocProgram;
    var currentProgram;
    var loadingTexture;
    var animationsInProgress = 0;
    var model = new MatrixStack();
    var modelToCamera = new MatrixStack();
    var viewport = new MatrixStack();
    var cameraToModel = new MatrixStack();
    var cameraPosition;

    // Initialization
    var extensions = {
        fragDepth: gl.getExtension('EXT_frag_depth'),
        floatTexture: gl.getExtension('OES_texture_float'),
        floatLinear: gl.getExtension('OES_float_linear'),
        colorBufferFloat: gl.getExtension('WEBGL_color_buffer_float'),
    }
    var ready = resources.all({
        'std-vertex.es2': resources.file,
        'std-fragment.es2': resources.file,
        'wfm-vertex.es2': resources.file,
        'wfm-fragment.es2': resources.file,
        'loadingtexture.jpg': resources.image,
    }).then(function (data) {
        standardProgram = new Shader(gl, data['std-vertex.es2'], data['std-fragment.es2']);
        registerBuiltInShaderData(standardProgram);
        standardProgram.registerFlag('wireframe');
        standardProgram.registerFlag('renderEdges');
        standardProgram.setSampler('uTexture', 0);
        standardProgram.setSampler('uNormalMap', 1);
        standardProgram.registerUniformInt('normalMapping');
        standardProgram.registerUniformComplex('refractiveIndex');
        standardProgram.registerUniformFloat('gloss');

        wireframePostprocProgram = new Shader(gl, data['wfm-vertex.es2'], data['wfm-fragment.es2']);
        wireframePostprocProgram.registerVertexAttrib('vertexPosition', gl.FLOAT, 2);
        wireframePostprocProgram.registerVertexAttrib('textureCoord', gl.FLOAT, 2);
        wireframePostprocProgram.setSampler('uWireframe', 0);
        wireframePostprocProgram.registerUniformMatrix('perspective');
        wireframePostprocProgram.setUniform2f('uViewportSize', width, height);
        wireframePostprocProgram.vertices = unpackBuffer([[-1,-1],[1,-1],[1,1],[1,1],[-1,1],[-1,-1]], 2);
        wireframePostprocProgram.texCoords = unpackBuffer([[0,0],[1,0],[1,1],[1,1],[0,1],[0,0]], 2);

        currentProgram = standardProgram;

        loadingTexture = data['loadingtexture.jpg'];

        return true;
    });

    preprocessed = createFramebuffer(true);
    viewport.perspective(30, +width/+height, 1, 50);
    cameraToModel.translate(0, 0, 10);
    modelToCamera.translate(0, 0, -10);

    // Public interface
    this.time = 0; // in seconds
    this.running = false;
    this.parameters = {};
    this.frameCount = 0;
    this.start = function () {
        if (renderer.running)
            return;
        renderer.running = true;
        if (!animationsInProgress)
            beginRendering();
    }
    this.stop = function () {
        renderer.running = false;
    }
    this.renderAt = function (time) {
        ready.then(function () {
            renderAt(time);
        }, orThrowError);
    }
    this.addNode = function (node, parent) {
        if (typeof parent != 'undefined')
            (parent.children = parent.children || []).push(node);
        else
            rootNodes.push(node);
        node.parent = parent;
        createRenderData(node);
    }
    this.removeNode = function (node) {
        var container = rootNodes;
        if (node.parent)
            container = node.parent;
        var idx = container.indexOf(node);
        if (idx >= 0) {
            container.splice(idx, 1);
            releaseRenderData(node);
        }
    }
    this.bindParameter = function (name, fn) {
        // actually no magic here, just psychology
        this.parameters[name] = fn;
    }
    this.setTexture = function (node, texture) {
        this.resources.texture(texture).then (function (tex) {
            if (node.__renderData)
                node.__renderData.mesh.texture = tex;
        });
    }
    this.getLocalTransform = function (node) {
        var m = new MatrixStack();
        var d = getRenderData(node);
        if (d.transform)
            d.transform(m);
        return m;
    }
    this.getTransform = function (node) {
        var m;
        if (node.parent)
            m = this.getTransform(node.parent);
        else
            m = new MatrixStack();
        var d = getRenderData(node);
        if (d.transform)
            d.transform(m);
        return m;
    }
    // events
    this.onerror = function (err) { }
}

function createRenderer(canvas, resourcePath) {
    return new Promise(function (resolve, reject) {
        try {
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
                    canvas.__renderjs = renderer;
                    resolve(renderer);
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

return createRenderer;
})();