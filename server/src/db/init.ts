// server/src/db/init.ts

import { db } from "./index.js";

export async function initializeDatabase() {
  try {
    // Таблица players
    if (!(await db.schema.hasTable("players"))) {
      await db.schema.createTable("players", (table) => {
        table.increments("id").primary();
        table.string("name", 50).notNullable().unique();
        table.string("gender", 10).checkIn(["male", "female"]);
        table.integer("health").defaultTo(50);
        table.integer("max_health").defaultTo(50);
        table.integer("armor").defaultTo(10);
        table.integer("strength").defaultTo(0);
        table.integer("agility").defaultTo(0);
        table.integer("intelligence").defaultTo(0);
        table.integer("physique").defaultTo(0);
        table.integer("wisdom").defaultTo(0);
        table.integer("charisma").defaultTo(0);
        table.text("history");
        table.boolean("in_battle").defaultTo(false);
        table.boolean("is_online").defaultTo(false);
        table.boolean("is_card_shown").defaultTo(true);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table
          .integer("race_id")
          .references("id")
          .inTable("races")
          .onDelete("SET NULL");
      });
      console.log("Таблица players создана");
    }

    // Таблица effects
    if (!(await db.schema.hasTable("effects"))) {
      await db.schema.createTable("effects", (table) => {
        table.increments("id").primary();
        table.string("name", 100).notNullable().unique();
        table.text("description");
        table
          .string("attribute", 20)
          .checkIn([
            "health",
            "max_health",
            "armor",
            "strength",
            "agility",
            "intelligence",
            "physique",
            "wisdom",
            "charisma",
          ]);
        table.integer("modifier");
        table.integer("duration_turns").nullable();
        table.integer("duration_days").nullable();
        table.boolean("is_permanent").defaultTo(false);
      });
      console.log("Таблица effects создана");
    }

    // Таблица abilities
    if (!(await db.schema.hasTable("abilities"))) {
      await db.schema.createTable("abilities", (table) => {
        table.increments("id").primary();
        table.string("name", 100).notNullable().unique();
        table.text("description");
        table
          .string("ability_type", 10)
          .checkIn(["active", "passive"])
          .defaultTo("active");
        table.integer("cooldown_turns").defaultTo(0);
        table.integer("cooldown_days").defaultTo(0);
        table
          .integer("effect_id")
          .references("id")
          .inTable("effects")
          .onDelete("SET NULL");
        table.timestamps(true, true);
      });
      console.log("Таблица abilities создана");
    }

    // Таблица player_abilities
    if (!(await db.schema.hasTable("player_abilities"))) {
      await db.schema.createTable("player_abilities", (table) => {
        table
          .integer("player_id")
          .references("id")
          .inTable("players")
          .onDelete("CASCADE");
        table
          .integer("ability_id")
          .references("id")
          .inTable("abilities")
          .onDelete("CASCADE");
        table.timestamp("obtained_at").defaultTo(db.fn.now());
        table.boolean("is_active").defaultTo(true);
        table.primary(["player_id", "ability_id"]);
      });
      console.log("Таблица player_abilities создана");
    }

    // Таблица items
    if (!(await db.schema.hasTable("items"))) {
      await db.schema.createTable("items", (table) => {
        table.increments("id").primary();
        table.string("name", 100).notNullable();
        table.text("description");
        table
          .string("rarity", 20)
          .checkIn([
            "common",
            "uncommon",
            "rare",
            "epic",
            "legendary",
            "mythical",
            "story",
          ])
          .defaultTo("common");
        table.integer("base_quantity").defaultTo(1);
        table
          .integer("active_effect_id")
          .references("id")
          .inTable("effects")
          .onDelete("SET NULL");
        table
          .integer("passive_effect_id")
          .references("id")
          .inTable("effects")
          .onDelete("SET NULL");
        table.timestamps(true, true);
      });
      console.log("Таблица items создана");
    }

    // Таблица player_items
    if (!(await db.schema.hasTable("player_items"))) {
      await db.schema.createTable("player_items", (table) => {
        table.increments("id").primary();
        table
          .integer("player_id")
          .references("id")
          .inTable("players")
          .onDelete("CASCADE");
        table
          .integer("item_id")
          .references("id")
          .inTable("items")
          .onDelete("CASCADE");
        table.integer("quantity").defaultTo(1);
        table.boolean("is_equipped").defaultTo(false);
        table.timestamp("obtained_at").defaultTo(db.fn.now());
        table.unique(["player_id", "item_id"]);
      });
      console.log("Таблица player_items создана");
    }

    // Таблица player_active_effects
    if (!(await db.schema.hasTable("player_active_effects"))) {
      await db.schema.createTable("player_active_effects", (table) => {
        table.increments("id").primary();
        table
          .integer("player_id")
          .references("id")
          .inTable("players")
          .onDelete("CASCADE");
        table
          .integer("effect_id")
          .references("id")
          .inTable("effects")
          .onDelete("CASCADE");
        table.string("source_type", 10).checkIn(["ability", "item", "admin"]);
        table.integer("source_id").nullable();
        table.integer("remaining_turns").nullable();
        table.integer("remaining_days").nullable();
        table.timestamp("applied_at").defaultTo(db.fn.now());
        table.index(["player_id", "effect_id"]);
      });
      console.log("Таблица player_active_effects создана");
    }

    // Таблица npcs
    if (!(await db.schema.hasTable("npcs"))) {
      await db.schema.createTable("npcs", (table) => {
        table.increments("id").primary();
        table.string("name", 50).notNullable().unique();
        table.string("gender", 10).checkIn(["male", "female"]);
        table.integer("health").defaultTo(50);
        table.integer("max_health").defaultTo(50);
        table.integer("armor").defaultTo(10);
        table.integer("strength").defaultTo(0);
        table.integer("agility").defaultTo(0);
        table.integer("intelligence").defaultTo(0);
        table.integer("physique").defaultTo(0);
        table.integer("wisdom").defaultTo(0);
        table.integer("charisma").defaultTo(0);
        table.text("history");
        table.boolean("in_battle").defaultTo(false);
        table.boolean("is_online").defaultTo(false);
        table.boolean("is_card_shown").defaultTo(true);
        table.integer("aggression").defaultTo(0).checkIn(["0", "1", "2"]);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table
          .integer("race_id")
          .references("id")
          .inTable("races")
          .onDelete("SET NULL");
      });
      console.log("Таблица npcs создана");
    }

    // Таблица npc_abilities
    if (!(await db.schema.hasTable("npc_abilities"))) {
      await db.schema.createTable("npc_abilities", (table) => {
        table
          .integer("npc_id")
          .references("id")
          .inTable("npcs")
          .onDelete("CASCADE");
        table
          .integer("ability_id")
          .references("id")
          .inTable("abilities")
          .onDelete("CASCADE");
        table.timestamp("obtained_at").defaultTo(db.fn.now());
        table.boolean("is_active").defaultTo(true);
        table.primary(["npc_id", "ability_id"]);
      });
      console.log("Таблица npc_abilities создана");
    }

    // Таблица npc_items
    if (!(await db.schema.hasTable("npc_items"))) {
      await db.schema.createTable("npc_items", (table) => {
        table.increments("id").primary();
        table
          .integer("npc_id")
          .references("id")
          .inTable("npcs")
          .onDelete("CASCADE");
        table
          .integer("item_id")
          .references("id")
          .inTable("items")
          .onDelete("CASCADE");
        table.integer("quantity").defaultTo(1);
        table.boolean("is_equipped").defaultTo(false);
        table.timestamp("obtained_at").defaultTo(db.fn.now());
        table.unique(["npc_id", "item_id"]);
      });
      console.log("Таблица npc_items создана");
    }

    // Таблица npc_active_effects
    if (!(await db.schema.hasTable("npc_active_effects"))) {
      await db.schema.createTable("npc_active_effects", (table) => {
        table.increments("id").primary();
        table
          .integer("npc_id")
          .references("id")
          .inTable("npcs")
          .onDelete("CASCADE");
        table
          .integer("effect_id")
          .references("id")
          .inTable("effects")
          .onDelete("CASCADE");
        table.string("source_type", 10).checkIn(["ability", "item", "admin"]);
        table.integer("source_id").nullable();
        table.integer("remaining_turns").nullable();
        table.integer("remaining_days").nullable();
        table.timestamp("applied_at").defaultTo(db.fn.now());
        table.index(["npc_id", "effect_id"]);
      });
      console.log("Таблица npc_active_effects создана");
    }

    if (!(await db.schema.hasTable("races"))) {
      await db.schema.createTable("races", (table) => {
        table.increments("id").primary();
        table.string("name", 50).notNullable().unique();
        table.text("description");
        table.timestamp("created_at").defaultTo(db.fn.now());
      });
      console.log("Таблица races создана");
    }

    // Таблица race_effects (связь расы с эффектами)
    if (!(await db.schema.hasTable("race_effects"))) {
      await db.schema.createTable("race_effects", (table) => {
        table
          .integer("race_id")
          .references("id")
          .inTable("races")
          .onDelete("CASCADE");
        table
          .integer("effect_id")
          .references("id")
          .inTable("effects")
          .onDelete("CASCADE");
        table.primary(["race_id", "effect_id"]);
      });
      console.log("Таблица race_effects создана");
    }

    // Индексы
    await db
      .raw(
        `
      CREATE INDEX IF NOT EXISTS idx_player_abilities ON player_abilities(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_items ON player_items(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_effects ON player_active_effects(player_id);
      CREATE INDEX IF NOT EXISTS idx_abilities_type ON abilities(ability_type);
      CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
      CREATE INDEX IF NOT EXISTS idx_npc_abilities ON npc_abilities(npc_id);
      CREATE INDEX IF NOT EXISTS idx_npc_items ON npc_items(npc_id);
      CREATE INDEX IF NOT EXISTS idx_npc_effects ON npc_active_effects(npc_id);
      CREATE INDEX IF NOT EXISTS idx_npcs_aggression ON npcs(aggression);
    `,
      )
      .catch((err) => console.log("Ошибка создания индексов:", err));

    // Триггер для проверки здоровья
    await db
      .raw(
        `
      CREATE TRIGGER IF NOT EXISTS check_health_limit 
      BEFORE UPDATE ON players
      FOR EACH ROW
      WHEN NEW.health > NEW.max_health
      BEGIN
        SELECT RAISE(ABORT, 'Health cannot exceed max health');
      END;
    `,
      )
      .catch((err) => console.log("Ошибка создания триггера:", err));

    console.log("Инициализация базы данных завершена");
  } catch (error) {
    console.error("Критическая ошибка инициализации БД:", error);
    process.exit(1);
  }
}
