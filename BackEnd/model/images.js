var db = require("./databaseConfig.js");

var imagesDB = {
  uploadImage: function (name, fk_product_id, userid, size, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql = "insert into images(name,fk_product_id,fk_user_id,size) values(?,?,?,?)";
        dbConn.query(sql, [name, fk_product_id, userid, size], function (err, result) {
          dbConn.end();
          if (err) {
            console.log(err);
            return callback(err, null);
          } else {
            return callback(null, result);
          }
        });
      }
    });
  },
  getUserTotalSize: function (userid, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql = "select sum(size) as total from images where fk_user_id=?";
        dbConn.query(sql, [userid], function (err, result) {
          dbConn.end();
          if (err) {
            console.log(err);
            return callback(err, null);
          } else {
            return callback(null, result);
          }
        });
      }
    });
  }
};

module.exports = imagesDB;
