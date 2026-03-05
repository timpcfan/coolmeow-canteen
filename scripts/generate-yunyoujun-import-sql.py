#!/usr/bin/env python3
import csv
import json
import sqlite3
from pathlib import Path
from datetime import datetime

ROOT = Path('/Users/timpcfan/workspace/coolmeow-canteen')
SRC_CSV = ROOT / 'tmp/yunyoujun-cook-src/app/data/recipe.csv'
DB_PATH = ROOT / 'db/sqlite.db'
OUT_SQL = ROOT / 'db/imports/2026-03-05__import_yunyoujun_cook.sql'
OUT_REPORT = ROOT / 'db/imports/2026-03-05__import_yunyoujun_cook.report.json'

OUT_SQL.parent.mkdir(parents=True, exist_ok=True)


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def split_tokens(s: str):
    if not s:
        return []
    for sep in ['、', '，', ',', '/', '|', '；', ';']:
        s = s.replace(sep, ' ')
    return [x.strip() for x in s.split() if x.strip()]


def infer_type(name: str, tags: list[str]):
    t = ''.join(tags) + name
    if any(k in t for k in ['汤', '羹', '粥汤']):
        return 'soup'
    if any(k in t for k in ['饭', '面', '粥', '饼', '粉', '包', '吐司', '主食', '早餐', '早饭']):
        return 'staple'
    return 'dish'


def infer_method(methods: list[str], name: str):
    if methods:
        return methods[0]
    for m in ['蒸', '煎', '炸', '烤', '煮', '炖', '焖', '烧', '拌', '卤', '煲']:
        if m in name:
            return m
    return '炒'


def map_tool(raw: str):
    s = raw or ''
    if '电饭煲' in s:
        return 'rice_cooker'
    if '蒸' in s:
        return 'steamer'
    if '烤箱' in s or '空气炸锅' in s or '微波' in s:
        return 'induction'
    if '锅' in s or '灶' in s:
        return 'gas_stove'
    return None


def infer_allergens(ings: list[str]):
    alls = []
    joined = ''.join(ings)
    if any(k in joined for k in ['蛋']):
        alls.append('egg')
    if any(k in joined for k in ['牛奶', '奶酪', '黄油', '奶油']):
        alls.append('dairy')
    if any(k in joined for k in ['虾', '蟹', '贝']):
        alls.append('shellfish')
    if any(k in joined for k in ['豆腐', '豆']):
        alls.append('soy')
    if any(k in joined for k in ['面', '麦', '吐司']):
        alls.append('gluten')
    return alls


def infer_category(ing: str):
    if any(k in ing for k in ['米', '面', '粉', '燕麦', '红薯', '土豆', '吐司', '面包']):
        return 'staple'
    if any(k in ing for k in ['蛋', '肉', '鸡', '牛', '猪', '虾', '鱼', '豆腐']):
        return 'protein'
    if any(k in ing for k in ['奶']):
        return 'dairy'
    if any(k in ing for k in ['姜', '蒜', '葱', '椒', '盐', '酱']):
        return 'seasoning'
    return 'vegetable'


conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute('select name from recipes')
existing_names = {r[0] for r in cur.fetchall()}

rows = []
with SRC_CSV.open('r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

sql = []
sql.append('-- generated at ' + datetime.now().isoformat())
sql.append('BEGIN TRANSACTION;')
sql.append("INSERT OR IGNORE INTO recipe_sources(key,name,license,source_url,commercial_use_allowed,notes,created_at,updated_at) VALUES('yunyoujun/cook','YunYouJun Cook','MIT','https://github.com/YunYouJun/cook',1,'import from app/data/recipe.csv',datetime('now'),datetime('now'));")
sql.append("INSERT INTO recipe_import_batches(source_id,batch_tag,total_count,success_count,failed_count,created_at,notes) VALUES((SELECT id FROM recipe_sources WHERE key='yunyoujun/cook'),'2026-03-05-initial',0,0,0,datetime('now'),'generated import batch');")
sql.append("CREATE TEMP TABLE IF NOT EXISTS _import_meta(k TEXT PRIMARY KEY, v TEXT);")
sql.append("INSERT OR REPLACE INTO _import_meta(k,v) VALUES('batch_id',(SELECT CAST(last_insert_rowid() AS TEXT)));")

success = 0
renamed = 0
for idx, r in enumerate(rows, start=1):
    name = (r.get('name') or '').strip()
    if not name:
        continue
    final_name = name
    if final_name in existing_names:
        final_name = f"{name}（云菜谱）"
        renamed += 1
        while final_name in existing_names:
            final_name += '·'
    existing_names.add(final_name)

    ings = split_tokens((r.get('stuff') or '').strip())
    if not ings:
        ings = ['待补充食材']
    methods = split_tokens((r.get('methods') or '').strip())
    tags = split_tokens((r.get('tags') or '').strip())
    tools = split_tokens((r.get('tools') or '').strip())
    difficulty = (r.get('difficulty') or '').strip()
    bv = (r.get('bv') or '').strip()

    rtype = infer_type(final_name, tags)
    primary_method = infer_method(methods, final_name)
    tool_code = map_tool(' '.join(tools))
    allergens = infer_allergens(ings)

    prep = 5 if difficulty in ['简单', ''] else 8 if difficulty in ['普通', '中等'] else 12
    cook = 10 if difficulty in ['简单', ''] else 18 if difficulty in ['普通', '中等'] else 28

    desc = f"来源: YunYouJun/cook; bv: {bv}" if bv else '来源: YunYouJun/cook'
    external_url = f"https://www.bilibili.com/video/{bv}" if bv else "https://github.com/YunYouJun/cook"

    sql.append(f"INSERT INTO recipes(name,type,servings,cooking_methods,flavor_tags,is_low_cal,allergens,description,status,source_id,source_recipe_id,external_url,import_batch_id,created_at,updated_at) VALUES({q(final_name)},{q(rtype)},2,{q(json.dumps(methods if methods else [primary_method], ensure_ascii=False))},{q(json.dumps(tags, ensure_ascii=False))},0,{q(json.dumps(allergens, ensure_ascii=False))},{q(desc)},'active',(SELECT id FROM recipe_sources WHERE key='yunyoujun/cook'),{q(str(idx))},{q(external_url)},(SELECT CAST(v AS INTEGER) FROM _import_meta WHERE k='batch_id'),datetime('now'),datetime('now'));")

    sql.append(f"DELETE FROM recipe_ingredients WHERE recipe_id=(SELECT id FROM recipes WHERE name={q(final_name)});")
    sql.append(f"DELETE FROM recipe_steps WHERE recipe_id=(SELECT id FROM recipes WHERE name={q(final_name)});")

    for i, ing in enumerate(ings):
        cat = infer_category(ing)
        sql.append(f"INSERT OR IGNORE INTO ingredients(name,unit,category,kcal_per_unit) VALUES({q(ing)},'g',{q(cat)},0);")
        amount = 180 if i == 0 and cat == 'staple' else 120 if i < 2 else 80
        sql.append(
            f"INSERT INTO recipe_ingredients(recipe_id,ingredient_id,amount,unit) VALUES((SELECT id FROM recipes WHERE name={q(final_name)}),(SELECT id FROM ingredients WHERE name={q(ing)}),{amount},'g');"
        )

    sql.append(
        f"INSERT INTO recipe_steps(recipe_id,step_order,title,duration_min,tool_type,tool_type_code) VALUES((SELECT id FROM recipes WHERE name={q(final_name)}),1,'食材准备',{prep},NULL,'');"
    )
    tlabel = primary_method + '烹饪'
    tool_type = tool_code if tool_code else ''
    tool_text = q(tool_type) if tool_type else 'NULL'
    sql.append(
        f"INSERT INTO recipe_steps(recipe_id,step_order,title,duration_min,tool_type,tool_type_code) VALUES((SELECT id FROM recipes WHERE name={q(final_name)}),2,{q(tlabel)},{cook},{tool_text},{q(tool_type)});"
    )

    success += 1

sql.append("UPDATE recipe_import_batches SET total_count=" + str(len(rows)) + ", success_count=" + str(success) + ", failed_count=" + str(max(0, len(rows)-success)) + " WHERE id=(SELECT CAST(v AS INTEGER) FROM _import_meta WHERE k='batch_id');")
sql.append('COMMIT;')

OUT_SQL.write_text('\n'.join(sql) + '\n', encoding='utf-8')
OUT_REPORT.write_text(json.dumps({
    'source_rows': len(rows),
    'generated_recipes': success,
    'renamed_due_to_name_conflict': renamed,
    'sql_file': str(OUT_SQL),
}, ensure_ascii=False, indent=2), encoding='utf-8')

print(str(OUT_SQL))
print(str(OUT_REPORT))
