import getSelfPromise, { SelfPromise } from './getSelfPromise'
import onProcessKill from './onProcessKill'
const sqlstring = require('./sqlstring')
const mysql = require('mysql2')
const Client = require('ssh2').Client
const _crypto = require('crypto')

//reuse pool
const poolMap: { [index: string]: any } = {}

//reuse SSH pool
const sshMap: {
  [index: string]: {
    ssh: any
    streamList: any[]
    initPromise: SelfPromise<void>
  }
} = {}

// When the process is closed, clear the SSH connection
onProcessKill(() => {
  Object.values(sshMap).forEach(({ ssh }) => {
    try {
      ssh.end()
    } catch (e) {
      console.error('e', e)
    }
  })
})

interface PropsType {
  driver?: any;
  dbConfig: {
    host: string
    port: string
    database: string
    user: string
    password: string
    connectionLimit?: number
  }
  endReleaseType?: 'release' | 'end'
  returnOriginError?: boolean // return original sql error infomation
  returnOriginSource?: boolean // return original sql success infomation
  ssh?: {
    srcHost: string
    srcPort: number
    host: string
    port: 36000
    username: string
    password: string
  }
}

/**
 * sqlUtil
 */
class SqlUtil {
  props: PropsType
  driver: PropsType["driver"]
  pool: any
  returnOriginError: boolean
  returnOriginSource: boolean
  poolMd5: string
  dbConfig: PropsType['dbConfig']
  endReleaseType: any
  format: any
  escape: any
  raw: any
  escapeId: any
  initSSHPromise: Promise<void>
  connectionInitPromise: Promise<void>
  sshConfig: PropsType['ssh']
  ssh: any
  SSHStreamList: any
  sshMd5 = ''

  constructor(props: PropsType) {
    this.props = props
    this.driver = props.driver || mysql;
    this.pool = null
    this.returnOriginError = !!props.returnOriginError
    this.returnOriginSource = !!props.returnOriginSource
    this.poolMd5 = this.getMd5(JSON.stringify(props)) //The configuration information is the connection pool unique ID
    this.dbConfig = {
      ...props.dbConfig,
      connectionLimit: (props.dbConfig && props.dbConfig.connectionLimit) || 10,
    }
    this.endReleaseType = props.endReleaseType || 'release' // release, end
    this.format = sqlstring.format
    this.escape = sqlstring.escape
    this.raw = sqlstring.raw
    this.escapeId = sqlstring.escapeId
    this.initSSHPromise = this.initSSH(props)
    this.connectionInitPromise = this.setConnection(this.dbConfig)
  }
  async initSSH(props: any) {
    this.sshConfig = props.ssh

    if (!this.sshConfig) {
      return
    }

    /**
     * use database configuration and SSH configuration to distinguish SSH
     */
    this.sshMd5 = this.poolMd5 + this.getMd5(JSON.stringify(this.sshConfig))

    if (sshMap[this.sshMd5]) {
      this.ssh = sshMap[this.sshMd5].ssh
      this.SSHStreamList = sshMap[this.sshMd5].streamList
      await sshMap[this.sshMd5].initPromise
    } else {
      this.ssh = new Client()
      this.ssh.connect({
        host: this.sshConfig.host,
        port: this.sshConfig.port,
        username: this.sshConfig.username,
        password: this.sshConfig.password,
        tryKeyboard: true,
      })

      // ssh initialization
      this.ssh.readyPromise = getSelfPromise()
      this.ssh.once('ready', () => {
        this.ssh.readyPromise.resolve()
      })

      // ssh 'keyboard-interactive' login
      this.ssh.on(
        'keyboard-interactive',
        (
          name: any,
          instructions: any,
          instructionsLang: any,
          prompts: any,
          finish: any
        ) => {
          finish([(this.sshConfig && this.sshConfig.password) || ''])
        }
      )

      // cache ssh
      sshMap[this.sshMd5] = {
        ssh: this.ssh,
        streamList: [],
        initPromise: getSelfPromise(),
      }

      // ssh queue: The number of ssh stream is equal to the pool's
      const SSHStreamList = await Promise.all(
        [...Array(this.dbConfig.connectionLimit)].map(() => this.getSSHStream())
      )

      /**
       * The streamList in the cache must be reused, because when await promise,
       * there may be another SqlUtil initialized, which uses sshMap[this.sshMd5].streamList.
       * Therefore the streamList array must be public and can not be replaced.
       */
      sshMap[this.sshMd5].streamList.push(...SSHStreamList.filter(v => v))

      this.SSHStreamList = sshMap[this.sshMd5].streamList

      sshMap[this.sshMd5].initPromise.resolve()
    }
  }
  async getSSHStream() {
    if (!this.ssh) {
      return Promise.resolve(null)
    }

    await this.ssh.readyPromise

    return new Promise((resolve, reject) => {
      this.ssh.forwardOut(
        this.sshConfig!.srcHost,
        this.sshConfig!.srcPort,
        this.dbConfig.host,
        this.dbConfig.port,
        (err: any, stream: any) => {
          if (err) {
            console.error(err)
            resolve(null)
            return
          }
          resolve(stream)
        }
      )
    })
  }
  async setConnection(dbConfig: any = {}) {
    await this.initSSHPromise

    if (poolMap[this.poolMd5] && !poolMap[this.poolMd5]._closed) {
      //whether or not to reuse pool
      this.pool = poolMap[this.poolMd5]
    } else {
      const connectionLimit = dbConfig.connectionLimit
      this.pool = poolMap[this.poolMd5] = this.driver.createPool({
        ...dbConfig,
        connectionLimit,
        timezone: dbConfig.timezone || '+08:00',
        stream: this.ssh
          ? () => {
            this.getSSHStream().then(stream => {
              if (stream) {
                this.SSHStreamList.push(stream)
              }
            })
            return this.SSHStreamList.shift()
          }
          : null,
      })

      /**
       * When the pool is using SSH, all the connections must be initialized immediately, otherwise the connections will always be in pending status.
       */
      if (this.ssh) {
        return new Promise<void>(resolve => {
          let count = 0
          for (let i = 0; i < connectionLimit; i++) {
            this.pool.getConnection((e: Error, connection: any) => {
              if (!e) {
                this.releaseConnection(connection)
              }

              count += 1
              if (count >= connectionLimit) {
                resolve()
              }
            })
          }
        })
      }
    }
  }
  async select({
    fields = [],
    table = '',
    where,
    groupby = '',
    orderby = '',
    order = 'desc',
    orders = null,
    orderCustom = '',
    limit,
    asSql = false,
  }: {
    fields?: any
    table: string
    where?: any
    groupby?: string
    orderby?: string
    order?: string
    orders?: any
    orderCustom?:string
    limit?: {
      start: number | string
      size: number | string
    }
    asSql?: boolean
  }) {
    if (!table) {
      return this.handleRes(-2001, 'The database table is not configured')
    }
    let sql = this.format(`select ${this.getSelectFields(fields)} from ?? `, [
      table,
    ])

    sql += this.getWhereCondition(where)
    if (groupby) {
      sql += this.format(' group by ?? ', [groupby])
    }
    if (orders || orderby) {
      sql += this.getOrderby({ orders, orderby, order })
    }
    if (orderCustom) {
      sql += ' '+orderCustom
    }
    if (limit) {
      sql += this.format(' limit ?,?', [
        Number(limit.start || 0),
        Number(limit.size || 10),
      ])
    }
    sql += ';'
    if (asSql) {
      return sql
    }
    return await this.query(sql)
  }
  async find({
    fields = [],
    table = '',
    where = null,
    groupby = '',
    orderby = '',
    order = 'desc',
    orders = null,
    limit = {
      start: 0,
      size: 1,
    },
    asSql = false,
  }) {
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
    })
    if (res.code !== 0) return res
    res.data = res.data[0] || null
    return res
  }
  async count({ field = '', table = '', where = null, asSql = false }) {
    if (!table) {
      return this.handleRes(-2001, 'The database table is not configured')
    }
    if (!field) {
      return this.handleRes(-2002, 'Field `field` is not specified')
    }
    let sql = this.format('select count(??) as total from ?? ', [field, table])

    sql += this.getWhereCondition(where)

    sql += ';'
    if (asSql) {
      return sql
    }
    const resData: any = await this.query(sql)
    if (resData.code !== 0) {
      return resData
    }
    resData.data = { total: resData.data[0].total }
    return resData
  }
  async insert({
    fields,
    table = '',
    data = [],
    asSql = false,
  }: {
    fields?: string[]
    table: string
    data: string | string[] | Record<string, any>
    asSql?: boolean
  }) {
    if (!table) {
      return this.handleRes(-2001, 'The database table is not configured')
    }

    let sql: string

    if (fields) {
      if (!fields.length) {
        return this.handleRes(-2002, 'Field `fields` is not specified')
      }
      if (!Array.isArray(data) || !data.length) {
        return this.handleRes(-2003, 'The insert field `data` cannot be empty')
      }
      sql = this.format('insert into ?? (??) values ? ;', [
        table,
        fields,
        !Array.isArray(data[0]) ? [data] : data,
      ])
    } else {
      sql = this.format('insert into ?? SET ? ;', [table, data])
    }

    if (asSql) {
      return sql
    }
    return await this.query(sql)
  }
  async update({ table = '', data = {}, where = null, asSql = false }) {
    if (!table) {
      return this.handleRes(-2001, 'The database table is not configured')
    }
    if (
      !where ||
      !Object.keys(where as any).length ||
      typeof where !== 'object' ||
      Array.isArray(where)
    ) {
      return this.handleRes(
        -2002,
        'Field `where` is not specified which might affect all the data. please configure the `where` field.If you do not need WHERE, write the SQL statement manually.'
      )
    }

    let sql = this.format('update ?? set ? ', [table, data])

    sql += this.getWhereCondition(where) + ';'
    if (asSql) {
      return sql
    }
    return await this.query(sql)
  }
  async delete({ table = '', where = null, asSql = false }) {
    if (!table) {
      return this.handleRes(-2001, 'The database table is not configured')
    }
    if (
      !where ||
      !Object.keys(where as any).length ||
      typeof where !== 'object' ||
      Array.isArray(where)
    ) {
      return this.handleRes(
        -2002,
        'Field `delete` is not specified which might affect all the data. please configure the `delete` field.If you do not need DELETE, write the SQL statement manually.'
      )
    }
    const sql =
      this.format('delete from ?? ', [table]) +
      this.getWhereCondition(where) +
      ';'
    if (asSql) {
      return sql
    }
    return await this.query(sql)
  }
  async join({
    leftTable = '',
    rightTable = '',
    leftFields = [],
    rightFields = [],
    joinCondition = '',
    where = null,
    groupby = '',
    orderby = '',
    order = 'desc',
    orders = null,
    limit = null,
    total = false,
    asSql = false,
  }) {
    if (!leftTable || !rightTable) {
      return this.handleRes(-2001, 'The database table is not configured')
    }
    if (!leftFields.length || !rightFields.length) {
      return this.handleRes(-2002, 'Field `leftFields` or `rightFields` is not specified')
    }
    if (!joinCondition) {
      return this.handleRes(-2002, 'Field `joinCondition` is not specified')
    }
    let leftCondition = ''
    let rightCondition = ''
    if (Array.isArray(joinCondition)) {
      if (joinCondition.length !== 2) {
        return this.handleRes(-2003, 'Two values must be passed when joinCondition is an array')
      }
      leftCondition = joinCondition[0]
      rightCondition = joinCondition[1]
    } else {
      leftCondition = joinCondition
      rightCondition = joinCondition
    }

    const _leftTable = leftTable.split(' as ')[0].trim()
    const leftAlias = (leftTable.split(' as ')[1] || _leftTable).trim()
    const _rightTable = rightTable.split(' as ')[0].trim()
    const rightAlias = (rightTable.split(' as ')[1] || _rightTable).trim()

    const leftFieldsList = leftFields.map((item: any) => {
      const _item = item.split(' as ')
      const before = _item[0].trim()
      const after = (_item[1] || before).trim()
      return `${this.escapeId(`${leftAlias}.${before}`)} as ${this.escapeId(
        after
      )}`
    })
    const rightFieldsList = rightFields.map((item: any) => {
      const _item = item.split(' as ')
      const before = _item[0].trim()
      const after = (_item[1] || before).trim()
      return `${this.escapeId(`${rightAlias}.${before}`)} as ${this.escapeId(
        after
      )}`
    })
    let sql = ''

    if (total) {
      sql += this.format(
        `select count(${this.escapeId(
          `${leftAlias}.${leftCondition}`
        )}) as total from ?? ${this.escapeId(leftAlias)},?? ${this.escapeId(
          rightAlias
        )} where ${this.escapeId(
          `${leftAlias}.${leftCondition}`
        )} = ${this.escapeId(`${rightAlias}.${rightCondition}`)}`,
        [_leftTable, _rightTable]
      )
    } else {
      sql += this.format(
        `select ${leftFieldsList.join(',')},${rightFieldsList.join(
          ','
        )} from ?? ${this.escapeId(leftAlias)},?? ${this.escapeId(
          rightAlias
        )} where ${this.escapeId(
          `${leftAlias}.${leftCondition}`
        )} = ${this.escapeId(`${rightAlias}.${rightCondition}`)}`,
        [_leftTable, _rightTable]
      )
    }

    sql += this.getWhereCondition(where).replace(' where ', ' and ')
    if (groupby) {
      sql += this.format(` group by ${this.escapeId(groupby)} `, [])
    }
    if (orders || orderby) {
      sql += this.getOrderby({ orders, orderby, order })
    }
    if (limit && !total) {
      sql += this.format(' limit ?,?', [
        parseInt((limit as any).start || 0, 10),
        parseInt((limit as any).size || 10, 10),
      ])
    }
    sql += ';'
    if (asSql) {
      return sql
    }
    return await this.query(sql)
  }
  /**
   * @return {string}
   */
  getSelectFields(fields = []) {
    try {
      if (!fields.length) return '*'
      const fieldsArr: string[] = []
      fields.forEach(item => {
        if (
          String(item)
            .toUpperCase()
            .indexOf(' AS ') >= 0
        ) {
          const field = String(item)
            .replace(' as ', ' AS ')
            .split(' AS ')
          const first = field[0].trim()
          const second = field[1].trim()
          if (first && second) {
            fieldsArr.push(this.format('?? AS ??', [first, second]))
          } else {
            fieldsArr.push(first)
          }
        } else {
          fieldsArr.push(item)
        }
      })
      return fieldsArr.join(',')
    } catch (e) {
      console.log('-----------errror fields---------', e)
      return '*'
    }
  }
  getWhereCondition(where = null) {
    let sql = ''
    if (!where || !Object.keys(where as any).length) {
      return sql
    }
    const isConditionArray = Array.isArray(where) //object or array type
    const keys: any = isConditionArray ? where : Object.keys(where as any)

    sql += ' where '
    keys.forEach((keyOrObject: any, index: number) => {
      const key = isConditionArray ? keyOrObject.field : keyOrObject
      const keyObject = isConditionArray ? keyOrObject : (where as any)[key]
      const comp =
        typeof keyObject === 'object' && keyObject.condition
          ? keyObject.condition
          : '='
      const value =
        typeof keyObject === 'object' && typeof keyObject.value !== 'undefined'
          ? keyObject.value
          : keyObject
      const combineCondition =
        typeof keyObject === 'object' && key === 'combineCondition'
      const join = typeof keyObject === 'object' && keyObject.or ? 'or' : 'and'
      const like = typeof keyObject === 'object' && keyObject.like
      const position = typeof keyObject === 'object' && keyObject.position
      const between = typeof keyObject === 'object' && keyObject.between
      if (Array.isArray(value) && !between) {
        sql +=
          `${index === 0 ? '' : join} ` +
          this.format(` ?? ${keyObject.notIn? 'not ': ''}in (?) `, [key, value])
      } else if (like || position) {
        if (like) {
          sql += this.format(
            ` ${index === 0 ? '' : join} ${this.escapeId(key)} like ? `,
            [`%${value}%`]
          )
        } else {
          sql += this.format(
            ` ${index === 0 ? '' : join} ${`POSITION(? in ${this.escapeId(
              key
            )})`} `,
            [value]
          )
        }
      } else if (Array.isArray(value) && between) {
        sql += this.format(
          ` ${index === 0 ? '' : join} ${`${this.escapeId(key)} ${keyObject.not ? 'not between' : 'between'
          } ? and ?`} `,
          [value[0], value[1]]
        )
      } else if (combineCondition) {
        sql += `${index === 0 ? '' : join} (${this.getWhereCondition(
          keyObject.fields || keyObject.where
        ).replace(/^\s+?where\s/gi, ' ')}) `
      } else {
        sql += this.format(
          ` ${index === 0 ? '' : join} ${`${this.escapeId(key)} ${comp} ?`} `,
          [value]
        )
      }
    })
    return sql
  }
  async query(sql = '', returnRes = true) {
    await this.connectionInitPromise

    return new Promise(resolve => {
      if (!this.pool)
        resolve(this.handleRes(-1005, 'Connection failed, connection pool is empty, please check configuration'))
      this.pool.getConnection((e: any, connection: any) => {
        if (e) {
          this.resolveConnectFail(resolve, e)
        } else {
          connection.query(sql, (err: any, rows: any) => {
            this.releaseConnection(connection)
            if (err) {
              this.resolveQueryFail(resolve, err, err.message)
            } else {
              resolve(
                this.handleRes(0, 'success', { data: returnRes || this.returnOriginSource ? rows : [] })
              )
            }
          })
        }
      })
    })
  }
  async beginTransaction(queryList = [], showlog = false) {
    await this.connectionInitPromise

    if (!queryList.length) {
      return this.handleRes(-2003, 'Missing transaction queue')
    }
    return new Promise(resolve => {
      this.pool.getConnection((e: any, connection: any) => {
        if (e) {
          this.resolveConnectFail(resolve, e)
        } else {
          connection.beginTransaction(async (err: any) => {
            if (err) {
              this.releaseConnection(connection)
              this.resolveConnectFail(resolve, err, 'Transaction startup failed')
            } else {
              let isOk = true
              let errData = {}
              for (let i = 0; i < queryList.length; i++) {
                const res: any = await this.connectionQuery(
                  connection,
                  queryList[i],
                  showlog
                )
                if (res.code !== 0) {
                  isOk = false
                  errData = res
                  break
                }
              }
              if (isOk) {
                connection.commit((err: any) => {
                  if (err) {
                    this.resolveCommitFail(resolve, err, 'Transaction submission failed ' + (err.message || ''))
                  } else {
                    resolve(this.handleRes(0, 'success'))
                  }
                  this.releaseConnection(connection)
                })
              } else {
                connection.rollback(() => {
                  this.resolveTransationFail(resolve, errData)
                  this.releaseConnection(connection)
                })
              }
            }
          })
        }
      })
    })
  }
  async connectionQuery(connection: any, sql: any, showlog = false) {
    return new Promise(resolve => {
      connection.query(sql, (err: any, rows: any) => {
        if (err) {
          this.resolveQueryFail(resolve, err)
        } else {
          resolve(this.handleRes(0, 'success'))
        }
      })
    })
  }

  async runTransaction(
    run: (opt: {
      sqlUtil: SqlUtil
      rollback: (res: ReturnType<SqlUtil['handleRes']>) => void
      commit: () => void
    }) => Promise<void>,
    showlog = false
  ) {
    await this.connectionInitPromise

    if (!run) {
      throw new Error('A transaction function must be passed in')
    }

    return new Promise(resolve => {
      this.pool.getConnection((e: any, connection: any) => {
        if (e) {
          this.resolveConnectFail(resolve, e)
        } else {
          connection.beginTransaction(async (err: any) => {
            if (err) {
              this.releaseConnection(connection)
              this.resolveConnectFail(resolve, err, 'Transaction startup failed')
            } else {
              const newSqlUtil = new SqlUtil(this.props)

              /**
               * The temporary sqlUtil must return the connections corresponding to the transaction.
               */
              newSqlUtil.query = async function (sql = '', returnRes = true) {
                return new Promise(resolve => {
                  connection.query(sql, (err: Error, rows: any[]) => {
                    if (err) {
                      this.resolveQueryFail(resolve, err)
                    } else {
                      resolve(
                        this.handleRes(0, 'success', {
                          data: returnRes ? rows : [],
                        })
                      )
                    }
                  })
                })
              }

              let runResult: ReturnType<SqlUtil['handleRes']>
              let isOk = true

              try {
                await run({
                  sqlUtil: newSqlUtil,
                  rollback: res => {
                    runResult = res
                    isOk = false
                  },
                  commit: () => {
                    isOk = true
                  },
                })
              } catch (e) {
                isOk = false
              }

              if (!isOk) {
                connection.rollback(() => {
                  this.resolveTransationFail(resolve, runResult)
                  this.releaseConnection(connection)
                })
              } else {
                connection.commit((err: any) => {
                  if (err) {
                    this.resolveCommitFail(resolve, err, 'Transaction submission failed ' + (err.message || ''))
                  } else {
                    resolve(this.handleRes(0, 'success'))
                  }
                  this.releaseConnection(connection)
                })
              }
            }
          })
        }
      })
    })
  }
  resolveConnectFail(resolve: any, error: any, message?: string) {
    if (this.returnOriginError) {
      resolve({ code: -1003, error })
    } else {
      resolve(this.handleRes(-1003, message || 'Connection failed'))
    }
  }
  resolveQueryFail(resolve: any, error: any, message?: string) {
    if (this.returnOriginError) {
      resolve({ code: -1004, error })
    } else {
      resolve(this.handleRes(-1004, message || 'Data query failed'))
    }
  }
  resolveTransationFail(resolve: any, error: any, message?: string) {
    if (this.returnOriginError) {
      resolve({ code: -1007, error })
    } else {
      resolve(this.handleRes(-1007, message || 'Transaction execution failed'))
    }
  }
  resolveCommitFail(resolve: any, error: any, message?: string) {
    if (this.returnOriginError) {
      resolve({ code: -1006, error })
    } else {
      resolve(this.handleRes(-1006, message || 'Transaction submission failed'))
    }
  }
  getMd5(text = '') {
    const md5 = _crypto.createHash('md5')
    return md5.update(text).digest('hex')
  }
  replaceDangerChar(word = '') {
    return word.replace(/['"]/gi, '')
  }
  handleRes(code = 0, message = '', obj = {}) {
    return {
      code,
      subcode: 0,
      message,
      default: 0,
      data: [],
      ...obj,
    }
  }
  releaseConnection(conn: any = {}) {
    if (this.endReleaseType === 'end') {
      conn.end && conn.end()
    } else {
      conn.release && conn.release()
    }
  }
  getOrderby(_orders: any) {
    let { orders, order, orderby } = _orders || {}
    let str: string = ''
    if (!orders && orderby) {
      return this.format(` order by ?? ${order}`, [orderby])
    }
    if (!(orders instanceof Array || Array.isArray(orders))) {
      orders = [orders]
    }
    orders.forEach((item: any, index: number) => {
      let { order, by } = item || {}
      if (order && by) {
        str += this.format(`${index ? ', ' : ` order by `}?? ${order}`, [by])
      }
    })
    return str
  }
}

export default SqlUtil

module.exports = SqlUtil
module.exports.default = SqlUtil
