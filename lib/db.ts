import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { ensureSchema } from "@/db/init";
import { seedIfEmpty } from "@/db/seed-data";
import * as schema from "@/db/schema";

const sqlite = new Database("db/sqlite.db");
sqlite.pragma("journal_mode = WAL");
ensureSchema(sqlite);
seedIfEmpty(sqlite);

export const db = drizzle(sqlite, { schema });
export type DbClient = typeof db;
