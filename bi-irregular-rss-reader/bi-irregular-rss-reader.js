define([
    "jquery",
    "qlik",
    "text!./partials/template.html",
    "css!./styles/bi-irregular-rss-reader.css"
], function ($, qlik, template) {
        'use strict';
        return {
            template: template,
            initialProperties: {
                version: 1.0
            },
            definition: {
                type: "items",
                component: "accordion",
                items: {
                    settings: {
                        uses: "settings",
                        items: {
                            options: {
                                label: "Options",
                                type: "items",
                                items: {        
                                    feedUrl: {
                                        ref: "feedUrl",
                                        label: "RSS Feed URL",
                                        type: "string",
                                        defaultValue: "",
                                        expression: "optional"
                                    },
                                    useProxy: {
                                        ref: "useProxy",
                                        type: "boolean",
                                        component: "switch",
                                        label: "Use Proxy",
                                        options: [{
                                            value: true,
                                            label: "On"
                                        }, {
                                            value: false,
                                            label: "Off"
                                        }],
                                        defaultValue: true
                                    },
                                    proxyUrl: {
                                        ref: "proxyUrl",
                                        label: "Proxy URL",
                                        type: "string",
                                        defaultValue: "https://cors-anywhere.herokuapp.com/",
                                        expression: "optional",
                                        show: function(d) {
                                            return d.useProxy;
                                        }
                                    },
                                    pollingInterval: {
                                        ref: "pollingInterval",
                                        label: "Polling Interval in secs",
                                        type: "integer",
                                        defaultValue: 60,
                                        min: 1,
                                        expression: "optional"
                                    },
                                    maxItems: {
                                        ref: "maxItems",
                                        label: "Read max. Items",
                                        type: "integer",
                                        defaultValue: 20,
                                        min: 1,
                                        expression: "optional"
                                    },
                                    renderTextAsHtml: {
                                        ref: "renderTextAsHtml",
                                        label: "Render Text as HTML",
                                        type: "boolean",
                                        defaultValue: false
                                    },
                                    logResult: {
                                        ref: "logResult",
                                        type: "boolean",
                                        component: "switch",
                                        label: "Log Result in Console",
                                        options: [{
                                            value: true,
                                            label: "On"
                                        }, {
                                            value: false,
                                            label: "Off"
                                        }],
                                        defaultValue: false
                                    }
                                }
                            }
                        }
                    }
                }
            },
            support: {
                snapshot: true,
                export: true,
                exportData: false
            },
            controller: ['$scope', '$interval', '$timeout', function (scope, interval, timeout) {
                scope.logResult = false;
                scope.feed = '';
                scope.useProxy = false;
                scope.proxyUrl = '';
                scope.pollingInterval = 60;
                scope.pollingStarted = false;

                scope.vm = {};
                scope.vm.channel = {
                    title: '',
                    link: '',
                    description: '',
                    items: []
                };
                scope.vm.spinner = true;
                scope.vm.renderTextAsHtml = false;

                scope.getMode = function() {
                    return qlik.navigation.getMode();
                }

                var intervalTimer;
                
                scope.startPolling = function() {
                    scope.pollingStarted = true;
                    intervalTimer = interval(getFeed, scope.pollingInterval * 1000);
                };

                scope.stopPolling = function() {
                    if (scope.pollingStarted) {
                        interval.cancel(intervalTimer);
                        intervalTimer = undefined;
                        scope.pollingStarted = false;
                    }
                }

                function setModel() {
                    scope.logResult = scope.layout.logResult;
                    scope.useProxy = scope.layout.useProxy;
                    scope.proxyUrl = scope.layout.proxyUrl;
                    scope.feed = scope.layout.feedUrl;
                    scope.maxItems = scope.layout.maxItems;
                    scope.vm.renderTextAsHtml = scope.layout.renderTextAsHtml;

                    if (scope.layout.pollingInterval > 0) {
                        scope.pollingInterval = scope.layout.pollingInterval;
                    }

                    scope.stopPolling();

                    getFeed();

                    scope.startPolling();
                }

                function getFeed() {
                    if (scope.feed && scope.feed.trim() !== '') {
                        scope.vm.spinner = true;

                        var feed = scope.feed;

                        if (scope.useProxy) {
                            feed = scope.proxyUrl + feed;
                        }

                        $.get(feed, function (data) {
                            if (scope.logResult) {
                                console.log(data);
                            }
                            scope.vm.spinner = false;
        
                            //Credit: http://stackoverflow.com/questions/10943544/how-to-parse-an-rss-feed-using-javascript
        
                            timeout(function() {
                                var channel = $(data).find("channel");

                                if (channel.length > 0) {
                                    scope.vm.channel.items = [];
                                    /* read feed info, if needed
                                    scope.vm.channel.title = channel.find("title:first").text();
                                    scope.vm.channel.link = channel.find("link:first").text();
                                    scope.vm.channel.description = channel.find("description:first").text();                        
                                    */
                                    var nItems = Math.max(1, (scope.maxItems || 20));

                                    channel.find("item:lt(" + nItems + ")").each(function () {
                                        var el = $(this);
                                        var item = {
                                            title: el.find("title").text(),
                                            link: el.find("link").text(),
                                            description: el.find("description").text(),
                                            pubDate: el.find("pubDate").text(),
                                            dcDate: el.find("dc\\:date").text()
                                        };
                                        try {
                                            if (item.dcDate !== '') {
                                                item.pubDate = new Date(Date.parse(item.dcDate)).toLocaleString();
                                            } else if (item.pubDate != '') {
                                                item.pubDate = new Date(Date.parse(item.pubDate)).toLocaleString();
                                            }
                                        } catch (err) {
                                        }
                                        scope.vm.channel.items.push(item);
                                    });
                                }
                            });
                        });
                    }
                }

                timeout(function() {
                    setModel();
                });

                scope.component.model.Validated.unbind();
                scope.component.model.Validated.bind(function () {
                    setModel();
                });

                scope.$on('$destroy', function() {
                    // Make sure that the interval is destroyed too
                    scope.stopPolling();
                });

                scope.$watch("getMode()", function (newValue, oldValue) {
                    if (newValue) {
                        if (newValue !== "edit" && oldValue === "edit") {
                            // exit edit mode
                            setModel();
                            return;
                        }
                    }
                });

            }]
        };
    });
