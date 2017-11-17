module.exports = {
  dev: {
    port: process.env.port || 3000,
    db  : process.env.DB_LINK || "mongodb://localhost:27017/addr2line-js-dev"
  },
  test: {
    port: process.env.port || 3000,
    db  : process.env.DB_LINK || "mongodb://localhost:27017/addr2line-js-test"
  },
  prod: {
    //TODO !
  }
}
