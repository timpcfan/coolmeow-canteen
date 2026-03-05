import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildMealCountdownSchedule } from "../lib/countdown.ts";
import { plannerInternals } from "../lib/planner-core.ts";
import type { PlannedMeal, PreferenceRow, RecipeFull } from "../lib/types.ts";

function makeRecipe(input: {
  id: number;
  name: string;
  type: "staple" | "dish" | "soup";
  servings?: number;
  ingredientId?: number;
  ingredientAmount?: number;
  ingredientUnit?: string;
  steps: Array<{ id: number; order: number; title: string; duration: number; toolType: string | null }>;
}): RecipeFull {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    servings: input.servings ?? 2,
    cookingMethods: ["boil"],
    flavorTags: ["清淡"],
    isLowCal: true,
    allergens: [],
    description: "",
    ingredients:
      input.ingredientId === undefined
        ? []
        : [
            {
              id: input.id * 100,
              recipeId: input.id,
              ingredientId: input.ingredientId,
              amount: input.ingredientAmount ?? 100,
              unit: input.ingredientUnit ?? "g",
              ingredient: {
                id: input.ingredientId,
                name: `Ingredient-${input.ingredientId}`,
                unit: input.ingredientUnit ?? "g",
                category: "test",
                kcalPerUnit: null,
              },
            },
          ],
    steps: input.steps.map((step) => ({
      id: step.id,
      recipeId: input.id,
      stepOrder: step.order,
      title: step.title,
      durationMin: step.duration,
      toolType: step.toolType,
    })),
  };
}

describe("planner internals", () => {
  test("schedules shared tools without exceeding capacity", () => {
    const recipeA = makeRecipe({
      id: 1,
      name: "A",
      type: "dish",
      steps: [
        { id: 11, order: 1, title: "prep", duration: 2, toolType: null },
        { id: 12, order: 2, title: "cook", duration: 10, toolType: "gas_stove" },
      ],
    });

    const recipeB = makeRecipe({
      id: 2,
      name: "B",
      type: "dish",
      steps: [
        { id: 21, order: 1, title: "prep", duration: 1, toolType: null },
        { id: 22, order: 2, title: "cook", duration: 8, toolType: "gas_stove" },
      ],
    });

    const tasks = plannerInternals.scheduleMeal([recipeA, recipeB], new Map([["gas_stove", 1]]));
    const gasTasks = tasks.filter((task) => task.toolType === "gas_stove").sort((a, b) => a.startMin - b.startMin);

    assert.equal(gasTasks.length, 2);
    assert.ok(gasTasks[1].startMin >= gasTasks[0].endMin);
  });

  test("computes shopping gaps with needed date", () => {
    const recipe = makeRecipe({
      id: 1,
      name: "rice",
      type: "staple",
      ingredientId: 9,
      ingredientAmount: 100,
      ingredientUnit: "g",
      steps: [{ id: 10, order: 1, title: "cook", duration: 10, toolType: "rice_cooker" }],
    });

    const targetDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const plans: PlannedMeal[] = [
      {
        date: targetDate,
        mealType: "lunch",
        householdSize: 2,
        stapleRecipeId: 1,
        soupRecipeId: null,
        dishRecipeIds: [],
        gantt: [],
      },
    ];

    const gaps = plannerInternals.computeShoppingGaps({
      plans,
      recipes: [recipe],
      inventory: new Map([[9, { quantity: 20, unit: "g" }]]),
    });

    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].ingredientId, 9);
    assert.equal(gaps[0].shortage, 80);
    assert.equal(gaps[0].neededBy, targetDate);
  });

  test("prefers low-cal dishes when enabled", () => {
    const lowCalDish = makeRecipe({
      id: 3,
      name: "low",
      type: "dish",
      steps: [{ id: 31, order: 1, title: "steam", duration: 8, toolType: "steamer" }],
    });

    const highCalDish: RecipeFull = {
      ...makeRecipe({
        id: 4,
        name: "high",
        type: "dish",
        steps: [{ id: 41, order: 1, title: "fry", duration: 8, toolType: "gas_stove" }],
      }),
      isLowCal: false,
    };

    const preference: PreferenceRow = {
      id: 1,
      householdSize: 2,
      preferredCookingMethods: [],
      lowCalOnly: true,
      flavorPreferences: [],
      avoidIngredients: [],
      allergens: [],
      needSoup: false,
      stapleRequired: false,
      updatedAt: new Date().toISOString(),
    };

    const filtered = plannerInternals.filterCandidates([lowCalDish, highCalDish], "dish", preference);
    assert.deepEqual(
      filtered.map((item) => item.id),
      [3],
    );
  });

  test("quick tune faster prioritizes shorter dishes", () => {
    const fastDish = makeRecipe({
      id: 21,
      name: "fast",
      type: "dish",
      steps: [{ id: 211, order: 1, title: "fast-step", duration: 8, toolType: "gas_stove" }],
    });

    const mediumDish = makeRecipe({
      id: 22,
      name: "medium",
      type: "dish",
      steps: [{ id: 221, order: 1, title: "medium-step", duration: 22, toolType: "gas_stove" }],
    });

    const slowDish = makeRecipe({
      id: 23,
      name: "slow",
      type: "dish",
      steps: [{ id: 231, order: 1, title: "slow-step", duration: 58, toolType: "gas_stove" }],
    });

    const preference: PreferenceRow = {
      id: 1,
      householdSize: 2,
      preferredCookingMethods: [],
      lowCalOnly: false,
      flavorPreferences: [],
      avoidIngredients: [],
      allergens: [],
      needSoup: false,
      stapleRequired: false,
      updatedAt: new Date().toISOString(),
    };

    const result = plannerInternals.generateSingleMeal({
      date: "2026-03-05",
      mealType: "dinner",
      recipes: [fastDish, mediumDish, slowDish],
      preferences: preference,
      inventoryMap: new Map(),
      usageCount: new Map(),
      toolCapacityMap: new Map([["gas_stove", 1]]),
      objective: "faster",
    });

    assert.equal(result.plannedMeal.dishRecipeIds.length, 2);
    assert.ok(result.plannedMeal.dishRecipeIds.includes(21));
    assert.ok(result.plannedMeal.dishRecipeIds.includes(22));
    assert.ok(!result.plannedMeal.dishRecipeIds.includes(23));
  });

  test("countdown schedule marks current start steps and parallel steps", () => {
    const schedule = buildMealCountdownSchedule({
      mealDate: "2026-03-05",
      targetServeTime: "19:00",
      now: new Date(2026, 2, 5, 18, 40, 30),
      tasks: [
        {
          taskId: "a",
          label: "task-a",
          recipeId: 1,
          recipeName: "A",
          toolType: "gas_stove",
          lane: 1,
          startMin: 0,
          endMin: 10,
        },
        {
          taskId: "b",
          label: "task-b",
          recipeId: 1,
          recipeName: "B",
          toolType: "steamer",
          lane: 2,
          startMin: 0,
          endMin: 8,
        },
        {
          taskId: "d",
          label: "task-d",
          recipeId: 2,
          recipeName: "D",
          toolType: "induction",
          lane: 3,
          startMin: 2,
          endMin: 12,
        },
        {
          taskId: "c",
          label: "task-c",
          recipeId: 2,
          recipeName: "C",
          toolType: "gas_stove",
          lane: 1,
          startMin: 10,
          endMin: 20,
        },
      ],
    });

    assert.ok(schedule);
    assert.equal(schedule?.mealStartClock, "18:40");

    const focusIds = schedule?.tasks.filter((task) => task.shouldStartNow).map((task) => task.taskId).sort();
    assert.deepEqual(focusIds, ["a", "b"]);

    const taskD = schedule?.tasks.find((task) => task.taskId === "d");
    assert.equal(taskD?.isParallelStep, true);
    assert.equal(schedule?.startsInMin, 0);
  });
});
