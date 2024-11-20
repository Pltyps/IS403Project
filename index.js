// Route for displaying recipes
app.get('/recipes', async (req, res) => {
    try {
      // Fetch recipes from the database (replace with your actual database query)
      const recipes = await knex('recipes_table').select('*');
  
      // Render the recipes page and pass the data
      res.render('displayRecipes', { recipes });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching recipes');
    }
  });
  
  // Route for filtering recipes
  app.post('/recipes/filter', async (req, res) => {
    const { filters } = req.body; // Get selected filters from the checkboxes
    try {
      // Query recipes based on selected filters
      const filteredRecipes = await knex('recipes_table')
        .select('*')
        .whereIn('category', filters); // Adjust the column name 'category' as per your database
  
      res.render('displayRecipes', { recipes: filteredRecipes });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error filtering recipes');
    }
  });