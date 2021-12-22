const SqlUtil = require("../dist/index.js")
const sqlutil = new SqlUtil({
  dbConfig: {
    connectionLimit: 100,
    host: "127.0.0.1",
    user: "root",
    password: "123456",
    port: 3306,
    database: "test",
    timezone: "",
    connectionLimit: 5 // default 5 //You can not configure it
  },
  returnOriginError: true,
  returnOriginSource: true
})
main()
async function main() {
  await select()
  await transation()
  process.exit(0)
}

async function select() {
  const queryRes = await sqlutil.select({
    table: 'guild',
    where: {}
  })
  console.log("queryRes::", queryRes)
}

async function transation() {
  const queryResSql = await sqlutil.select({
    table: 'guild',
    where: {},
    asSql: true
  })
  const queryRes = await sqlutil.beginTransaction([queryResSql])
  console.log("queryRes::", queryRes)
}