// server/src/db/init.ts

import { db } from "./index.js";

export async function initializeDatabase() {
  try {
    // Удаляем старые триггеры, если они существуют (больше не нужны)
    await db.raw(`DROP TRIGGER IF EXISTS check_health_limit`);
    await db.raw(`DROP TRIGGER IF EXISTS check_npc_health_limit`);

    // === НОВАЯ ТАБЛИЦА rooms ===
    if (!(await db.schema.hasTable("rooms"))) {
      await db.schema.createTable("rooms", (table) => {
        table.increments("id").primary();
        table.string("name", 100).notNullable();
        table.string("password_hash", 255).nullable(); // bcrypt hash
        table.boolean("is_active_for_players").defaultTo(false);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });
      console.log("Таблица rooms создана");
    } else {
      // Миграция: добавить колонки, если их нет
      if (!(await db.schema.hasColumn("rooms", "password_hash"))) {
        await db.schema.alterTable("rooms", (table) => {
          table.string("password_hash", 255).nullable();
        });
      }
      if (!(await db.schema.hasColumn("rooms", "is_active_for_players"))) {
        await db.schema.alterTable("rooms", (table) => {
          table.boolean("is_active_for_players").defaultTo(false);
        });
      }
      if (!(await db.schema.hasColumn("rooms", "updated_at"))) {
        await db.schema.alterTable("rooms", (table) => {
          table.timestamp("updated_at").defaultTo(db.fn.now());
        });
      }
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
        table.boolean("is_instant").defaultTo(false);
        table.text("tags").defaultTo("[]");
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица effects создана");
    } else {
      if (!(await db.schema.hasColumn("effects", "room_id"))) {
        await db.schema.alterTable("effects", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу effects");
      }
    }

    // Таблица races
    if (!(await db.schema.hasTable("races"))) {
      await db.schema.createTable("races", (table) => {
        table.increments("id").primary();
        table.string("name", 50).notNullable().unique();
        table.text("description");
        table.timestamp("created_at").defaultTo(db.fn.now());
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица races создана");
    } else {
      if (!(await db.schema.hasColumn("races", "room_id"))) {
        await db.schema.alterTable("races", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу races");
      }
    }

    // Таблица race_effects
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
        table.string("name", 50).notNullable();
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
        table.text("notes").nullable();
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица players создана");
    } else {
      if (!(await db.schema.hasColumn("players", "room_id"))) {
        await db.schema.alterTable("players", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу players");
      }
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
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица abilities создана");
    } else {
      if (!(await db.schema.hasColumn("abilities", "room_id"))) {
        await db.schema.alterTable("abilities", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу abilities");
      }
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
        table.boolean("is_deletable").notNullable().defaultTo(1);
        table.boolean("is_usable").notNullable().defaultTo(1);
        table.boolean("infinite_uses").notNullable().defaultTo(0);
        table.timestamps(true, true);
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица items создана");
    } else {
      if (!(await db.schema.hasColumn("items", "room_id"))) {
        await db.schema.alterTable("items", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу items");
      }
    }

    // Таблица item_effects
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
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица npcs создана");
    } else {
      if (!(await db.schema.hasColumn("npcs", "room_id"))) {
        await db.schema.alterTable("npcs", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу npcs");
      }
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

    // Таблица maps
    if (!(await db.schema.hasTable("maps"))) {
      await db.schema.createTable("maps", (table) => {
        table.increments("id").primary();
        table.string("name", 100).notNullable();
        table.string("image_url", 255).notNullable();
        table.boolean("show_to_players").defaultTo(false);
        table.integer("original_width").notNullable();
        table.integer("original_height").notNullable();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица maps создана");
    } else {
      if (!(await db.schema.hasColumn("maps", "room_id"))) {
        await db.schema.alterTable("maps", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу maps");
      }
      // Проверка original_width и original_height (уже есть)
      const hasOriginalWidth = await db.schema.hasColumn(
        "maps",
        "original_width",
      );
      if (!hasOriginalWidth) {
        await db.schema.alterTable("maps", (table) => {
          table.integer("original_width").nullable();
          table.integer("original_height").nullable();
        });
      }
    }

    // Таблица map_tokens
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
        table.float("x").defaultTo(0);
        table.float("y").defaultTo(0);
        table.boolean("is_grayscale").defaultTo(false);
        table.float("scale").defaultTo(1);
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.unique(["map_id", "entity_type", "entity_id"]);
        table.index(["map_id"]);
      });
      console.log("Таблица map_tokens создана");
    } else {
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
        await db.schema.alterTable("map_tokens", (table) => {
          table
            .integer("map_id")
            .references("id")
            .inTable("maps")
            .onDelete("CASCADE");
        });
        await db("map_tokens").update({ map_id: 1 }).whereNull("map_id");
      }
    }

    // Таблица logs
    if (!(await db.schema.hasTable("logs"))) {
      await db.schema.createTable("logs", (table) => {
        table.increments("id").primary();
        table.string("action_type", 20).notNullable();
        table.integer("player_id").nullable();
        table.integer("npc_id").nullable();
        table.string("entity_name", 100).notNullable();
        table.string("action_name", 100).notNullable();
        table.text("details").nullable();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
        table.index(["created_at"]);
      });
      console.log("Таблица logs создана");
    } else {
      if (!(await db.schema.hasColumn("logs", "room_id"))) {
        await db.schema.alterTable("logs", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу logs");
      }
    }

    // Таблица combat_sessions
    if (!(await db.schema.hasTable("combat_sessions"))) {
      await db.schema.createTable("combat_sessions", (table) => {
        table.increments("id").primary();
        table.boolean("is_active").defaultTo(true);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("ended_at").nullable();
        table
          .integer("room_id")
          .notNullable()
          .references("id")
          .inTable("rooms")
          .onDelete("CASCADE");
        table.index(["room_id"]);
      });
      console.log("Таблица combat_sessions создана");
    } else {
      if (!(await db.schema.hasColumn("combat_sessions", "room_id"))) {
        await db.schema.alterTable("combat_sessions", (table) => {
          table
            .integer("room_id")
            .notNullable()
            .references("id")
            .inTable("rooms")
            .onDelete("CASCADE");
          table.index(["room_id"]);
        });
        console.log("Добавлена колонка room_id в таблицу combat_sessions");
      }
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

    // Добавление колонки notes в таблицу players (уже есть, но на всякий случай)
    const hasNotesColumn = await db.schema.hasColumn("players", "notes");
    if (!hasNotesColumn) {
      await db.schema.alterTable("players", (table) => {
        table.text("notes").nullable();
      });
      console.log("Добавлена колонка notes в таблицу players");
    }

    // Добавление колонки is_instant в таблицу effects (уже есть, но на всякий случай)
    const hasIsInstant = await db.schema.hasColumn("effects", "is_instant");
    if (!hasIsInstant) {
      await db.schema.alterTable("effects", (table) => {
        table.boolean("is_instant").defaultTo(false);
      });
      console.log("Добавлена колонка is_instant в таблицу effects");
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

    console.log("Инициализация базы данных завершена");
  } catch (error) {
    console.error("Критическая ошибка инициализации БД:", error);
    process.exit(1);
  }
}
