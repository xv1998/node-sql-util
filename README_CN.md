

[English](./README.md) | 简体中文

## 目录

- [介绍](#introduction)
- [安装](install)
- [快速上手](#quick)
- [ssh配置](#ssh-config)
- [SqlUtil 功能介绍](#sql-methods-intro)
- [SqlUtil 方法使用](#sqlUtil-use)
- [错误码](#errorCode)
- [License](#license)

## <a id="introduction">介绍</a>

SqlUtil 是轻量型数据库工具库，基于 mysql2+ssh2 实现，支持：

- 支持 ssh 远程调试，方便本地开发调试

- 操作数据库便捷方法，包括数据查询、创建、删除、修改、事务单等等

- 支持原生 SQL 查询

- 安全防范，避免安全问题，比如 SQL 注入等

- 使用连接池库缓存数据库链接，减少连接创建/释放操作



## <a id="install">安装</a>

```
yarn add node-sql-util -S
```

```
npm install node-sql-util --save
```

## <a id="quick">快速上手</a>

```js
// 创建链接
const mySql = new SqlUtil({
  dbConfig: {
    host: "1.2.3.4",
    port: "1000",
    database: "xxxx",
    user: "xxxx",
    password: "xxxx",
    connectionLimit: 5 // 默认5 可以不配置
  }
});

// 使用
let searchRes = await mySql.select({
  table: "xxxx",
  where: {
    id: 1
  }
});
```



## <a id="ssh-config">SSH 配置[option feature]</a>

```js
// 创建链接
const mySql = new SqlUtil({
  dbConfig: {
    host: "1.2.3.4",
    port: "1000",
    database: "xxxx",
    user: "xxxx",
    password: "xxxx",
    connectionLimit: 5 // 默认5 可以不配置
  },
  // 仅在本地开发时使用ssh
  ssh: __DEV__
    ? {
        srcHost: "127.0.0.1",
        srcPort: 8080,
        host: "1.2.3.4",
        port: 1000,
        username: "xxx",
        password: "xxxx"
      }
    : null
});

// 使用
let searchRes = await mySql.select({
  table: "xxxx",
  where: {
    id: 1
  }
});
```



- srcHost：本地后台服务启动 ip

- srcPort: 本地后台服务启动端口

- host: SSH 服务器 ip

- port: SSH 服务器端口

- username: SSH 服务器账户

- password: SSH 服务器密码



**注意**:  ssh 只能在本地开发时使用，线上最好不要使用，注意隔离开发和线上环境。



## <a id="sql-methods-intro">SqlUtil 功能介绍</a>

SqlUtil 实例属性和方法

- [`sqlutil.dbConfig` ](#newSqlUtil)db 配置
- [`sqlutil.ssh`](#newSqlUtil)ssh 配置
- [`sqlutil.format()` ](#format)转义 sql 语句，将输入字符转为安全字符串
- [`sqlutil.escape()` ](#escape)转义某个字符串字段
- [`sqlutil.escapeId()`](#escapeId) 转义表字段
- [`sqlutil.query()` ](#query)手动查询 sql 方法
- [`sqlutil.handleRes()` ](#handleRes)返回执行结果
- `sqlutil.setConnection(dbConfig)` 设置 db 连接配置
- `sqlutil.raw()` 转义 sql 内置方法变量
- `sqlutil.select()` 筛选数据方法
- `sqlutil.count()` 统计方法
- `sqlutil.insert()` 插入数据方法
- `sqlutil.update()` 更新数据方法
- `sqlutil.join()`多表查询方法
- `sqlutil.delete()`删除数据方法
- `sqlutil.find()`查找单一数据方法



### <a id="newSqlUtil">创建 SqlUtil 连接实例</a>

```javascript
// 创建链接
const mySql = new SqlUtil({
  dbConfig: {
    host: "1.2.3.4",
    port: "1000",
    database: "xxxx",
    user: "xxxx",
    password: "xxxx",
    connectionLimit: 5 // 默认5 可以不配置
  },
  // 仅在本地开发时使用ssh
  ssh: __DEV__
    ? {
        srcHost: "127.0.0.1",
        srcPort: 8080,
        host: "1.2.3.4",
        port: 1000,
        username: "xxx",
        password: "xxxx"
      }
    : null
});
```



### <a id="format">转义 SQL 语句</a>

`??` 为字段或表名，`?` 为具体字段值，需要转义的字段

1.普通字 `? `段转义

```javascript
const name = 'lili'
const sql = sqlutil.format(`select * from table1 where name = ?;`,[name]);
console.log(sql);//select * from table1 where name = 'lili';
```



2.字段`??`转义

```javascript
const name = 'lili'
const field= 'name'
const sql = sqlutil.format(`select * from table1 where ?? = ?;`,[field,name]);
console.log(sql);//select * from table1 where `name` = 'lili';
```



3.数组和对象转义

```javascript
const name = 'milu'
const age = 18
const field= ['name','age']
const sql = sqlutil.format(`select ?? from table1 where name = ? and age = ?;`,[field,name,age]);
console.log(sql);//select `name`,`age` from table1 where `name` = 'milu' and `age` = 18;
```



```javascript
const name= 'milu';
const condition = {
  name : 'milu',
  age : 18
};
const sql = sqlutil.format(`update ?? set ? where name = ?;`,['talble1',condition,name]);
console.log(sql);//update `table1` set `name` = 'milu', `age` = 18 where name = 'milu';
```



4.内置函数不转义 `sqlutil.raw`

```javascript
const name = 'milu'
const table = 'table1'
const value = {
	date : sqlutil.raw('NOW()')
}
const sql = sqlutil.format(`update ?? set ? where name = ?;`,[table,value,name]);
console.log(sql);//update `table1` set `date` = NOW() where name = 'milu';
```



5.列表转义

```javascript
const value = [['a', 'b'], ['c', 'd']];
const sql = sqlutil.format('?',[value])
console.log(sql);//('a', 'b'), ('c', 'd')
```



6.<a id="escapeId">表字段转义 `sqlutil.escapeId`</a>

```javascript
const sorter = 'posts.date';
const sql    = 'SELECT * FROM posts ORDER BY ' + sqlutil.escapeId(sorter);
console.log(sql); // SELECT * FROM posts ORDER BY `posts`.`date`

// sqlutil.escapeId('date'); -> `date`
// sqlutil.escapeId('table.date'); -> `table`.`date`
// sqlutil.escapeId('table.date',true); -> `table.date`
```



7.<a id="escape">转义字符串</a>

```javascript
sqlutil.escape('abc\'d'); // -> "'aaa\'a'"
```



### <a id="query">手动查询 sql</a>

```javascript
await sqlutil.query('select * from table1;');
await sqlutil.query('update table1 set a=1 where id=1;');
await sqlutil.query(`insert into table1 (name,age) values('milu',18)`);
```



### <a id="handleRes">返回统一的执行结果</a>

```javascript
return sqlutil.handleRes(-1000, '未登录', {
  data: 'data',
  other: 'other info'
});
// 返回
{
  code:-1000,
  subcode: 0,
  message:'未登录',
  default: 0,
  data: 'data',
  other:'other info'
}
```



## <a id="sqlUtil-use">SqlUtil 方法使用</a>

注意：

1. 所有的方法里，当 asSql 字段为 true 时，返回 sql 语句，否则**默认返回 sql 执行结果**。
2. Where 语句默认对象写法，数组写法见[这里](#where-array)（推荐数组写法，更灵活）



以下展示常用的 sql 语句的用法

- [select 选择](#select)
- [find 查找单一数据](#find)
- [insert 插入](#insert)
- [update 更新](#update)
- [delete 删除](#delete)
- [count 统计](#count)
- [join 多表联查](#join)
- [条件选择](#condition)
- [事务](#task)
- [raw 原生 SQL 操作](#raw)



### <a id="select">select 选择</a>

用法：

```js
mysql.select({
  fields = [],
  table = "",
  where = null,
  groupby = "",
  order = "desc",
  limit = null,
  asSql = false
})
```



#### 参数

| 字段名  | 默认值 | 说明            | 必需 |
| ------- | ------ | --------------- | ---- |
| table   | ""     | 表              | 是   |
| fields  | []     | 列              | 否   |
| where   | null   | 条件            | 否   |
| groupby | ""     | 分组            | 否   |
| orderby | ""     | 排序            | 否   |
| order   | "desc" | 排序方式        | 否   |
| limit   | null   | 分页            | 否   |
| asSql   | false  | 是否返回sql语句 | 否   |

#### 返回示例

```javascript
{
  code:0,
  subcode: 0,
  message:'success',
  default: 0,
  data: [{name: 'milu',age: 18}],
}
```



1.选择全部字段

```sql
select * from table1;
```

```javascript
let res = await mySql.select({
  table: "table1"
});

if (res.code === 0) {
  res.data; // 返回数组
  console.info("成功！");
} else {
  console.info("错误！");
}
```

<br/>

2.选择指定列

```sql
select name,age from table1;
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1"
});
```

<br/>

3.条件选择

```sql
select name,age from table1 where age=18 and name="lili";
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  where: {
    age: 18,
    name: "lili"
  }
});
```

更多条件请看[《条件选择》章节](#condition)



### <a id="find">find查找单一数据</a>

`find`方法和`select`方法类似，差异在于：

- limit 参数为 1，支持覆盖
- 返回结果`res.data`不是数组，而是第一个数据项

```sql
select age,sex from table1 where age=18 limit 1;
await mySql.find({
  table: "table1",
  fields: ["age", "sex"],
  where: {
    age: {
      value: 18
    }
  }
});
```

#### 返回示例

```javascript
{
  code: 0, // 0表示成功，非0表示失败
  data: {
    name: "xxx",
    age: 1,
    sex: 2,
    type: 8
  },
  message: "xxxxx"
}
```

### <a id="insert">insert插入</a>

用法：

```js
mysql.insert({
  fields = [],
  table = "",
  data = []
})
```



1.插入单行

```sql
INSERT INTO table_1 SET `age` = 1, `sex` = 1, `type` = 2, `created` = Now();
```

```javascript
await mySql.insert({
  table: "table_1",
  data: {
    age: 1,
    sex: 1,
    type: 2,
    created: mySql.raw("Now()")
  }
});

// 或者数组写法
await sqlutil.insert({
  fields: ["age", "sex", "type", "created"],
  table: "table_1",
  data:[1, 1, 2, mySql.raw("now()")]
});

```

返回值中提供`insertId`表示新增数据的ID，形如：

```javascript
{
  code: 0, // 0表示成功，非0表示失败
  data: {
    insertId: 20000061,
  },
  message: "xxxxx"
}
```

<br/>2.插入多行

```javascript
await mySql.insert({
  fields: ["fid", "uid", "position", "qq", "nick","insert_time"],
  table: "table_1",
  data:[
    ["3", "333", "333", "333", "333",sqlutil.raw("CURRENT_TIMESTAMP")],
    ["4", "444", "444", "444", "444",sqlutil.raw("CURRENT_TIMESTAMP")]
  ]
});
```

#### 返回示例

```json
{
  "code": 0, 
  "subcode": 0, 
  "message": "success", 
  "default": 0, 
  "data": {
    "fieldCount": 0, 
    "affectedRows": 1, 
    "insertId": 17, 
    "info": "", 
    "serverStatus": 2, 
    "warningStatus": 0
  }
}

```



### <a id="update">update 更新</a>

用法：

```js
mysql.update({
  table = "",
  data = {},
  where = null
})
```



> 注意：`插入的字段如果是SQL内置变量或方法`，如 `NOW()，CURRENT_TIMESTAMP`，必须使用`sqlutil.raw()`进行转义，否则会以普通字符串形式插入。

```sql
update table_1 SET `age` = 18, `sex` = 2, `updated` = Now() where `id` = 4;
```

```javascript
await mySql.update({
  table: "table_1",
  data: {
    age: 18,
    sex: 2,
    updated: mySql.raw("Now()")
  },
  where: {
    id: 4
  }
});
```

#### 返回示例

```json
{
  "code": 0, 
  "subcode": 0, 
  "message": "success", 
  "default": 0, 
  "data": {
    "fieldCount": 0, 
    "affectedRows": 1, 
    "insertId": 0, 
    "info": "Rows matched: 1  Changed: 0  Warnings: 0", 
    "serverStatus": 2, 
    "warningStatus": 0, 
    "changedRows": 0
  }
}

```



### <a id="delete">delete 删除数据</a>

用法：

```js
mysql.delete({
  table = "",
  where = null,
  asSql = false
})
```



```sql
delete from `table1` where `id` = 11 ;
```

```javascript
await mySql.delete({
  table: "table1",
  where: {
    id: 11
  }
});
```

#### 返回示例

```json
{
  "code": 0, 
  "subcode": 0, 
  "message": "success", 
  "default": 0, 
  "data": {
    "fieldCount": 0, 
    "affectedRows": 1, 
    "insertId": 0, 
    "info": "", 
    "serverStatus": 2, 
    "warningStatus": 0
  }
}

```



### <a id="count">count 统计数量</a>

用法：

```js
mySql.count({
  field = "",
  table = "",
  where = null
})
```



```sql
select count(`id`) as total from `table1` where `age` >= 18 ;
```

```javascript
let res = await mySql.count({
  table: "table1",
  field: "id",
  where: {
    age: {
      value: 18,
      condition: ">="
    }
  }
});
```

返回值中`total`表示数量，形如：

```javascript
{
  code: 0, // 0表示成功，非0表示失败  
  data: {
    total: 14
  },
  message: "xxxxx"
}
```

### <a id="join">join 多表联查</a>

用法：

```js
mysql.join({
  leftTable = "",
  leftFields = [],
  rightTable = "",
  rightFields = [],
  joinCondition = "",
  where = null,
  groupby = "",
  orderby = "",
  order = "desc",
  limit = null,
  total = false,
  asSql = false
})
```



#### 参数

| 字段名        | 默认值 | 说明                                          | 必需 |
| ------------- | ------ | --------------------------------------------- | ---- |
| leftTable     | ""     | 左表                                          | 是   |
| leftFields    | []     | 左边字段                                      | 是   |
| rightTable    | ""     | 右表                                          | 是   |
| rightFields   | []     | 右表字段                                      | 是   |
| joinCondition | ""     | 连接条件                                      | 是   |
| where         | null   | 查询条件                                      | 否   |
| groupby       | ""     | 分组                                          | 否   |
| orderby       | ""     | 排序                                          | 否   |
| order         | "desc" | 排序方式                                      | 否   |
| limit         | null   | 分页                                          | 否   |
| total         | false  | //ture的时候为查询全部数据，limit字段此时失效 | 否   |
| asSql         | false  | 是否返回sql语句                               | 否   |

1.指定表字段

```sql
select 
`table1`.`name` as `name`,
`table1`.`age` as `age`,
`table1`.`b` as `b`,
`table2`.`c` as `c`,`table2`.`d` as `d` 
from `table1` `table1`,`table2` `table2` 
where 
`table1`.`name` = `table2`.`name` and `table2`.`name` >= 11 ;
```

```javascript
await mySql.join({
  leftTable: "table1",
  leftFields: ["name", "age", "b"],
  rightTable: "table2",
  rightFields: ["c", "d"],
  joinCondition: "name",
  where: {
    'table2.age': { // 指定表字段
      value: 11,
      condition: '>='
    }
  },
  total: false
});
```

<br/>

2.表别名

```javascript
await mySql.join({
  leftTable: "table1 as extra",
  leftFields: ["name", "age", "b"],
  rightTable: "table2",
  rightFields: ["c", "d"],
  joinCondition: "name",
  where: {
    'extra.age': { // 表别名
      value: 11,
      condition: '>='
    }
  },
  total: false
});
```

更复杂的查询请结合 sqlutil.format 手动编写 sql 语句

### <a id="condition">条件选择</a>

#### 分页

```sql
select name,age from table1 limit 30,10;
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  limit: {
    start: 30,
    size: 10
  }
});
```

#### 模糊选择

```sql
select name,age from table1 where name like "%ju%";
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  where: {
    name: {
      value: "ju",
      like: true
    }
  }
});
```

#### 位置查询

```sql
select name,age from table1 where age=18 and position('milu' in name);
```

```js
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  where: {
    age: 18,
    name: {
      value: "milu",
      position: true
    }
  }
});
```

#### 分组排序

```sql
select name,age from `table1` where `age` = 18 group by `sex` order by `brithday` desc;
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  where: {
    age: 18
  },
  groupby: "sex",
  orderby: "brithday",
  order: "desc"
});
```

#### 选择范围

```sql
select name,age from table1 where age in (12,34,1,6,7)
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  where: {
    age: [12, 34, 1, 6, 7]
  }
});
```

1.或大于小于

```sql
select * from table1 where age between 3 and 5;
```

```javascript
await mySql.select({
  table: "table1",
  where: {
    age: {
      value: [3, 5],
      between: true
    }
  }
});
```

<br/>

2.大于小于取反

```sql
select * from table1 where age not between 3 and 5;
```

```javascript
await mySql.select({
  table: "table1",
  where: {
    age: {
      value: [3, 5],
      between: true,
      not: true
    }
  }
});
```

#### 组合条件

1.(=,>,>=,<,<=)

<a id="where-array">where 条件数组写法</a>，支持重复字段，字段名 field 写在对象里面。其他条件跟对象写法一致

```sql
select * from table1 where age > 3 and age <= 5;
```

```javascript
await mySql.select({
  table: "table1",
  where: [
    {
      field: "age",
      value: 3,
      condition: ">"
    },
    {
      field: "age",
      value: 5,
      condition: "<="
    }
  ]
});
```

<br/>

2.(and or)

```sql
select name,age from table1 where age=18 or name="milu";
```

```javascript
await sqlutil.select({
  fields: ["name", "age"],
  table: "table1",
  where: {
    age: 18,
    name: {
      value: "milu",
      or: true //必须在第二个条件才生效
    }
  }
});
```

<br/>

3.优先查询组合条件，combineCondition 可以递归组合条件，`combineCondition.where`就和条件语法完全一致：

```sql
select age, name from table1 where age=1 and (type=2 or (name like "luck" and type=8));
```

```javascript
await mySql.select({
  table: "table1",
  fields: ["age", "name"],
  where: {
    age: 1,
    combineCondition: {
      where: {
        type: 2,
        combineCondition: {
          where: {
            name: {
              value: "luck",
              like: true
            },
            type: 8
          },
          or: true
        }
      }
    }
  }
});
```



### <a id="task">事务</a>

`sqlUtil` 提供`runTransaction`方法处理事务，该方法中提供：

- 一个新的 `sqlUtil` 实例，用法和上述一致，在事务中**必须使用该新实例**操作数据库
- 通过`rollback()`可以回滚事务执行的所有操作
- 当事务全部完成时，调用`commit()`用于提交事务。主要用于**提前**提交事务完成。

```javascript
let taskRes = await mySql.runTransaction(
  async ({ sqlUtil: newSql, rollback, commit }) => {
    // 事务内必须使用新实例newSql进行操作，用法和mySql一致
    const modRes = await newSql.find({
      table: "xxx",
      where: {
        id: "xxx"
      }
    });

    // 可以将错误结果通过rollback返回，方便内部输入日志
    if (modRes.code !== 0) {
      return rollback(modRes);
    }

    const updateRes = await newSql.update({
      table: "xxx",
      data: {
        name: "xxx"
      },
      where: {
        id: "xxx"
      }
    });
    if (updateRes.code !== 0) {
      return rollback(updateRes);
    }

    // commit()是可选的
    commit();
  }
);

if (taskRes.code === 0) {
  console.info("事务成功！");
} else {
  console.info("事务失败！");
}
```

`commit()`是可选的，可以不调用，`runTransaction(cb)`监听到 `cb `函数完成时，如果判断没有调用过 `rollback()` 并且代码没有报错，就会自动提交 `commit`。

`commit()`主要使用在**语义化的**地表示**提前完成事务**的场景：

```javascript
await mySql.runTransaction(
  async ({ sqlUtil: newSql, rollback, commit }) => {
    const userRes = await newSql.select({
      table: "xxx",
      where: {
        age: 18
      }
    });

    if (userRes.code !== 0) {
      return rollback(modRes);
    }

    // 如果人数过长，删除多余数据
    if (userRes.data.length >= 20) {
      await newSql.delete({
        table: "xxx",
        where: {
          age: 18
        }
      });
      // 提前完成事务
      return commit();
    }

    // 其他代码操作....
  }
);
```

### <a id="raw">raw 原生 SQL 操作</a>

使用`.format()`方法生成 SQL 语句，基本用法：

> format 函数基于[sqlstring 官方库 ](https://github.com/mysqljs/sqlstring)实现的，具体说明看官方文档

```javascript
const SqlUtil = require("@tencent/kg-sqlutil");

const mySql = new SqlUtil({ /* ... */ })

// 1. ?表示对插入值进行转义
const sql = mySql.format(`select * from table1 where name = ?;`, ["lulu"]);

// 2. 不需要转义的插入值，应该用双问号??
const sql = mySql.format(`insert into ?? set name = ?;`, ["table1", "lulu"]);

// 3. 使用raw()方法表示插入值为“原生SQL代码”，注意raw对应一个问号
const sql = mySql.format(`insert into ?? set created = ?;`, [
  "table1",
  mySql.raw("NOW()")
]);
```

最后使用`.query()`方法执行上述生成的 SQL 语句：

```javascript
let res = await mySql.query(sql);

if (res.code === 0) {
  console.info("成功！");
} else {
  console.info("失败！");
}
```



## <a id="errorCode">错误码</a>

| 类型  | 说明                  |
| ----- | --------------------- |
| 0     | 操作成功              |
| -100x | 数据库连接相关的错误  |
| -200x | sql语句使用相关的错误 |

### 连接相关

| 类型  | 说明                                 |
| ----- | ------------------------------------ |
| 0     | 操作成功                             |
| -1003 | 1. 连接数据失败<br />2. 事务启动失败 |
| -1004 | 查询数据失败                         |
| -1005 | 连接数据失败,连接池为空,请检查配置   |
| -1006 | 事务提交失败                         |
| -1007 | 事务执行失败                         |

### sql语句相关

#### -2001

| 说明              |
| ----------------- |
| 未配置数据表table |

#### -2002

| 方法   | 说明                                                         |
| ------ | ------------------------------------------------------------ |
| count  | 未指定字段统计                                               |
| insert | 未配置表字段fields                                           |
| update | update条件未配置，有可能影响全部数据，请配置where字段。如需绕过请手动编写sql语句。 |
| delete | delete条件未配置，有可能影响全部数据，请配置delete字段。如需绕过请手动编写sql语句。 |
| join   | 1. 未指定字段 leftFields 或 rightFields<br />2. 未指定连接字段 joinCondition |

#### -2003

| 方法   | 说明                         |
| ------ | ---------------------------- |
| insert | 插入字段不能为空             |
| join   | 连接字段为数组时必须传两个值 |



## <a id="license">License</a>

SqlUtil is available under the [MIT license](https://opensource.org/licenses/MIT). 

