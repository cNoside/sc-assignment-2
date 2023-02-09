module.exports = function validateEditListing(req, res, next) {
  // Validate the input from the edit listing form
  var title = req.body.title;
  var category = req.body.category;
  var description = req.body.description;
  var price = req.body.price;

  reString = new RegExp(/^[a-zA-Z0-9\s-_?]+$/);
  reNumber = new RegExp(/^[0-9]+$/);

  if (
    reString.test(title) &&
    reString.test(category) &&
    reString.test(description) &&
    reNumber.test(price)
  ) {
    next();
  } else {
    console.log("Error at XSS validation!");
    res.status(500);
    res.json(`{ "Message": "Error!" }`);
  }
};
