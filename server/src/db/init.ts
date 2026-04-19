// server/src/db/init.ts

import { db } from "./index.js";

export async function initializeDatabase() {
  try {
    // Таблица effects (нужна для рас, способностей, предметов)
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
        table.text("tags").defaultTo("[]");
      });
      console.log("Таблица effects создана");
    }

    // Таблица races (должна быть до players и npcs из-за внешних ключей)
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
        table.text("access_password");
        table.string("avatar_url", 255).nullable();
      });
      console.log("Таблица players создана");
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
        table.integer("remaining_cooldown_turns").defaultTo(0);
        table.integer("remaining_cooldown_days").defaultTo(0);
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
        // Старые колонки (оставляем для совместимости, но не используем)
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
        // Новые поля
        table.boolean("is_deletable").notNullable().defaultTo(1);
        table.boolean("is_usable").notNullable().defaultTo(1);
        table.boolean("infinite_uses").notNullable().defaultTo(0);
        table.timestamps(true, true);
      });
      console.log("Таблица items создана");
    }

    // Таблица item_effects (связь предметов с множественными эффектами)
    if (!(await db.schema.hasTable("item_effects"))) {
      await db.schema.createTable("item_effects", (table) => {
        table.increments("id").primary();
        table
          .integer("item_id")
          .notNullable()
          .references("id")
          .inTable("items")
          .onDelete("CASCADE");
        table
          .integer("effect_id")
          .notNullable()
          .references("id")
          .inTable("effects")
          .onDelete("CASCADE");
        table
          .string("effect_type", 10)
          .notNullable()
          .checkIn(["active", "passive"]);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.unique(["item_id", "effect_id", "effect_type"]);
      });
      console.log("Таблица item_effects создана");
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
        table.string("avatar_url", 255).nullable();
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
        table.integer("remaining_cooldown_turns").defaultTo(0);
        table.integer("remaining_cooldown_days").defaultTo(0);
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

    // Таблица maps (карты)
    if (!(await db.schema.hasTable("maps"))) {
      await db.schema.createTable("maps", (table) => {
        table.increments("id").primary();
        table.string("name", 100).notNullable();
        table.string("image_url", 255).notNullable(); // путь к файлу карты
        table.boolean("show_to_players").defaultTo(false);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Таблица maps создана");
    }

    // Обновляем существующую таблицу map_tokens (добавляем колонки, если их нет)
    const hasMapTokens = await db.schema.hasTable("map_tokens");
    if (!hasMapTokens) {
      await db.schema.createTable("map_tokens", (table) => {
        table.increments("id").primary();
        table
          .integer("map_id")
          .notNullable()
          .references("id")
          .inTable("maps")
          .onDelete("CASCADE");
        table
          .string("entity_type", 10)
          .notNullable()
          .checkIn(["player", "npc"]);
        table.integer("entity_id").notNullable();
        table.float("x").defaultTo(0); // процент 0..1
        table.float("y").defaultTo(0); // процент 0..1
        table.boolean("is_grayscale").defaultTo(false);
        table.float("scale").defaultTo(1); // масштаб аватарки (1 = 100%)
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.unique(["map_id", "entity_type", "entity_id"]);
        table.index(["map_id"]);
      });
      console.log("Таблица map_tokens создана");
    } else {
      // Добавляем недостающие колонки (миграция)
      const hasIsGrayscale = await db.schema.hasColumn(
        "map_tokens",
        "is_grayscale",
      );
      if (!hasIsGrayscale) {
        await db.schema.alterTable("map_tokens", (table) => {
          table.boolean("is_grayscale").defaultTo(false);
          table.float("scale").defaultTo(1);
        });
      }
      const hasMapId = await db.schema.hasColumn("map_tokens", "map_id");
      if (!hasMapId) {
        // Если таблица существовала без map_id, пересоздаём (или добавляем с дефолтом)
        await db.schema.alterTable("map_tokens", (table) => {
          table
            .integer("map_id")
            .references("id")
            .inTable("maps")
            .onDelete("CASCADE");
        });
        // Устанавливаем map_id = 1 для существующих записей (если есть)
        await db("map_tokens").update({ map_id: 1 }).whereNull("map_id");
      }
    }

    // Таблица logs
    if (!(await db.schema.hasTable("logs"))) {
      await db.schema.createTable("logs", (table) => {
        table.increments("id").primary();
        table.string("action_type", 20).notNullable(); // ability_use, item_use, effect_gain
        table.integer("player_id").nullable();
        table.integer("npc_id").nullable();
        table.string("entity_name", 100).notNullable();
        table.string("action_name", 100).notNullable();
        table.text("details").nullable(); // JSON строка
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.index(["created_at"]);
      });
      console.log("Таблица logs создана");
    }

    // Таблица combat_sessions
    if (!(await db.schema.hasTable("combat_sessions"))) {
      await db.schema.createTable("combat_sessions", (table) => {
        table.increments("id").primary();
        table.boolean("is_active").defaultTo(true);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("ended_at").nullable();
      });
      console.log("Таблица combat_sessions создана");
    }

    // Таблица combat_participants
    if (!(await db.schema.hasTable("combat_participants"))) {
      await db.schema.createTable("combat_participants", (table) => {
        table.increments("id").primary();
        table
          .integer("session_id")
          .notNullable()
          .references("id")
          .inTable("combat_sessions")
          .onDelete("CASCADE");
        table
          .string("entity_type", 10)
          .notNullable()
          .checkIn(["player", "npc"]);
        table.integer("entity_id").notNullable();
        table.integer("order_index").notNullable();
        table.boolean("is_current_turn").defaultTo(false);
        table.timestamp("joined_at").defaultTo(db.fn.now());
        table.unique(["session_id", "entity_type", "entity_id"]);
        table.index(["session_id", "order_index"]);
      });
      console.log("Таблица combat_participants создана");
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
