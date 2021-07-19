"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getSelfPromise_1 = __importDefault(require("./getSelfPromise"));
var onProcessKill_1 = __importDefault(require("./onProcessKill"));
var sqlstring = require('./sqlstring');
var mysql = require('mysql2');
var Client = require('ssh2').Client;
var _crypto = require('crypto');
//reuse pool
var poolMap = {};
//reuse SSH pool
var sshMap = {};
// When the process is closed, clear the SSH connection
onProcessKill_1.default(function () {
    Object.values(sshMap).forEach(function (_a) {
        var ssh = _a.ssh;
        try {
            ssh.end();
        }
        catch (e) {
            console.error('e', e);
        }
    });
});
/**
 * sqlUtil
 */
var SqlUtil = /** @class */ (function () {
    function SqlUtil(props) {
        this.sshMd5 = '';
        this.props = props;
        this.driver = props.driver || mysql;
        this.pool = null;
        this.poolMd5 = this.getMd5(JSON.stringify(props)); //The configuration information is the connection pool unique ID
        this.dbConfig = __assign(__assign({}, props.dbConfig), { connectionLimit: (props.dbConfig && props.dbConfig.connectionLimit) || 10 });
        this.endReleaseType = props.endReleaseType || 'release'; // release, end
        this.format = sqlstring.format;
        this.escape = sqlstring.escape;
        this.raw = sqlstring.raw;
        this.escapeId = sqlstring.escapeId;
        this.initSSHPromise = this.initSSH(props);
        this.connectionInitPromise = this.setConnection(this.dbConfig);
    }
    SqlUtil.prototype.initSSH = function (props) {
        return __awaiter(this, void 0, void 0, function () {
            var SSHStreamList;
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.sshConfig = props.ssh;
                        if (!this.sshConfig) {
                            return [2 /*return*/];
                        }
                        /**
                         * use database configuration and SSH configuration to distinguish SSH
                         */
                        this.sshMd5 = this.poolMd5 + this.getMd5(JSON.stringify(this.sshConfig));
                        if (!sshMap[this.sshMd5]) return [3 /*break*/, 2];
                        this.ssh = sshMap[this.sshMd5].ssh;
                        this.SSHStreamList = sshMap[this.sshMd5].streamList;
                        return [4 /*yield*/, sshMap[this.sshMd5].initPromise];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        this.ssh = new Client();
                        this.ssh.connect({
                            host: this.sshConfig.host,
                            port: this.sshConfig.port,
                            username: this.sshConfig.username,
                            password: this.sshConfig.password,
                            tryKeyboard: true,
                        });
                        // ssh initialization
                        this.ssh.readyPromise = getSelfPromise_1.default();
                        this.ssh.once('ready', function () {
                            _this.ssh.readyPromise.resolve();
                        });
                        // ssh 'keyboard-interactive' login
                        this.ssh.on('keyboard-interactive', function (name, instructions, instructionsLang, prompts, finish) {
                            finish([(_this.sshConfig && _this.sshConfig.password) || '']);
                        });
                        // cache ssh
                        sshMap[this.sshMd5] = {
                            ssh: this.ssh,
                            streamList: [],
                            initPromise: getSelfPromise_1.default(),
                        };
                        return [4 /*yield*/, Promise.all(__spreadArrays(Array(this.dbConfig.connectionLimit)).map(function () { return _this.getSSHStream(); }))
                            /**
                             * The streamList in the cache must be reused, because when await promise,
                             * there may be another SqlUtil initialized, which uses sshMap[this.sshMd5].streamList.
                             * Therefore the streamList array must be public and can not be replaced.
                             */
                        ];
                    case 3:
                        SSHStreamList = _b.sent();
                        /**
                         * The streamList in the cache must be reused, because when await promise,
                         * there may be another SqlUtil initialized, which uses sshMap[this.sshMd5].streamList.
                         * Therefore the streamList array must be public and can not be replaced.
                         */
                        (_a = sshMap[this.sshMd5].streamList).push.apply(_a, SSHStreamList.filter(function (v) { return v; }));
                        this.SSHStreamList = sshMap[this.sshMd5].streamList;
                        sshMap[this.sshMd5].initPromise.resolve();
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SqlUtil.prototype.getSSHStream = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.ssh) {
                            return [2 /*return*/, Promise.resolve(null)];
                        }
                        return [4 /*yield*/, this.ssh.readyPromise];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                _this.ssh.forwardOut(_this.sshConfig.srcHost, _this.sshConfig.srcPort, _this.dbConfig.host, _this.dbConfig.port, function (err, stream) {
                                    if (err) {
                                        console.error(err);
                                        resolve(null);
                                        return;
                                    }
                                    resolve(stream);
                                });
                            })];
                }
            });
        });
    };
    SqlUtil.prototype.setConnection = function (dbConfig) {
        if (dbConfig === void 0) { dbConfig = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var connectionLimit_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSSHPromise];
                    case 1:
                        _a.sent();
                        if (poolMap[this.poolMd5] && !poolMap[this.poolMd5]._closed) {
                            //whether or not to reuse pool
                            this.pool = poolMap[this.poolMd5];
                        }
                        else {
                            connectionLimit_1 = dbConfig.connectionLimit;
                            this.pool = poolMap[this.poolMd5] = this.driver.createPool(__assign(__assign({}, dbConfig), { connectionLimit: connectionLimit_1, timezone: dbConfig.timezone || '+08:00', stream: this.ssh
                                    ? function () {
                                        _this.getSSHStream().then(function (stream) {
                                            if (stream) {
                                                _this.SSHStreamList.push(stream);
                                            }
                                        });
                                        return _this.SSHStreamList.shift();
                                    }
                                    : null }));
                            /**
                             * When the pool is using SSH, all the connections must be initialized immediately, otherwise the connections will always be in pending status.
                             */
                            if (this.ssh) {
                                return [2 /*return*/, new Promise(function (resolve) {
                                        var count = 0;
                                        for (var i = 0; i < connectionLimit_1; i++) {
                                            _this.pool.getConnection(function (e, connection) {
                                                if (!e) {
                                                    _this.releaseConnection(connection);
                                                }
                                                count += 1;
                                                if (count >= connectionLimit_1) {
                                                    resolve();
                                                }
                                            });
                                        }
                                    })];
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    SqlUtil.prototype.select = function (_a) {
        var _b = _a.fields, fields = _b === void 0 ? [] : _b, _c = _a.table, table = _c === void 0 ? '' : _c, where = _a.where, _d = _a.groupby, groupby = _d === void 0 ? '' : _d, _e = _a.orderby, orderby = _e === void 0 ? '' : _e, _f = _a.order, order = _f === void 0 ? 'desc' : _f, limit = _a.limit, _g = _a.asSql, asSql = _g === void 0 ? false : _g;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (!table) {
                            return [2 /*return*/, this.handleRes(-2001, 'The database table is not configured')];
                        }
                        sql = this.format("select " + this.getSelectFields(fields) + " from ?? ", [
                            table,
                        ]);
                        sql += this.getWhereCondition(where);
                        if (groupby) {
                            sql += this.format(' group by ?? ', [groupby]);
                        }
                        if (orderby) {
                            sql += this.format(" order by ?? " + order + " ", [orderby]);
                        }
                        if (limit) {
                            sql += this.format(' limit ?,?', [
                                Number(limit.start || 0),
                                Number(limit.size || 10),
                            ]);
                        }
                        sql += ';';
                        if (asSql) {
                            return [2 /*return*/, sql];
                        }
                        return [4 /*yield*/, this.query(sql)];
                    case 1: return [2 /*return*/, _h.sent()];
                }
            });
        });
    };
    SqlUtil.prototype.find = function (_a) {
        var _b = _a.fields, fields = _b === void 0 ? [] : _b, _c = _a.table, table = _c === void 0 ? '' : _c, _d = _a.where, where = _d === void 0 ? null : _d, _e = _a.groupby, groupby = _e === void 0 ? '' : _e, _f = _a.orderby, orderby = _f === void 0 ? '' : _f, _g = _a.order, order = _g === void 0 ? 'desc' : _g, _h = _a.limit, limit = _h === void 0 ? {
            start: 0,
            size: 1,
        } : _h, _j = _a.asSql, asSql = _j === void 0 ? false : _j;
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0: return [4 /*yield*/, this.select({
                            fields: fields,
                            table: table,
                            where: where,
                            groupby: groupby,
                            orderby: orderby,
                            order: order,
                            limit: limit,
                            asSql: asSql,
                        })];
                    case 1:
                        res = _k.sent();
                        if (res.code !== 0)
                            return [2 /*return*/, res];
                        res.data = res.data[0] || null;
                        return [2 /*return*/, res];
                }
            });
        });
    };
    SqlUtil.prototype.count = function (_a) {
        var _b = _a.field, field = _b === void 0 ? '' : _b, _c = _a.table, table = _c === void 0 ? '' : _c, _d = _a.where, where = _d === void 0 ? null : _d, _e = _a.asSql, asSql = _e === void 0 ? false : _e;
        return __awaiter(this, void 0, void 0, function () {
            var sql, resData;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!table) {
                            return [2 /*return*/, this.handleRes(-2001, 'The database table is not configured')];
                        }
                        if (!field) {
                            return [2 /*return*/, this.handleRes(-2002, 'Field `field` is not specified')];
                        }
                        sql = this.format('select count(??) as total from ?? ', [field, table]);
                        sql += this.getWhereCondition(where);
                        sql += ';';
                        if (asSql) {
                            return [2 /*return*/, sql];
                        }
                        return [4 /*yield*/, this.query(sql)];
                    case 1:
                        resData = _f.sent();
                        if (resData.code !== 0) {
                            return [2 /*return*/, resData];
                        }
                        resData.data = { total: resData.data[0].total };
                        return [2 /*return*/, resData];
                }
            });
        });
    };
    SqlUtil.prototype.insert = function (_a) {
        var fields = _a.fields, _b = _a.table, table = _b === void 0 ? '' : _b, _c = _a.data, data = _c === void 0 ? [] : _c, _d = _a.asSql, asSql = _d === void 0 ? false : _d;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!table) {
                            return [2 /*return*/, this.handleRes(-2001, 'The database table is not configured')];
                        }
                        if (fields) {
                            if (!fields.length) {
                                return [2 /*return*/, this.handleRes(-2002, 'Field `fields` is not specified')];
                            }
                            if (!Array.isArray(data) || !data.length) {
                                return [2 /*return*/, this.handleRes(-2003, 'The insert field `data` cannot be empty')];
                            }
                            sql = this.format('insert into ?? (??) values ? ;', [
                                table,
                                fields,
                                !Array.isArray(data[0]) ? [data] : data,
                            ]);
                        }
                        else {
                            sql = this.format('insert into ?? SET ? ;', [table, data]);
                        }
                        if (asSql) {
                            return [2 /*return*/, sql];
                        }
                        return [4 /*yield*/, this.query(sql)];
                    case 1: return [2 /*return*/, _e.sent()];
                }
            });
        });
    };
    SqlUtil.prototype.update = function (_a) {
        var _b = _a.table, table = _b === void 0 ? '' : _b, _c = _a.data, data = _c === void 0 ? {} : _c, _d = _a.where, where = _d === void 0 ? null : _d, _e = _a.asSql, asSql = _e === void 0 ? false : _e;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!table) {
                            return [2 /*return*/, this.handleRes(-2001, 'The database table is not configured')];
                        }
                        if (!where ||
                            !Object.keys(where).length ||
                            typeof where !== 'object' ||
                            Array.isArray(where)) {
                            return [2 /*return*/, this.handleRes(-2002, 'Field `where` is not specified which might affect all the data. please configure the `where` field.If you do not need WHERE, write the SQL statement manually.')];
                        }
                        sql = this.format('update ?? set ? ', [table, data]);
                        sql += this.getWhereCondition(where) + ';';
                        if (asSql) {
                            return [2 /*return*/, sql];
                        }
                        return [4 /*yield*/, this.query(sql)];
                    case 1: return [2 /*return*/, _f.sent()];
                }
            });
        });
    };
    SqlUtil.prototype.delete = function (_a) {
        var _b = _a.table, table = _b === void 0 ? '' : _b, _c = _a.where, where = _c === void 0 ? null : _c, _d = _a.asSql, asSql = _d === void 0 ? false : _d;
        return __awaiter(this, void 0, void 0, function () {
            var sql;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!table) {
                            return [2 /*return*/, this.handleRes(-2001, 'The database table is not configured')];
                        }
                        if (!where ||
                            !Object.keys(where).length ||
                            typeof where !== 'object' ||
                            Array.isArray(where)) {
                            return [2 /*return*/, this.handleRes(-2002, 'Field `delete` is not specified which might affect all the data. please configure the `delete` field.If you do not need DELETE, write the SQL statement manually.')];
                        }
                        sql = this.format('delete from ?? ', [table]) +
                            this.getWhereCondition(where) +
                            ';';
                        if (asSql) {
                            return [2 /*return*/, sql];
                        }
                        return [4 /*yield*/, this.query(sql)];
                    case 1: return [2 /*return*/, _e.sent()];
                }
            });
        });
    };
    SqlUtil.prototype.join = function (_a) {
        var _b = _a.leftTable, leftTable = _b === void 0 ? '' : _b, _c = _a.rightTable, rightTable = _c === void 0 ? '' : _c, _d = _a.leftFields, leftFields = _d === void 0 ? [] : _d, _e = _a.rightFields, rightFields = _e === void 0 ? [] : _e, _f = _a.joinCondition, joinCondition = _f === void 0 ? '' : _f, _g = _a.where, where = _g === void 0 ? null : _g, _h = _a.groupby, groupby = _h === void 0 ? '' : _h, _j = _a.orderby, orderby = _j === void 0 ? '' : _j, _k = _a.order, order = _k === void 0 ? 'desc' : _k, _l = _a.limit, limit = _l === void 0 ? null : _l, _m = _a.total, total = _m === void 0 ? false : _m, _o = _a.asSql, asSql = _o === void 0 ? false : _o;
        return __awaiter(this, void 0, void 0, function () {
            var leftCondition, rightCondition, _leftTable, leftAlias, _rightTable, rightAlias, leftFieldsList, rightFieldsList, sql;
            var _this = this;
            return __generator(this, function (_p) {
                switch (_p.label) {
                    case 0:
                        if (!leftTable || !rightTable) {
                            return [2 /*return*/, this.handleRes(-2001, 'The database table is not configured')];
                        }
                        if (!leftFields.length || !rightFields.length) {
                            return [2 /*return*/, this.handleRes(-2002, 'Field `leftFields` or `rightFields` is not specified')];
                        }
                        if (!joinCondition) {
                            return [2 /*return*/, this.handleRes(-2002, 'Field `joinCondition` is not specified')];
                        }
                        leftCondition = '';
                        rightCondition = '';
                        if (Array.isArray(joinCondition)) {
                            if (joinCondition.length !== 2) {
                                return [2 /*return*/, this.handleRes(-2003, 'Two values must be passed when joinCondition is an array')];
                            }
                            leftCondition = joinCondition[0];
                            rightCondition = joinCondition[1];
                        }
                        else {
                            leftCondition = joinCondition;
                            rightCondition = joinCondition;
                        }
                        _leftTable = leftTable.split(' as ')[0].trim();
                        leftAlias = (leftTable.split(' as ')[1] || _leftTable).trim();
                        _rightTable = rightTable.split(' as ')[0].trim();
                        rightAlias = (rightTable.split(' as ')[1] || _rightTable).trim();
                        leftFieldsList = leftFields.map(function (item) {
                            var _item = item.split(' as ');
                            var before = _item[0].trim();
                            var after = (_item[1] || before).trim();
                            return _this.escapeId(leftAlias + "." + before) + " as " + _this.escapeId(after);
                        });
                        rightFieldsList = rightFields.map(function (item) {
                            var _item = item.split(' as ');
                            var before = _item[0].trim();
                            var after = (_item[1] || before).trim();
                            return _this.escapeId(rightAlias + "." + before) + " as " + _this.escapeId(after);
                        });
                        sql = '';
                        if (total) {
                            sql += this.format("select count(" + this.escapeId(leftAlias + "." + leftCondition) + ") as total from ?? " + this.escapeId(leftAlias) + ",?? " + this.escapeId(rightAlias) + " where " + this.escapeId(leftAlias + "." + leftCondition) + " = " + this.escapeId(rightAlias + "." + rightCondition), [_leftTable, _rightTable]);
                        }
                        else {
                            sql += this.format("select " + leftFieldsList.join(',') + "," + rightFieldsList.join(',') + " from ?? " + this.escapeId(leftAlias) + ",?? " + this.escapeId(rightAlias) + " where " + this.escapeId(leftAlias + "." + leftCondition) + " = " + this.escapeId(rightAlias + "." + rightCondition), [_leftTable, _rightTable]);
                        }
                        sql += this.getWhereCondition(where).replace(' where ', ' and ');
                        if (groupby) {
                            sql += this.format(" group by " + this.escapeId(groupby) + " ", []);
                        }
                        if (orderby) {
                            sql += this.format(" order by " + this.escapeId(orderby) + " " + order + " ", []);
                        }
                        if (limit && !total) {
                            sql += this.format(' limit ?,?', [
                                parseInt(limit.start || 0, 10),
                                parseInt(limit.size || 10, 10),
                            ]);
                        }
                        sql += ';';
                        if (asSql) {
                            return [2 /*return*/, sql];
                        }
                        return [4 /*yield*/, this.query(sql)];
                    case 1: return [2 /*return*/, _p.sent()];
                }
            });
        });
    };
    /**
     * @return {string}
     */
    SqlUtil.prototype.getSelectFields = function (fields) {
        var _this = this;
        if (fields === void 0) { fields = []; }
        try {
            if (!fields.length)
                return '*';
            var fieldsArr_1 = [];
            fields.forEach(function (item) {
                if (String(item)
                    .toUpperCase()
                    .indexOf(' AS ') >= 0) {
                    var field = String(item)
                        .replace(' as ', ' AS ')
                        .split(' AS ');
                    var first = field[0].trim();
                    var second = field[1].trim();
                    if (first && second) {
                        fieldsArr_1.push(_this.format('?? AS ??', [first, second]));
                    }
                    else {
                        fieldsArr_1.push(first);
                    }
                }
                else {
                    fieldsArr_1.push(item);
                }
            });
            return fieldsArr_1.join(',');
        }
        catch (e) {
            console.log('-----------errror fields---------', e);
            return '*';
        }
    };
    SqlUtil.prototype.getWhereCondition = function (where) {
        var _this = this;
        if (where === void 0) { where = null; }
        var sql = '';
        if (!where || !Object.keys(where).length) {
            return sql;
        }
        var isConditionArray = Array.isArray(where); //object or array type
        var keys = isConditionArray ? where : Object.keys(where);
        sql += ' where ';
        keys.forEach(function (keyOrObject, index) {
            var key = isConditionArray ? keyOrObject.field : keyOrObject;
            var keyObject = isConditionArray ? keyOrObject : where[key];
            var comp = typeof keyObject === 'object' && keyObject.condition
                ? keyObject.condition
                : '=';
            var value = typeof keyObject === 'object' && typeof keyObject.value !== 'undefined'
                ? keyObject.value
                : keyObject;
            var combineCondition = typeof keyObject === 'object' && key === 'combineCondition';
            var join = typeof keyObject === 'object' && keyObject.or ? 'or' : 'and';
            var like = typeof keyObject === 'object' && keyObject.like;
            var position = typeof keyObject === 'object' && keyObject.position;
            var between = typeof keyObject === 'object' && keyObject.between;
            if (Array.isArray(value) && !between) {
                sql +=
                    (index === 0 ? '' : join) + " " +
                        _this.format(' ?? in (?) ', [key, value]);
            }
            else if (like || position) {
                if (like) {
                    sql += _this.format(" " + (index === 0 ? '' : join) + " " + _this.escapeId(key) + " like ? ", ["%" + value + "%"]);
                }
                else {
                    sql += _this.format(" " + (index === 0 ? '' : join) + " " + ("POSITION(? in " + _this.escapeId(key) + ")") + " ", [value]);
                }
            }
            else if (Array.isArray(value) && between) {
                sql += _this.format(" " + (index === 0 ? '' : join) + " " + (_this.escapeId(key) + " " + (keyObject.not ? 'not between' : 'between') + " ? and ?") + " ", [value[0], value[1]]);
            }
            else if (combineCondition) {
                console.log('============', _this.getWhereCondition(keyObject.fields || keyObject.where));
                sql += (index === 0 ? '' : join) + " (" + _this.getWhereCondition(keyObject.fields || keyObject.where).replace(/^\s+?where\s/gi, ' ') + ") ";
            }
            else {
                sql += _this.format(" " + (index === 0 ? '' : join) + " " + (_this.escapeId(key) + " " + comp + " ?") + " ", [value]);
            }
        });
        return sql;
    };
    SqlUtil.prototype.query = function (sql, returnRes) {
        if (sql === void 0) { sql = ''; }
        if (returnRes === void 0) { returnRes = true; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connectionInitPromise];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (resolve) {
                                if (!_this.pool)
                                    resolve(_this.handleRes(-1005, 'Connection failed, connection pool is empty, please check configuration'));
                                _this.pool.getConnection(function (e, connection) {
                                    if (e) {
                                        resolve(_this.handleRes(-1003, 'Connection failed'));
                                    }
                                    else {
                                        connection.query(sql, function (err, rows) {
                                            _this.releaseConnection(connection);
                                            if (err) {
                                                resolve(_this.handleRes(-1004, err.message || 'Data query failed', {}));
                                            }
                                            else {
                                                resolve(_this.handleRes(0, 'success', { data: returnRes ? rows : [] }));
                                            }
                                        });
                                    }
                                });
                            })];
                }
            });
        });
    };
    SqlUtil.prototype.beginTransaction = function (queryList, showlog) {
        if (queryList === void 0) { queryList = []; }
        if (showlog === void 0) { showlog = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connectionInitPromise];
                    case 1:
                        _a.sent();
                        if (!queryList.length) {
                            return [2 /*return*/, this.handleRes(-2003, 'Missing transaction queue')];
                        }
                        return [2 /*return*/, new Promise(function (resolve) {
                                _this.pool.getConnection(function (e, connection) {
                                    if (e) {
                                        resolve(_this.handleRes(-1003, 'Connection failed'));
                                    }
                                    else {
                                        connection.beginTransaction(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                            var isOk, errData_1, i, res;
                                            var _this = this;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        if (!err) return [3 /*break*/, 1];
                                                        this.releaseConnection(connection);
                                                        resolve(this.handleRes(-1003, 'Transaction startup failed'));
                                                        return [3 /*break*/, 6];
                                                    case 1:
                                                        isOk = true;
                                                        errData_1 = {};
                                                        i = 0;
                                                        _a.label = 2;
                                                    case 2:
                                                        if (!(i < queryList.length)) return [3 /*break*/, 5];
                                                        return [4 /*yield*/, this.connectionQuery(connection, queryList[i], showlog)];
                                                    case 3:
                                                        res = _a.sent();
                                                        if (res.code !== 0) {
                                                            isOk = false;
                                                            errData_1 = res;
                                                            return [3 /*break*/, 5];
                                                        }
                                                        _a.label = 4;
                                                    case 4:
                                                        i++;
                                                        return [3 /*break*/, 2];
                                                    case 5:
                                                        if (isOk) {
                                                            connection.commit(function (err) {
                                                                if (err) {
                                                                    resolve(_this.handleRes(-1006, 'Transaction submission failed ' + (err.message || ''), showlog ? { err: err } : {}));
                                                                }
                                                                else {
                                                                    resolve(_this.handleRes(0, 'success'));
                                                                }
                                                                _this.releaseConnection(connection);
                                                            });
                                                        }
                                                        else {
                                                            connection.rollback(function () {
                                                                resolve(_this.handleRes(-1007, 'Transaction execution failed', showlog ? { err: errData_1 } : {}));
                                                                _this.releaseConnection(connection);
                                                            });
                                                        }
                                                        _a.label = 6;
                                                    case 6: return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                    }
                                });
                            })];
                }
            });
        });
    };
    SqlUtil.prototype.connectionQuery = function (connection, sql, showlog) {
        if (showlog === void 0) { showlog = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        connection.query(sql, function (err, rows) {
                            if (err) {
                                resolve(_this.handleRes(-1004, 'Data query failed', {}));
                            }
                            else {
                                resolve(_this.handleRes(0, 'success'));
                            }
                        });
                    })];
            });
        });
    };
    SqlUtil.prototype.runTransaction = function (run, showlog) {
        if (showlog === void 0) { showlog = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connectionInitPromise];
                    case 1:
                        _a.sent();
                        if (!run) {
                            throw new Error('必须传入事务函数');
                        }
                        return [2 /*return*/, new Promise(function (resolve) {
                                _this.pool.getConnection(function (e, connection) {
                                    if (e) {
                                        resolve(_this.handleRes(-1003, 'Connection failed'));
                                    }
                                    else {
                                        connection.beginTransaction(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                            var newSqlUtil, runResult_1, isOk_1, e_1;
                                            var _this = this;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        if (!err) return [3 /*break*/, 1];
                                                        this.releaseConnection(connection);
                                                        resolve(this.handleRes(-1003, 'Transaction startup failed'));
                                                        return [3 /*break*/, 6];
                                                    case 1:
                                                        newSqlUtil = new SqlUtil(this.props);
                                                        /**
                                                         * The temporary sqlUtil must return the connections corresponding to the transaction.
                                                         */
                                                        newSqlUtil.query = function (sql, returnRes) {
                                                            if (sql === void 0) { sql = ''; }
                                                            if (returnRes === void 0) { returnRes = true; }
                                                            return __awaiter(this, void 0, void 0, function () {
                                                                var _this = this;
                                                                return __generator(this, function (_a) {
                                                                    return [2 /*return*/, new Promise(function (resolve) {
                                                                            connection.query(sql, function (err, rows) {
                                                                                if (err) {
                                                                                    resolve(_this.handleRes(-1004, err.message || 'Data query failed', {}));
                                                                                }
                                                                                else {
                                                                                    resolve(_this.handleRes(0, 'success', {
                                                                                        data: returnRes ? rows : [],
                                                                                    }));
                                                                                }
                                                                            });
                                                                        })];
                                                                });
                                                            });
                                                        };
                                                        isOk_1 = true;
                                                        _a.label = 2;
                                                    case 2:
                                                        _a.trys.push([2, 4, , 5]);
                                                        return [4 /*yield*/, run({
                                                                sqlUtil: newSqlUtil,
                                                                rollback: function (res) {
                                                                    runResult_1 = res;
                                                                    isOk_1 = false;
                                                                },
                                                                commit: function () {
                                                                    isOk_1 = true;
                                                                },
                                                            })];
                                                    case 3:
                                                        _a.sent();
                                                        return [3 /*break*/, 5];
                                                    case 4:
                                                        e_1 = _a.sent();
                                                        isOk_1 = false;
                                                        return [3 /*break*/, 5];
                                                    case 5:
                                                        if (!isOk_1) {
                                                            connection.rollback(function () {
                                                                resolve(_this.handleRes(-1007, 'Transaction execution failed', showlog
                                                                    ? {
                                                                        err: runResult_1,
                                                                    }
                                                                    : {}));
                                                                _this.releaseConnection(connection);
                                                            });
                                                        }
                                                        else {
                                                            connection.commit(function (err) {
                                                                if (err) {
                                                                    resolve(_this.handleRes(-1006, 'Transaction submission failed' + (err.message || ''), showlog ? { err: err } : {}));
                                                                }
                                                                else {
                                                                    resolve(_this.handleRes(0, 'success'));
                                                                }
                                                                _this.releaseConnection(connection);
                                                            });
                                                        }
                                                        _a.label = 6;
                                                    case 6: return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                    }
                                });
                            })];
                }
            });
        });
    };
    SqlUtil.prototype.getMd5 = function (text) {
        if (text === void 0) { text = ''; }
        var md5 = _crypto.createHash('md5');
        return md5.update(text).digest('hex');
    };
    SqlUtil.prototype.replaceDangerChar = function (word) {
        if (word === void 0) { word = ''; }
        return word.replace(/['"]/gi, '');
    };
    SqlUtil.prototype.handleRes = function (code, message, obj) {
        if (code === void 0) { code = 0; }
        if (message === void 0) { message = ''; }
        if (obj === void 0) { obj = {}; }
        return __assign({ code: code, subcode: 0, message: message, default: 0, data: [] }, obj);
    };
    SqlUtil.prototype.releaseConnection = function (conn) {
        if (conn === void 0) { conn = {}; }
        if (this.endReleaseType === 'end') {
            conn.end && conn.end();
        }
        else {
            conn.release && conn.release();
        }
    };
    return SqlUtil;
}());
exports.default = SqlUtil;
module.exports = SqlUtil;
module.exports.default = SqlUtil;
