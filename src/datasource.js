import _ from "lodash";

export class NGSIDatasource {

    constructor(instanceSettings, $q, backendSrv, templateSrv) {
        this.type = instanceSettings.type;
        this.url = instanceSettings.url;
        this.name = instanceSettings.name;
        this.q = $q;
        this.backendSrv = backendSrv;
        this.templateSrv = templateSrv;
        this.withCredentials = instanceSettings.withCredentials;
        this.headers = {'Content-Type': 'application/json', "fiware-servicepath": "/"};
        if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
            this.headers['Authorization'] = instanceSettings.basicAuth;
        }
    }

    query(options) {
        let queryResponse = {};
        queryResponse.data = [];
        let promises = [];
        let query = this.buildQueryParameters(options);
        query.targets = query.targets.filter(t => !t.hide);

        if (query.targets.length < 1) {
            console.log("no data for this panel");
            return ({data: []});
        }

        for (let t in query.targets) {
            // Timeserie response
            let targetArray = query.targets[t].target.split(".");
            let myType = targetArray[0];
            let myTarget = targetArray [1];
            let myProperty = targetArray[2];
            let maxDataPoints = query.maxDataPoints;

            /* Test settings
            myType = "testSensor";
            myTarget = "00001C00000000000001000001000A00";
            myProperty = "light";
            maxDataPoints = 5;*/

            if (query.targets[t].target !== undefined && query.targets[t].target !== "select entity") {
                promises.push(this.doRequest({
                    url: this.url + "/v1/contextEntities/type/" + myType + "/id/" + myTarget + "/attributes/" + myProperty + "?lastN=" + maxDataPoints + "&dateFrom=" + query.range.from + "&dateTo=" + query.range.to,
                    method: 'GET',
                }));
            }
            else {
                return ({data: []});
            }
        }
        return Promise.all(promises).then(results => {
            let returnArray = [];

            for (let r in results) {
                let returnObject = {};
                returnObject.datapoints = [];

                let contextElement = results[r].data.contextResponses[0].contextElement;
                let values = contextElement.attributes[0].values;
                returnObject.target = contextElement.attributes[0].name + " (" + contextElement.type + ": " + contextElement.id + ")";

                for (let v in values) {
                    let time, timeSplit, unixTime;
                    let datapointArray = [];
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
            let returnObject = {};
            returnObject.data = returnArray;
            return(returnObject);
        });
    }

    testDatasource() {
        return this.doRequest({
            url: this.url + "/v2/entities",
            method: 'GET'
        }).then(response => {
            if (response.status === 200) {
                return {status: "success", message: "Data source is working", title: "Success"};
            }
            else {
                return {status: "success", message: "COMET URL cannot be automatically tested, sorry.", title: "No connection test possible"};
            }
        });
    }

    annotationQuery(options) {
        let query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
        let annotationQuery = {
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
        }).then(result => {
            return result.data;
        });
    }

    metricFindQuery(mode, pattern) {
        // Pre-fills data types
        let queryURL;
        if (mode === "listTypes") {
            queryURL = "/v2/types";
            return this.doRequest({
                url: this.url + queryURL,
                method: 'GET'
            }).then(response => {
                if (response.status === 200) {
                    let returnArray = [];
                    for (let n = 0; n < response.data.length; n++) {
                        if (response.data[n].type !== "" && response.data[n].type !== undefined) {
                            let returnObject = {};
                            returnObject.text = response.data[n].type;
                            returnObject.value = response.data[n].type;
                            returnArray.push(returnObject);
                        }
                    }
                    return returnArray;
                }
            });
        }
        else if (mode === "listIDs" && pattern !== undefined && pattern !== "select entity") {
            queryURL = "/v2/entities?type=" + pattern;
            return this.doRequest({
                url: this.url + queryURL,
                method: 'GET'
            }).then(response => {
                if (response.status === 200) {
                    let returnArray = [];
                    for (let n = 0; n < response.data.length; n++) {
                        if (response.data[n].id !== "" && response.data[n].id !== undefined) {
                            let returnObject = {};
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

    mapToTextValue(result) {
        return _.map(result.data, (d, i) => {
            if (d && d.text && d.value) {
                return {text: d.text, value: d.value};
            } else if (_.isObject(d)) {
                return {text: d, value: i};
            }
            return {text: d, value: d};
        });
    }

    doRequest(options) {
        options.withCredentials = this.withCredentials;
        options.headers = this.headers;

        return this.backendSrv.datasourceRequest(options);
    }

    buildQueryParameters(options) {
        //remove placeholder targets
        options.targets = _.filter(options.targets, target => {
            return target.target !== 'select entity';
        });

        var targets = _.map(options.targets, target => {
            return {
                target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie'
            };
        });

        options.targets = targets;

        return options;
    }
}
