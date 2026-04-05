// server/src/db/index.ts

import knex from "knex";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Создана директория для БД: ${dataDir}`);
}

export const db = knex({
  client: "sqlite3",
  connection: {
    filename: path.join(dataDir, "game.db"),
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    afterCreate: (conn: any, done: Function) => {
      conn.run("PRAGMA foreign_keys = ON;", (err: any) => {
        if (err) console.error("Ошибка включения внешних ключей:", err);
        conn.run("PRAGMA journal_mode = WAL;", done);
      });
    },
  },
});
