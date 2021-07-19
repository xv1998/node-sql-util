import { sqlTrim } from './tools'
const kgSqlutil = require('../lib')

describe('condition', () => {
  test('page limit sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.select({
      fields: ['name', 'age'],
      table: 'table1',
      limit: {
        start: 30,
        size: 10,
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe('select name,age from `table1` limit 30,10;')
  })

  test('like sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.select({
      fields: ['name', 'age'],
      table: 'table1',
      where: {
        name: {
          value: 'ju',
          like: true,
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      "select name,age from `table1` where `name` like '%ju%';"
    )
  })

  test('group by sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.select({
      fields: ['name', 'age'],
      table: 'table1',
      where: {
        age: 18,
      },
      groupby: 'sex',
      orderby: 'brithday',
      order: 'desc',
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select name,age from `table1` where `age` = 18 group by `sex` order by `brithday` desc;'
    )
  })

  test('in range sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.select({
      fields: ['name', 'age'],
      table: 'table1',
      where: {
        age: [12, 34, 1, 6, 7],
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select name,age from `table1` where `age` in (12, 34, 1, 6, 7);'
    )
  })

  test('between sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.select({
      table: 'table1',
      where: {
        age: {
          value: [3, 5],
          between: true,
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select * from `table1` where `age` between 3 and 5;'
    )
  })

  test('not between sql', async () => {
    let mySql = new kgSqlutil({})

    let sql = await mySql.select({
      table: 'table1',
      where: {
        age: {
          value: [3, 5],
          between: true,
          not: true,
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select * from `table1` where `age` not between 3 and 5;'
    )
  })

  test('combineCondition sql', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.select({
      table: 'table1',
      fields: ['age', 'name'],
      where: {
        age: 1,
        combineCondition: {
          where: {
            type: 2,
            combineCondition: {
              where: {
                name: {
                  value: 'luck',
                  like: true,
                },
                type: 8,
              },
              or: true,
            },
          },
        },
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      "select age,name from `table1` where `age` = 1 and ( `type` = 2 or ( `name` like '%luck%' and `type` = 8 ) );"
    )
  })

  test('as sql', async () => {
    let mysql = new kgSqlutil({})

    let sql = await mysql.select({
      table: 'table1',
      fields: ['name as n', 'age as a'],
      asSql: true
    })

    expect(sqlTrim(sql)).toBe('select `name` AS `n`,`age` AS `a` from `table1`;')
  })

  test('position sql', async () => {
    let mysql = new kgSqlutil({})

    let sql = await mysql.select({
      table: 'table1',
      where:{
        vegetable:{
          value: 'tomato',
          position: true
        },
      },
      asSql: true
    })

    expect(sqlTrim(sql)).toBe("select * from `table1` where POSITION('tomato' in `vegetable`);")
  })
})