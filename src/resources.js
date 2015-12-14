var Resources = (function () {
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

if (typeof Promise == 'undefined') {
    window.Promise = (function() {
        // simple polyfill which is good enough for our purposes
        function Promise(evaluator) {
            function resolve(result) {
                value = result;
                promise.state = Promise.FULFILLED;
                for (var i = 0; i < resolveCallbacks.length; ++ i)
                    resolveCallbacks[i](result);
                resolveCallbacks = rejectCallbacks = null;
            }
            function reject(result) {
                value = result;
                promise.state = Promise.REJECTED;
                for (var i = 0; i < rejectCallbacks.length; ++ i)
                    rejectCallbacks[i](result);
                resolveCallbacks = rejectCallbacks = null;
            }
            var value;
            var resolveCallbacks = [];
            var rejectCallbacks = [];
            var promise = this;
            this.state = Promise.PENDING;
            evaluator(resolve, reject);
            this.then = function (onFulfill, onReject) {
                return new Promise(function (nextResolve, nextReject) {
                    if (promise.state == Promise.PENDING) {
                        if (onFulfill)
                            resolveCallbacks.push(function (result) { nextResolve(onFulfill(result)); });
                        if (onReject)
                            rejectCallbacks.push(function (result) { nextReject(onReject(result)); });
                    } else if (promise.state == Promise.FULFILLED && onFulfill) {
                        nextResolve(onFulfill(value));
                    } else if (promise.state == Promise.REJECTED && onReject) {
                        nextReject(onReject(value));
                    }
                });
            }
            // we don't define Promise.catch since it is a reserved work in IE, and the polyfill is targeted at IE,
            // so really there is no point.
        }
        Promise.PENDING = 1;
        Promise.FULFILLED = 2;
        Promise.REJECTED = 3;
        Promise.all = function (promiseArray) {
            return new Promise(function (resolve, reject) {
                function makeResolver(i, callback) {
                    return function (result) {
                        if (results) {
                            results[i] = result;
                            --outstanding;
                            if (outstanding == 0)
                                callback(results);
                        }
                    }
                }
                var outstanding = promiseArray.length;
                var results = [];
                for (var i = 0; i < promiseArray.length; ++ i)
                    results.push(null);
                for (var i = 0; i < promiseArray.length; ++ i)
                    promiseArray[i].then(makeResolver(i, resolve), function (error) { results = null; reject(error); });
            });
        }
        return Promise;
    })();
}

return Resources;

})();