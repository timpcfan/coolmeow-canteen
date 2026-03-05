# 冷喵食堂 V1 架构说明

## 1. 模块划分

- `app/`：
  - 页面：周计划、库存、采购、偏好、工具
  - API：`/api/weekly-plan`、`/api/inventory`、`/api/shopping-list`、`/api/preferences`、`/api/tools`
- `lib/repository.ts`：数据库访问层（Drizzle）
- `lib/planner.ts`：规则规划引擎 + 并发调度 + 采购缺口计算
- `db/`：SQLite 初始化、schema、seed 数据

## 2. 数据模型（SQLite + Drizzle）

核心表：

- `ingredients`：食材基础信息（单位、分类、热量）
- `recipes`：菜谱信息（类型 staple/dish/soup、低卡标记、口味、过敏原）
- `recipe_ingredients`：菜谱与食材关联（用量）
- `recipe_steps`：菜谱步骤（顺序、时长、工具类型）
- `tools`：厨房工具及并发能力（capacity）
- `inventory`：库存数量、单位、位置、保质期
- `preferences`：家庭偏好与限制（人份、口味、忌口、过敏、汤/主食开关）
- `meal_plans`：生成后的每餐结构与甘特图数据

## 3. 周计划算法（规则引擎）

输入：

- 偏好配置
- 菜谱库（含食材和步骤）
- 当前库存
- 工具并发能力

流程：

1. 按餐型筛选候选菜谱：
   - 满足低卡/忌口/过敏限制
   - 优先满足烹饪方式偏好
2. 评分排序：
   - 库存覆盖率（库存越能覆盖所需食材，分越高）
   - 口味匹配、方式匹配
   - 重复惩罚（同一菜谱反复出现会降分）
3. 结构组装：
   - 主食：根据 `stapleRequired` 与餐型决定是否选取
   - 菜品：按人份目标选择 1~3 道
   - 汤：根据 `needSoup` 决定（早餐默认不配汤）
4. 生成后扣减库存工作副本，用于后续餐次推荐更贴近库存现实。

输出：`meal_plans` 行数据。

## 4. 并发调度与甘特图思路

### 调度目标

- 在满足菜谱步骤顺序的前提下，利用工具并发能力缩短总时长。

### 调度规则

1. 每个菜谱内部步骤必须串行。
2. 使用工具的步骤需要占用对应工具槽位（capacity）。
3. 对同工具类型，选择最早空闲槽位排程。
4. 无工具步骤归为备料泳道（lane=0）。

### 输出结构

每个任务：

- `taskId`
- `recipeName`
- `label`
- `toolType`
- `lane`
- `startMin`
- `endMin`

前端直接据此绘制横向甘特条。

## 5. 采购缺口计算

1. 汇总周计划全部食材需求（按人份比例缩放）。
2. 对比库存总量，得到 `shortage`。
3. 根据按日期累积需求，计算首次超过库存的 `neededBy`。
4. 建议采购时间 `suggestedPurchaseDate = neededBy - 1 天`（不早于当天）。

## 6. 错误处理与校验

- API 入参统一用 `zod` 做基础校验。
- 仓储层对不存在记录返回 `null` 或布尔状态。
- 前端统一展示错误消息并支持刷新重试。
