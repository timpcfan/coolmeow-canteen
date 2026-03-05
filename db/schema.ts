import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  kcalPerUnit: real("kcal_per_unit"),
});

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type", { enum: ["staple", "dish", "soup"] })
    .$type<"staple" | "dish" | "soup">()
    .notNull(),
  servings: integer("servings").notNull().default(2),
  cookingMethods: text("cooking_methods", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  flavorTags: text("flavor_tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  isLowCal: integer("is_low_cal", { mode: "boolean" }).notNull().default(false),
  allergens: text("allergens", { mode: "json" }).$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  unit: text("unit").notNull(),
});

export const recipeSteps = sqliteTable("recipe_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  title: text("title").notNull(),
  durationMin: integer("duration_min").notNull(),
  toolType: text("tool_type"),
});

export const tools = sqliteTable("tools", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull().default(1),
  notes: text("notes").notNull().default(""),
});

export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  location: text("location").notNull(),
  expiresAt: text("expires_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const preferences = sqliteTable("preferences", {
  id: integer("id").primaryKey(),
  householdSize: integer("household_size").notNull().default(2),
  preferredCookingMethods: text("preferred_cooking_methods", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  lowCalOnly: integer("low_cal_only", { mode: "boolean" }).notNull().default(false),
  flavorPreferences: text("flavor_preferences", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  avoidIngredients: text("avoid_ingredients", { mode: "json" }).$type<string[]>().notNull().default([]),
  allergens: text("allergens", { mode: "json" }).$type<string[]>().notNull().default([]),
  needSoup: integer("need_soup", { mode: "boolean" }).notNull().default(true),
  stapleRequired: integer("staple_required", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});

export const mealPlans = sqliteTable("meal_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner"] })
    .$type<"breakfast" | "lunch" | "dinner">()
    .notNull(),
  householdSize: integer("household_size").notNull(),
  stapleRecipeId: integer("staple_recipe_id").references(() => recipes.id),
  soupRecipeId: integer("soup_recipe_id").references(() => recipes.id),
  dishRecipeIds: text("dish_recipe_ids", { mode: "json" }).$type<number[]>().notNull().default([]),
  gantt: text("gantt", { mode: "json" })
    .$type<{
      taskId: string;
      label: string;
      recipeId: number;
      recipeName: string;
      toolType: string | null;
      lane: number;
      startMin: number;
      endMin: number;
    }[]>()
    .notNull()
    .default([]),
  createdAt: text("created_at").notNull(),
});

export const recipeRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
}));

export const ingredientRelations = relations(ingredients, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
  inventoryItems: many(inventory),
}));

export const recipeIngredientRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));

export const recipeStepRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeSteps.recipeId],
    references: [recipes.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  ingredient: one(ingredients, {
    fields: [inventory.ingredientId],
    references: [ingredients.id],
  }),
}));
