var db = require("./databaseConfig.js");
var config = require("../config.js");
var jwt = require("jsonwebtoken");
var argon2 = require("argon2");

var userDB = {
  findUser: function (id, callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        console.log("Connected!");

        var sql = "select * from users where id = ?";
        conn.query(sql, [id], function (err, result) {
          conn.end();

          if (err) {
            console.log("Err: " + err);
            return callback(err, null);
          } else if (result.length == 1) {
            return callback(null, result);
          } else {
            console.log("User not found");
            var err2 = new Error("User not found.");
            err2.statusCode = 404;
            console.log(err2);
            return callback(err2, null);
          }
        });
      }
    });
  },
  loginUser: function (email, password, callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        console.log("Connected!");

        var sql = "select * from users where email = ?";
        conn.query(sql, [email], function (err, result) {
          conn.end();

          if (err) {
            console.log("Err: " + err);
            return callback(err, null, null);
          } else if (result.length == 1) {
            argon2.verify(result[0].password, password).then((isMatched) => {
              var token = "";
              var refresh = "";

              if (isMatched) {
                token = jwt.sign({ id: result[0].id }, config.key, {
                  expiresIn: 15 * 60 // expires in 15 mins
                });
                refresh = jwt.sign({ id: result[0].id }, config.key, {
                  expiresIn: 7 * 24 * 60 * 60 // expires in 1 week
                });
                console.log("@@token " + token);
                return callback(null, [token, refresh], result);
              } else {
                console.log("email/password does not match");
                var err2 = new Error("Email/Password does not match.");
                err2.statusCode = 404;
                console.log(err2);
                return callback(err2, [], null);
              }
            });
          } else {
            console.log("email/password does not match");
            var err2 = new Error("Email/Password does not match.");
            err2.statusCode = 404;
            console.log(err2);
            return callback(err2, [], null);
          }
        });
      }
    });
  },

  updateUser: function (username, firstname, lastname, id, callback) {
    var conn = db.getConnection();
    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        console.log("Connected!");

        var sql =
          "update users set username = ?,firstname = ?,lastname = ? where id = ?;";

        conn.query(
          sql,
          [username, firstname, lastname, id],
          function (err, result) {
            conn.end();

            if (err) {
              console.log(err);
              return callback(err, null);
            } else {
              console.log(
                "No. of records updated successfully: " + result.affectedRows
              );
              return callback(null, result.affectedRows);
            }
          }
        );
      }
    });
  },

  addUser: function (
    username,
    email,
    password,
    profile_pic_url,
    role,
    callback
  ) {
    var conn = db.getConnection();

    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        console.log("Connected!");
        var sql =
          "Insert into users(username,email,password,profile_pic_url,role) values(?,?,?,?,?)";
        argon2.hash(password).then((hash) => {
          conn.query(
            sql,
            [username, email, hash, profile_pic_url, role],
            function (err, result) {
              conn.end();

              if (err) {
                console.log(err);
                return callback(err, null);
              } else {
                return callback(null, result);
              }
            }
          );
        });
      }
    });
  }
};

module.exports = userDB;
