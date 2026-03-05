import Database from "better-sqlite3";

import { ensureSchema } from "./init.ts";
import { resetAndSeed } from "./seed-data.ts";

const sqlite = new Database("db/sqlite.db");
ensureSchema(sqlite);
resetAndSeed(sqlite);
console.log("Seed completed: 冷喵食堂示例数据已写入 db/sqlite.db");
