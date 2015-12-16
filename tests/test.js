var Test = (function () {
    var lastFrameCount = 0;
    var lastTime = new Date().getTime();
    setInterval(function () {
        var renderer = $('canvas')[0].__renderjs;
        var frames = renderer.frameCount - lastFrameCount;
        lastFrameCount = renderer.frameCount;
        var time = new Date().getTime();
        var elapsed = time - lastTime;
        lastTime = time;
        var fps = frames * 1000.0 / elapsed;
        $('#fps').text(fps.toFixed(1)+' fps');
    }, 1000);
    
    var Test = {
        createSourceElement: function () {
            var source = $('body > script:last-of-type').text().trim();
            var identsRe = new RegExp(
                '(?:var\\s+([$a-zA-Z_][$a-zA-Z_0-9]*))' +
                '|(?:function \\s*(?:[$a-zA-Z_][$a-zA-Z_0-9]*)?\\s*(?:' +
                    '(?:\\(([$a-zA-Z_][$a-zA-Z_0-9]*)\\))' +
                    '|(?:([$a-zA-Z_][$a-zA-Z_0-9]*)\\s*,)' +
                    '|(?:,\\s*([$a-zA-Z_][$a-zA-Z_0-9]*))))' +
                '|(?:([$a-zA-Z_][$a-zA-Z_0-9]*)\\:)', 'g');
            var idents = [];
            var m;
            while ((m = identsRe.exec(source)) != null)
                idents.push(m[1]||m[2]||m[3]||m[4]||m[5]);
            var tokens = new RegExp(
                '(\\.?)([$a-zA-Z_][$a-zA-Z_0-9]*)|' +
                '(-?[0-9]+(?:\\.[0-9]*)?)|' +
                '((?:"[^"]*(?:""[^"]+)*")|(?:\'[^\']*(?:\'\'[^\']+)*\'))|' +
                '(//.*$)', 'gm');
            source = source.replace(tokens, function (token) {
                var className;
                if (arguments[2]) {
                    if ('function|var|if|while|throw|catch|typeof|instanceof|in|new|yield|void|delete|true|false'.indexOf(arguments[2]) >= 0)
                        className = 'rw';
                    else if (idents.indexOf(arguments[2]) >= 0)
                        className = 'ident';
                    else if (arguments[1])
                        className = 'mem';
                    else
                        className = 'ns';
                } else if (arguments[3])
                    className = 'num';
                else if (arguments[4])
                    className = 'str';
                else if (arguments[5])
                    className = 'com';
                return '<span class="js-' + className + '">' + token + '</span>';
            });
            return $('<pre class="javascript">' + source + '</pre>');
        },
        showSource: function () {
            var container = $('#source');
            if (container.length > 0) {
                container.remove();
                return;
            }
            var source = Test.createSourceElement();
            var container = $('<div id="source"><h3>Source code</h3><button class="close">Close</button><div class="container"></div></div>');
            container.find('.container').append(source);
            $('#ui-overlay').append(container);
            container.find('button.close').on('click', function () {
                container.remove();
            });
        }
    };
    return Test;
})();