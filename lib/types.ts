import type { ingredients, inventory, mealPlans, preferences, recipeIngredients, recipeSteps, recipes, tools } from "@/db/schema";

export type MealType = "breakfast" | "lunch" | "dinner";

export type RecipeRow = typeof recipes.$inferSelect;
export type RecipeIngredientRow = typeof recipeIngredients.$inferSelect;
export type RecipeStepRow = typeof recipeSteps.$inferSelect;
export type IngredientRow = typeof ingredients.$inferSelect;
export type ToolRow = typeof tools.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type PreferenceRow = typeof preferences.$inferSelect;
export type MealPlanRow = typeof mealPlans.$inferSelect;

export type RecipeFull = RecipeRow & {
  ingredients: Array<RecipeIngredientRow & { ingredient: IngredientRow }>;
  steps: RecipeStepRow[];
};

export type PlannedMeal = {
  date: string;
  mealType: MealType;
  householdSize: number;
  stapleRecipeId: number | null;
  soupRecipeId: number | null;
  dishRecipeIds: number[];
  gantt: GanttTask[];
};

export type GanttTask = {
  taskId: string;
  label: string;
  recipeId: number;
  recipeName: string;
  toolType: string | null;
  lane: number;
  startMin: number;
  endMin: number;
};

export type ShoppingGap = {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  required: number;
  inStock: number;
  shortage: number;
  neededBy: string;
  suggestedPurchaseDate: string;
};
