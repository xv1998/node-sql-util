import { sqlTrim, ErrorData } from './tools'
const kgSqlutil = require('../lib')

describe('insert', () => {
  test('simple insert', async () => {
    let mysql = new kgSqlutil({})

    let sql = await mysql.insert({
      table: 'table1',
      fields: ['name', 'age'],
      data: ['alice', 12],
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe("insert into `table1` (`name`, `age`) values ('alice', 12);")
  })

  test('insert set', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.insert({
      table: 'table_1',
      data: {
        age: 1,
        sex: 1,
        type: 2,
        created: sqlUtil.raw('Now()'),
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'insert into `table_1` SET `age` = 1, `sex` = 1, `type` = 2, `created` = Now();'
    )
  })

  test('lack configured field', async () => {
    let sqlUtil = new kgSqlutil({})

    let noField = await sqlUtil.insert({
      table: 'table1',
      fields: [],
      asSql: true,
    })

    let noInsertDate = await sqlUtil.insert({
      table: 'table1',
      fields: ['name', 'age'],
      asSql: true,
    })
    expect(noField).toHaveProperty('code', ErrorData.nofield.code)
    expect(noInsertDate).toHaveProperty('code', ErrorData.notEmtpy.code)
  })
})