var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var user = require("../model/user.js");
var listing = require("../model/listing");
var offers = require("../model/offer");
var likes = require("../model/likes");
var images = require("../model/images");
var verifyToken = require("../auth/verifyToken.js");

var path = require("path");
var multer = require("multer");
var fileType = require("file-type");
var fs = require("fs/promises");
var fsSync = require("fs");
var config = require("../config.js");

var cors = require("cors"); //Just use(security feature)
var cookieParser = require("cookie-parser");
var jwt = require("jsonwebtoken");

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.options("*", cors()); //Just use
app.use(cors()); //Just use
app.use(bodyParser.json());
app.use(urlencodedParser);
app.use(cookieParser());

//User APIs
app.post("/user/login", function (req, res) {
  //Login
  var email = req.body.email;
  var password = req.body.password;

  if (!email || !password) {
    res.status(401);
    res.send("Please enter email and password");
  }

  user.loginUser(email, password, function (err, [token, refresh], result) {
    if (err) {
      res.status(500);
      res.send(err.statusCode);
    } else {
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      delete result[0]["password"]; //clear the password in json data, do not send back to client
      res.cookie("refresh", refresh, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "none"
      });
      res.json({
        success: true,
        UserData: JSON.stringify(result),
        token: token,
        refresh: refresh,
        status: "You are successfully logged in!"
      });
    }
  });
});

app.post("/user/refresh", function (req, res) {
  if (req.cookies.refresh) {
    var refresh = req.cookies.refresh;
    var token = "";

    jwt.verify(refresh, config.key, function (err, decoded) {
      if (err) {
        res.status(401).send("Unauthorized");
      } else {
        user.findUser(decoded.id, function (err, result) {
          if (err) {
            res.status(401).send("Unauthorized");
          } else {
            token = jwt.sign({ id: result[0].id }, config.key, {
              expiresIn: 15 * 60 // expires in 15 mins
            });
            res.status(200).json({ token: token });
          }
        });
      }
    });
  } else {
    res.status(401).send("Unauthorized");
  }
});

const commonPasswords = fsSync
  .readFileSync("bin/common-passwords.txt", "utf8")
  .split("\n");

app.post("/user", function (req, res) {
  //Create User
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  var profile_pic_url = req.body.profile_pic_url;
  var role = req.body.role;

  const MIN_LENGTH = 10;
  const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;

  if (password.length < MIN_LENGTH) {
    res.status(400);
    res.send("Password must be at least 10 characters long");
    return;
  }
  if (!PASSWORD_REGEX.test(password)) {
    res.status(400);
    res.send(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
    return;
  }
  if (commonPasswords.includes(password)) {
    res.status(400);
    res.send("Password is too common");
    return;
  }

  user.addUser(
    username,
    email,
    password,
    profile_pic_url,
    role,
    function (err, result) {
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        res.status(201);
        res.setHeader("Content-Type", "application/json");
        res.send(result);
      }
    }
  );
});

app.post("/user/logout", function (req, res) {
  //Logout
  console.log("..logging out.");
  res.clearCookie("session-id"); //clears the cookie in the response
  res.setHeader("Content-Type", "application/json");
  res.json({ success: true, status: "Log out successful!" });
});

app.put("/user/update/", verifyToken, function (req, res) {
  //Update user info
  var id = req.id;
  var username = req.body.username;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  user.updateUser(username, firstname, lastname, id, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true });
    }
  });
});

//Listing APIs
app.post("/listing/", verifyToken, function (req, res) {
  //Add Listing
  var title = req.body.title;
  var category = req.body.category;
  var description = req.body.description;
  var price = req.body.price;
  var fk_poster_id = req.id;
  listing.addListing(
    title,
    category,
    description,
    price,
    fk_poster_id,
    function (err, result) {
      if (err) {
        res.status(500);
        res.json({ success: false });
      } else {
        res.status(201);
        res.setHeader("Content-Type", "application/json");
        res.json({ success: true, id: result.insertId });
      }
    }
  );
});

app.get("/user/listing", verifyToken, function (req, res) {
  //Get all Listings of the User
  var userid = req.id;
  listing.getUserListings(userid, function (err, result) {
    if (err) {
      res.status(500);
      console.log(err);
      res.json({ success: false });
    } else {
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, result: result });
    }
  });
});

app.get("/listing/:id", function (req, res) {
  //View a listing
  var id = req.params.id;
  listing.getListing(id, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, result: result });
    }
  });
});

app.get("/search/:query", verifyToken, function (req, res) {
  //View all other user's listing that matches the search
  var query = req.params.query;
  var userid = req.id;
  listing.getOtherUsersListings(query, userid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, result: result });
    }
  });
});

app.put("/listing/update/", function (req, res) {
  //View a listing
  var title = req.body.title;
  var category = req.body.category;
  var description = req.body.description;
  var price = req.body.price;
  var id = req.body.id;
  listing.updateListing(
    title,
    category,
    description,
    price,
    id,
    function (err, result) {
      if (err) {
        res.status(500);
        res.json({ success: false });
      } else {
        res.status(200);
        res.setHeader("Content-Type", "application/json");
        res.json({ success: true });
      }
    }
  );
});

app.delete("/listing/delete/", function (req, res) {
  //View a listing
  var id = req.body.id;

  listing.deleteListing(id, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true });
    }
  });
});

//Offers API
app.post("/offer/", verifyToken, function (req, res) {
  //View a listing
  var offer = req.body.offer;
  var fk_listing_id = req.body.fk_listing_id;
  var fk_offeror_id = req.id;
  var status = "pending";
  offers.addOffer(
    offer,
    fk_listing_id,
    fk_offeror_id,
    status,
    function (err, result) {
      if (err) {
        res.status(500);
        res.json({ success: false });
      } else {
        res.status(201);
        res.setHeader("Content-Type", "application/json");
        res.json({ success: true });
      }
    }
  );
});

app.get("/offer/", verifyToken, function (req, res) {
  //View all offers
  var userid = req.id;
  offers.getOffers(userid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(201);
      res.setHeader("Content-Type", "application/json");
      console.log(result);
      res.json({ success: true, result: result });
    }
  });
});

app.post("/offer/decision/", function (req, res) {
  //View all offers
  var status = req.body.status;
  var offerid = req.body.offerid;
  offers.AcceptOrRejectOffer(status, offerid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(201);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true });
    }
  });
});

app.get("/offer/status/", verifyToken, function (req, res) {
  //View all offers
  var userid = req.id;
  offers.getOfferStatus(userid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(201);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, result: result });
    }
  });
});

//Likes API
app.post("/likes/", verifyToken, function (req, res) {
  //View all offers
  var userid = req.id;
  var listingid = req.body.listingid;
  likes.insertLike(userid, listingid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(201);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true });
    }
  });
});

app.get("/likeorunlike/:listingid/", verifyToken, function (req, res) {
  //Like or Unlike
  var userid = req.id;
  var listingid = req.params.listingid;
  likes.checklike(userid, listingid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(200);
      if (result.length == 0) {
        likes.insertLike(userid, listingid, function (err, result) {
          if (err) {
            res.status(500);
            res.json({ success: false });
          } else {
            res.status(201);
            res.setHeader("Content-Type", "application/json");
            res.json({ success: true, action: "liked" });
          }
        });
      } else {
        likes.deleteLike(userid, listingid, function (err, result) {
          if (err) {
            res.status(500);
            res.json({ success: false });
          } else {
            res.status(200);
            res.json({ success: true, action: "unliked" });
          }
        });
      }
    }
  });
});

app.get("/likes/:listingid/", function (req, res) {
  //View all offers
  var listingid = req.params.listingid;
  likes.getLike(listingid, function (err, result) {
    if (err) {
      res.status(500);
      res.json({ success: false });
    } else {
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.json({ success: true, amount: result.length });
    }
  });
});

//Images API

let memory = multer({ storage: multer.memoryStorage() });

app.post(
  "/images/:fk_product_id/",
  verifyToken,
  memory.single("myfile"),
  async function (req, res, next) {
    const filenameWhitelist = /[^a-zA-Z0-9\s-_.]/g; // allowed characters
    const extensionWhitelist = /jpeg|jpg|png|gif/; // allowed extensions
    const limits = { fileSize: 5 * 1024 * 1024 }; // 5mb limit
    const destination = __dirname + "/../public";
    const filename =
      req.file.originalname
        .replace(filenameWhitelist, "")
        .replace(path.extname(req.file.originalname), "") +
      "-" +
      Date.now() +
      path.extname(req.file.originalname);

    const typeFromFilename = path
      .extname(req.file.originalname)
      .toLowerCase()
      .slice(1);
    const typeFromContent = await fileType.fromBuffer(req.file.buffer);

    if (
      !extensionWhitelist.test(typeFromFilename) ||
      !extensionWhitelist.test(typeFromContent?.ext)
    ) {
      res.status(400).json({ success: false, message: "Invalid file type" });
      return;
    } else if (req.file.size > limits.fileSize) {
      res.status(400).json({ success: false, message: "File too large" });
      return;
    }

    try {
      await fs.writeFile(destination + "/" + filename, req.file.buffer);
      images.getUserTotalSize(req.id, function (err, result) {
        if (err) {
          res.status(500);
          res.json({ success: false });
        } else {
          const limitMb = 10;
          const isAuthorised =
            result[0].total + req.file.size <= limitMb * 1024 * 1024;
          if (!isAuthorised) {
            res.status(403);
            res.json({
              success: false,
              message: `You have ${(
                limitMb -
                result[0].total / 1024 / 1024
              ).toFixed(2)}MB of storage left. The file you uploaded is ${(
                req.file.size /
                1024 /
                1024
              ).toFixed(2)}MB`
            });
          } else {
            var fk_product_id = req.params.fk_product_id;
            var name = filename;
            images.uploadImage(
              name,
              fk_product_id,
              req.id,
              req.file.size,
              function (err, result) {
                if (err) {
                  res.status(500);
                  res.json({ success: false });
                } else {
                  res.status(201);
                  res.json({ success: true });
                }
              }
            );
          }
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500);
      res.json({ success: false, message: "Internal server error" });
    }
  }
);
module.exports = app;
