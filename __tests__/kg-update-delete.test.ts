import { sqlTrim, ErrorData } from './tools'
const kgSqlutil = require('../lib')

describe('update', () => {
  test('update sql', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.update({
      table: 'table_1',
      data: {
        age: 18,
        sex: 2,
        updated: sqlUtil.raw('Now()'),
      },
      where: {
        id: 4,
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'update `table_1` set `age` = 18, `sex` = 2, `updated` = Now() where `id` = 4;'
    )
  })

  test('lack configured field', async () => {
    let sqlUtil = new kgSqlutil({})

    let errData = await sqlUtil.update({
      table: 'table_1',
      asSql: true
    })

    expect(errData).toHaveProperty('code', ErrorData.nofield.code)
  })
})

describe('delete', () => {
  test('delete sql', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.delete({
      table: 'table1',
      where: {
        id: 11,
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe('delete from `table1` where `id` = 11;')
  })

  test('lack configured field', async () => {
    let sqlUtil = new kgSqlutil({})

    let errData = await sqlUtil.delete({
      table: 'table_1',
      asSql: true
    })

    expect(errData).toHaveProperty('code', ErrorData.nofield.code)
  })
})