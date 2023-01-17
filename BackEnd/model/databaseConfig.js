var mysql = require("mysql");

var dbconnect = {
  getConnection: function () {
    var conn = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    return conn;
  }
};

module.exports = dbconnect;
