export function sqlTrim(sql: string): string {
  return sql
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+;/g, ';')
}

export const ErrorData = {
  notable: {
    code: -2001
  },
  nofield: {
    code: -2002
  },
  notEmtpy: {
    code: -2003
  }
}

export const SqlType = ['select', 'count', 'insert', 'delete', 'update', 'join']