import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class DatasourceQueryCtrl extends QueryCtrl {

    constructor($scope, $injector) {
        super($scope, $injector);

        this.scope = $scope;
        this.target.targetType = this.target.targetType || 'select type';
        this.target.target = this.target.target || 'select entity';
        this.target.type = this.target.type || 'timeserie';
    }

    getOptions($query) {
        if (this.target.targetType !== undefined && this.target.targetType !== "select type") {
            let res = this.datasource.metricFindQuery("listIDs", this.target.targetType);
            if (this.target.type === "table") {
                return res;
            }
            else if (this.target.type === "timeserie") {
                let returnArray = [];
                return res.then(results => {
                    let promises = [];
                    for (let r in results) {
                        let targetArray = results[r].value.split(".");
                        let myType = targetArray[0];
                        let myTarget = targetArray [1];

                        let queryURL = "/v2/entities/" + myTarget + "?type=" + myType + "&options=keyValues";
                        promises.push(this.datasource.doRequest({
                            url: this.datasource.url + queryURL,
                            method: 'GET'
                        }));
                    }

                    return Promise.all(promises).then(finals => {

                        for (let f in finals) {
                            let keys = Object.keys(finals[f].data);
                            let id = finals[f].data.id;
                            let type = finals[f].data.type;
                            for (let k in keys) {
                                if (keys[k] !== "id" && keys[k] !== "type") {
                                    let returnObject = {};
                                    returnObject.text = id + " (" + keys[k] + ")";
                                    returnObject.value = type + "." + id + "." + keys[k];
                                    returnArray.push(returnObject);
                                }
                            }

                        }
                        return returnArray;
                    }).catch(errors => {
                        console.log(errors);
                    });
                });
            }
        }
        else {
            console.log("Entity Type undefined!");
            return null;
        }
    }

    getTypes() {
        return this.datasource.metricFindQuery("listTypes");
    }

    toggleEditorMode() {
        this.target.rawQuery = !this.target.rawQuery;
    }

    onChangeInternal() {
        this.panelCtrl.refresh(); // Asks the panel to refresh data.
    }
}

DatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';