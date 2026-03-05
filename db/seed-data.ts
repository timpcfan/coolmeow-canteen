import Database from "better-sqlite3";

type RecipeType = "staple" | "dish" | "soup";

type SeedRecipe = {
  id: number;
  name: string;
  type: RecipeType;
  servings: number;
  cookingMethods: string[];
  flavorTags: string[];
  isLowCal: boolean;
  allergens: string[];
  description: string;
  ingredients: Array<{ ingredientName: string; amount: number; unit: string }>;
  steps: Array<{ order: number; title: string; durationMin: number; toolType: string | null }>;
};

const ingredientSeeds = [
  { id: 1, name: "大米", unit: "g", category: "staple", kcalPerUnit: 1.16 },
  { id: 2, name: "燕麦片", unit: "g", category: "staple", kcalPerUnit: 3.8 },
  { id: 3, name: "鸡蛋", unit: "个", category: "protein", kcalPerUnit: 70 },
  { id: 4, name: "番茄", unit: "g", category: "vegetable", kcalPerUnit: 0.18 },
  { id: 5, name: "西兰花", unit: "g", category: "vegetable", kcalPerUnit: 0.34 },
  { id: 6, name: "鸡胸肉", unit: "g", category: "protein", kcalPerUnit: 1.65 },
  { id: 7, name: "嫩豆腐", unit: "g", category: "protein", kcalPerUnit: 0.76 },
  { id: 8, name: "胡萝卜", unit: "g", category: "vegetable", kcalPerUnit: 0.41 },
  { id: 9, name: "土豆", unit: "g", category: "vegetable", kcalPerUnit: 0.77 },
  { id: 10, name: "生菜", unit: "g", category: "vegetable", kcalPerUnit: 0.15 },
  { id: 11, name: "虾仁", unit: "g", category: "protein", kcalPerUnit: 0.9 },
  { id: 12, name: "香菇", unit: "g", category: "vegetable", kcalPerUnit: 0.34 },
  { id: 13, name: "紫菜", unit: "g", category: "vegetable", kcalPerUnit: 2.7 },
  { id: 14, name: "玉米粒", unit: "g", category: "vegetable", kcalPerUnit: 0.86 },
  { id: 15, name: "牛奶", unit: "ml", category: "dairy", kcalPerUnit: 0.62 },
  { id: 16, name: "面条", unit: "g", category: "staple", kcalPerUnit: 1.45 },
  { id: 17, name: "小白菜", unit: "g", category: "vegetable", kcalPerUnit: 0.17 },
  { id: 18, name: "姜", unit: "g", category: "seasoning", kcalPerUnit: 0.8 },
  { id: 19, name: "葱", unit: "g", category: "seasoning", kcalPerUnit: 0.32 },
  { id: 20, name: "红薯", unit: "g", category: "staple", kcalPerUnit: 0.86 },
  { id: 21, name: "苹果", unit: "个", category: "fruit", kcalPerUnit: 95 },
  { id: 22, name: "蒜", unit: "g", category: "seasoning", kcalPerUnit: 1.49 },
];

const recipeSeeds: SeedRecipe[] = [
  {
    id: 1,
    name: "白米饭",
    type: "staple",
    servings: 2,
    cookingMethods: ["boil"],
    flavorTags: ["清淡"],
    isLowCal: false,
    allergens: [],
    description: "基础主食，适配多数中餐。",
    ingredients: [{ ingredientName: "大米", amount: 160, unit: "g" }],
    steps: [
      { order: 1, title: "淘米并加水", durationMin: 5, toolType: null },
      { order: 2, title: "电饭煲焖煮", durationMin: 35, toolType: "rice_cooker" },
    ],
  },
  {
    id: 2,
    name: "蒸红薯",
    type: "staple",
    servings: 2,
    cookingMethods: ["steam"],
    flavorTags: ["清甜"],
    isLowCal: true,
    allergens: [],
    description: "简单快手早餐主食。",
    ingredients: [{ ingredientName: "红薯", amount: 350, unit: "g" }],
    steps: [
      { order: 1, title: "清洗切块", durationMin: 6, toolType: null },
      { order: 2, title: "电蒸锅蒸制", durationMin: 25, toolType: "steamer" },
    ],
  },
  {
    id: 3,
    name: "番茄鸡蛋面",
    type: "staple",
    servings: 2,
    cookingMethods: ["boil", "stir_fry"],
    flavorTags: ["酸香"],
    isLowCal: false,
    allergens: ["egg", "gluten"],
    description: "早餐或晚餐都适合的一锅面。",
    ingredients: [
      { ingredientName: "面条", amount: 200, unit: "g" },
      { ingredientName: "番茄", amount: 180, unit: "g" },
      { ingredientName: "鸡蛋", amount: 2, unit: "个" },
      { ingredientName: "葱", amount: 8, unit: "g" },
    ],
    steps: [
      { order: 1, title: "备料并打蛋", durationMin: 6, toolType: null },
      { order: 2, title: "炒番茄鸡蛋底", durationMin: 8, toolType: "gas_stove" },
      { order: 3, title: "下入面条煮熟", durationMin: 10, toolType: "gas_stove" },
    ],
  },
  {
    id: 4,
    name: "牛奶燕麦粥",
    type: "staple",
    servings: 2,
    cookingMethods: ["boil"],
    flavorTags: ["奶香"],
    isLowCal: true,
    allergens: ["dairy"],
    description: "低门槛高饱腹早餐。",
    ingredients: [
      { ingredientName: "燕麦片", amount: 90, unit: "g" },
      { ingredientName: "牛奶", amount: 450, unit: "ml" },
      { ingredientName: "苹果", amount: 1, unit: "个" },
    ],
    steps: [
      { order: 1, title: "燕麦与牛奶混合", durationMin: 2, toolType: null },
      { order: 2, title: "小火煮粥", durationMin: 12, toolType: "induction" },
      { order: 3, title: "切苹果配碗", durationMin: 4, toolType: null },
    ],
  },
  {
    id: 5,
    name: "清蒸西兰花鸡胸肉",
    type: "dish",
    servings: 2,
    cookingMethods: ["steam"],
    flavorTags: ["清淡"],
    isLowCal: true,
    allergens: [],
    description: "高蛋白低脂肪。",
    ingredients: [
      { ingredientName: "西兰花", amount: 280, unit: "g" },
      { ingredientName: "鸡胸肉", amount: 220, unit: "g" },
      { ingredientName: "姜", amount: 8, unit: "g" },
    ],
    steps: [
      { order: 1, title: "鸡胸切片腌制", durationMin: 8, toolType: null },
      { order: 2, title: "西兰花焯水", durationMin: 4, toolType: "gas_stove" },
      { order: 3, title: "蒸锅蒸制", durationMin: 18, toolType: "steamer" },
    ],
  },
  {
    id: 6,
    name: "番茄炒蛋",
    type: "dish",
    servings: 2,
    cookingMethods: ["stir_fry"],
    flavorTags: ["酸甜"],
    isLowCal: false,
    allergens: ["egg"],
    description: "高接受度家常菜。",
    ingredients: [
      { ingredientName: "番茄", amount: 260, unit: "g" },
      { ingredientName: "鸡蛋", amount: 3, unit: "个" },
      { ingredientName: "葱", amount: 8, unit: "g" },
    ],
    steps: [
      { order: 1, title: "处理番茄和鸡蛋", durationMin: 5, toolType: null },
      { order: 2, title: "热锅快炒", durationMin: 9, toolType: "gas_stove" },
    ],
  },
  {
    id: 7,
    name: "香菇豆腐煲",
    type: "dish",
    servings: 2,
    cookingMethods: ["stew"],
    flavorTags: ["鲜香"],
    isLowCal: true,
    allergens: ["soy"],
    description: "低油、适合晚餐。",
    ingredients: [
      { ingredientName: "香菇", amount: 170, unit: "g" },
      { ingredientName: "嫩豆腐", amount: 260, unit: "g" },
      { ingredientName: "葱", amount: 6, unit: "g" },
    ],
    steps: [
      { order: 1, title: "食材切块", durationMin: 6, toolType: null },
      { order: 2, title: "电磁炉炖煮", durationMin: 16, toolType: "induction" },
    ],
  },
  {
    id: 8,
    name: "虾仁玉米炒蔬菜",
    type: "dish",
    servings: 2,
    cookingMethods: ["stir_fry"],
    flavorTags: ["鲜甜"],
    isLowCal: true,
    allergens: ["shellfish"],
    description: "高蛋白快手菜。",
    ingredients: [
      { ingredientName: "虾仁", amount: 220, unit: "g" },
      { ingredientName: "玉米粒", amount: 150, unit: "g" },
      { ingredientName: "胡萝卜", amount: 130, unit: "g" },
      { ingredientName: "生菜", amount: 120, unit: "g" },
    ],
    steps: [
      { order: 1, title: "处理蔬菜虾仁", durationMin: 8, toolType: null },
      { order: 2, title: "双灶快炒", durationMin: 9, toolType: "gas_stove" },
    ],
  },
  {
    id: 9,
    name: "清炒小白菜",
    type: "dish",
    servings: 2,
    cookingMethods: ["stir_fry"],
    flavorTags: ["清香"],
    isLowCal: true,
    allergens: [],
    description: "3 分钟快炒青菜。",
    ingredients: [
      { ingredientName: "小白菜", amount: 320, unit: "g" },
      { ingredientName: "蒜", amount: 10, unit: "g" },
    ],
    steps: [
      { order: 1, title: "拍蒜切菜", durationMin: 4, toolType: null },
      { order: 2, title: "旺火翻炒", durationMin: 5, toolType: "gas_stove" },
    ],
  },
  {
    id: 10,
    name: "土豆胡萝卜焖鸡",
    type: "dish",
    servings: 2,
    cookingMethods: ["stew"],
    flavorTags: ["家常"],
    isLowCal: false,
    allergens: [],
    description: "一锅焖，适合晚餐主菜。",
    ingredients: [
      { ingredientName: "土豆", amount: 260, unit: "g" },
      { ingredientName: "胡萝卜", amount: 150, unit: "g" },
      { ingredientName: "鸡胸肉", amount: 260, unit: "g" },
      { ingredientName: "姜", amount: 8, unit: "g" },
    ],
    steps: [
      { order: 1, title: "切块与腌制", durationMin: 10, toolType: null },
      { order: 2, title: "翻炒上色", durationMin: 7, toolType: "gas_stove" },
      { order: 3, title: "小火焖熟", durationMin: 20, toolType: "gas_stove" },
    ],
  },
  {
    id: 11,
    name: "蒸蛋羹",
    type: "dish",
    servings: 2,
    cookingMethods: ["steam"],
    flavorTags: ["软嫩"],
    isLowCal: true,
    allergens: ["egg", "dairy"],
    description: "儿童友好菜品。",
    ingredients: [
      { ingredientName: "鸡蛋", amount: 2, unit: "个" },
      { ingredientName: "牛奶", amount: 120, unit: "ml" },
      { ingredientName: "葱", amount: 3, unit: "g" },
    ],
    steps: [
      { order: 1, title: "打蛋加液体", durationMin: 4, toolType: null },
      { order: 2, title: "蒸锅蒸制", durationMin: 12, toolType: "steamer" },
    ],
  },
  {
    id: 12,
    name: "番茄豆腐汤",
    type: "soup",
    servings: 2,
    cookingMethods: ["boil"],
    flavorTags: ["清鲜"],
    isLowCal: true,
    allergens: ["soy"],
    description: "常见家庭汤品。",
    ingredients: [
      { ingredientName: "番茄", amount: 220, unit: "g" },
      { ingredientName: "嫩豆腐", amount: 180, unit: "g" },
      { ingredientName: "葱", amount: 6, unit: "g" },
    ],
    steps: [
      { order: 1, title: "食材处理", durationMin: 5, toolType: null },
      { order: 2, title: "炖煮出汤", durationMin: 12, toolType: "gas_stove" },
    ],
  },
  {
    id: 13,
    name: "紫菜蛋花汤",
    type: "soup",
    servings: 2,
    cookingMethods: ["boil"],
    flavorTags: ["鲜香"],
    isLowCal: true,
    allergens: ["egg"],
    description: "快手补汤。",
    ingredients: [
      { ingredientName: "紫菜", amount: 18, unit: "g" },
      { ingredientName: "鸡蛋", amount: 1, unit: "个" },
      { ingredientName: "葱", amount: 5, unit: "g" },
    ],
    steps: [
      { order: 1, title: "备料", durationMin: 3, toolType: null },
      { order: 2, title: "煮汤并打蛋花", durationMin: 8, toolType: "gas_stove" },
    ],
  },
  {
    id: 14,
    name: "玉米香菇汤",
    type: "soup",
    servings: 2,
    cookingMethods: ["stew"],
    flavorTags: ["甜鲜"],
    isLowCal: true,
    allergens: [],
    description: "适合秋冬的一锅汤。",
    ingredients: [
      { ingredientName: "玉米粒", amount: 180, unit: "g" },
      { ingredientName: "香菇", amount: 120, unit: "g" },
      { ingredientName: "胡萝卜", amount: 90, unit: "g" },
    ],
    steps: [
      { order: 1, title: "处理食材", durationMin: 6, toolType: null },
      { order: 2, title: "电磁炉慢炖", durationMin: 20, toolType: "induction" },
    ],
  },
];

const toolSeeds = [
  { id: 1, name: "电蒸锅", type: "steamer", capacity: 3, notes: "三层，可并行蒸制" },
  { id: 2, name: "电饭煲", type: "rice_cooker", capacity: 1, notes: "标准 4L" },
  { id: 3, name: "燃气灶", type: "gas_stove", capacity: 2, notes: "双口并发" },
  { id: 4, name: "电磁炉", type: "induction", capacity: 1, notes: "辅助炖煮" },
];

const inventorySeeds = [
  { ingredientId: 1, quantity: 500, unit: "g", location: "常温", expiresAt: "2026-09-30" },
  { ingredientId: 2, quantity: 220, unit: "g", location: "常温", expiresAt: "2026-08-01" },
  { ingredientId: 3, quantity: 8, unit: "个", location: "冷藏", expiresAt: "2026-03-15" },
  { ingredientId: 4, quantity: 400, unit: "g", location: "冷藏", expiresAt: "2026-03-10" },
  { ingredientId: 5, quantity: 180, unit: "g", location: "冷藏", expiresAt: "2026-03-09" },
  { ingredientId: 6, quantity: 300, unit: "g", location: "冷冻", expiresAt: "2026-04-01" },
  { ingredientId: 7, quantity: 200, unit: "g", location: "冷藏", expiresAt: "2026-03-08" },
  { ingredientId: 8, quantity: 120, unit: "g", location: "冷藏", expiresAt: "2026-03-12" },
  { ingredientId: 9, quantity: 420, unit: "g", location: "常温", expiresAt: "2026-03-20" },
  { ingredientId: 10, quantity: 140, unit: "g", location: "冷藏", expiresAt: "2026-03-07" },
  { ingredientId: 11, quantity: 180, unit: "g", location: "冷冻", expiresAt: "2026-04-10" },
  { ingredientId: 12, quantity: 80, unit: "g", location: "冷藏", expiresAt: "2026-03-09" },
  { ingredientId: 13, quantity: 15, unit: "g", location: "常温", expiresAt: "2026-12-01" },
  { ingredientId: 14, quantity: 120, unit: "g", location: "冷冻", expiresAt: "2026-05-10" },
  { ingredientId: 15, quantity: 300, unit: "ml", location: "冷藏", expiresAt: "2026-03-11" },
  { ingredientId: 16, quantity: 260, unit: "g", location: "常温", expiresAt: "2026-07-10" },
  { ingredientId: 17, quantity: 180, unit: "g", location: "冷藏", expiresAt: "2026-03-08" },
  { ingredientId: 18, quantity: 40, unit: "g", location: "冷藏", expiresAt: "2026-03-18" },
  { ingredientId: 19, quantity: 35, unit: "g", location: "冷藏", expiresAt: "2026-03-10" },
  { ingredientId: 20, quantity: 300, unit: "g", location: "常温", expiresAt: "2026-03-14" },
  { ingredientId: 21, quantity: 3, unit: "个", location: "冷藏", expiresAt: "2026-03-12" },
  { ingredientId: 22, quantity: 20, unit: "g", location: "冷藏", expiresAt: "2026-03-16" },
];

function clearTables(sqlite: Database.Database): void {
  sqlite.exec(`
    DELETE FROM meal_plans;
    DELETE FROM inventory;
    DELETE FROM recipe_steps;
    DELETE FROM recipe_ingredients;
    DELETE FROM recipes;
    DELETE FROM ingredients;
    DELETE FROM tools;
    DELETE FROM preferences;
    DELETE FROM app_state;
  `);
}

function seedIngredients(sqlite: Database.Database): void {
  const stmt = sqlite.prepare(
    "INSERT INTO ingredients (id, name, unit, category, kcal_per_unit) VALUES (@id, @name, @unit, @category, @kcalPerUnit)",
  );
  for (const row of ingredientSeeds) {
    stmt.run(row);
  }
}

function seedRecipes(sqlite: Database.Database): void {
  const recipeStmt = sqlite.prepare(
    `INSERT INTO recipes
      (id, name, type, servings, cooking_methods, flavor_tags, is_low_cal, allergens, description)
      VALUES (@id, @name, @type, @servings, @cookingMethods, @flavorTags, @isLowCal, @allergens, @description)`,
  );

  const recipeIngredientStmt = sqlite.prepare(
    `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
     VALUES (@recipeId, @ingredientId, @amount, @unit)`,
  );

  const stepStmt = sqlite.prepare(
    `INSERT INTO recipe_steps (recipe_id, step_order, title, duration_min, tool_type)
     VALUES (@recipeId, @stepOrder, @title, @durationMin, @toolType)`,
  );

  const idStmt = sqlite.prepare("SELECT id FROM ingredients WHERE name = ?");

  for (const recipe of recipeSeeds) {
    recipeStmt.run({
      id: recipe.id,
      name: recipe.name,
      type: recipe.type,
      servings: recipe.servings,
      cookingMethods: JSON.stringify(recipe.cookingMethods),
      flavorTags: JSON.stringify(recipe.flavorTags),
      isLowCal: recipe.isLowCal ? 1 : 0,
      allergens: JSON.stringify(recipe.allergens),
      description: recipe.description,
    });

    for (const item of recipe.ingredients) {
      const ingredient = idStmt.get(item.ingredientName) as { id: number } | undefined;
      if (!ingredient) {
        continue;
      }
      recipeIngredientStmt.run({
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        amount: item.amount,
        unit: item.unit,
      });
    }

    for (const step of recipe.steps) {
      stepStmt.run({
        recipeId: recipe.id,
        stepOrder: step.order,
        title: step.title,
        durationMin: step.durationMin,
        toolType: step.toolType,
      });
    }
  }
}

function seedTools(sqlite: Database.Database): void {
  const stmt = sqlite.prepare(
    "INSERT INTO tools (id, name, type, capacity, notes) VALUES (@id, @name, @type, @capacity, @notes)",
  );
  for (const tool of toolSeeds) {
    stmt.run(tool);
  }
}

function seedInventory(sqlite: Database.Database): void {
  const stmt = sqlite.prepare(
    "INSERT INTO inventory (ingredient_id, quantity, unit, location, expires_at, updated_at) VALUES (@ingredientId, @quantity, @unit, @location, @expiresAt, @updatedAt)",
  );
  const now = new Date().toISOString();
  for (const row of inventorySeeds) {
    stmt.run({
      ...row,
      updatedAt: now,
    });
  }
}

function seedPreferences(sqlite: Database.Database): void {
  sqlite.prepare(
    `INSERT INTO preferences
      (id, household_size, preferred_cooking_methods, low_cal_only, flavor_preferences, avoid_ingredients, allergens, need_soup, staple_required, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    1,
    3,
    JSON.stringify(["steam", "boil", "stir_fry"]),
    0,
    JSON.stringify(["清淡", "鲜香"]),
    JSON.stringify(["芹菜"]),
    JSON.stringify([]),
    1,
    1,
    new Date().toISOString(),
  );
}

export function resetAndSeed(sqlite: Database.Database): void {
  const tx = sqlite.transaction(() => {
    clearTables(sqlite);
    seedIngredients(sqlite);
    seedRecipes(sqlite);
    seedTools(sqlite);
    seedInventory(sqlite);
    seedPreferences(sqlite);
  });
  tx();
}

export function seedIfEmpty(sqlite: Database.Database): void {
  const row = sqlite.prepare("SELECT COUNT(1) AS count FROM ingredients").get() as { count: number };
  if (row.count === 0) {
    resetAndSeed(sqlite);
  }
}
