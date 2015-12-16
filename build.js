(function (window) {

function StringWriter() {
    var writer;
    writer = function (newText) {
        writer.text += newText;
    }
    writer.text = '';
    return writer;
}

function makeOperators() {
    var list = [
        [')',                                          { precedence: 19 }],
        ['.', '[]',                                    { precedence: 18, assoc: 'ltr' }],
        ['new()',                                      { precedence: 18, assoc: 'rtl' }],
        ['fcall',                                      { precedence: 17, assoc: 'ltr' }],
        ['new',                                        { precedence: 17, assoc: 'rtl' }],
        ['()++', '()--',                               { precedence: 16 }],
        ['!()', '~()', '+()', '-()', '++()', '--()',
         'typeof()', 'void()', 'delete()',             { precedence: 15, assoc: 'rtl' }],
        ['**',                                         { precedence: 14, assoc: 'rtl' }],
        ['*', '/', '%',                                { precedence: 14, assoc: 'ltr' }],
        ['+', '-',                                     { precedence: 13, assoc: 'ltr' }],
        ['<<', '>>', '>>>',                            { precedence: 12, assoc: 'ltr' }],
        ['<', '<=', '>', '>=', 'in', 'instanceof',     { precedence: 11, assoc: 'ltr' }],
        ['==', '!=', '===', '!==',                     { precedence: 10, assoc: 'ltr' }],
        ['&',                                          { precedence:  9, assoc: 'ltr' }],
        ['^',                                          { precedence:  8, assoc: 'ltr' }],
        ['|',                                          { precedence:  7, assoc: 'ltr' }],
        ['&&',                                         { precedence:  6, assoc: 'ltr' }],
        ['||',                                         { precedence:  5, assoc: 'ltr' }],
        ['?:',                                         { precedence:  4, assoc: 'rtl' }],
        ['=', '+=', '-=', '**=', '*=', '/=', '%=',
         '<<=', '>>=', '>>>=', '&=', '^=', '|=',       { precedence:  3, assoc: 'rtl' }],
        ['(',                                          { precedence:  3 }],
        ['yield',                                      { precedence:  2, assoc: 'rtl' }],
        ['...' ,                                       { precedence:  1 }],
        [',',                                          { precedence:  0, assoc: 'ltr' }],
    ];
    var dict = {};
    for (var i = 0; i < list.length; ++ i) {
        var info = list[i][list[i].length - 1];
        for (var j = 0; j < list[i].length - 1; ++ j) {
            if (dict[list[i][j]])
                console.warn('WARNING: duplicate operator ' + list[i][j] + '!');
            dict[list[i][j]] = info;
        }
    }
    return dict;
}

var operators = makeOperators();

function LexicalScope() {
    var scope = { vars: {} };
    this.push = function () {
        var newScope = { parent: scope, vars: {} };
        scope = newScope;
    }
    this.pop = function () {
        //for (var k in scope.vars)
        //    anonNameCount--;
        scope = scope.parent;
    }
    this.lookup = function (varName) {
        for (var s = scope; s; s = s.parent) {
            if (varName in s.vars)
                return s.vars[varName];
        }
        return varName; // not found, so must be a global
    }
    this.register = function (varName) {
        var suffix = anonNameCount/26|0;
        var name = 'abcdefghijklmnopqrstuvwxyz'[anonNameCount%26];
        if (suffix)
            name = name + suffix;
        scope.vars[varName] = name;
        anonNameCount++;
        return name;
    }
    var anonNameCount = 0;
}

function minify(source, output, options) {
    var defaultOptions = {
        renameVariables: true,
        lexicalScope: new LexicalScope(),
    };
    if (output && !output.call && options == undefined) {
        options = output;
        output = undefined;
    }
    options = options || {};
    for (var k in defaultOptions)
        if (!(k in options))
            options[k] = defaultOptions[k];
    output = output || new StringWriter();
    var lex = options.lexicalScope;
    function Visitors() {
        var contextStack = [];
        function context(n) {
            n = n || 1;
            return contextStack[contextStack.length - 1 - n];
        }
        var currentBlock = {name:'root', operStack: []};
        function setState(name, value) {
            currentBlock.popStates = currentBlock.popStates || {};
            currentBlock.popStates[name] = state(name);
            state(name, value);
        }
        function pushBlock(name) {
            var newBlock = {name: name, parent: currentBlock, operStack: []};
            currentBlock = newBlock;
            lex.push();
        }
        function popBlock() {
            if (currentBlock.popStates) {
                for (var k in currentBlock.popStates)
                    state(k, currentBlock.popStates[k]);
            }
            lex.pop();
            currentBlock = currentBlock.parent;
        }
        function pushOperator(op) {
            currentBlock.operStack.push(op);
        }
        function popOperator() {
            currentBlock.operStack.pop();
        }
        function requireBrackets() {
            if (currentBlock.operStack.length == 1)
                return false;
            var outerOp = operators[currentBlock.operStack[currentBlock.operStack.length - 2]];
            var innerOp = operators[currentBlock.operStack[currentBlock.operStack.length - 1]];
            if (!outerOp)
                console.error('unrecognized operator ' + currentBlock.operStack[currentBlock.operStack.length - 2]);
            if (!innerOp)
                console.error('unrecognized operator ' + currentBlock.operStack[currentBlock.operStack.length - 1]);
            var higherPrec = outerOp.precedence > innerOp.precedence
                         || (outerOp.precedence == innerOp.precedence && innerOp.assoc == 'ltr');
            return higherPrec;
        }
        var outputStack = [];
        function pushOutput() {
            outputStack.push(output);
            output = new StringWriter();
        }
        function popOutput() {
            var text = output.text;
            outputStack.pop();
            return text;
        }
        var state = function (name, value) {
            if (value != undefined)
                state[name] = value;
            return state[name];
        }
        function lookup(name) {
            if (options.renameVariables)
                return lex.lookup(name);
            return name;
        }
        function anonymize(name) {
            if (options.renameVariables)
                return lex.register(name);
            return name;
        }
        function scanLexicals(statements) {
            if (!options.renameVariables)
                return;
            // Find all declarations in a set of statements and register them in the lexical scope.  We need to do
            // this because e.g.
            //   function (f) { x = x + 1; }
            //   var x;
            // is valid Javascript code, x inside the function is identical with x outside the function, and so if we
            // rename x it has to be done before the evaluation of the function body tries to look it up.
            for (var i = 0; i < statements.length; ++ i) {
                var s = statements[i];
                if (s.type == 'VariableDeclaration') {
                    for (var j = 0; j < s.declarations.length; ++ j)
                        anonymize(s.declarations[j].id.name);
                } else if (s.type == 'FunctionExpression' || s.type == 'FunctionDeclaration') {
                    if (s.id)
                        anonymize(s.id.name);
                    for (var j = 0; j < s.params.length; ++ j)
                        anonymize(s.params[j].name);
                } else if (s.type == 'ForStatement' || s.type == 'ForInStatement') { // gotcha
                    var decl = s.init || s.left;
                    if (decl && decl.type == 'VariableDeclaration') {
                        for (var j = 0; j < decl.declarations.length; ++ j)
                            anonymize(decl.declarations[j].id.name);
                    }
                }
            }
        }
        var symbolicOperator = false;
        var leftHandSide = false;
        this.traverseBody = function (node) {
            if (node.body) {
                for (var i = 0; i < node.body.length; ++ i) {
                    this.visit(node.body[i]);
                }
            }
        }
        this.Program = this.traverseBody;
        this.Identifier = function (node, state) {
            if (state && state.isMember) {
                output(node.name);
                return;
            }
            var actualName;
            /*if (state && state.isDeclarative)
                actualName = anonymize(node.name);
            else*/
                actualName = lookup(node.name);
            output(actualName);
        }
        this.Literal = function (node) {
            output(node.raw);
        }
        this.ExpressionStatement = function (node) {
            if (node.expression.type == 'Literal') {
                if (node.expression.value == 'use strict')
                    return; // we do this at the beginning of the compiled script anyway
                else if (node.expression.value == 'use asm')
                    state('asmJsMode', true);
            }
            this.visit(node.expression);
            output(';');
        }
        this.VariableDeclaration = function (node) {
            output('var ');
            var first = true;
            for (var i = 0; i < node.declarations.length; ++ i) {
                var decl = node.declarations[i];
                if (first)
                    first = false;
                else
                    output(',');
                this.visit(decl.id, {isDeclarative: true});
                if (decl.init) {
                    output('=');
                    pushOperator('=');
                    pushOperator('(');
                    this.visit(decl.init);
                    pushOperator('(');
                    popOperator();
                }
            }
            if (context() == 'BlockStatement' || context() == 'Program')
                output(';');
            if (context() == 'Program' && options.moduleName
            && node.declarations.length == 1 && node.declarations[0].init) {
                output(options.moduleName + '.');
                this.visit(decl.id);
                output('=');
                this.visit(decl.id);
                output(';');
            }
        }
        this.AssignmentExpression = function (node) {
            pushOperator(node.operator);
            if (requireBrackets())
                output('(');
            this.visit(node.left);
            output(node.operator);
            this.visit(node.right);
            if (requireBrackets())
                output(')');
            popOperator();
        }
        this.MemberExpression = function (node) {
            pushOperator('.');
            this.visit(node.object);
            popOperator();
            if (node.computed) {
                output('[');
                pushOperator('(');
                this.visit(node.property);
                popOperator();
                output(']');
            } else {
                output('.');
                this.visit(node.property, {isMember: true});
            }
        }
        this.ArrayExpression = function (node) {
            output('[');
            for (var i = 0; i < node.elements.length; ++i) {
                if (i > 0)
                    output(',');
                pushOperator(',');
                this.visit(node.elements[i]);
                popOperator();
            }
            output(']');
        }
        this.ObjectExpression = function (node) {
            output('{');
            for (var i = 0; i < node.properties.length; ++ i) {
                var p = node.properties[i];
                // TODO - lots of work here
                if (i > 0)
                    output(',');
                this.visit(p.key, {isMember: true});
                output(':');
                pushOperator('(');
                this.visit(p.value);
                popOperator();
            }
            output('}');
        }
        this.UpdateExpression = function (node) {
            if (node.prefix)
                pushOperator(node.operator + '()');
            else
                pushOperator('()' + node.operator);
            var brackets = requireBrackets();
            if (brackets)
                output('(');
            if (node.prefix) {
                if (!brackets && symbolicOperator && !leftHandSide && context() == 'BinaryExpression')
                    output(' ');
                output(node.operator);
            }
            this.visit(node.argument);
            if (!node.prefix) {
                output(node.operator);
                if (!brackets && symbolicOperator && leftHandSide && context() == 'BinaryExpression')
                    output(' ');
            }
            if (brackets)
                output(')');
            popOperator();
        }
        this.UnaryExpression = function (node) {
            if (node.prefix)
                pushOperator(node.operator + '()');
            else
                pushOperator('()' + node.operator);
            var brackets = requireBrackets();
            if (brackets)
                output('(');
            else if (node.operator == '+')
                output(' ');
            var isText = node.operator == 'delete' || node.operator == 'typeof';
            if (node.prefix) {
                if (!isText && !brackets && symbolicOperator && !leftHandSide && context() == 'BinaryExpression')
                    output(' ');
                    // TODO: check if it's an assignment
                output(node.operator);
                if (isText)
                    output(' ');
            }
            this.visit(node.argument);
            if (!node.prefix) {
                output(node.operator);
                if (isText || !brackets && symbolicOperator && leftHandSide && context() == 'BinaryExpression')
                    output(' ');
            }
            if (brackets)
                output(')');
            popOperator();
        }
        this.BinaryExpression = this.LogicalExpression = function (node) {
            pushOperator(node.operator);
            symbolicOperator = !(node.operator == 'instanceof' || node.operator == 'in');
            if (requireBrackets())
                output('(');
            leftHandSide = true;
            this.visit(node.left);
            if (!symbolicOperator)
                output(' ');
            output(node.operator);
            if (!symbolicOperator)
                output(' ');
            leftHandSide = false;
            this.visit(node.right);
            if (requireBrackets())
                output(')');
            popOperator();
        }
        this.SequenceExpression = function (node) {
            pushOperator(',');
            var brackets = requireBrackets();
            if (brackets) {
                output('(');
            }
            for (var i = 0; i < node.expressions.length; ++ i) {
                if (i > 0)
                    output(',');
                this.visit(node.expressions[i]);
            }
            if (brackets) {
                output(')');
            }
            popOperator();
        }
        this.ReturnStatement = function (node) {
            output('return');
            if (node.argument) {
                output(' ');
                this.visit(node.argument);
            }
            output(';');
        }
        this.ContinueStatement = function (node) {
            output('continue;');
        }
        this.NewExpression = function (node) {
            output('new ');
            pushOperator('new()'); // esprima doesn't let us distinguish "new F" from "new F()", so assume higher prec
            this.visit(node.callee);
            popOperator();
            output('(');
            for (var i = 0; i < node.arguments.length; ++ i) {
                if (i > 0)
                    output(',');
                pushOperator(',');
                this.visit(node.arguments[i]);
                popOperator();
            }
            output(')');
        }
        this.ThrowStatement = function (node) {
            output('throw ');
            this.visit(node.argument);
            output(';');
        }
        this.CatchClause = function (node) {
            output('catch(');
            this.visit(node.param);
            output(')');
            this.visit(node.body);
        }
        this.TryStatement = function (node) {
            output('try');
            this.visit(node.block);
            if (node.handler)
                this.visit(node.handler);
            if (node.finalizer) {
                output('finally');
                this.visit(node.handler);
            }
        }
        this.ThisExpression = function (node) {
            output('this');
        }
        this.BlockStatement = function (node) {
            output('{');
            pushBlock();
            scanLexicals(node.body);
            this.traverseBody(node);
            popBlock();
            output('}');
        }
        this.ForStatement = function (node) {
            output('for(');
            if (node.init)
                this.visit(node.init);
            output(';');
            if (node.test)
                this.visit(node.test);
            output(';');
            if (node.update)
                this.visit(node.update);
            output(')');
            if (node.body)
                this.visit(node.body);
            else
                output(';');
        }
        this.ForInStatement = function (node) {
            output('for(');
            this.visit(node.left);
            output(' in ');
            this.visit(node.right);
            output(')');
            this.visit(node.body);
        }
        this.WhileStatement = function (node) {
            output('while(');
            this.visit(node.test);
            output(')');
            this.visit(node.body);
        }
        this.SwitchStatement = function (node) {
            output('switch(');
            this.visit(node.discriminant);
            output('){');
            pushBlock();
            for (var i = 0; i < node.cases.length; ++ i)
                scanLexicals(node.cases[i].consequent);
            for (var i = 0; i < node.cases.length; ++ i) {
                if (node.cases[i].test) {
                    output('case ');
                    this.visit(node.cases[i].test);
                } else {
                    output('default');
                }
                output(':');
                for (var j = 0; j < node.cases[i].consequent.length; ++ j)
                    this.visit(node.cases[i].consequent[j]);
            }
            popBlock();
            output('}');
        }
        this.BreakStatement = function (node) {
            output('break;');
        }
        this.ConditionalExpression = function (node) {
            pushOperator('?:');
            if (requireBrackets())
                output('(');
            this.visit(node.test);
            output('?');
            this.visit(node.consequent);
            output(':');
            this.visit(node.alternate);
            if (requireBrackets())
                output(')');
            popOperator();
        }
        this.IfStatement = function (node) {
            output('if(');
            this.visit(node.test);
            output(')');
            if (node.consequent.type == 'EmptyStatement')
                output(';');
            else
                this.visit(node.consequent);
            if (node.alternate) {
                output(' else ');
                this.visit(node.alternate);
            }
        }
        this.CallExpression = function (node) {
            if (options.stripModules && node.callee.type == 'FunctionExpression' && context(2) == 'Program' && context() != 'VariableDeclaration') {
                // this may be a module: check if the invocation arguments are the same as the function parameters
                var argumentsMatchParameters = true;
                for (var i = 0; i < node.arguments.length; ++i) {
                    var name;
                    if (node.arguments[i].type == 'Identifier') {
                        name = node.arguments[i].name;
                    } else {
                        // TODO: handle non-standard forms like this['window']
                        argumentsMatchParameters = false;
                        break;
                    }
                    if (node.callee.params[i].name != name) {
                        argumentsMatchParameters = false;
                        break;
                    }
                }
                if (argumentsMatchParameters) {
                    scanLexicals(node.callee.body.body);
                    contextStack.push(node.callee.body.type);
                    this.traverseBody(node.callee.body);
                    contextStack.pop();
                    return;
                }
            }
            pushOperator('fcall');
            this.visit(node.callee);
            popOperator();
            output('(');
            for (var i = 0; i < node.arguments.length; ++ i) {
                if (i > 0)
                    output(',');
                pushOperator(',');
                this.visit(node.arguments[i]);
                popOperator();
            }
            output(')');
        }
        this.FunctionExpression = this.FunctionDeclaration = function (node) {
            pushOperator('(');
            if (requireBrackets())
                output('(');
            output('function');
            if (node.generator)
                output('*');
            if (node.expression)
                throw "Don't understand what functionExpression.expression means";
            if (node.id) {
                output(' ');
                this.visit(node.id, {isDeclarative: true});
            }
            pushBlock('function' + (node.id ? ' ' + node.id.name : ''));
            output('(');
            for (var i = 0; i < node.params.length; ++ i) {
                if (i > 0)
                    output(',');
                pushOperator(',');
                this.visit(node.params[i], {isDeclarative: true});
                if (node.defaults && node.defaults[i]) {
                    output('=');
                    pushOperator('=');
                    this.visit(node.defaults[i]);
                    popOperator();
                }
                popOperator();
            }
            output(')');
            this.visit(node.body);
            popBlock();
            if (requireBrackets())
                output(')');
            popOperator();
        }
        this.visit = function (node) {
            contextStack.push(node.type);
            var handler = this[node.type];
            if (handler) {
                handler.apply(this, arguments);
            } else {
                console.error('UNHANDLED: ' + node.type);
                this.traverseBody(node);
            }
            contextStack.pop();
        }
    }
    var v = new Visitors();
    var syntax = esprima.parse(source);
    v.visit(syntax);
    return output.text;
}

window.LexicalScope = LexicalScope;
window.StringWriter = StringWriter;
window.minify = minify;

})(this['window'] || this);

if (typeof window == 'undefined') {
    function compile(sources, basePath) {
        function source(file) {
            console.info('opening ' + (basePath + file));
            return new Promise(function (resolve, reject) {
                fs.readFile(basePath + file, 'utf8', function (err, data) {
                    if (err)
                        reject(err);
                    else
                        resolve(data);
                });
            });
        }

        function injectResources(source) {
            return Promise.resolve(source.replace(/\/\/!([A-Z]+)\s+(.*)$/gm, function (_, command, arguments) {
                if (command == 'EMBED') {
                    var fileListIndex = arguments.indexOf(':');
                    var resourcePack = arguments.substring(0, fileListIndex);
                    var files = arguments.substring(fileListIndex + 1).split(',');
                    var embed = new builder.StringWriter();
                    for (var i = 0; i < files.length; ++ i) {
                        var fname = files[i].trim();
                        var data = fs.readFileSync(basePath + fname);
                        var ext = fname.substring(fname.lastIndexOf('.')+1);
                        if (ext == 'jpg' || ext == 'jpeg' || ext == 'png' || ext == 'gif') {
                            var contentType;
                            if (ext == 'png')
                                contentType = 'image/png';
                            else if (ext == 'gif')
                                contentType = 'image/gif';
                            else
                                contentType = 'image/jpeg';
                            embed(resourcePack + '.image.set("' + fname +
                                '",(function(){var i=new Image();i.src="data:' + contentType + ';base64,' +
                                new Buffer(data).toString('base64') + '";return i;})());');
                        } else {
                            embed(resourcePack + '.file.set("' + fname + '",atob("' +
                                new Buffer(data).toString('base64') + '"));');
                        }
                    }
                    return embed.text;
                }
                return '';
            }));
        }
        
        function emit(source) {
            try {
                console.info('minifying...');
                builder.minify(source, output, options);
                return Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            }
        }
        
        function next() {
            if (sourceIndex >= sources.length) {
                output('})(typeof window !== "undefined" ? window : this);');
                return Promise.resolve(output);
            }
            var nextSource = sources[sourceIndex];
            ++ sourceIndex;
            return source(nextSource).then(injectResources).then(emit).then(next);
        }

        basePath = basePath || './';
        console.info('sources: ' + sources);
        var sourceIndex = 0;
        var output = new builder.StringWriter();
        var options = {
            stripModules: true,
            moduleName: name,
            renameVariables: true
        };
        if (options.stripModules)
            options.lexicalScope = new builder.LexicalScope();
        output('(function(exports){exports.' + name + '={};');
        return next();
    }

    var builder = this;
    var esprima = require('./lib/esprima.js');
    var fs = require('fs');

    var name = 'renderjs';
    var version = '0.1';
    var targetDir = './dist/';
    var path = './src/';
    var sources = [
        'matrix.js',
        'bezier.js',
        'geometry.js',
        'resources.js',
        'parser.js',
        'shader.js',
        'renderer.js',
        'primitives.js',
    ];

    compile(sources, path).then(function (output) {
        var source = output.text;
        var outputFile = targetDir + name + '-' + version + '.js';
        fs.writeFile(outputFile, source);
        console.info('wrote output ' + outputFile);
    }).catch(function (error) {
        console.error(error);
    });
}