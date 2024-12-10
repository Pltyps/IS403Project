const express = require('express');
const knex = require('knex');
const path = require('path');
const bcrypt = require('bcrypt');

// Initialize the Express app
const app = express();

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
        host: 'localhost', // Replace with your DB host
        user: 'postgres', // Replace with your DB username
        password: 'ItisIStime2024!', // Replace with your DB password
        database: 'newnew', // Replace with your DB name
        port: 5432
    },
    useNullAsDefault: true // This resolves the default values warning
});

// Test database connection
(async () => {
    try {
        await db.raw('SELECT 1');
        console.log('Database connection successful');
    } catch (error) {
        console.error('Database connection failed:', error);
    }
})();

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
        loginUrl: '/login',
        loginAction: '/login',
        homeUrl: '/',
        recipesUrl: '/recipes',
        signUpUrl: '/signUp',
        privacyUrl: '/privacy',
    });
});

// Login route (POST)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db('users').where({ username }).first();

        if (user && await bcrypt.compare(password, user.password)) {
            res.redirect('/');
        } else {
            res.status(401).render('login', { error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).render('login', { error: 'An error occurred' });
    }
});

// Signup route (GET)
app.get('/signUp', (req, res) => {
    res.render('signUp', {
        homeUrl: '/',
        recipesUrl: '/recipes',
        loginUrl: '/login',
        privacyUrl: '/privacy',
    });
});

// Signup route (POST)
app.post('/signUp', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.render('signUp', { error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
        return res.render('signUp', { error: 'Passwords do not match.' });
    }

    try {
        const existingUser = await db('users').where({ email }).first();

        if (existingUser) {
            return res.render('signUp', { error: 'Email is already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db('users').insert({
            first_name: firstName,
            last_name: lastName,
            email,
            password: hashedPassword
        });

        res.redirect('/login');
    } catch (error) {
        console.error('Error creating user:', error);
        res.render('signUp', { error: 'An error occurred during signup.' });
    }
});

// Route to display recipes filtered by category
app.get('/recipes', async (req, res) => {
    try {
        const { category } = req.query;
        console.log('Selected category:', category);

        const categories = await db('category').select('categoryid', 'catname');
        console.log('Categories fetched:', categories);

        let query = db('recipes')
            .join('category', 'recipes.categoryid', 'category.categoryid')
            .select(
                'recipes.recipeid',
                'recipes.recipename',
                'recipes.description',
                'recipes.cooktime',
                'recipes.preptime',
                'recipes.servings',
                'category.catname as category_name'
            );

        if (category) {
            query = query.where('recipes.categoryid', category);
        }

        const recipes = await query;

        const userFavorites = await db('userfavs').where('userid', 1).select('recipeid');
        const favoriteIds = new Set(userFavorites.map(fav => fav.recipeid));

        const recipeDetails = await Promise.all(
            recipes.map(async (recipe) => {
                const ingredients = await db('recipeingredients')
                    .join('ingredients', 'recipeingredients.ingredientid', 'ingredients.ingredientid')
                    .join('units', 'recipeingredients.unit', 'units.unitid')
                    .select(
                        'ingredients.ingname as ingredient_name',
                        'recipeingredients.amount',
                        'units.unname as unit_name'
                    )
                    .where('recipeingredients.recipeid', recipe.recipeid);

                const instructions = await db('instruction')
                    .select('stepnumber', 'instdesc')
                    .where('instruction.recipeid', recipe.recipeid);

                return {
                    ...recipe,
                    ingredients,
                    instructions,
                    isFavorite: favoriteIds.has(recipe.recipeid),
                };
            })
        );

        res.render('displayRecipes', {
            recipes: recipeDetails,
            categories,
            selectedCategory: category || ''
        });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).send('Error fetching recipes');
    }
});

// Route to handle toggling favorites
app.post('/favorites/toggle', async (req, res) => {
    try {
        const { userid, recipeid, isFavorite } = req.body;

        if (isFavorite === 'true') {
            await db('userfavs').where({ userid, recipeid }).del();
        } else {
            await db('userfavs').insert({ userid, recipeid });
        }

        res.status(200).send('Favorite list updated successfully');
    } catch (error) {
        console.error('Error updating favorites:', error);
        res.status(500).send('Error updating favorites');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
