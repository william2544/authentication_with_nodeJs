import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT =  2000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'userdetail',
  password: 'william',
  port: 9000,
});
db.connect()
    .then(()=>console.log('connected to pg'))
// Set view engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));
app.get('/',(req,res)=>{
    res.render('home.ejs');
})

// register route
app.get('/register', (req, res) => {
  res.render('register.ejs');
});
app.post('/register',async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  bcrypt.hash(password, 10, async (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Internal server error');
    }
    try {
      const query = 'INSERT INTO users (email, password) VALUES ($1, $2)';
      const values = [email, hash];
      await db.query(query, values);
      console.log('user registerd successfully');
      res.render('secrets.ejs')
    } catch (error) {
      console.error('Error inserting user:', error);
      res.status(500).send('Internal server error');
    }
  });
})
// login route

app.get('/login', (req, res) => {
  res.render('login.ejs');
});
app.post('/login', async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    // Find user by email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).send('Invalid email or password');
    }

    const user = result.rows[0];

    // Compare passwords
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      console.log('User logged in successfully');
      res.render('secrets.ejs');
    } else {
      res.status(401).send('Invalid email or password');
    }

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal server error');
  }
});
// logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/'); // Redirect to homepage after logout
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});