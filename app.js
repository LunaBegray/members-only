/////// app.js
const dotenv = require('dotenv').config()
const bcrypt = require('bcryptjs')
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mongoDb = process.env.MONGOURL;
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    clubmember: {type: Boolean, required: true},
    admin: {type: Boolean, required: true},
  })
);

const Message = mongoose.model(
  "Message",
  new Schema({
    userName: {type: String, required: true},
    date: {},
    text: {type: String, required: true},
    title: {type: String, required: true},
  })
);

const app = express();
app.set("views", './views');
app.set("view engine", "ejs");
app.use(passport.initialize())

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

const { body,validationResult } = require('express-validator');

passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username: username }, (err, user) => {
      if (err) { 
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          // passwords match! log user in
          return done(null, user)
        } else {
          // passwords do not match!
          return done(null, false, { message: "Incorrect password" })
        }
      })
      return done(null, user);
    });
  })
);
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//create a new message!
app.get("/createMessage", (_req, res) => {
  res.render("createMessage", { user: _req.user});
}); 

app.post("/createMessage", 
  body("text").trim().isLength({min: 1}).escape().withMessage('text must be specified'),
  body("title").trim().isLength({min: 1}).escape().withMessage('title must be specified'),

  (req, res, next) => {
    const message = new Message({
      userName: req.body.username,
      date: new Date(),
      text: req.body.text,
      title: req.body.title,
    }).save(err => {
      if (err) { 
        return next(err);
      }
      res.redirect("/");
    });
  }
);

//index page
app.get("/", (req, res, next) => {
  Message.find().exec(function(err, message_list){
    if(err) {return next(err)}
    else{
      console.log(message_list)
      res.render("index", { user: req.user, messages: message_list});
    }
  })
});
//delete message
app.post('/', 
  (req,res,next) => {
    Message.findOneAndRemove({userName: req.body.messageUsername.toString(), text: req.body.messageText.toString(), 
      title: req.body.messageTitle.toString()}, 
        function(err, docs) {
          if(err) {return next(err)}
          else{
            console.log("removed message: " + docs)
          }
        }
      )
    /*Message.deleteOne({userName: req.body.messageUsername.toString(), date: req.body.messageDate.toString(), text: req.body.messageText.toString(), 
      title: req.body.messageTitle.toString()}, function(err){
      if(err) {return next(err)};
      res.redirect('/');
    }) */
  }
)
//log in
app.post(
  "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/"
    })
);
//log out page
app.get("/log-out", (req, res) => {
  req.logout();
  res.redirect("/");
});
//sign up place DONE
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.post("/sign-up",  
  body("username").trim().isLength({ min: 1 }).escape().withMessage('Username must be specified.'), 
  body("password").trim().isLength({ min: 1 }).escape().withMessage('passworde must be specified.'),

  (req, res, next) => {
  bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
    if(err) {
      return next(err)}
    else {
    const user = new User({
      username: req.body.username,
      password: hashedPassword,
      clubmember: false,
      admin: false,
    }).save(err => {
      if (err) { 
        return next(err);
      }
      res.redirect("/");
    });
    }

  });

});


//app.listen(8000, () => console.log("app listening on port 8000!"));

module.exports = app

/*

    <h2>message feed:</h2>
    <% for(let i=0; i < messages.length; i++){ %>
      <div> 
        <%= messages[i].title + messages[i].text + messages[i].userName + messages[i].date %>
      </div>
    <%} %>
*/