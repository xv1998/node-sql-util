import { sqlTrim } from './tools'
const kgSqlutil = require('../lib')

describe('raw', () => {
  test('raw sql', async () => {
    let mysql = new kgSqlutil({})

    let sql = mysql.format('insert into ?? set name = ?;', ['table1', 'lulu'])

    expect(sqlTrim(sql)).toBe("insert into `table1` set name = 'lulu';")

    let sql2 = mysql.format('insert into ?? set created = ?;', [
      'table1',
      mysql.raw('NOW()'),
    ])

    expect(sqlTrim(sql2)).toBe('insert into `table1` set created = NOW();')
  })
})