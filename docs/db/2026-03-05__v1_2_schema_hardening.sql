-- 冷喵食堂数据库 V1.2 最小加固草案
-- 目标：提高可导入性、可维护性、可扩展性
-- 注意：本文件为“草案 SQL”，建议先在测试库验证再执行到生产库。

BEGIN TRANSACTION;

-- 1) 来源与导入批次：支持外部菜谱溯源
CREATE TABLE IF NOT EXISTS recipe_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,               -- 例如: yunyoujun/cook
  name TEXT NOT NULL,
  license TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  commercial_use_allowed INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES recipe_sources(id) ON DELETE CASCADE,
  batch_tag TEXT NOT NULL,                -- 例如: 2026-03-05-initial-30
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

-- 2) recipes 增强字段（增量，不破坏现有逻辑）
ALTER TABLE recipes ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE recipes ADD COLUMN source_id INTEGER REFERENCES recipe_sources(id);
ALTER TABLE recipes ADD COLUMN source_recipe_id TEXT NOT NULL DEFAULT '';
ALTER TABLE recipes ADD COLUMN external_url TEXT NOT NULL DEFAULT '';
ALTER TABLE recipes ADD COLUMN import_batch_id INTEGER REFERENCES recipe_import_batches(id);
ALTER TABLE recipes ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE recipes ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

-- 约束性索引：同源去重（source_id + source_recipe_id）
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_source_unique
  ON recipes(source_id, source_recipe_id)
  WHERE source_id IS NOT NULL AND source_recipe_id <> '';

-- 3) 方法/标签标准化（保留原 JSON 字段，新增可维护结构）
CREATE TABLE IF NOT EXISTS cooking_method_dict (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,              -- fry/steam/stew/boil/bake...
  name_zh TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]'      -- JSON 数组
);

CREATE TABLE IF NOT EXISTS tag_dict (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS allergen_dict (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS recipe_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  method_id INTEGER NOT NULL REFERENCES cooking_method_dict(id) ON DELETE RESTRICT,
  UNIQUE(recipe_id, method_id)
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag_dict(id) ON DELETE RESTRICT,
  UNIQUE(recipe_id, tag_id)
);

-- 4) 步骤工具规范化（先补字典，后续逐步替换自由文本）
CREATE TABLE IF NOT EXISTS tool_type_dict (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,              -- gas_stove / steamer / induction / rice_cooker
  name_zh TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]'
);

ALTER TABLE recipe_steps ADD COLUMN tool_type_code TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_order ON recipe_steps(recipe_id, step_order);

-- 5) 计划与库存约束/索引增强
-- meal_plans: 避免同一天同餐次重复生成
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_date_meal_type_unique
  ON meal_plans(date, meal_type);

-- inventory: 加速库存查询与去重治理
CREATE INDEX IF NOT EXISTS idx_inventory_ingredient_location_expires
  ON inventory(ingredient_id, location, expires_at);

-- 6) app_state 可用性索引（已有主键 key，这里保留更新时间索引）
CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON app_state(updated_at);

COMMIT;

-- 回滚提示（手动）：
-- 1) 新表可 DROP TABLE
-- 2) 新增列在 SQLite 中不可直接 DROP；需重建表（因此上线前务必先在测试库演练）
