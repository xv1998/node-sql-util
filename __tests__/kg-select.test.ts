import { sqlTrim } from './tools'
const kgSqlutil = require('../lib')

describe('select', () => {
  test('select all fields', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.select({
      table: 'user',
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe('select * from `user`;')
  })

  test('select specific fields', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.select({
      fields: ['name', 'age', 'type'],
      table: 'user',
      where: {
        age: {
          value: 18,
          condition: '>=',
        }
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe('select name,age,type from `user` where `age` >= 18;')
  })

  test('select with simple condition', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.select({
      fields: ['age', 'sex', 'type'],
      table: 'user',
      where: {
        type: 2,
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select age,sex,type from `user` where `type` = 2;'
    )
  })

  test('select with notIn condition', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.select({
      fields: ['age', 'sex', 'type'],
      table: 'user',
      where: {
        type: {
          value:[8,9],
          notIn:true
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select age,sex,type from `user` where `type` not in (8, 9);'
    )
  })
})