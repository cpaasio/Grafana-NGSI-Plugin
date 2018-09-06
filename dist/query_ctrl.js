'use strict';

var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _typeof = typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol" ? function (obj) {
    return typeof obj === "undefined" ? "undefined" : _typeof2(obj);
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof2(obj);
};

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DatasourceQueryCtrl = undefined;

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

var _sdk = require('app/plugins/sdk');

require('./css/query-editor.css!');

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _possibleConstructorReturn(self, call) {
    if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var DatasourceQueryCtrl = exports.DatasourceQueryCtrl = function (_QueryCtrl) {
    _inherits(DatasourceQueryCtrl, _QueryCtrl);

    function DatasourceQueryCtrl($scope, $injector) {
        _classCallCheck(this, DatasourceQueryCtrl);

        var _this = _possibleConstructorReturn(this, (DatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(DatasourceQueryCtrl)).call(this, $scope, $injector));

        _this.scope = $scope;
        _this.target.targetType = _this.target.targetType || 'select type';
        _this.target.target = _this.target.target || 'select entity';
        _this.target.type = _this.target.type || 'timeserie';
        return _this;
    }

    _createClass(DatasourceQueryCtrl, [{
        key: 'getOptions',
        value: function getOptions($query) {
            var _this2 = this;

            if (this.target.targetType !== undefined && this.target.targetType !== "select type") {
                var res = this.datasource.metricFindQuery("listIDs", this.target.targetType);
                if (this.target.type === "table") {
                    return res;
                } else if (this.target.type === "timeserie") {
                    var returnArray = [];
                    return res.then(function (results) {
                        var promises = [];
                        for (var r in results) {
                            var targetArray = results[r].value.split(".");
                            var myType = targetArray[0];
                            var myTarget = targetArray[1];

                            var queryURL = "/v2/entities/" + myTarget + "?type=" + myType + "&options=keyValues";
                            promises.push(_this2.datasource.doRequest({
                                url: _this2.datasource.url + queryURL,
                                method: 'GET'
                            }));
                        }

                        return Promise.all(promises).then(function (finals) {

                            for (var f in finals) {
                                var keys = Object.keys(finals[f].data);
                                var id = finals[f].data.id;
                                var type = finals[f].data.type;
                                for (var k in keys) {
                                    if (keys[k] !== "id" && keys[k] !== "type") {
                                        var returnObject = {};
                                        returnObject.text = id + " (" + keys[k] + ")";
                                        returnObject.value = type + "." + id + "." + keys[k];
                                        returnArray.push(returnObject);
                                    }
                                }
                            }
                            return returnArray;
                        }).catch(function (errors) {
                            console.log(errors);
                        });
                    });
                }
            } else {
                console.log("Entity Type undefined!");
                return null;
            }
        }
    }, {
        key: 'getTypes',
        value: function getTypes() {
            return this.datasource.metricFindQuery("listTypes");
        }
    }, {
        key: 'toggleEditorMode',
        value: function toggleEditorMode() {
            this.target.rawQuery = !this.target.rawQuery;
        }
    }, {
        key: 'onChangeInternal',
        value: function onChangeInternal() {
            this.panelCtrl.refresh(); // Asks the panel to refresh data.
        }
    }]);

    return DatasourceQueryCtrl;
}(_sdk.QueryCtrl);

DatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
//# sourceMappingURL=query_ctrl.js.map
//# sourceMappingURL=query_ctrl.js.map
//# sourceMappingURL=query_ctrl.js.map