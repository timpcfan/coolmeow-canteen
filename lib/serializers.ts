import type { MealPlanRow, RecipeFull } from "@/lib/types";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export function enrichMealPlans(plans: MealPlanRow[], recipes: RecipeFull[]) {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  return plans.map((plan) => ({
    id: plan.id,
    date: plan.date,
    mealType: plan.mealType,
    mealLabel: MEAL_LABEL[plan.mealType],
    householdSize: plan.householdSize,
    staple: plan.stapleRecipeId
      ? { id: plan.stapleRecipeId, name: recipeMap.get(plan.stapleRecipeId)?.name ?? "未知主食" }
      : null,
    dishes: plan.dishRecipeIds.map((id) => ({
      id,
      name: recipeMap.get(id)?.name ?? "未知菜品",
    })),
    soup: plan.soupRecipeId
      ? { id: plan.soupRecipeId, name: recipeMap.get(plan.soupRecipeId)?.name ?? "未知汤品" }
      : null,
    gantt: plan.gantt,
  }));
}
