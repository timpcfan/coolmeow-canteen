import type { GanttTask, MealType, PlannedMeal, PreferenceRow, RecipeFull, ShoppingGap, ToolRow } from "./types";
import { DEFAULT_MAX_MEAL_DURATION_MIN, validateGanttExecutability } from "./gantt-feasibility.ts";

export type MealTuneObjective = "balanced" | "faster" | "budget" | "low_cal";

const INGREDIENT_COST_FACTOR: Record<string, number> = {
  staple: 0.6,
  vegetable: 0.8,
  seasoning: 0.5,
  protein: 1.8,
  dairy: 1.2,
  fruit: 1.1,
};

function normalize(items: string[]): string[] {
  return items.map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function matchesAny(source: string[], target: string[]): boolean {
  const normalizedSource = new Set(normalize(source));
  return target.some((item) => normalizedSource.has(item.toLowerCase()));
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function todayDateInternal(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateMinusInternal(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function toToolCapacityMap(toolRows: ToolRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const tool of toolRows) {
    map.set(tool.type, (map.get(tool.type) ?? 0) + Math.max(1, tool.capacity));
  }
  return map;
}

export function cloneInventoryMap(source: Map<number, { quantity: number; unit: string }>) {
  const clone = new Map<number, { quantity: number; unit: string }>();
  for (const [ingredientId, value] of source.entries()) {
    clone.set(ingredientId, { ...value });
  }
  return clone;
}

export function scaledAmount(baseAmount: number, baseServings: number, householdSize: number): number {
  const raw = (baseAmount * householdSize) / Math.max(baseServings, 1);
  return Number(raw.toFixed(2));
}

export function filterCandidates(
  recipes: RecipeFull[],
  type: "staple" | "dish" | "soup",
  preferences: PreferenceRow,
): RecipeFull[] {
  const avoidSet = new Set(normalize(preferences.avoidIngredients));
  const allergenSet = new Set(normalize(preferences.allergens));
  const methodSet = new Set(normalize(preferences.preferredCookingMethods));

  const base = recipes.filter((recipe) => {
    if (recipe.type !== type) {
      return false;
    }

    if (preferences.lowCalOnly && !recipe.isLowCal) {
      return false;
    }

    const ingredientNames = recipe.ingredients.map((item) => item.ingredient.name.toLowerCase());
    if (ingredientNames.some((name) => avoidSet.has(name))) {
      return false;
    }

    const recipeAllergens = normalize(recipe.allergens);
    if (recipeAllergens.some((item) => allergenSet.has(item))) {
      return false;
    }

    return true;
  });

  if (methodSet.size === 0) {
    return base;
  }

  const methodFiltered = base.filter((recipe) => recipe.cookingMethods.some((method) => methodSet.has(method.toLowerCase())));
  return methodFiltered.length > 0 ? methodFiltered : base;
}

function inventoryCoverageScore(
  recipe: RecipeFull,
  householdSize: number,
  inventoryMap: Map<number, { quantity: number; unit: string }>,
): number {
  if (recipe.ingredients.length === 0) {
    return 0;
  }

  let totalCoverage = 0;
  for (const ingredient of recipe.ingredients) {
    const need = scaledAmount(ingredient.amount, recipe.servings, householdSize);
    const stock = inventoryMap.get(ingredient.ingredientId);
    if (!stock || stock.unit !== ingredient.unit) {
      continue;
    }
    totalCoverage += Math.min(stock.quantity / Math.max(need, 1), 1);
  }

  return (totalCoverage / recipe.ingredients.length) * 40;
}

function recipeDurationMin(recipe: RecipeFull): number {
  return recipe.steps.reduce((sum, step) => sum + step.durationMin, 0);
}

function durationScore(recipe: RecipeFull): number {
  const totalMin = recipeDurationMin(recipe);
  return Math.max(0, 75 - totalMin) * 1.1;
}

function recipeEstimatedCalories(recipe: RecipeFull, householdSize: number): number {
  let totalCalories = 0;
  for (const ingredient of recipe.ingredients) {
    const kcalPerUnit = ingredient.ingredient.kcalPerUnit ?? 0;
    const amount = scaledAmount(ingredient.amount, recipe.servings, householdSize);
    totalCalories += amount * kcalPerUnit;
  }
  return totalCalories;
}

function lowCalScore(recipe: RecipeFull, householdSize: number): number {
  const estimatedCalories = recipeEstimatedCalories(recipe, householdSize);
  return Math.max(0, 950 - estimatedCalories) / 12;
}

function recipeEstimatedCost(recipe: RecipeFull, householdSize: number): number {
  let totalCost = 0;
  for (const ingredient of recipe.ingredients) {
    const factor = INGREDIENT_COST_FACTOR[ingredient.ingredient.category] ?? 1;
    const amount = scaledAmount(ingredient.amount, recipe.servings, householdSize);
    totalCost += amount * factor;
  }
  return totalCost;
}

function budgetScore(recipe: RecipeFull, householdSize: number): number {
  const estimatedCost = recipeEstimatedCost(recipe, householdSize);
  return Math.max(0, 900 - estimatedCost) / 10;
}

export function scoreRecipe(params: {
  recipe: RecipeFull;
  date: string;
  mealType: MealType;
  householdSize: number;
  preferences: PreferenceRow;
  inventoryMap: Map<number, { quantity: number; unit: string }>;
  usageCount: Map<number, number>;
  objective?: MealTuneObjective;
}): number {
  const { recipe, date, mealType, householdSize, preferences, inventoryMap, usageCount, objective = "balanced" } = params;

  const inventoryScore = inventoryCoverageScore(recipe, householdSize, inventoryMap);
  let score = 0;

  if (objective === "faster") {
    score += 30;
    score += durationScore(recipe) * 1.6;
    score += inventoryScore * 0.7;
    if (recipe.cookingMethods.includes("boil") || recipe.cookingMethods.includes("steam")) {
      score += 6;
    }
  } else if (objective === "budget") {
    score += 26;
    score += inventoryScore * 1.7;
    score += budgetScore(recipe, householdSize) * 1.1;
    if (recipe.type === "dish" && recipe.ingredients.length <= 3) {
      score += 4;
    }
  } else if (objective === "low_cal") {
    score += 26;
    score += lowCalScore(recipe, householdSize) * 1.7;
    score += inventoryScore * 0.5;
    if (recipe.isLowCal) {
      score += 26;
    }
  } else {
    score += 30;
    score += inventoryScore;
    if (matchesAny(recipe.flavorTags, preferences.flavorPreferences)) {
      score += 12;
    }
    if (matchesAny(recipe.cookingMethods, preferences.preferredCookingMethods)) {
      score += 14;
    }
    if (preferences.lowCalOnly && recipe.isLowCal) {
      score += 10;
    }
    if (mealType === "breakfast" && recipe.cookingMethods.includes("steam")) {
      score += 4;
    }
    if (mealType === "dinner" && recipe.cookingMethods.includes("stew")) {
      score += 3;
    }
  }

  if (objective !== "balanced") {
    if (matchesAny(recipe.flavorTags, preferences.flavorPreferences)) {
      score += 4;
    }
    if (matchesAny(recipe.cookingMethods, preferences.preferredCookingMethods)) {
      score += 5;
    }
  }

  const used = usageCount.get(recipe.id) ?? 0;
  score -= objective === "balanced" ? used * 18 : used * 10;

  const noiseScale = objective === "balanced" ? 100 : 40;
  const noise = (hashString(`${date}-${mealType}-${recipe.id}`) % noiseScale) / noiseScale;
  score += noise;

  return score;
}

function pickRecipe(params: {
  candidates: RecipeFull[];
  date: string;
  mealType: MealType;
  householdSize: number;
  preferences: PreferenceRow;
  inventoryMap: Map<number, { quantity: number; unit: string }>;
  usageCount: Map<number, number>;
  selectedIds: Set<number>;
  excludedIds?: Set<number>;
  objective?: MealTuneObjective;
}): RecipeFull | null {
  const {
    candidates,
    date,
    mealType,
    householdSize,
    preferences,
    inventoryMap,
    usageCount,
    selectedIds,
    excludedIds,
    objective,
  } = params;

  const scored = candidates
    .filter((recipe) => !selectedIds.has(recipe.id) && !(excludedIds?.has(recipe.id) ?? false))
    .map((recipe) => ({
      recipe,
      score: scoreRecipe({
        recipe,
        date,
        mealType,
        householdSize,
        preferences,
        inventoryMap,
        usageCount,
        objective,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.recipe ?? null;
}

export function consumeInventory(
  inventoryMap: Map<number, { quantity: number; unit: string }>,
  recipes: RecipeFull[],
  householdSize: number,
): void {
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const need = scaledAmount(ingredient.amount, recipe.servings, householdSize);
      const stock = inventoryMap.get(ingredient.ingredientId);
      if (!stock || stock.unit !== ingredient.unit) {
        continue;
      }
      stock.quantity = Math.max(0, stock.quantity - need);
      inventoryMap.set(ingredient.ingredientId, stock);
    }
  }
}

export function scheduleMeal(selected: RecipeFull[], toolCapacityMap: Map<string, number>): GanttTask[] {
  const laneMap = new Map<string, { endTimes: number[]; laneIds: number[] }>();
  const fallbackTool = "generic_tool";
  let laneSeed = 1;

  const ensureToolLanes = (toolType: string) => {
    if (laneMap.has(toolType)) {
      return laneMap.get(toolType) as { endTimes: number[]; laneIds: number[] };
    }

    const capacity = Math.max(1, toolCapacityMap.get(toolType) ?? (toolType ? 1 : 0));
    const laneIds = Array.from({ length: capacity }, () => laneSeed++);
    const lanes = {
      endTimes: Array.from({ length: capacity }, () => 0),
      laneIds,
    };
    laneMap.set(toolType, lanes);
    return lanes;
  };

  const tasks: GanttTask[] = [];

  for (const recipe of selected) {
    let recipeCursor = 0;
    const steps = [...recipe.steps].sort((a, b) => a.stepOrder - b.stepOrder);

    for (const step of steps) {
      if (!step.toolType) {
        const startMin = recipeCursor;
        const endMin = startMin + step.durationMin;
        recipeCursor = endMin;
        tasks.push({
          taskId: `${recipe.id}-${step.id}`,
          label: step.title,
          recipeId: recipe.id,
          recipeName: recipe.name,
          toolType: null,
          lane: 0,
          startMin,
          endMin,
        });
        continue;
      }

      const toolType = step.toolType || fallbackTool;
      const lanes = ensureToolLanes(toolType);

      let selectedLaneIdx = 0;
      for (let i = 1; i < lanes.endTimes.length; i += 1) {
        if (lanes.endTimes[i] < lanes.endTimes[selectedLaneIdx]) {
          selectedLaneIdx = i;
        }
      }

      const startMin = Math.max(recipeCursor, lanes.endTimes[selectedLaneIdx]);
      const endMin = startMin + step.durationMin;
      lanes.endTimes[selectedLaneIdx] = endMin;
      recipeCursor = endMin;

      tasks.push({
        taskId: `${recipe.id}-${step.id}`,
        label: step.title,
        recipeId: recipe.id,
        recipeName: recipe.name,
        toolType: step.toolType,
        lane: lanes.laneIds[selectedLaneIdx],
        startMin,
        endMin,
      });
    }
  }

  return tasks.sort((a, b) => a.startMin - b.startMin);
}

function scheduleMealSequentialFallback(selected: RecipeFull[]): GanttTask[] {
  const toolLaneMap = new Map<string, number>();
  let laneSeed = 1;
  let cursor = 0;
  const tasks: GanttTask[] = [];

  for (const recipe of selected) {
    const steps = [...recipe.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    for (const step of steps) {
      const startMin = cursor;
      const endMin = startMin + step.durationMin;
      cursor = endMin;

      let lane = 0;
      if (step.toolType) {
        if (!toolLaneMap.has(step.toolType)) {
          toolLaneMap.set(step.toolType, laneSeed++);
        }
        lane = toolLaneMap.get(step.toolType) as number;
      }

      tasks.push({
        taskId: `${recipe.id}-${step.id}`,
        label: step.title,
        recipeId: recipe.id,
        recipeName: recipe.name,
        toolType: step.toolType,
        lane,
        startMin,
        endMin,
      });
    }
  }

  return tasks;
}

export type SingleMealInput = {
  date: string;
  mealType: MealType;
  recipes: RecipeFull[];
  preferences: PreferenceRow;
  inventoryMap: Map<number, { quantity: number; unit: string }>;
  usageCount: Map<number, number>;
  toolCapacityMap: Map<string, number>;
  excludedIds?: Set<number>;
  objective?: MealTuneObjective;
};

export function generateSingleMeal(input: SingleMealInput): {
  plannedMeal: PlannedMeal;
  selectedRecipes: RecipeFull[];
} {
  const { date, mealType, recipes, preferences, inventoryMap, usageCount, toolCapacityMap, excludedIds, objective } = input;

  const selected = new Set<number>();
  const selectedRecipes: RecipeFull[] = [];

  const stapleCandidates = filterCandidates(recipes, "staple", preferences);
  const dishCandidates = filterCandidates(recipes, "dish", preferences);
  const soupCandidates = filterCandidates(recipes, "soup", preferences);

  const includeStaple = preferences.stapleRequired || mealType !== "dinner";
  const includeSoup = preferences.needSoup && mealType !== "breakfast";

  let stapleRecipeId: number | null = null;
  if (includeStaple) {
    const staple = pickRecipe({
      candidates: stapleCandidates,
      date,
      mealType,
      householdSize: preferences.householdSize,
      preferences,
      inventoryMap,
      usageCount,
      selectedIds: selected,
      excludedIds,
      objective,
    });
    if (staple) {
      selected.add(staple.id);
      selectedRecipes.push(staple);
      stapleRecipeId = staple.id;
    }
  }

  const dishTarget = mealType === "breakfast" ? 1 : preferences.householdSize >= 4 ? 3 : 2;
  const dishRecipeIds: number[] = [];

  for (let i = 0; i < dishTarget; i += 1) {
    const dish = pickRecipe({
      candidates: dishCandidates,
      date,
      mealType,
      householdSize: preferences.householdSize,
      preferences,
      inventoryMap,
      usageCount,
      selectedIds: selected,
      excludedIds,
      objective,
    });

    if (!dish) {
      break;
    }

    selected.add(dish.id);
    selectedRecipes.push(dish);
    dishRecipeIds.push(dish.id);
  }

  let soupRecipeId: number | null = null;
  if (includeSoup) {
    const soup = pickRecipe({
      candidates: soupCandidates,
      date,
      mealType,
      householdSize: preferences.householdSize,
      preferences,
      inventoryMap,
      usageCount,
      selectedIds: selected,
      excludedIds,
      objective,
    });
    if (soup) {
      selected.add(soup.id);
      selectedRecipes.push(soup);
      soupRecipeId = soup.id;
    }
  }

  if (dishRecipeIds.length === 0) {
    const fallbackDish = dishCandidates[0];
    if (fallbackDish) {
      selectedRecipes.push(fallbackDish);
      dishRecipeIds.push(fallbackDish.id);
      selected.add(fallbackDish.id);
    }
  }

  let gantt = scheduleMeal(selectedRecipes, toolCapacityMap);
  const feasibility = validateGanttExecutability(gantt, {
    maxDurationMin: DEFAULT_MAX_MEAL_DURATION_MIN,
  });
  if (!feasibility.isExecutable) {
    gantt = scheduleMealSequentialFallback(selectedRecipes);
    const fallbackFeasibility = validateGanttExecutability(gantt, {
      maxDurationMin: DEFAULT_MAX_MEAL_DURATION_MIN,
    });
    if (!fallbackFeasibility.isExecutable) {
      throw new Error(`餐次步骤排程不可执行: ${fallbackFeasibility.issues.map((item) => item.code).join(",")}`);
    }
  }

  for (const recipe of selectedRecipes) {
    usageCount.set(recipe.id, (usageCount.get(recipe.id) ?? 0) + 1);
  }

  return {
    plannedMeal: {
      date,
      mealType,
      householdSize: preferences.householdSize,
      stapleRecipeId,
      soupRecipeId,
      dishRecipeIds,
      gantt,
    },
    selectedRecipes,
  };
}

function pickNeededByDate(
  demands: Array<{ date: string; amount: number }>,
  inStock: number,
): string {
  let consumed = 0;
  for (const demand of demands.sort((a, b) => a.date.localeCompare(b.date))) {
    consumed += demand.amount;
    if (consumed > inStock) {
      return demand.date;
    }
  }

  return demands.sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? todayDateInternal();
}

export function computeShoppingGaps(params: {
  plans: PlannedMeal[];
  recipes: RecipeFull[];
  inventory: Map<number, { quantity: number; unit: string }>;
}): ShoppingGap[] {
  const { plans, recipes, inventory } = params;
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const stats = new Map<
    number,
    {
      ingredientName: string;
      unit: string;
      required: number;
      demands: Array<{ date: string; amount: number }>;
    }
  >();

  for (const plan of plans) {
    const recipeIds = [
      ...(plan.stapleRecipeId ? [plan.stapleRecipeId] : []),
      ...plan.dishRecipeIds,
      ...(plan.soupRecipeId ? [plan.soupRecipeId] : []),
    ];

    for (const recipeId of recipeIds) {
      const recipe = recipeMap.get(recipeId);
      if (!recipe) {
        continue;
      }

      for (const ingredient of recipe.ingredients) {
        const amount = scaledAmount(ingredient.amount, recipe.servings, plan.householdSize);
        const existing = stats.get(ingredient.ingredientId);
        if (!existing) {
          stats.set(ingredient.ingredientId, {
            ingredientName: ingredient.ingredient.name,
            unit: ingredient.unit,
            required: amount,
            demands: [{ date: plan.date, amount }],
          });
          continue;
        }

        if (existing.unit !== ingredient.unit) {
          continue;
        }

        existing.required += amount;
        existing.demands.push({ date: plan.date, amount });
        stats.set(ingredient.ingredientId, existing);
      }
    }
  }

  const output: ShoppingGap[] = [];

  for (const [ingredientId, item] of stats.entries()) {
    const stock = inventory.get(ingredientId);
    const inStock = stock && stock.unit === item.unit ? stock.quantity : 0;
    const shortage = Math.max(0, Number((item.required - inStock).toFixed(2)));
    if (shortage <= 0) {
      continue;
    }

    const neededBy = pickNeededByDate(item.demands, inStock);
    const suggestion = dateMinusInternal(neededBy, 1);
    output.push({
      ingredientId,
      ingredientName: item.ingredientName,
      unit: item.unit,
      required: Number(item.required.toFixed(2)),
      inStock: Number(inStock.toFixed(2)),
      shortage,
      neededBy,
      suggestedPurchaseDate: suggestion < todayDateInternal() ? todayDateInternal() : suggestion,
    });
  }

  return output.sort((a, b) => a.neededBy.localeCompare(b.neededBy));
}

export const plannerInternals = {
  filterCandidates,
  scoreRecipe,
  scheduleMeal,
  validateGanttExecutability,
  computeShoppingGaps,
  generateSingleMeal,
  toToolCapacityMap,
  cloneInventoryMap,
  consumeInventory,
};
