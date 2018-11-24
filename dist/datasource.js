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
            var _this = this;

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
                if (maxDataPoints === 1) {
                    maxDataPoints = 1250;
                }
                if (query.targets[t].target !== undefined && query.targets[t].target !== "select entity") {
                    var rangeFrom = new Date(query.range.from).toISOString();
                    var rangeTo = new Date(query.range.to).toISOString();

                    promises.push(this.doRequest({
                        url: this.url + "/v1/contextEntities/type/" + myType + "/id/" + myTarget + "/attributes/" + myProperty + "?hLimit=" + maxDataPoints + "&dateFrom=" + rangeFrom + "&dateTo=" + rangeTo,
                        method: 'GET'
                    }));

                    promises.push(this.doRequest({
                        url: this.url + "/v1/contextEntities/type/" + myType + "/id/" + myTarget + "/attributes/" + myProperty + "___Latitude?hLimit=" + maxDataPoints + "&dateFrom=" + rangeFrom + "&dateTo=" + rangeTo,
                        method: 'GET'
                    }));

                    promises.push(this.doRequest({
                        url: this.url + "/v1/contextEntities/type/" + myType + "/id/" + myTarget + "/attributes/" + myProperty + "___Longitude?hLimit=" + maxDataPoints + "&dateFrom=" + rangeFrom + "&dateTo=" + rangeTo,
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
                        var contextElement = results[r].data.contextResponses[0].contextElement;

                        if (contextElement.attributes[0].name.includes("___") === false) {
                            // Attribute is not metadata
                            var returnObject = {};
                            returnObject.datapoints = [];

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
                    }
                } else if (query.targets[0].type === "table") {
                    // Table format (used for World Map Plugin)
                    var rowArray = [];
                    var _r = 0;

                    while (_r < results.length) {
                        var valueElement = results[_r].data.contextResponses[0].contextElement.attributes[0].values;
                        var latitudeElement = results[_r + 1].data.contextResponses[0].contextElement.attributes[0].values;
                        var longitudeElement = results[_r + 2].data.contextResponses[0].contextElement.attributes[0].values;

                        var _returnObject = {};
                        _returnObject.type = "table";
                        _returnObject.columns = [{ text: "Time" }, { text: "Value" }, { text: "geohash" }, { text: "latitude" }, { text: "longitude" }];
                        _returnObject.rows = [];

                        // create rows
                        for (var _v in valueElement) {
                            var row = [];
                            row.push(valueElement[_v].recvTime);
                            row.push(valueElement[_v].attrValue);

                            var lat = latitudeElement[_v].attrValue;
                            var long = longitudeElement[_v].attrValue;
                            var geohash = void 0;

                            if (isNaN(lat) === false && isNaN(long) === false) {
                                // Coordinates as numbers available
                                geohash = _this.encodeGeoHash(lat, long); // format: u0m713d5ubmd


                                // Generate random geohash
                                /*const geohashLength = 12;
                                let geohash = "";
                                const char_list = "abcdefghijklmnopqrstuvwxyz0123456789";
                                for(let i=0; i < geohashLength; i++ )
                                {
                                    geohash += char_list.charAt(Math.floor(Math.random() * char_list.length));
                                }*/
                            } else {
                                geohash = "gzzzzzzzzzzz";
                            }

                            row.push(geohash);
                            row.push(lat);
                            row.push(long);

                            rowArray.push(row);
                        }
                        _returnObject.rows = rowArray;
                        returnArray.push(_returnObject);

                        // Step size = number of queries made above. ADJUST ACCORDINGLY!
                        _r += 3;
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
            var _this2 = this;

            //remove placeholder targets
            options.targets = _lodash2.default.filter(options.targets, function (target) {
                return target.target !== 'select entity';
            });

            var targets = _lodash2.default.map(options.targets, function (target) {
                return {
                    target: _this2.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                    refId: target.refId,
                    hide: target.hide,
                    type: target.type || 'timeserie'
                };
            });

            options.targets = targets;

            return options;
        }
    }, {
        key: 'encodeGeoHash',
        value: function encodeGeoHash(lat, lon, precision) {
            if (typeof precision === 'undefined') {
                // refine geohash until it matches precision of supplied lat/lon
                for (var p = 1; p <= 12; p++) {
                    var hash = this.encodeGeoHash(lat, lon, p);
                    var posn = this.decodeGeohash(hash);
                    if (posn.lat === lat && posn.lon === lon) {
                        return hash;
                    }
                }
                precision = 12; // set to maximum
            }

            lat = Number(lat);
            lon = Number(lon);
            precision = Number(precision);

            if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error('Invalid geoposition');

            var base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
            var idx = 0; // index into base32 map
            var bit = 0; // each char holds 5 bits
            var evenBit = true;
            var geohash = '';

            var latMin = -90,
                latMax = 90;
            var lonMin = -180,
                lonMax = 180;

            while (geohash.length < precision) {
                if (evenBit) {
                    // bisect E-W longitude
                    var lonMid = (lonMin + lonMax) / 2;
                    if (lon >= lonMid) {
                        idx = idx * 2 + 1;
                        lonMin = lonMid;
                    } else {
                        idx = idx * 2;
                        lonMax = lonMid;
                    }
                } else {
                    // bisect N-S latitude
                    var latMid = (latMin + latMax) / 2;
                    if (lat >= latMid) {
                        idx = idx * 2 + 1;
                        latMin = latMid;
                    } else {
                        idx = idx * 2;
                        latMax = latMid;
                    }
                }
                evenBit = !evenBit;

                if (++bit === 5) {
                    // 5 bits gives us a character: append it and start over
                    geohash += base32.charAt(idx);
                    bit = 0;
                    idx = 0;
                }
            }
            return geohash;
        }
    }, {
        key: 'decodeGeohash',
        value: function decodeGeohash(geohash) {
            var base32 = '0123456789bcdefghjkmnpqrstuvwxyz';

            if (geohash.length === 0) throw new Error('Invalid geohash');
            geohash = geohash.toLowerCase();

            var evenBit = true;
            var latMin = -90,
                latMax = 90;
            var lonMin = -180,
                lonMax = 180;

            for (var i = 0; i < geohash.length; i++) {
                var chr = geohash.charAt(i);
                var idx = base32.indexOf(chr);
                if (idx === -1) throw new Error('Invalid geohash');

                for (var n = 4; n >= 0; n--) {
                    var bitN = idx >> n & 1;
                    if (evenBit) {
                        // longitude
                        var lonMid = (lonMin + lonMax) / 2;
                        if (bitN === 1) {
                            lonMin = lonMid;
                        } else {
                            lonMax = lonMid;
                        }
                    } else {
                        // latitude
                        var latMid = (latMin + latMax) / 2;
                        if (bitN === 1) {
                            latMin = latMid;
                        } else {
                            latMax = latMid;
                        }
                    }
                    evenBit = !evenBit;
                }
            }

            var bounds = {
                sw: { lat: latMin, lon: lonMin },
                ne: { lat: latMax, lon: lonMax }
            };

            latMin = bounds.sw.lat;
            lonMin = bounds.sw.lon;
            latMax = bounds.ne.lat;
            lonMax = bounds.ne.lon;

            // cell centre
            var lat = (latMin + latMax) / 2;
            var lon = (lonMin + lonMax) / 2;

            // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
            lat = lat.toFixed(Math.floor(2 - Math.log(latMax - latMin) / Math.LN10));
            lon = lon.toFixed(Math.floor(2 - Math.log(lonMax - lonMin) / Math.LN10));

            return { lat: Number(lat), lon: Number(lon) };
        }
    }]);

    return NGSIDatasource;
}();
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map
//# sourceMappingURL=datasource.js.map