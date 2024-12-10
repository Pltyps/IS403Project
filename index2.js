const express = require("express");

const app = express();

const path = require("path");

const port = 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Middleware for JSON requests

const knex = require("knex")({
    client: "pg",
    connection: {
        host: "localhost",
        user: "postgres",
        password: "0000",
        database: "newnew",
    },
});

// Route to display recipes filtered by category
app.get("/recipes", async (req, res) => {
    try {
        const { category } = req.query;

        // Log the received category query parameter
        console.log("Selected category:", category);

        // Fetch all categories
        const categories = await knex("category").select("categoryid", "catname");
        console.log("Categories fetched:", categories);

        // Build the query for recipes
        let query = knex("recipes")
            .join("category", "recipes.categoryid", "category.categoryid")
            .select(
                "recipes.recipeid",
                "recipes.recipename",
                "recipes.description",
                "recipes.cooktime",
                "recipes.preptime",
                "recipes.servings",
                "category.catname as category_name"
            );

        if (category) {
            query = query.where("recipes.categoryid", category);
        }

        const recipes = await query;
        console.log("Recipes fetched:", recipes);

        // Fetch the user's favorite recipes
        const userFavorites = await knex("userfavs").where("userid", 1).select("recipeid");
        console.log("User favorites fetched:", userFavorites);

        // Create a Set of favorite recipe IDs for easy lookup
        const favoriteIds = new Set(userFavorites.map((fav) => fav.recipeid));

        // Fetch ingredients and instructions for all recipes
        const recipeDetails = await Promise.all(
            recipes.map(async (recipe) => {
                // Updated query to fetch ingredients
                const ingredients = await knex("recipeingredients")
                    .join("ingredients", "recipeingredients.ingredientid", "ingredients.ingredientid")
                    .join("units", "recipeingredients.unit", "units.unitid") // Updated column name
                    .select(
                        "ingredients.ingname as ingredient_name", // Updated column name
                        "recipeingredients.amount",
                        "units.unname as unit_name" // Updated column name
                    )
                    .where("recipeingredients.recipeid", recipe.recipeid);
                console.log(`Ingredients for recipe ${recipe.recipeid}:`, ingredients);

                const instructions = await knex("instruction")
                    .select("stepnumber", "instdesc")
                    .where("instruction.recipeid", recipe.recipeid);
                console.log(`Instructions for recipe ${recipe.recipeid}:`, instructions);

                return {
                    ...recipe,
                    ingredients,
                    instructions,
                    isFavorite: favoriteIds.has(recipe.recipeid), // Check if the recipe is a favorite
                };
            })
        );

        console.log("Final recipe details:", recipeDetails);
        res.render("displayRecipes", { recipes: recipeDetails, categories, selectedCategory: category || "" });
    } catch (error) {
        console.error("Error fetching recipes:", error.stack);
        res.status(500).send("Error fetching recipes");
    }
});

// Route to handle toggling favorites (add/remove)
app.post("/favorites/toggle", async (req, res) => {
    try {
        const { userid, recipeid, isFavorite } = req.body;
        console.log("Toggling favorite:", { userid, recipeid, isFavorite });

        if (isFavorite === "true") {
            // Remove from favorites
            await knex("userfavs").where({ userid, recipeid }).del();
            console.log(`Recipe ID ${recipeid} removed from favorites`);
        } else {
            // Add to favorites
            await knex("userfavs").insert({ userid, recipeid });
            console.log(`Recipe ID ${recipeid} added to favorites`);
        }

        res.status(200).send("Favorite list updated successfully");
    } catch (error) {
        console.error("Error updating favorites:", error.stack);
        res.status(500).send("Error updating favorites");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
