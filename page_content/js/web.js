
            (function() {
                var identityCounter = 1;

                _cet_data = {
                    stream: 'conversionEvents',
                    accountId: '6c8f8b42',
                    name: 'celtraPixelEvent',
                    userEventSetId: 'c76b9201',
                    userIdentity: {},
                    version: 1.0
                };

                function extend(obj, src) {
                    Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
                    return obj;
                }

                /* Sends tracking event */
                var trackEvent = function(data) {
                    var trackingUrl = 'https://track.celtra.com/pixel.gif';
                    var sendRequest = function() {
                        data = extend(data, _cet_data);

                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', trackingUrl);
                        xhr.setRequestHeader('Content-Type', 'text/plain');
                        xhr.send(JSON.stringify(data));
                    }.bind(this);

                    sendRequest();
                }.bind(this);

                /* Handles: '_cet('actionName')' events */
                var _cetAction = function() {
                    action = arguments[0];
                    if (action === 'track' || action === 'track.custom') {
                        data = {};
                        data['eventName'] = arguments[1];

                        if (action === 'track') {
                            data['namespace'] = 'celtra';
                        } else if (action === 'track.custom') {
                            data['namespace'] = 'custom';
                        }

                        if (arguments.length > 2) {
                            data['data'] = arguments[2];
                        }

                        trackEvent(data);
                    }
                }.bind(this);

                var collectUserIdentity = function(namespace, data) {
                    if (data && data.id) {
                        _cet_data.userIdentity[namespace] = data.id
                    }

                    if (!--identityCounter) {
                        clearTimeout(timeoutHandler)
                        sendCollectedData();
                    }
                };

                var sendCollectedData = function() {
                    if (Object.keys(_cet_data.userIdentity).length > 0) {
                        // 1. Store queued actions.
                        queue = window._cet.queue;
                        // 2. Set 'window._cet' to the tracking function (queuing is not necessary anymore)
                        window._cet = _cetAction;
                        // 3. Run 'queued' actions.
                        for (var i = 0; i < queue.length; i++) {
                            _cetAction.apply(this, queue[i]);
                        }
                    }
                }.bind(this);

                var timeoutHandler = setTimeout(sendCollectedData, 5000);

                
            /* Get Celtra identity. */
            !function(callback) {
                var cbName = '__jsonp' + (Math.random() + '').slice(2);
                window[cbName] = function(data) {
                    data.id ? callback({ id: data.id }) : callback({ id: null });
                };

                var script = document.createElement('script');
                script.src =  'https://celtraidentity.com/6c8f8b42?countryCode=US&cb=' + cbName;
                script.onerror = function() {
                    callback({ id: null });
                }
                document.querySelector('head').appendChild(script);
            }(collectUserIdentity.bind(this, 'celtraCookieId'))
        
            })()
        