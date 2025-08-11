/********************************************************************************
 *  WEB322 – Assignment 06
 *
 *  I declare that this assignment is my own work and completed based on my
 *  current understanding of the course concepts.
 *
 *  The assignment was completed in accordance with:
 *  a. The Seneca's Academic Integrity Policy
 *  https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
 *
 *  b. The academic integrity policies noted in the assessment description
 *   i got the help from the documentation for web322 about ensureLogin
 *
 *  I did NOT use generative AI tools (ChatGPT, Copilot, etc) to produce the code
 *  for this assessment.
 *
 *  Name:Elshad Humbatli       Student ID: 107143240
 *
 ********************************************************************************/

const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const app = express();
app.use(express.static("public")); // css files
app.set("view engine", "ejs"); //ejs
app.use(express.urlencoded({ extended: true })); //forms

// setup sessions
const session = require("express-session");
app.use(
  session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890", // random string, used for configuring the session
    resave: false,
    saveUninitialized: true,
  })
);

require("dotenv").config();
const mongoose = require("mongoose");

// TODO: Put your model and schemas here

const renterSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const renter = new mongoose.model("renters", renterSchema);

const carSchema = new mongoose.Schema({
  model: String,
  imageUrl: String,
  returnDate: String,
  rentedBy: { type: mongoose.Schema.Types.ObjectId, ref: "renters" },
});

const car = new mongoose.model("cars", carSchema);

app.get("/", async (req, res) => {
  return res.render("login.ejs", { errorMsg: null });
});
app.post("/login", async (req, res) => {
  const mailFromLogin = req.body.email;
  const passwordFromLogin = req.body.password;

  const rentingPerson = await renter.findOne({ email: mailFromLogin });
  if (rentingPerson) {
    //for existing one

    if (rentingPerson.password !== passwordFromLogin) {
      //if password wrong send the error message

      return res.render("login.ejs", {
        errorMsg: "Invalid  password.Try again",
      });
    }
    req.session.rentingPerson = {
      id: rentingPerson._id.toString(),
      email: rentingPerson.email,
    }; //save the database renter to the session
    return res.redirect("/cars");
  } else {
    //this user does not exist add this user to the database
    const newUser = await renter.create({
      email: mailFromLogin,
      password: passwordFromLogin,
    });
    req.session.rentingPerson = {
      id: newUser._id.toString(),
      email: newUser.email,
    }; //save the database renter to the session
    return res.redirect("/cars");
  }
});

function ensureLogin(req, res, next) {
  if (!req.session.rentingPerson) res.redirect("/");
  else next();
}
app.get("/logout", async (req, res) => {
  return req.session.destroy(() => {
    res.redirect("/");
  });
});
app.get("/cars", ensureLogin, async (req, res) => {
  const userId = req.session.rentingPerson.id;
  const carData = await car.find().populate("rentedBy");
  return res.render("cars.ejs", { carList: carData, currentUserId: userId });
});

app.get("/cars/:id/book", ensureLogin, async (req, res) => {
  const vehicle = await car.findById(req.params.id);
  if (!vehicle) return res.redirect("/cars");
  if (vehicle.returnDate) return res.redirect("/cars");
  res.render("bookingForm.ejs", { results: vehicle });
});
app.post("/cars/:id/book", ensureLogin, async (req, res) => {
  const renterId = req.session.rentingPerson.id;
  const date = req.body.date;
  await car.findByIdAndUpdate(req.params.id, {
    returnDate: date,
    rentedBy: renterId,
  });

  return res.redirect("/cars");
});
app.post("/cars/:id/return", ensureLogin, async (req, res) => {
  const renterId = req.session.rentingPerson.id;

  await car.updateOne(
    { _id: req.params.id, rentedBy: renterId },
    { $set: { returnDate: "" }, $unset: { rentedBy: "" } }
  );
  res.redirect("/cars");
});

async function populateDatabase() {
  const renterCount = await renter.countDocuments();
  if (renterCount === 0) {
    const firstPerson = await renter.create({
      email: "ehumbatli@myseneca.ca",
      password: "apple123",
    });
    const secondPerson = await renter.create({
      email: "farhadli@gmail.com",
      password: "water456",
    });
    console.log("renters are created");

    console.log("creating cars");

    await car.insertMany([
      {
        model: "Hyundai",
        imageUrl:
          "https://hips.hearstapps.com/hmg-prod/images/2024-hyundai-elantra-n-lightning-lap-2025-788-67b0a409b17e3.jpg?crop=0.627xw:0.528xh;0.206xw,0.244xh&resize=1200:*",
        returnDate: "20/08/2025",
        rentedBy: firstPerson._id,
      },
      {
        model: "BMW",
        imageUrl:
          "https://t4.ftcdn.net/jpg/04/20/38/41/240_F_420384111_5fzxWlWxvB7bg5BROxfKdBbgBYB2TwGP.jpg",
        returnDate: "20/08/2025",
        rentedBy: secondPerson._id,
      },
      {
        model: "Toyota",
        imageUrl:
          "https://scene7.toyota.eu/is/image/toyotaeurope/COR0004a_25_WEB_CROP?qlt=80&wid=1600&fit=fit,1&ts=0&resMode=sharp2&op_usm=1.75,0.3,2,0&fmt=png-alpha",
        returnDate: "",
      },
      {
        model: "Mercedes",
        imageUrl:
          "https://www.topgear.com/sites/default/files/cars-car/inline-gallery/2025/05/Original-49014-mercedes-e53-amg-saloon-0002_0.jpg",
        returnDate: "",
      },
      {
        model: "Nissan",
        imageUrl:
          "https://hips.hearstapps.com/hmg-prod/images/2024-nissan-sentra-129-6488757e6ae9a.jpg?crop=0.663xw:0.560xh;0.279xw,0.373xh&resize=1200:*",
        returnDate: "",
      },
    ]);
    console.log("done");
  } else {
    console.log("renters already exist");
  }
}

async function startServer() {
  try {
    // TODO: Update this
    await mongoose.connect(process.env.MONGO_CONNECTION_STRING);
    await populateDatabase();

    console.log("SUCCESS connecting to MONGO database");
    console.log("STARTING Express web server");

    app.listen(HTTP_PORT, () => {
      console.log(`server listening on: http://localhost:${HTTP_PORT}`);
    });
  } catch (err) {
    console.log("ERROR: connecting to MONGO database");
    console.log(err);
    console.log("Please resolve these errors and try again.");
  }
}
startServer();
