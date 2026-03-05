import {
  getPreferences,
  getPlanConfigSource,
  getMealPlanById,
  listMealPlans,
  listRecipesFull,
  listTools,
  loadInventoryMapByIngredient,
  replaceTools,
  replaceMealPlans,
  setPlanConfigSource,
  updatePreferences,
  updateMealPlan,
} from "@/lib/repository";
import {
  type MealTuneObjective,
  cloneInventoryMap,
  computeShoppingGaps,
  consumeInventory,
  generateSingleMeal,
  plannerInternals,
  toToolCapacityMap,
} from "@/lib/planner-core";
import { addDays, daysInRange, todayDate } from "@/lib/time";
import type { MealPlanRow, PlanConfigSource, PlanConfigSourceState, PlannedMeal } from "@/lib/types";

const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
const DEFAULT_ONBOARDING_TOOL_TYPES = ["rice_cooker", "gas_stove"] as const;

type WeekPlanSnapshot = {
  startDate: string;
  endDate: string;
  plans: MealPlanRow[];
  shoppingGaps: ReturnType<typeof computeShoppingGaps>;
  configSource: PlanConfigSourceState;
};

const TOOL_PRESETS: Record<
  string,
  {
    name: string;
    type: string;
    capacity: number;
    notes: string;
  }
> = {
  steamer: {
    name: "家庭蒸锅",
    type: "steamer",
    capacity: 2,
    notes: "引导默认配置",
  },
  rice_cooker: {
    name: "电饭煲",
    type: "rice_cooker",
    capacity: 1,
    notes: "引导默认配置",
  },
  gas_stove: {
    name: "燃气灶",
    type: "gas_stove",
    capacity: 2,
    notes: "引导默认配置",
  },
  induction: {
    name: "电磁炉",
    type: "induction",
    capacity: 1,
    notes: "引导默认配置",
  },
};

export { plannerInternals };

export type OnboardingInput = {
  householdSize: number;
  needSoup: boolean;
  toolTypes: string[];
  startDate?: string;
  days?: number;
};

function normalizeOnboardingTools(toolTypes: string[]): string[] {
  const normalized = Array.from(new Set(toolTypes.filter((item) => TOOL_PRESETS[item])));
  if (normalized.length > 0) {
    return normalized;
  }
  return [...DEFAULT_ONBOARDING_TOOL_TYPES];
}

export async function completeOnboardingSetup(params: OnboardingInput): Promise<WeekPlanSnapshot> {
  const toolTypes = normalizeOnboardingTools(params.toolTypes);

  await updatePreferences({
    householdSize: params.householdSize,
    needSoup: params.needSoup,
    stapleRequired: true,
    lowCalOnly: false,
    preferredCookingMethods: ["steam", "boil", "stir_fry"],
    flavorPreferences: ["清淡", "鲜香"],
    avoidIngredients: [],
    allergens: [],
  });

  await replaceTools(toolTypes.map((toolType) => TOOL_PRESETS[toolType]));

  return generateWeeklyPlan({
    startDate: params.startDate ?? todayDate(),
    days: params.days ?? 7,
    source: "onboarding",
    sourceNote: "新手引导完成后生效",
  });
}

export async function generateWeeklyPlan(params?: {
  startDate?: string;
  days?: number;
  source?: PlanConfigSource;
  sourceNote?: string;
}): Promise<WeekPlanSnapshot> {
  const startDate = params?.startDate ?? todayDate();
  const days = params?.days ?? 7;
  const source = params?.source ?? "manual";

  const [preferences, tools, recipes, originalInventory] = await Promise.all([
    getPreferences(),
    listTools(),
    listRecipesFull(),
    loadInventoryMapByIngredient(),
  ]);

  const toolCapacityMap = toToolCapacityMap(tools);
  const inventoryWorking = cloneInventoryMap(originalInventory);
  const usageCount = new Map<number, number>();

  const plans: PlannedMeal[] = [];

  for (const date of daysInRange(startDate, days)) {
    for (const mealType of MEAL_TYPES) {
      const { plannedMeal, selectedRecipes } = generateSingleMeal({
        date,
        mealType,
        recipes,
        preferences,
        inventoryMap: inventoryWorking,
        usageCount,
        toolCapacityMap,
      });
      plans.push(plannedMeal);
      consumeInventory(inventoryWorking, selectedRecipes, preferences.householdSize);
    }
  }

  const endDate = addDays(startDate, days - 1);
  await replaceMealPlans(
    startDate,
    endDate,
    plans.map((plan) => ({
      date: plan.date,
      mealType: plan.mealType,
      householdSize: plan.householdSize,
      stapleRecipeId: plan.stapleRecipeId,
      soupRecipeId: plan.soupRecipeId,
      dishRecipeIds: plan.dishRecipeIds,
      gantt: plan.gantt,
      createdAt: new Date().toISOString(),
    })),
  );

  const persistedPlans = await listMealPlans(startDate, endDate);
  const shoppingGaps = computeShoppingGaps({
    plans,
    recipes,
    inventory: originalInventory,
  });
  const configSource = await setPlanConfigSource(source, params?.sourceNote ?? "");

  return {
    startDate,
    endDate,
    plans: persistedPlans,
    shoppingGaps,
    configSource,
  };
}

export async function getWeekSnapshot(params?: { startDate?: string; days?: number }): Promise<WeekPlanSnapshot> {
  const startDate = params?.startDate ?? todayDate();
  const days = params?.days ?? 7;
  const endDate = addDays(startDate, days - 1);
  const plans = await listMealPlans(startDate, endDate);

  if (plans.length === 0) {
    return generateWeeklyPlan({ startDate, days, source: "manual", sourceNote: "首次自动生成" });
  }

  const [recipes, inventory, configSource] = await Promise.all([
    listRecipesFull(),
    loadInventoryMapByIngredient(),
    getPlanConfigSource(),
  ]);

  const normalizedPlans: PlannedMeal[] = plans.map((plan) => ({
    date: plan.date,
    mealType: plan.mealType,
    householdSize: plan.householdSize,
    stapleRecipeId: plan.stapleRecipeId,
    soupRecipeId: plan.soupRecipeId,
    dishRecipeIds: plan.dishRecipeIds,
    gantt: plan.gantt,
  }));

  return {
    startDate,
    endDate,
    plans,
    shoppingGaps: computeShoppingGaps({
      plans: normalizedPlans,
      recipes,
      inventory,
    }),
    configSource,
  };
}

export async function replaceMealPlanById(planId: number, objective: MealTuneObjective = "balanced"): Promise<MealPlanRow | null> {
  const target = await getMealPlanById(planId);
  if (!target) {
    return null;
  }

  const [preferences, tools, recipes, inventory] = await Promise.all([
    getPreferences(),
    listTools(),
    listRecipesFull(),
    loadInventoryMapByIngredient(),
  ]);

  const excludedIds = new Set<number>([
    ...(target.stapleRecipeId ? [target.stapleRecipeId] : []),
    ...target.dishRecipeIds,
    ...(target.soupRecipeId ? [target.soupRecipeId] : []),
  ]);

  const toolCapacityMap = toToolCapacityMap(tools);
  const usageCount = new Map<number, number>();

  let result = generateSingleMeal({
    date: target.date,
    mealType: target.mealType,
    recipes,
    preferences,
    inventoryMap: cloneInventoryMap(inventory),
    usageCount,
    toolCapacityMap,
    excludedIds,
    objective,
  });

  const isSameAsCurrent =
    result.plannedMeal.stapleRecipeId === target.stapleRecipeId &&
    result.plannedMeal.soupRecipeId === target.soupRecipeId &&
    JSON.stringify(result.plannedMeal.dishRecipeIds) === JSON.stringify(target.dishRecipeIds);

  if (isSameAsCurrent) {
    result = generateSingleMeal({
      date: target.date,
      mealType: target.mealType,
      recipes,
      preferences,
      inventoryMap: cloneInventoryMap(inventory),
      usageCount,
      toolCapacityMap,
      objective,
    });
  }

  const updated = await updateMealPlan(planId, {
    householdSize: preferences.householdSize,
    stapleRecipeId: result.plannedMeal.stapleRecipeId,
    soupRecipeId: result.plannedMeal.soupRecipeId,
    dishRecipeIds: result.plannedMeal.dishRecipeIds,
    gantt: result.plannedMeal.gantt,
  });

  return updated ?? null;
}
