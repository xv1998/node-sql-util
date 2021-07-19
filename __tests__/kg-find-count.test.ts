import { sqlTrim, ErrorData } from './tools'
const kgSqlutil = require('../lib')

describe('find', () => {
  test('find sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.find({
      table: 'table1',
      fields: ['age', 'sex'],
      where: {
        age: {
          value: 18,
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select age,sex from `table1` where `age` = 18 limit 0,1;'
    )
  })
})

describe('count', () => {
  test('count', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.count({
      table: 'table1',
      field: 'id',
      where: {
        age: {
          value: 18,
          condition: '>=',
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select count(`id`) as total from `table1` where `age` >= 18;'
    )
  })

  test('lack configured field', async () => {
    let sqlUtil = new kgSqlutil({})

    let errData = await sqlUtil.count({
      table: 'table1',
    })

    expect(errData).toHaveProperty('code', ErrorData.nofield.code)
  })

})