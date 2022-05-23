"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getSelfPromise_1 = __importDefault(require("./getSelfPromise"));
const onProcessKill_1 = __importDefault(require("./onProcessKill"));
const sqlstring = require('./sqlstring');
const mysql = require('mysql2');
const Client = require('ssh2').Client;
const _crypto = require('crypto');
//reuse pool
const poolMap = {};
//reuse SSH pool
const sshMap = {};
// When the process is closed, clear the SSH connection
onProcessKill_1.default(() => {
    Object.values(sshMap).forEach(({ ssh }) => {
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
class SqlUtil {
    constructor(props) {
        this.sshMd5 = '';
        this.props = props;
        this.driver = props.driver || mysql;
        this.pool = null;
        this.returnOriginError = !!props.returnOriginError;
        this.returnOriginSource = !!props.returnOriginSource;
        this.poolMd5 = this.getMd5(JSON.stringify(props)); //The configuration information is the connection pool unique ID
        this.dbConfig = {
            ...props.dbConfig,
            connectionLimit: (props.dbConfig && props.dbConfig.connectionLimit) || 10,
        };
        this.endReleaseType = props.endReleaseType || 'release'; // release, end
        this.format = sqlstring.format;
        this.escape = sqlstring.escape;
        this.raw = sqlstring.raw;
        this.escapeId = sqlstring.escapeId;
        this.initSSHPromise = this.initSSH(props);
        this.connectionInitPromise = this.setConnection(this.dbConfig);
    }
    async initSSH(props) {
        this.sshConfig = props.ssh;
        if (!this.sshConfig) {
            return;
        }
        /**
         * use database configuration and SSH configuration to distinguish SSH
         */
        this.sshMd5 = this.poolMd5 + this.getMd5(JSON.stringify(this.sshConfig));
        if (sshMap[this.sshMd5]) {
            this.ssh = sshMap[this.sshMd5].ssh;
            this.SSHStreamList = sshMap[this.sshMd5].streamList;
            await sshMap[this.sshMd5].initPromise;
        }
        else {
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
            this.ssh.once('ready', () => {
                this.ssh.readyPromise.resolve();
            });
            // ssh 'keyboard-interactive' login
            this.ssh.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
                finish([(this.sshConfig && this.sshConfig.password) || '']);
            });
            // cache ssh
            sshMap[this.sshMd5] = {
                ssh: this.ssh,
                streamList: [],
                initPromise: getSelfPromise_1.default(),
            };
            // ssh queue: The number of ssh stream is equal to the pool's
            const SSHStreamList = await Promise.all([...Array(this.dbConfig.connectionLimit)].map(() => this.getSSHStream()));
            /**
             * The streamList in the cache must be reused, because when await promise,
             * there may be another SqlUtil initialized, which uses sshMap[this.sshMd5].streamList.
             * Therefore the streamList array must be public and can not be replaced.
             */
            sshMap[this.sshMd5].streamList.push(...SSHStreamList.filter(v => v));
            this.SSHStreamList = sshMap[this.sshMd5].streamList;
            sshMap[this.sshMd5].initPromise.resolve();
        }
    }
    async getSSHStream() {
        if (!this.ssh) {
            return Promise.resolve(null);
        }
        await this.ssh.readyPromise;
        return new Promise((resolve, reject) => {
            this.ssh.forwardOut(this.sshConfig.srcHost, this.sshConfig.srcPort, this.dbConfig.host, this.dbConfig.port, (err, stream) => {
                if (err) {
                    console.error(err);
                    resolve(null);
                    return;
                }
                resolve(stream);
            });
        });
    }
    async setConnection(dbConfig = {}) {
        await this.initSSHPromise;
        if (poolMap[this.poolMd5] && !poolMap[this.poolMd5]._closed) {
            //whether or not to reuse pool
            this.pool = poolMap[this.poolMd5];
        }
        else {
            const connectionLimit = dbConfig.connectionLimit;
            this.pool = poolMap[this.poolMd5] = this.driver.createPool({
                ...dbConfig,
                connectionLimit,
                timezone: dbConfig.timezone || '+08:00',
                stream: this.ssh
                    ? () => {
                        this.getSSHStream().then(stream => {
                            if (stream) {
                                this.SSHStreamList.push(stream);
                            }
                        });
                        return this.SSHStreamList.shift();
                    }
                    : null,
            });
            /**
             * When the pool is using SSH, all the connections must be initialized immediately, otherwise the connections will always be in pending status.
             */
            if (this.ssh) {
                return new Promise(resolve => {
                    let count = 0;
                    for (let i = 0; i < connectionLimit; i++) {
                        this.pool.getConnection((e, connection) => {
                            if (!e) {
                                this.releaseConnection(connection);
                            }
                            count += 1;
                            if (count >= connectionLimit) {
                                resolve();
                            }
                        });
                    }
                });
            }
        }
    }
    async select({ fields = [], table = '', where, groupby = '', orderby = '', order = 'desc', orders = null, limit, asSql = false, }) {
        if (!table) {
            return this.handleRes(-2001, 'The database table is not configured');
        }
        let sql = this.format(`select ${this.getSelectFields(fields)} from ?? `, [
            table,
        ]);
        sql += this.getWhereCondition(where);
        if (groupby) {
            sql += this.format(' group by ?? ', [groupby]);
        }
        if (orders || orderby) {
            sql += this.getOrderby({ orders, orderby, order });
        }
        if (limit) {
            sql += this.format(' limit ?,?', [
                Number(limit.start || 0),
                Number(limit.size || 10),
            ]);
        }
        sql += ';';
        if (asSql) {
            return sql;
        }
        return await this.query(sql);
    }
    async find({ fields = [], table = '', where = null, groupby = '', orderby = '', order = 'desc', orders = null, limit = {
        start: 0,
        size: 1,
    }, asSql = false, }) {
        const res = await this.select({
            fields,
            table,
            where,
            groupby,
            orderby,
            order,
            orders,
            limit,
            asSql,
        });
        if (res.code !== 0)
            return res;
        res.data = res.data[0] || null;
        return res;
    }
    async count({ field = '', table = '', where = null, asSql = false }) {
        if (!table) {
            return this.handleRes(-2001, 'The database table is not configured');
        }
        if (!field) {
            return this.handleRes(-2002, 'Field `field` is not specified');
        }
        let sql = this.format('select count(??) as total from ?? ', [field, table]);
        sql += this.getWhereCondition(where);
        sql += ';';
        if (asSql) {
            return sql;
        }
        const resData = await this.query(sql);
        if (resData.code !== 0) {
            return resData;
        }
        resData.data = { total: resData.data[0].total };
        return resData;
    }
    async insert({ fields, table = '', data = [], asSql = false, }) {
        if (!table) {
            return this.handleRes(-2001, 'The database table is not configured');
        }
        let sql;
        if (fields) {
            if (!fields.length) {
                return this.handleRes(-2002, 'Field `fields` is not specified');
            }
            if (!Array.isArray(data) || !data.length) {
                return this.handleRes(-2003, 'The insert field `data` cannot be empty');
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
            return sql;
        }
        return await this.query(sql);
    }
    async update({ table = '', data = {}, where = null, asSql = false }) {
        if (!table) {
            return this.handleRes(-2001, 'The database table is not configured');
        }
        if (!where ||
            !Object.keys(where).length ||
            typeof where !== 'object' ||
            Array.isArray(where)) {
            return this.handleRes(-2002, 'Field `where` is not specified which might affect all the data. please configure the `where` field.If you do not need WHERE, write the SQL statement manually.');
        }
        let sql = this.format('update ?? set ? ', [table, data]);
        sql += this.getWhereCondition(where) + ';';
        if (asSql) {
            return sql;
        }
        return await this.query(sql);
    }
    async delete({ table = '', where = null, asSql = false }) {
        if (!table) {
            return this.handleRes(-2001, 'The database table is not configured');
        }
        if (!where ||
            !Object.keys(where).length ||
            typeof where !== 'object' ||
            Array.isArray(where)) {
            return this.handleRes(-2002, 'Field `delete` is not specified which might affect all the data. please configure the `delete` field.If you do not need DELETE, write the SQL statement manually.');
        }
        const sql = this.format('delete from ?? ', [table]) +
            this.getWhereCondition(where) +
            ';';
        if (asSql) {
            return sql;
        }
        return await this.query(sql);
    }
    async join({ leftTable = '', rightTable = '', leftFields = [], rightFields = [], joinCondition = '', where = null, groupby = '', orderby = '', order = 'desc', orders = null, limit = null, total = false, asSql = false, }) {
        if (!leftTable || !rightTable) {
            return this.handleRes(-2001, 'The database table is not configured');
        }
        if (!leftFields.length || !rightFields.length) {
            return this.handleRes(-2002, 'Field `leftFields` or `rightFields` is not specified');
        }
        if (!joinCondition) {
            return this.handleRes(-2002, 'Field `joinCondition` is not specified');
        }
        let leftCondition = '';
        let rightCondition = '';
        if (Array.isArray(joinCondition)) {
            if (joinCondition.length !== 2) {
                return this.handleRes(-2003, 'Two values must be passed when joinCondition is an array');
            }
            leftCondition = joinCondition[0];
            rightCondition = joinCondition[1];
        }
        else {
            leftCondition = joinCondition;
            rightCondition = joinCondition;
        }
        const _leftTable = leftTable.split(' as ')[0].trim();
        const leftAlias = (leftTable.split(' as ')[1] || _leftTable).trim();
        const _rightTable = rightTable.split(' as ')[0].trim();
        const rightAlias = (rightTable.split(' as ')[1] || _rightTable).trim();
        const leftFieldsList = leftFields.map((item) => {
            const _item = item.split(' as ');
            const before = _item[0].trim();
            const after = (_item[1] || before).trim();
            return `${this.escapeId(`${leftAlias}.${before}`)} as ${this.escapeId(after)}`;
        });
        const rightFieldsList = rightFields.map((item) => {
            const _item = item.split(' as ');
            const before = _item[0].trim();
            const after = (_item[1] || before).trim();
            return `${this.escapeId(`${rightAlias}.${before}`)} as ${this.escapeId(after)}`;
        });
        let sql = '';
        if (total) {
            sql += this.format(`select count(${this.escapeId(`${leftAlias}.${leftCondition}`)}) as total from ?? ${this.escapeId(leftAlias)},?? ${this.escapeId(rightAlias)} where ${this.escapeId(`${leftAlias}.${leftCondition}`)} = ${this.escapeId(`${rightAlias}.${rightCondition}`)}`, [_leftTable, _rightTable]);
        }
        else {
            sql += this.format(`select ${leftFieldsList.join(',')},${rightFieldsList.join(',')} from ?? ${this.escapeId(leftAlias)},?? ${this.escapeId(rightAlias)} where ${this.escapeId(`${leftAlias}.${leftCondition}`)} = ${this.escapeId(`${rightAlias}.${rightCondition}`)}`, [_leftTable, _rightTable]);
        }
        sql += this.getWhereCondition(where).replace(' where ', ' and ');
        if (groupby) {
            sql += this.format(` group by ${this.escapeId(groupby)} `, []);
        }
        if (orders || orderby) {
            sql += this.getOrderby({ orders, orderby, order });
        }
        if (limit && !total) {
            sql += this.format(' limit ?,?', [
                parseInt(limit.start || 0, 10),
                parseInt(limit.size || 10, 10),
            ]);
        }
        sql += ';';
        if (asSql) {
            return sql;
        }
        return await this.query(sql);
    }
    /**
     * @return {string}
     */
    getSelectFields(fields = []) {
        try {
            if (!fields.length)
                return '*';
            const fieldsArr = [];
            fields.forEach(item => {
                if (String(item)
                    .toUpperCase()
                    .indexOf(' AS ') >= 0) {
                    const field = String(item)
                        .replace(' as ', ' AS ')
                        .split(' AS ');
                    const first = field[0].trim();
                    const second = field[1].trim();
                    if (first && second) {
                        fieldsArr.push(this.format('?? AS ??', [first, second]));
                    }
                    else {
                        fieldsArr.push(first);
                    }
                }
                else {
                    fieldsArr.push(item);
                }
            });
            return fieldsArr.join(',');
        }
        catch (e) {
            console.log('-----------errror fields---------', e);
            return '*';
        }
    }
    getWhereCondition(where = null) {
        let sql = '';
        if (!where || !Object.keys(where).length) {
            return sql;
        }
        const isConditionArray = Array.isArray(where); //object or array type
        const keys = isConditionArray ? where : Object.keys(where);
        sql += ' where ';
        keys.forEach((keyOrObject, index) => {
            const key = isConditionArray ? keyOrObject.field : keyOrObject;
            const keyObject = isConditionArray ? keyOrObject : where[key];
            const comp = typeof keyObject === 'object' && keyObject.condition
                ? keyObject.condition
                : '=';
            const value = typeof keyObject === 'object' && typeof keyObject.value !== 'undefined'
                ? keyObject.value
                : keyObject;
            const combineCondition = typeof keyObject === 'object' && key === 'combineCondition';
            const join = typeof keyObject === 'object' && keyObject.or ? 'or' : 'and';
            const like = typeof keyObject === 'object' && keyObject.like;
            const position = typeof keyObject === 'object' && keyObject.position;
            const between = typeof keyObject === 'object' && keyObject.between;
            if (Array.isArray(value) && !between) {
                sql +=
                    `${index === 0 ? '' : join} ` +
                        this.format(` ?? ${keyObject.notIn ? 'not ' : ''}in (?) `, [key, value]);
            }
            else if (like || position) {
                if (like) {
                    sql += this.format(` ${index === 0 ? '' : join} ${this.escapeId(key)} like ? `, [`%${value}%`]);
                }
                else {
                    sql += this.format(` ${index === 0 ? '' : join} ${`POSITION(? in ${this.escapeId(key)})`} `, [value]);
                }
            }
            else if (Array.isArray(value) && between) {
                sql += this.format(` ${index === 0 ? '' : join} ${`${this.escapeId(key)} ${keyObject.not ? 'not between' : 'between'} ? and ?`} `, [value[0], value[1]]);
            }
            else if (combineCondition) {
                sql += `${index === 0 ? '' : join} (${this.getWhereCondition(keyObject.fields || keyObject.where).replace(/^\s+?where\s/gi, ' ')}) `;
            }
            else {
                sql += this.format(` ${index === 0 ? '' : join} ${`${this.escapeId(key)} ${comp} ?`} `, [value]);
            }
        });
        return sql;
    }
    async query(sql = '', returnRes = true) {
        await this.connectionInitPromise;
        return new Promise(resolve => {
            if (!this.pool)
                resolve(this.handleRes(-1005, 'Connection failed, connection pool is empty, please check configuration'));
            this.pool.getConnection((e, connection) => {
                if (e) {
                    this.resolveConnectFail(resolve, e);
                }
                else {
                    connection.query(sql, (err, rows) => {
                        this.releaseConnection(connection);
                        if (err) {
                            this.resolveQueryFail(resolve, err, err.message);
                        }
                        else {
                            resolve(this.handleRes(0, 'success', { data: returnRes || this.returnOriginSource ? rows : [] }));
                        }
                    });
                }
            });
        });
    }
    async beginTransaction(queryList = [], showlog = false) {
        await this.connectionInitPromise;
        if (!queryList.length) {
            return this.handleRes(-2003, 'Missing transaction queue');
        }
        return new Promise(resolve => {
            this.pool.getConnection((e, connection) => {
                if (e) {
                    this.resolveConnectFail(resolve, e);
                }
                else {
                    connection.beginTransaction(async (err) => {
                        if (err) {
                            this.releaseConnection(connection);
                            this.resolveConnectFail(resolve, err, 'Transaction startup failed');
                        }
                        else {
                            let isOk = true;
                            let errData = {};
                            for (let i = 0; i < queryList.length; i++) {
                                const res = await this.connectionQuery(connection, queryList[i], showlog);
                                if (res.code !== 0) {
                                    isOk = false;
                                    errData = res;
                                    break;
                                }
                            }
                            if (isOk) {
                                connection.commit((err) => {
                                    if (err) {
                                        this.resolveCommitFail(resolve, err, 'Transaction submission failed ' + (err.message || ''));
                                    }
                                    else {
                                        resolve(this.handleRes(0, 'success'));
                                    }
                                    this.releaseConnection(connection);
                                });
                            }
                            else {
                                connection.rollback(() => {
                                    this.resolveTransationFail(resolve, errData);
                                    this.releaseConnection(connection);
                                });
                            }
                        }
                    });
                }
            });
        });
    }
    async connectionQuery(connection, sql, showlog = false) {
        return new Promise(resolve => {
            connection.query(sql, (err, rows) => {
                if (err) {
                    this.resolveQueryFail(resolve, err);
                }
                else {
                    resolve(this.handleRes(0, 'success'));
                }
            });
        });
    }
    async runTransaction(run, showlog = false) {
        await this.connectionInitPromise;
        if (!run) {
            throw new Error('A transaction function must be passed in');
        }
        return new Promise(resolve => {
            this.pool.getConnection((e, connection) => {
                if (e) {
                    this.resolveConnectFail(resolve, e);
                }
                else {
                    connection.beginTransaction(async (err) => {
                        if (err) {
                            this.releaseConnection(connection);
                            this.resolveConnectFail(resolve, err, 'Transaction startup failed');
                        }
                        else {
                            const newSqlUtil = new SqlUtil(this.props);
                            /**
                             * The temporary sqlUtil must return the connections corresponding to the transaction.
                             */
                            newSqlUtil.query = async function (sql = '', returnRes = true) {
                                return new Promise(resolve => {
                                    connection.query(sql, (err, rows) => {
                                        if (err) {
                                            this.resolveQueryFail(resolve, err);
                                        }
                                        else {
                                            resolve(this.handleRes(0, 'success', {
                                                data: returnRes ? rows : [],
                                            }));
                                        }
                                    });
                                });
                            };
                            let runResult;
                            let isOk = true;
                            try {
                                await run({
                                    sqlUtil: newSqlUtil,
                                    rollback: res => {
                                        runResult = res;
                                        isOk = false;
                                    },
                                    commit: () => {
                                        isOk = true;
                                    },
                                });
                            }
                            catch (e) {
                                isOk = false;
                            }
                            if (!isOk) {
                                connection.rollback(() => {
                                    this.resolveTransationFail(resolve, runResult);
                                    this.releaseConnection(connection);
                                });
                            }
                            else {
                                connection.commit((err) => {
                                    if (err) {
                                        this.resolveCommitFail(resolve, err, 'Transaction submission failed ' + (err.message || ''));
                                    }
                                    else {
                                        resolve(this.handleRes(0, 'success'));
                                    }
                                    this.releaseConnection(connection);
                                });
                            }
                        }
                    });
                }
            });
        });
    }
    resolveConnectFail(resolve, error, message) {
        if (this.returnOriginError) {
            resolve({ code: -1003, error });
        }
        else {
            resolve(this.handleRes(-1003, message || 'Connection failed'));
        }
    }
    resolveQueryFail(resolve, error, message) {
        if (this.returnOriginError) {
            resolve({ code: -1004, error });
        }
        else {
            resolve(this.handleRes(-1004, message || 'Data query failed'));
        }
    }
    resolveTransationFail(resolve, error, message) {
        if (this.returnOriginError) {
            resolve({ code: -1007, error });
        }
        else {
            resolve(this.handleRes(-1007, message || 'Transaction execution failed'));
        }
    }
    resolveCommitFail(resolve, error, message) {
        if (this.returnOriginError) {
            resolve({ code: -1006, error });
        }
        else {
            resolve(this.handleRes(-1006, message || 'Transaction submission failed'));
        }
    }
    getMd5(text = '') {
        const md5 = _crypto.createHash('md5');
        return md5.update(text).digest('hex');
    }
    replaceDangerChar(word = '') {
        return word.replace(/['"]/gi, '');
    }
    handleRes(code = 0, message = '', obj = {}) {
        return {
            code,
            subcode: 0,
            message,
            default: 0,
            data: [],
            ...obj,
        };
    }
    releaseConnection(conn = {}) {
        if (this.endReleaseType === 'end') {
            conn.end && conn.end();
        }
        else {
            conn.release && conn.release();
        }
    }
    getOrderby(_orders) {
        let { orders, order, orderby } = _orders || {};
        let str = '';
        if (!orders && orderby) {
            return this.format(` order by ?? ${order}`, [orderby]);
        }
        if (!(orders instanceof Array || Array.isArray(orders))) {
            orders = [orders];
        }
        orders.forEach((item, index) => {
            let { order, by } = item || {};
            if (order && by) {
                str += this.format(`${index ? ', ' : ` order by `}?? ${order}`, [by]);
            }
        });
        return str;
    }
}
exports.default = SqlUtil;
module.exports = SqlUtil;
module.exports.default = SqlUtil;
