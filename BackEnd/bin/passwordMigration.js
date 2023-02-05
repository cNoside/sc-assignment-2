require("dotenv").config();
var db = require("../model/databaseConfig");
var argon2 = require("argon2");

var conn = db.getConnection();

conn.connect(function (err) {
  if (err) {
    console.log(err);
  } else {
    var sql = "select * from users where password not like '$argon2id$%'";
    conn.query(sql, function (err, result) {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        result.forEach((user) => {
          var sql2 = "update users set password=? where id=?";
          argon2.hash(user.password).then((hash) => {
            conn.query(sql2, [hash, user.id], function (err, result) {
              if (err) {
                console.log(err);
              } else {
                console.log("updated", user.username);
              }
            });
          });
        });
      }
    });
  }
});
