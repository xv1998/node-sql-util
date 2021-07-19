import { sqlTrim, ErrorData } from './tools'
const kgSqlutil = require('../lib')

describe('join', () => {
  test('join sql', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.join({
      leftTable: 'table1',
      leftFields: ['name', 'age', 'b'],
      rightTable: 'table2',
      rightFields: ['c', 'd'],
      joinCondition: 'name',
      where: {
        age: 18,
      },
      groupby: 'name',
      orderby: 'age',
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select `table1`.`name` as `name`,`table1`.`age` as `age`,`table1`.`b` as `b`,`table2`.`c` as `c`,`table2`.`d` as `d` from `table1` `table1`,`table2` `table2` where `table1`.`name` = `table2`.`name` and `age` = 18 group by `name` order by `age` desc;'
    )
  })

  test('join condition sql', async () => {
    let sqlUtil = new kgSqlutil({})

    let sql = await sqlUtil.join({
      leftTable: 'table1',
      leftFields: ['name'],
      rightTable: 'table2 as userTable',
      rightFields: ['age'],
      joinCondition: ['name', 'id'],
      where: {
        'userTable.age': 18,
      },
      limit:{
        start: 2
      },
      asSql: true,
    })

    expect(sqlTrim(sql)).toBe(
      'select `table1`.`name` as `name`,`userTable`.`age` as `age` from `table1` `table1`,`table2` `userTable` where `table1`.`name` = `userTable`.`id` and `userTable`.`age` = 18 limit 2,10;'
    )
  })

  test('lack configured field', async () => {
    let sqlUtil = new kgSqlutil({})

    let noLeftFields = await sqlUtil.join({
      leftTable: 'table1',
      rightTable: 'table2 as userTable',
      asSql: true,
    })

    let noJoinCondition = await sqlUtil.join({
      leftTable: 'table1',
      rightTable: 'table2 as userTable',
      leftFields: ['name'],
      rightFields: ['age'],
      asSql: true,
    })

    expect(noLeftFields).toHaveProperty('code', ErrorData.nofield.code)
    expect(noJoinCondition).toHaveProperty('code', ErrorData.nofield.code)
  })

  test('JoinCondition array has one element', async () => {
    let sqlUtil = new kgSqlutil({})

    let rsp = await sqlUtil.join({
      leftTable: 'table1',
      rightTable: 'table2 as userTable',
      leftFields: ['name'],
      rightFields: ['age'],
      joinCondition: ['name'],
      asSql: true,
    })

    expect(rsp).toHaveProperty('code', ErrorData.notEmtpy.code)
  })
})