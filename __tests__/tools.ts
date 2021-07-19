export function sqlTrim(sql: string): string {
  return sql
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+;/g, ';')
}

export const ErrorData = {
  notable: {
    code: -2001,
    message: '未配置数据表'
  },
  nofield: {
    code: -2002,
    message: '未配置表字段'
  },
  notEmtpy: {
    code: -2003,
    message: '插入字段不能为空'
  }
}

export const SqlType = ['select', 'count', 'insert', 'delete', 'update', 'join']