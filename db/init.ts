import Database from "better-sqlite3";

export function ensureSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL,
      category TEXT NOT NULL,
      kcal_per_unit REAL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('staple', 'dish', 'soup')),
      servings INTEGER NOT NULL DEFAULT 2,
      cooking_methods TEXT NOT NULL DEFAULT '[]',
      flavor_tags TEXT NOT NULL DEFAULT '[]',
      is_low_cal INTEGER NOT NULL DEFAULT 0,
      allergens TEXT NOT NULL DEFAULT '[]',
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      unit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipe_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      tool_type TEXT
    );

    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      location TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY,
      household_size INTEGER NOT NULL DEFAULT 2,
      preferred_cooking_methods TEXT NOT NULL DEFAULT '[]',
      low_cal_only INTEGER NOT NULL DEFAULT 0,
      flavor_preferences TEXT NOT NULL DEFAULT '[]',
      avoid_ingredients TEXT NOT NULL DEFAULT '[]',
      allergens TEXT NOT NULL DEFAULT '[]',
      need_soup INTEGER NOT NULL DEFAULT 1,
      staple_required INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
      household_size INTEGER NOT NULL,
      staple_recipe_id INTEGER REFERENCES recipes(id),
      soup_recipe_id INTEGER REFERENCES recipes(id),
      dish_recipe_ids TEXT NOT NULL DEFAULT '[]',
      gantt TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON recipe_steps(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_ingredient ON inventory(ingredient_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
  `);
}
