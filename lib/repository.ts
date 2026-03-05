import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  appState,
  ingredients,
  inventory,
  mealPlans,
  preferences,
  recipeIngredients,
  recipeSteps,
  recipes,
  tools,
} from "@/db/schema";
import type { MealPlanRow, PlanConfigSource, PlanConfigSourceState, PreferenceRow, RecipeFull, ToolRow } from "@/lib/types";

const DEFAULT_PREFERENCE_INPUT = {
  id: 1,
  householdSize: 3,
  preferredCookingMethods: ["steam", "boil", "stir_fry"],
  lowCalOnly: false,
  flavorPreferences: ["清淡", "鲜香"],
  avoidIngredients: ["芹菜"],
  allergens: [],
  needSoup: true,
  stapleRequired: true,
};

const PLAN_CONFIG_SOURCE_KEY = "plan_config_source";

function normalizePlanConfigSource(value: string): PlanConfigSource {
  if (value === "onboarding" || value === "quick_tune" || value === "manual") {
    return value;
  }
  return "manual";
}

export async function getPlanConfigSource(): Promise<PlanConfigSourceState> {
  const row = await db.select().from(appState).where(eq(appState.key, PLAN_CONFIG_SOURCE_KEY)).get();
  if (!row) {
    return setPlanConfigSource("manual", "系统默认");
  }

  return {
    source: normalizePlanConfigSource(row.value),
    updatedAt: row.updatedAt,
    notes: row.notes,
  };
}

export async function setPlanConfigSource(source: PlanConfigSource, notes = ""): Promise<PlanConfigSourceState> {
  const payload = {
    key: PLAN_CONFIG_SOURCE_KEY,
    value: source,
    updatedAt: new Date().toISOString(),
    notes,
  };

  await db
    .insert(appState)
    .values(payload)
    .onConflictDoUpdate({
      target: appState.key,
      set: {
        value: payload.value,
        updatedAt: payload.updatedAt,
        notes: payload.notes,
      },
    });

  return {
    source,
    updatedAt: payload.updatedAt,
    notes,
  };
}

export async function getPreferences(): Promise<PreferenceRow> {
  const row = await db.select().from(preferences).where(eq(preferences.id, 1)).get();
  if (row) {
    return row;
  }

  await db.insert(preferences).values({
    ...DEFAULT_PREFERENCE_INPUT,
    updatedAt: new Date().toISOString(),
  });

  return (await db.select().from(preferences).where(eq(preferences.id, 1)).get()) as PreferenceRow;
}

export async function updatePreferences(input: Partial<PreferenceRow>): Promise<PreferenceRow> {
  const existing = await getPreferences();
  const payload = {
    householdSize: input.householdSize ?? existing.householdSize,
    preferredCookingMethods: input.preferredCookingMethods ?? existing.preferredCookingMethods,
    lowCalOnly: input.lowCalOnly ?? existing.lowCalOnly,
    flavorPreferences: input.flavorPreferences ?? existing.flavorPreferences,
    avoidIngredients: input.avoidIngredients ?? existing.avoidIngredients,
    allergens: input.allergens ?? existing.allergens,
    needSoup: input.needSoup ?? existing.needSoup,
    stapleRequired: input.stapleRequired ?? existing.stapleRequired,
    updatedAt: new Date().toISOString(),
  };

  await db.update(preferences).set(payload).where(eq(preferences.id, 1));
  return (await db.select().from(preferences).where(eq(preferences.id, 1)).get()) as PreferenceRow;
}

export async function listTools(): Promise<ToolRow[]> {
  return db.select().from(tools).orderBy(asc(tools.id)).all();
}

export async function createTool(input: Omit<ToolRow, "id">): Promise<ToolRow> {
  await db.insert(tools).values(input);
  return (await db.select().from(tools).orderBy(sql`${tools.id} DESC`).get()) as ToolRow;
}

export async function replaceTools(input: Array<Omit<ToolRow, "id">>): Promise<ToolRow[]> {
  await db.delete(tools);

  if (input.length > 0) {
    await db.insert(tools).values(input);
  }

  return db.select().from(tools).orderBy(asc(tools.id)).all();
}

export async function updateTool(id: number, input: Partial<Omit<ToolRow, "id">>): Promise<ToolRow | null> {
  const existing = await db.select().from(tools).where(eq(tools.id, id)).get();
  if (!existing) {
    return null;
  }

  await db
    .update(tools)
    .set({
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      capacity: input.capacity ?? existing.capacity,
      notes: input.notes ?? existing.notes,
    })
    .where(eq(tools.id, id));

  return (await db.select().from(tools).where(eq(tools.id, id)).get()) as ToolRow;
}

export async function deleteTool(id: number): Promise<boolean> {
  const existing = await db.select({ id: tools.id }).from(tools).where(eq(tools.id, id)).get();
  if (!existing) {
    return false;
  }
  await db.delete(tools).where(eq(tools.id, id));
  return true;
}

export async function listInventory() {
  return db
    .select({
      id: inventory.id,
      ingredientId: inventory.ingredientId,
      ingredientName: ingredients.name,
      quantity: inventory.quantity,
      unit: inventory.unit,
      location: inventory.location,
      expiresAt: inventory.expiresAt,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .orderBy(asc(inventory.expiresAt))
    .all();
}

export async function listIngredients() {
  return db.select().from(ingredients).orderBy(asc(ingredients.name)).all();
}

export async function createInventoryItem(input: {
  ingredientId: number;
  quantity: number;
  unit: string;
  location: string;
  expiresAt: string;
}) {
  await db.insert(inventory).values({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  return db
    .select({
      id: inventory.id,
      ingredientId: inventory.ingredientId,
      ingredientName: ingredients.name,
      quantity: inventory.quantity,
      unit: inventory.unit,
      location: inventory.location,
      expiresAt: inventory.expiresAt,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .orderBy(sql`${inventory.id} DESC`)
    .get();
}

export async function updateInventoryItem(
  id: number,
  input: Partial<{ ingredientId: number; quantity: number; unit: string; location: string; expiresAt: string }>,
) {
  const existing = await db.select().from(inventory).where(eq(inventory.id, id)).get();
  if (!existing) {
    return null;
  }

  await db
    .update(inventory)
    .set({
      ingredientId: input.ingredientId ?? existing.ingredientId,
      quantity: input.quantity ?? existing.quantity,
      unit: input.unit ?? existing.unit,
      location: input.location ?? existing.location,
      expiresAt: input.expiresAt ?? existing.expiresAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(inventory.id, id));

  return db
    .select({
      id: inventory.id,
      ingredientId: inventory.ingredientId,
      ingredientName: ingredients.name,
      quantity: inventory.quantity,
      unit: inventory.unit,
      location: inventory.location,
      expiresAt: inventory.expiresAt,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .where(eq(inventory.id, id))
    .get();
}

export async function deleteInventoryItem(id: number): Promise<boolean> {
  const existing = await db.select({ id: inventory.id }).from(inventory).where(eq(inventory.id, id)).get();
  if (!existing) {
    return false;
  }
  await db.delete(inventory).where(eq(inventory.id, id));
  return true;
}

export async function listRecipesFull(): Promise<RecipeFull[]> {
  const recipeRows = await db.select().from(recipes).orderBy(asc(recipes.id)).all();
  const ingredientRows = await db
    .select({
      id: recipeIngredients.id,
      recipeId: recipeIngredients.recipeId,
      ingredientId: recipeIngredients.ingredientId,
      amount: recipeIngredients.amount,
      unit: recipeIngredients.unit,
      ingredient: ingredients,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .all();

  const stepRows = await db.select().from(recipeSteps).orderBy(asc(recipeSteps.recipeId), asc(recipeSteps.stepOrder)).all();

  return recipeRows.map((recipe) => ({
    ...recipe,
    ingredients: ingredientRows.filter((row) => row.recipeId === recipe.id),
    steps: stepRows.filter((step) => step.recipeId === recipe.id),
  }));
}

export async function listMealPlans(startDate: string, endDate: string): Promise<MealPlanRow[]> {
  return db
    .select()
    .from(mealPlans)
    .where(and(gte(mealPlans.date, startDate), lte(mealPlans.date, endDate)))
    .orderBy(asc(mealPlans.date), asc(mealPlans.mealType))
    .all();
}

export async function listMealPlansByIds(ids: number[]): Promise<MealPlanRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(mealPlans).where(inArray(mealPlans.id, ids)).all();
}

export async function getMealPlanById(id: number): Promise<MealPlanRow | null> {
  const row = await db.select().from(mealPlans).where(eq(mealPlans.id, id)).get();
  return row ?? null;
}

export async function replaceMealPlans(startDate: string, endDate: string, plans: Omit<MealPlanRow, "id">[]): Promise<void> {
  await db
    .delete(mealPlans)
    .where(and(gte(mealPlans.date, startDate), lte(mealPlans.date, endDate)));

  if (plans.length === 0) {
    return;
  }

  await db.insert(mealPlans).values(plans);
}

export async function updateMealPlan(id: number, patch: Partial<Omit<MealPlanRow, "id" | "createdAt">>) {
  const existing = await db.select().from(mealPlans).where(eq(mealPlans.id, id)).get();
  if (!existing) {
    return null;
  }

  await db
    .update(mealPlans)
    .set({
      stapleRecipeId: patch.stapleRecipeId ?? existing.stapleRecipeId,
      soupRecipeId: patch.soupRecipeId ?? existing.soupRecipeId,
      dishRecipeIds: patch.dishRecipeIds ?? existing.dishRecipeIds,
      gantt: patch.gantt ?? existing.gantt,
      householdSize: patch.householdSize ?? existing.householdSize,
      date: patch.date ?? existing.date,
      mealType: patch.mealType ?? existing.mealType,
    })
    .where(eq(mealPlans.id, id));

  return db.select().from(mealPlans).where(eq(mealPlans.id, id)).get();
}

export async function loadInventoryMapByIngredient(): Promise<Map<number, { quantity: number; unit: string }>> {
  const rows = await db
    .select({
      ingredientId: inventory.ingredientId,
      quantity: sql<number>`SUM(${inventory.quantity})`,
      unit: inventory.unit,
    })
    .from(inventory)
    .groupBy(inventory.ingredientId, inventory.unit)
    .all();

  const map = new Map<number, { quantity: number; unit: string }>();
  for (const row of rows) {
    const existing = map.get(row.ingredientId);
    if (!existing) {
      map.set(row.ingredientId, { quantity: row.quantity, unit: row.unit });
      continue;
    }

    if (existing.unit === row.unit) {
      existing.quantity += row.quantity;
      map.set(row.ingredientId, existing);
    }
  }

  return map;
}
