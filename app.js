import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pg from 'pg';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import passportlocalmongoose from 'passport-local-mongoose';
import pkg from 'passport-google-oauth20';
const { Strategy: GoogleStrategy } = pkg;
import findOrCreate from 'mongoose-findorcreate';
// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT =  4000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// const db = new pg.Client({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'userdetail',
//   password: 'william',
//   port: 9000,
// });
// db.connect()
//     .then(()=>console.log('connected to pg'))

mongoose.connect("mongodb://localhost:27017/userdetail",{ useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportlocalmongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err));
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
    // remeber to install mongoose-findorcreate for the findOrCreate method to work
  }
));

// Set view engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));
app.get('/',(req,res)=>{
    res.render('home.ejs');
})
// Google authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });
// register route
app.get('/register', (req, res) => {
  res.render('register.ejs');
});
app.post('/register',async (req, res) => {
  User.register(new User({ username: req.body.username }), req.body.password, (err, user) => {
    if (err) {
      console.error('Registration error:', err);
      return res.status(500).send('Registration error');
    }
    passport.authenticate('local')(req, res, () => {
      res.redirect('/');
    });
  })
})
// login route

app.get('/login', (req, res) => {
  res.render('login.ejs');
});
app.post('/login', async (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, (err) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).send('Login error');
    }
    passport.authenticate('local')(req, res, () => {
      res.redirect('secrets');
    });
  });
});
// logout route
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout error');
    }
    res.redirect('/');
  });
});

// secrets route
app.get('/secrets', (req, res) => {
  if (req.isAuthenticated()) {
    console.log('user is authenticated:', req.user);
    res.render('secrets.ejs');
  } else {
    res.redirect('/login');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});