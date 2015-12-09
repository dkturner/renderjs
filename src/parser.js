'use strict';

(function (window) {

var tokens = {
    ident: '[a-zA-Z_$][a-zA-Z_$0-9]*',
    num: '-?[0-9]+(?:\.[0-9]*)?',
    oper: '[+*^/%.,-]',
    bracket: '[)(]'
}
var tokenOrder = [tokens.ident, tokens.num, tokens.oper, tokens.bracket];
var tokenRe = '(' + tokenOrder.join(')|(') + ')';
var END = new Object();

// negatable -> -? expression
// expression -> term (+ term | - term)*
// term -> factor (* factor | / factor)*
// factor -> atom (^ atom)*
// atom -> IDENT | NUM | fcall | '(' negatable ')'
// fcall -> IDENT '(' ( expression ( ',' negatable )*)? ')'

function Parser() {
    function negatable() {
        if (currentSymbol.value == '-') {
            shiftSymbol();
            var subtree = expression();
            return {op: 'negate', subtree: subtree};
        } else {
            return expression();
        }
    }

    function atom() {
        if (currentSymbol.type == tokens.ident) {
            if (lookaheadSymbol.value != '(')
                return accept({op: 'lookup', name: currentSymbol.value});
            return fcall();
        } else if (currentSymbol.type == tokens.num) {
            return accept({op: 'const', value: +currentSymbol.value});
        } else if (currentSymbol.value == '(') {
            shiftSymbol();
            var result = negatable();
            shiftSymbol(); // should check that this is ')'
            return result;
        }
    }

    function fcall() {
        var fname = currentSymbol.value;
        var args = [];
        shiftSymbol(); // gives us the opening bracket
        shiftSymbol(); // first argument, or closing bracket
        while (true) {
            args.push(negatable());
            if (currentSymbol.value == ',')
                shiftSymbol();
            else // should check that this is ')'
                break;

        }
        shiftSymbol();
        return {op: 'call', name: fname, args: args};
    }

    function lrecursive(validSymbols, subType) {
        return function () {
            var tree = subType();
            while (validSymbols.indexOf(currentSymbol.value) >= 0) {
                var op = currentSymbol.value;
                shiftSymbol();
                var rhs = subType();
                tree = {op: op, left: tree, right: rhs};
            }
            return tree;
        }
    }

    function accept(result) {
        shiftSymbol();
        return result;
    }

    function shiftSymbol() {
        currentSymbol = symbolQueue.shift();
        lookaheadSymbol = symbolQueue[0];
        return currentSymbol;
    }

    function optimize(tree) {
        if (tree.left) {
            tree.left = optimize(tree.left);
            tree.right = optimize(tree.right);
            // todo: change associativity to catch (nonconst*const)*const, requires precedence rules
            if (tree.left.op == 'const' && tree.right.op == 'const') {
                switch (tree.op) {
                    case '+': return {op:'const', value: left.value + right.value};
                    case '-': return {op:'const', value: left.value - right.value};
                    case '*': return {op:'const', value: left.value * right.value};
                    case '/': return {op:'const', value: left.value / right.value};
                    case '%': return {op:'const', value: left.value % right.value};
                    case '^': return {op:'const', value: Math.pow(left.value, right.value)};
                    default: throw {error:'unknown operation ' + tree.op};
                }
            }
        } else if (tree.subtree) {
            tree.subtree = optimize(tree.subtree);
            if (tree.subtree.op == 'const')
                return {op: 'const', value: -tree.subtree.value};
        } else if (tree.args) {
            if (tree.name == 'pi')
                return {op: 'const', value: Math.PI};
            if (tree.name == 'e')
                return {op: 'const', value: Math.E};
            for (var i = 0; i < tree.args.length; ++ i)
                tree.args[i] = optimize(tree.args[i]);
        }
        return tree;
    }

    function emit(tree) {
        if (tree.op == 'const')
            return function () { return tree.value; };
        if (tree.op == 'call') {
            var fn = parser.builtins[tree.name];
            if (!fn)
                throw {error: 'unknown function ' + tree.name};
            return function () { fn.apply(this, tree.args.map(function(a) { return a(); })); };
        }
        if (tree.op == 'lookup') {
            var value = parser.resolve(tree.name);
            if (typeof value == 'function')
                return value;
            return function () { return value; };
        }
        if (tree.op == 'negate') {
            var subexpr = emit(tree.subtree);
            return function () { return -subexpr(); }
        }
        var left = emit(tree.left);
        var right = emit(tree.right);
        switch (tree.op) {
            case '+': return function () { return left() + right(); }
            case '-': return function () { return left() - right(); }
            case '*': return function () { return left() * right(); }
            case '/': return function () { return left() / right(); }
            case '%': return function () { return left() % right(); }
            case '^': return function () { return Math.pow(left(), right()); }
            default: throw {error:'unknown operation ' + tree.op};
        }
    }

    var factor = lrecursive(['^'], atom);
    var term = lrecursive(['*','/'], factor);
    var expression = lrecursive(['+','-'], term);

    var parser = this;
    var lookaheadRequired = 1;
    var currentSymbol = null;
    var lookaheadSymbol = null;
    var symbolQueue = [];
    var syntaxTree = null;

    this.resolve = function (name) {
        return 0.0;
    }
    this.parse = function (expression) {
        var re = new RegExp(tokenRe, 'g');
        var result;
        while ((result = re.exec(expression)) !== null) {
            var type = null;
            for (var i = 0; i < tokenOrder.length; ++ i) {
                if (result[i+1]) {
                    type = tokenOrder[i];
                    break;
                }
            }
            symbolQueue.push({type: type, value: result[0]});
        }
        symbolQueue.push({type: END});
        shiftSymbol();
        syntaxTree = negatable();
    }
    this.createEvaluator = function () {
        var optimized = optimize(syntaxTree);
        return emit(optimized);
    }
    this.builtins = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        atan: Math.atan,
        atan2: Math.atan2,
        exp: Math.exp,
        log: Math.log,
    }
}

Parser.createEvaluator = function (expression, resolver) {
    var p = new Parser();
    p.resolve = resolver;
    p.parse(expression);
    return p.createEvaluator();
};

window.Parser = Parser;

})(window);