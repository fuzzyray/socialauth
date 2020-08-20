'use strict';

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const mongo = require('mongodb').MongoClient;
const passport = require('passport');
const GitHubStrategy = require('passport-github');

const app = express();

fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'pug');

const connectOptions = {
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
};
const mongoClient = new mongo(process.env.DATABASE, connectOptions);
mongoClient.connect((err) => {
  if (err) {
    console.log('Database error: ' + err);
  } else {
    const db = mongoClient.db(process.env.DBNAME);
    console.log('Successful database connection');

    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: true,
      saveUninitialized: true,
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect('/');
    }

    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
      db.collection('socialusers').findOne(
          {id: id},
          (err, doc) => {
            done(null, doc);
          },
      );
    });

    /*
    *  ADD YOUR CODE BELOW
    */
    /*
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
    }));
    */
    app.route('/auth/github')
        .get(passport.authenticate('github'));

    const authOptions = {failureRedirect: '/'};
    app.route('/auth/github/callback')
        .get(passport.authenticate('github', authOptions), (req, res) => {
          res.redirect('/profile');
        });

    /*
    *  ADD YOUR CODE ABOVE
    */

    app.route('/')
        .get((req, res) => {
          res.render(process.cwd() + '/views/pug/index');
        });

    app.route('/profile')
        .get(ensureAuthenticated, (req, res) => {
          res.render(process.cwd() + '/views/pug/profile', {user: req.user});
        });

    app.route('/logout')
        .get((req, res) => {
          req.logout();
          res.redirect('/');
        });

    app.use((req, res, next) => {
      res.status(404)
          .type('text')
          .send('Not Found');
    });

    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Listening on port ' + listener.address().port);
    });
  }
});
