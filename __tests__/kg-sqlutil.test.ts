'use strict'
import { SqlType, ErrorData } from './tools'
const kgSqlutil = require('../lib')


describe('kg-sqlutil', () => {

  test('test no table param', () => {
    let sqlUtil = new kgSqlutil({})

    SqlType.map(async (sqlStatment) => {
      let errData = await sqlUtil[sqlStatment]({})

      expect(errData).toHaveProperty('code', ErrorData.notable.code)
    })
  })

  test('repalce danger char', () => {
    let sqlutil = new kgSqlutil({})
    let dangerString = '\"veget\"able'

    expect(sqlutil.replaceDangerChar(dangerString)).toBe('vegetable')
  })
})
