English| [简体中文](./README_CN.md) 

## Table of contents

- [Introduction](#introduction)
- [Installing](install)
- [Quick start](#quick)
- [SqlUtil methods](#sqlUtil-use)
- [SSH configuration](#ssh-config)
- [SqlUtil features](#sql-methods-intro)
- [ErrorCode](#errorCode)
- [License](#license)



## <a id="introduction">Introduction</a>

SqlUtil is a lightweight database tool library based on MySQL2 + SSH2, which supports:

- Support SSH remote debugging, convenient local development
- Convenient methods of manipulating databases, including data query, creation, deletion, modification, transaction lists, etc
- Support for native SQL queries
- Security precautions to avoid security issues, such as SQL injection, etc
- Use pool libraries to cache database links and reduce connection creation/release operations



## <a id="install">Installing</a>

```
yarn add node-sql-util -S
```
```
npm install node-sql-util --save
```


## <a id="quick">Quick start</a>

```javascript
// create connection
const mySql = new SqlUtil({
  dbConfig: {
    host: "1.2.3.4",
    port: "1000",
    database: "xxxx",
    user: "xxxx",
    password: "xxxx",
    timezone: "",
    connectionLimit: 5 // default 5 //You can not configure it
  }
});

let searchRes = await mySql.select({
  table: "xxxx",
  where: {
    id: 1
  }
});
```
## <a id="sqlUtil-use">SqlUtil methods</a>

Attention：

1. In all methods, if the asSql field is true, the SQL statement is returned. **Otherwise, the default SQL result is returned.**
2. The WHERE statement defaults to object. See array notation [here](#where-array)（Recommends array writing method, more flexible）

The following shows the use of common SQL statements

- [select](#select)
- [find](#find)
- [insert](#insert)
- [update](#update)
- [delete](#delete)
- [count](#count)
- [join](#join)
- [condition](#condition)
- [Transaction](#task)
- [raw SQL](#raw)

### <a id="select">select</a>

```js
mySql.select({
  fields = [],
  table = "",
  where = null,
  groupby = "",
  order = "desc",
  limit = null,
  asSql = false
})
```



#### Parameter

| field name | default | need |
| ---------- | ------- | ---- |
| table      | ""      | yes  |
| fields     | []      | no   |
| where      | null    | no   |
| groupby    | ""      | no   |
| orderby    | ""      | no   |
| order      | "desc"  | no   |
| limit      | null    | no   |
| asSql      | false   | no   |

#### Return sample

```javascript
{
  code: 0,
  subcode: 0,
  message: 'success',
  default: 0,
  data: [{
    name: 'milu',
    age: 18
  }],
}
```

1.Select all Fields

```sql
select * from table1;
```

```javascript
let res = await mySql.select({
  table: "table1"
});
if (res.code === 0) {
  res.data;
  console.info("success！");
} else {
  console.info("error！");
}
```

<br/>

2.Select the specified column

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

3.Condition select

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

more condition please see [《condition》chapter](#condition)

### <a id="find">Find find a single data</a>

`find` method is similar to `select` method，the different are：

- `limit` value is 1，which supports coverage.
- Returns the result `res.data`, not an array, but the first data item

```sql
select age,sex from table1 where age=18 limit 1;
```



```javascript

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

#### Return sample

```javascript
{
  code: 0, // 0 means success, non-0 means failure
  data: {
    name: "xxx",
    age: 1,
    sex: 2,
    type: 8
  },
  message: "xxxxx"
}
```

### <a id="insert">insert</a>

```js
mySql.insert({
  fields = [],
  table = "",
  data = []
})
```



1.Insert one row

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

// or array type
await sqlutil.insert({
  fields: ["age", "sex", "type", "created"],
  table: "table_1",
  data:[1, 1, 2, mySql.raw("now()")]
});

```

In the return value to provide ` insertId ` ID of the new data, like:

```javascript
{
  code: 0,
  data: {
    insertId: 20000061,
  },
  message: "xxxxx"
}
```

<br/>2.insert multiple rows

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

#### Return sample

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



### <a id="update">update</a>

```js
mySql.update({
  table = "",
  data = {},
  where = null
})
```



> Note：`If the inserted field is a SQL built-in variable or method`，like  `NOW()，CURRENT_TIMESTAMP`，it must  use `sqlutil.raw()` to escape, Otherwise it will be inserted as a plain string.

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

#### Return sample

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

### <a id="delete">delete</a>

```js
mySql.delete({
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

#### Return sample

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

### <a id="count">count</a>

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

In return value, `total` means the number of statistics，like：

```javascript
{
  code: 0,
  data: {
    total: 14
  },
  message: "xxxxx"
}
```

### <a id="join"><a id="join">join</a>

```js
mySql.join({
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



#### Parameters

| Field name    | default | must |
| ------------- | ------- | ---- |
| leftTable     | ""      | yes  |
| leftFields    | []      | yes  |
| rightTable    | ""      | yes  |
| rightFields   | []      | yes  |
| joinCondition | ""      | yes  |
| where         | null    | no   |
| groupby       | ""      | no   |
| orderby       | ""      | no   |
| order         | "desc"  | no   |
| limit         | null    | no   |
| total         | false   | no   |
| asSql         | false   | no   |

> Note: when `total`  is true, it means select all the data and  `limit` can be no use

</a>

1.Specify table fields

```sql
select 
`table1`.`name` as `name`,
`table1`.`age` as `age`,
`table1`.`b` as `b`,
`table2`.`c` as `c`,
`table2`.`d` as `d` 
from 
`table1` `table1`,
`table2` `table2` 
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
    'table2.age': { // Specify table fields
      value: 11,
      condition: '>='
    }
  },
  total: false
});
```

<br/>

2.Table alias

```javascript
await mySql.join({
  leftTable: "table1 as extra",
  leftFields: ["name", "age", "b"],
  rightTable: "table2",
  rightFields: ["c", "d"],
  joinCondition: "name",
  where: {
    'extra.age': { // alias      
      value: 11,
      condition: '>='
    }
  },
  total: false
});
```

For more complex queries, write SQL statements manually with `sqlutil.format `.



### <a id="condition">Condition</a>

#### Paging

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

#### 

#### Fuzzy selection

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

#### Location query

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

#### Sorting

1.Grouping sorting
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

2.Multi sorting
```sql
select name,age from table1 order by age desc, id asc;
```

```javascript
await mySql.select({
  fields: ["name", "age"],
  table: "table1",
  orders: [{
    order: 'desc',
    by: 'age'
  },{
    order: 'asc',
    by: 'id'
  }]
});
```

#### Select range

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

1.greater than or less than

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

2.greater than or less than inverse

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

#### Combination conditions

1.(=,>,>=,<,<=)

<a id="where-array">`where ` array notation</a>，supports duplicate fields. Field names are written inside the object. The other conditions are the same as the object notation.

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

3.Prioritize query combination conditions，`combineCondition`can combine conditions recursively，`combineCondition.where` is exactly the same as the conditional syntax：

```sql
select 
age, name 
from table1 
where 
age=1 and (type=2 or (name like "luck" and type=8));
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

### <a id="task">Transaction</a>

`sqlUtil` support `runTransaction` method to handle transactions，the method supports：

- A new instance of 'sqlUtil' with the same usage as above. **It must be used ** to manipulate the database in a transaction
- All operations performed by the transaction can be rolled back by `rollback()`
- When the transaction is complete, `commit()` is called to commit the transaction. It is mainly used to **pre-commit** transaction completion.

```javascript
let taskRes = await mySql.runTransaction(
  async ({ sqlUtil: newSql, rollback, commit }) => {
    // A new instance newSql must be used to operate within the transaction,
    const modRes = await newSql.find({
      table: "xxx",
      where: {
        id: "xxx"
      }
    });

    // Error results can be returned via rollback() for internal input logging
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

    // commit()is optional
    commit();
  }
);

if (taskRes.code === 0) {
  console.info("success！");
} else {
  console.info("error！");
}
```

`commit()` is optional and may not be called. When the `runTransaction(CB)` listens for the `CB` function to complete, it automatically commits the `commit` if it determines that `rollback()` has not been called and the code does not report an error.

`Commit()` is primarily used semantically to indicate the early completion of a transaction:

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

    // If the number of people is too much, delete the redundant data
    if (userRes.data.length >= 20) {
      await newSql.delete({
        table: "xxx",
        where: {
          age: 18
        }
      });
      // pre-commit transaction
      return commit();
    }

    // other....
  }
);
```

### <a id="raw">raw SQL</a>

Use `.format()`method to create SQL statement，basic usage：

> format function is based on [sqlstring ](https://github.com/mysqljs/sqlstring)，please see the official document for more details.

```javascript
const SqlUtil = require("@tencent/kg-sqlutil");

const mySql = new SqlUtil({ /* ... */ })

// 1. ? represents the escape of the inserted value
const sql = mySql.format(`select * from table1 where name = ?;`, ["lulu"]);

// 2. Inserted values that do not need to be escaped should use a double question mark??
const sql = mySql.format(`insert into ?? set name = ?;`, ["table1", "lulu"]);

// 3. Use the raw() method to indicate that the insert value is "native SQL code." Note that raw corresponds to a question mark
const sql = mySql.format(`insert into ?? set created = ?;`, [
  "table1",
  mySql.raw("NOW()")
]);
```

Finally, execute the generated SQL statement using the `.query() `method：

```javascript
let res = await mySql.query(sql);

if (res.code === 0) {
  console.info("success！");
} else {
  console.info("error！");
}
```
## <a id="ssh-config">SSH configuration [option feature]</a>

```js
// create connection
const mySql = new SqlUtil({
  dbConfig: {
    host: "1.2.3.4",
    port: "1000",
    database: "xxxx",
    user: "xxxx",
    password: "xxxx",
    timezone: "",
    connectionLimit: 5 // default 5 //You can not configure it
  },
  // Use SSH only when developing locally
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

let searchRes = await mySql.select({
  table: "xxxx",
  where: {
    id: 1
  }
});
```



- srcHost：The IP from which the local backend service is started

- srcPort: The port on which the local backend service is started

- host: SSH server IP

- port: SSH server port

- username: SSH server account

- password: SSH server password



**attention**:  SSH can only be used for local development. It is best not to use it online. Be careful to isolate the development from the online environment.



## <a id="sql-methods-intro">SqlUtil features</a>

SqlUtil instance properties and methods

- [`sqlutil.dbConfig` ](#newSqlUtil)db configuration
- [`sqlutil.ssh`](#newSqlUtil)ssh configuration
- [`sqlutil.format()` ](#format)Escape the SQL statement to convert the input character to a secure string
- [`sqlutil.escape()` ](#escape)Escape a string field
- [`sqlutil.escapeId()`](#escapeId) Escape table fields
- [`sqlutil.query()` ](#query)Manually query SQL
- [`sqlutil.handleRes()` ](#handleRes)Return the result of execution
- `sqlutil.setConnection(dbConfig)` Set the DB connection configuration
- `sqlutil.raw()` Escape SQL built-in method variables
- `sqlutil.select()` 
- `sqlutil.count()` 
- `sqlutil.insert()` 
- `sqlutil.update()` 
- `sqlutil.join()`
- `sqlutil.delete()`
- `sqlutil.find()`

### <a id="newSqlUtil">Crate SqlUtil Instance</a>

```javascript
const mySql = new SqlUtil({
  dbConfig: {
    host: "1.2.3.4",
    port: "1000",
    database: "xxxx",
    user: "xxxx",
    password: "xxxx",
    connectionLimit: 5
  },
  // Use SSH only when developing locally
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



### <a id="format">Escape SQL statements</a>

`??` is the field or table name，`?` is the value of the specific field，which needs to be escaped.

1.simple value `? ` escape

```javascript
const name = 'lili'
const sql = sqlutil.format(`select * from table1 where name = ?;`,[name]);
console.log(sql);//select * from table1 where name = 'lili';
```

2.field `??`escape

```javascript
const name = 'lili'
const field= 'name'
const sql = sqlutil.format(`select * from table1 where ?? = ?;`,[field,name]);
console.log(sql);//select * from table1 where `name` = 'lili';
```

3.array and object escape

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

4.use `sqlutil.raw` not to escape built-in function.

```javascript
const name = 'milu'
const table = 'table1'
const value = {
	date : sqlutil.raw('NOW()')
}
const sql = sqlutil.format(`update ?? set ? where name = ?;`,[table,value,name]);
console.log(sql);//update `table1` set `date` = NOW() where name = 'milu';
```

5.array list escape

```javascript
const value = [['a', 'b'], ['c', 'd']];
const sql = sqlutil.format('?',[value])
console.log(sql);//('a', 'b'), ('c', 'd')
```

6.<a id="escapeId">table field escape `sqlutil.escapeId`</a>

```javascript
const sorter = 'posts.date';
const sql    = 'SELECT * FROM posts ORDER BY ' + sqlutil.escapeId(sorter);
console.log(sql); // SELECT * FROM posts ORDER BY `posts`.`date`

// sqlutil.escapeId('date'); -> `date`
// sqlutil.escapeId('table.date'); -> `table`.`date`
// sqlutil.escapeId('table.date',true); -> `table.date`
```

7.<a id="escape">escape string</a>

```javascript
sqlutil.escape('abc\'d'); // -> "'aaa\'a'"
```

### <a id="query">Manually query SQL</a>

```javascript
await sqlutil.query('select * from table1;');
await sqlutil.query('update table1 set a=1 where id=1;');
await sqlutil.query(`insert into table1 (name,age) values('milu',18)`);
```



### <a id="handleRes">Return the result of execution</a>

```javascript
return sqlutil.handleRes(-1000, 'unlogin', {
  data: 'data',
  other: 'other info'
});
// return
{
  code:-1000,
  subcode: 0,
  message:'unlogin',
  default: 0,
  data: 'data',
  other:'other info'
}
```





## <a id="errorCode">ErrorCode</a>

| Type  | Instructions                         |
| ----- | ------------------------------------ |
| 0     | successful                           |
| -100x | Error related to database connection |
| -200x | Error related to SQL statement       |

### Database related

| type  | Instructions                                                 |
| ----- | ------------------------------------------------------------ |
| 0     | successful                                                   |
| -1003 | 1. Connection failed<br />2. Transaction startup failed      |
| -1004 | Data query failed                                            |
| -1005 | Connection failed, connection pool is empty, please check configuration |
| -1006 | Transaction submission failed                                |
| -1007 | Transaction execution failed                                 |

### SQL related

#### -2001

| Instructions                        |
| ----------------------------------- |
| Database table is not configured |

#### -2002

| Methods | Instructions                                                 |
| ------- | ------------------------------------------------------------ |
| count   | Field `field` is not specified                               |
| insert  | Field `field` is not specified                               |
| update  | Field `where` is not specified which might affect all the data. please configure the `where` field.If you do not need WHERE, write the SQL statement manually. |
| delete  | Field `delete` is not specified which might affect all the data. please configure the `delete` field.If you do not need DELETE, write the SQL statement manually. |
| join    | 1. Field `leftFields` or `rightFields` is not specified<br />2. Field `joinCondition` is not specified |

#### -2003

| Methods | Instructions                                             |
| ------- | -------------------------------------------------------- |
| insert  | The insert field `data` cannot be empty                  |
| join    | Two values must be passed when joinCondition is an array |



## <a id="license">License</a>

SqlUtil is available under the [MIT license](https://opensource.org/licenses/MIT). 

