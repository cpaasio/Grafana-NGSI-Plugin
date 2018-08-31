'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NGSIDatasource = undefined;

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var NGSIDatasource = exports.NGSIDatasource = function () {
    function NGSIDatasource(instanceSettings, $q, backendSrv, templateSrv) {
        _classCallCheck(this, NGSIDatasource);

        this.type = instanceSettings.type;
        this.url = instanceSettings.url;
        this.name = instanceSettings.name;
        this.q = $q;
        this.backendSrv = backendSrv;
        this.templateSrv = templateSrv;
        this.withCredentials = instanceSettings.withCredentials;
        this.headers = { 'Content-Type': 'application/json', "fiware-servicepath": "/" };
        if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
            this.headers['Authorization'] = instanceSettings.basicAuth;
        }
    }

    _createClass(NGSIDatasource, [{
        key: 'query',
        value: function query(options) {
            var promises = [];
            var query = this.buildQueryParameters(options);
            query.targets = query.targets.filter(function (t) {
                return !t.hide;
            });

            if (query.targets.length < 1) {
                console.log("no data for this panel");
                return { data: [] };
            }

            for (var t in query.targets) {
                // Get data from timeserie and table response
                var targetArray = query.targets[t].target.split(".");
                var myType = targetArray[0];
                var myTarget = targetArray[1];
                var myProperty = targetArray[2];
                var maxDataPoints = query.maxDataPoints;
                if (query.targets[t].target !== undefined && query.targets[t].target !== "select entity") {
                    var rangeFrom = new Date(query.range.from).toISOString();
                    var rangeTo = new Date(query.range.to).toISOString();

                    promises.push(this.doRequest({
                        url: this.url + "/v1/contextEntities/type/" + myType + "/id/" + myTarget + "/attributes/" + myProperty + "?lastN=" + maxDataPoints + "&dateFrom=" + rangeFrom + "&dateTo=" + rangeTo,
                        method: 'GET'
                    }));
                } else {
                    return { data: [] };
                }
            }

            return Promise.all(promises).then(function (results) {
                var returnArray = [];
                var queryResponse = {};
                queryResponse.data = [];

                if (query.targets[0].type === "timeserie") {
                    // Timeseries format
                    for (var r in results) {
                        var returnObject = {};
                        returnObject.datapoints = [];

                        var contextElement = results[r].data.contextResponses[0].contextElement;
                        var values = contextElement.attributes[0].values;
                        returnObject.target = contextElement.attributes[0].name + " (" + contextElement.type + ": " + contextElement.id + ")";

                        for (var v in values) {
                            var time = void 0,
                                timeSplit = void 0,
                                unixTime = void 0;
                            var datapointArray = [];
                            time = values[v].recvTime;
                            time += "Z";
                            timeSplit = time.split(' ');
                            time = timeSplit[0] + "T" + timeSplit[1];
                            unixTime = new Date(time).getTime();
                            datapointArray.push(values[v].attrValue);
                            datapointArray.push(unixTime);
                            returnObject.datapoints.push(datapointArray);
                        }
                        returnArray.push(returnObject);
                    }
                } else if (query.targets[0].type === "table") {
                    // Table format
                    var rowArray = [];

                    for (var _r in results) {
                        var _contextElement = results[_r].data.contextResponses[0].contextElement;
                        var _returnObject = {};
                        _returnObject.type = "table";
                        _returnObject.columns = [{ text: "Time" }, { text: "Value" }, { text: "geohash" }];
                        _returnObject.rows = [];

                        // TODO Make query for geolocation attribute here

                        // fill rows
                        for (var _v in _contextElement.attributes[0].values) {
                            var row = [];
                            row.push(_contextElement.attributes[0].values[_v].recvTime);
                            row.push(_contextElement.attributes[0].values[_v].attrValue);

                            // TODO Match recvTime with geolocation attribute and copy geohash

                            // Generate random geohash
                            var geohashLength = 12;
                            var geohash = "";
                            var char_list = "abcdefghijklmnopqrstuvwxyz0123456789";
                            for (var i = 0; i < geohashLength; i++) {
                                geohash += char_list.charAt(Math.floor(Math.random() * char_list.length));
                            }

                            row.push(geohash);
                            rowArray.push(row);
                        }
                        _returnObject.rows = rowArray;
                        returnArray.push(_returnObject);
                    }
                }
                queryResponse.data = returnArray;
                return queryResponse;
            });
        }
    }, {
        key: 'testDatasource',
        value: function testDatasource() {
            return this.doRequest({
                url: this.url + "/v2/entities",
                method: 'GET'
            }).then(function (response) {
                if (response.status === 200) {
                    return { status: "success", message: "Data source is working", title: "Success" };
                } else {
                    return { status: "success", message: "COMET URL cannot be automatically tested, sorry.", title: "No connection test possible" };
                }
            });
        }
    }, {
        key: 'annotationQuery',
        value: function annotationQuery(options) {
            var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
            var annotationQuery = {
                range: options.range,
                annotation: {
                    name: options.annotation.name,
                    datasource: options.annotation.datasource,
                    enable: options.annotation.enable,
                    iconColor: options.annotation.iconColor,
                    query: query
                },
                rangeRaw: options.rangeRaw
            };

            return this.doRequest({
                url: this.url + '/annotations',
                method: 'POST',
                data: annotationQuery
            }).then(function (result) {
                return result.data;
            });
        }
    }, {
        key: 'metricFindQuery',
        value: function metricFindQuery(mode, pattern) {
            // Pre-fills data types
            var queryURL = void 0;
            if (mode === "listTypes") {
                queryURL = "/v2/types";
                return this.doRequest({
                    url: this.url + queryURL,
                    method: 'GET'
                }).then(function (response) {
                    if (response.status === 200) {
                        var returnArray = [];
                        for (var n = 0; n < response.data.length; n++) {
                            if (response.data[n].type !== "" && response.data[n].type !== undefined) {
                                var returnObject = {};
                                returnObject.text = response.data[n].type;
                                returnObject.value = response.data[n].type;
                                returnArray.push(returnObject);
                            }
                        }
                        return returnArray;
                    }
                });
            } else if (mode === "listIDs" && pattern !== undefined && pattern !== "select entity") {
                queryURL = "/v2/entities?type=" + pattern;
                return this.doRequest({
                    url: this.url + queryURL,
                    method: 'GET'
                }).then(function (response) {
                    if (response.status === 200) {
                        var returnArray = [];
                        for (var n = 0; n < response.data.length; n++) {
                            if (response.data[n].id !== "" && response.data[n].id !== undefined) {
                                var returnObject = {};
                                returnObject.text = response.data[n].id;
                                returnObject.value = response.data[n].type + "." + response.data[n].id;
                                returnArray.push(returnObject);
                            }
                        }
                        return returnArray;
                    }
                });
            }
        }
    }, {
        key: 'mapToTextValue',
        value: function mapToTextValue(result) {
            return _lodash2.default.map(result.data, function (d, i) {
                if (d && d.text && d.value) {
                    return { text: d.text, value: d.value };
                } else if (_lodash2.default.isObject(d)) {
                    return { text: d, value: i };
                }
                return { text: d, value: d };
            });
        }
    }, {
        key: 'doRequest',
        value: function doRequest(options) {
            options.withCredentials = this.withCredentials;
            options.headers = this.headers;

            return this.backendSrv.datasourceRequest(options);
        }
    }, {
        key: 'buildQueryParameters',
        value: function buildQueryParameters(options) {
            var _this = this;

            //remove placeholder targets
            options.targets = _lodash2.default.filter(options.targets, function (target) {
                return target.target !== 'select entity';
            });

            var targets = _lodash2.default.map(options.targets, function (target) {
                return {
                    target: _this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                    refId: target.refId,
                    hide: target.hide,
                    type: target.type || 'timeserie'
                };
            });

            options.targets = targets;

            return options;
        }
    }]);

    return NGSIDatasource;
}();
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map