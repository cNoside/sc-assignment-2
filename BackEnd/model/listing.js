var db = require("./databaseConfig.js");

var listingDB = {
  addListing: function (
    title,
    category,
    description,
    price,
    fk_poster_id,
    callback
  ) {
    console.log(description);
    var conn = db.getConnection();

    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql =
          "insert into listings(title,category,description,price,fk_poster_id) values(?,?,?,?,?)";
        conn.query(
          sql,
          [title, category, description, price, fk_poster_id],
          function (err, result) {
            conn.end();
            if (err) {
              console.log("Err: " + err);
              return callback(err, null);
            } else {
              return callback(null, result);
            }
          }
        );
      }
    });
  },
  getUserListings: function (userid, callback) {
    var conn = db.getConnection();
    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql = `select l.title,l.category,l.price,l.id,i.name from listings l,images i where l.id = i.fk_product_id and fk_poster_id = ${userid}`;
        conn.query(sql, [], function (err, result) {
          conn.end();
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
  getListing: function (id, callback) {
    var conn = db.getConnection();
    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql =
          "select l.title,l.category,l.description,l.price,u.username,l.fk_poster_id,i.name from listings l,users u,images i where l.id = ? and l.id = i.fk_product_id and l.fk_poster_id = u.id";
        conn.query(sql, [id], function (err, result) {
          conn.end();
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
  getOtherUsersListings: function (query, userid, callback) {
    var conn = db.getConnection();
    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql =
          "select l.title,l.category,l.price,l.id,i.name from listings l,images i where l.id = i.fk_product_id and l.fk_poster_id != ? and l.title like '%" +
          query +
          "%'";
        conn.query(sql, [userid], function (err, result) {
          conn.end();
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
  updateListing: function (title, category, description, price, id, callback) {
    var conn = db.getConnection();
    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql =
          "update listings set title = ?,category = ?,description = ?,price = ? where id = ?";
        conn.query(
          sql,
          [title, category, description, price, id],
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
      }
    });
  },
  deleteListing: function (userId, id, callback) {
    var conn = db.getConnection();
    conn.connect(function (err) {
      if (err) {
        console.log(err);
        return callback(err, null);
      } else {
        var sql1 = "select * from listings where id = ?";
        conn.query(sql1, [id], function (err, result) {
          if (err) {
            console.log(err);
            return callback(err, null);
          }
          if (result.length == 0) {
            var err3 = new Error("Listing does not exist");
            err3.statusCode = 404;
            return callback(err3, null);
          }
          if (result[0]?.fk_poster_id != userId) {
            var err2 = new Error(
              "You are not authorized to delete this listing"
            );
            err2.statusCode = 401;
            return callback(err2, null);
          }

          var sql2 = "delete from listings where id = ?";
          conn.query(sql2, [id], function (err, result) {
            conn.end();
            if (err) {
              console.log(err);
              return callback(err, null);
            } else {
              return callback(null, result);
            }
          });
        });
      }
    });
  }
};

module.exports = listingDB;
