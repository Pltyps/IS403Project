const express = require('express');
const knex = require('knex');
const path = require('path');

// Initialize the Express app
const app = express();
const bcrypt = require('bcrypt');

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files middleware (for styles and scripts, if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Knex with PostgreSQL configuration
const db = knex({
    client: 'pg',
    connection: {
        host: 'localhost',
        user: 'pg',
        password: process.env.DB_PASSWORD || 'your_secure_password', // Use environment variable
        database: 'your_pg_database',
    },
});

// Home route
app.get('/', (req, res) => {
    res.render('index', {
        homeUrl: '/',
        recipesUrl: '/recipes',
        loginUrl: '/login',
        privacyUrl: '/privacy',
    });
});

// Login route (GET)
app.get('/login', (req, res) => {
    res.render('login', {
        loginAction: '/login',
        homeUrl: '/',
        recipesUrl: '/recipes',
        signupUrl: '/signup',
        privacyUrl: '/privacy',
        loginUrl: '/login'  // Pass the login URL correctly
    });
});

// Login route (POST)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Replace the query below with your actual user authentication logic
        const user = await db('users')
            .where({ username }) // Check username
            .first();

        if (user && await bcrypt.compare(password, user.password)) {
            res.redirect('/');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).send('An error occurred');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
