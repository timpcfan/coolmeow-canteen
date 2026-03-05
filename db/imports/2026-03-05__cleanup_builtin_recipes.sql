BEGIN TRANSACTION;
-- 清空旧计划，避免引用到被删除的旧菜谱 ID
DELETE FROM meal_plans;

-- 删除非 yunyoujun/cook 来源的菜谱（即旧内置菜谱）
DELETE FROM recipes
WHERE source_id IS NULL
   OR source_id != (SELECT id FROM recipe_sources WHERE key='yunyoujun/cook');
COMMIT;
