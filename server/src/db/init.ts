// server/src/db/init.ts

import { db } from "./index.js";

// Добавление отсутствующих колонок (миграция)
async function addMissingColumns() {
  // Проверяем и добавляем race_id в таблицу players
  const playersColumns = await db.table("players").columnInfo();
  if (!playersColumns.race_id) {
    await db.schema.alterTable("players", (table) => {
      table
        .integer("race_id")
        .references("id")
        .inTable("races")
        .onDelete("SET NULL");
    });
    console.log("Колонка race_id добавлена в таблицу players");
  }

  // Проверяем и добавляем access_password в таблицу players
  if (!playersColumns.access_password) {
    await db.schema.alterTable("players", (table) => {
      table.text("access_password");
    });
    // Добавляем уникальный индекс для паролей (кроме NULL)
    await db.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_access_password 
      ON players (access_password) 
      WHERE access_password IS NOT NULL
    `);
    console.log("Колонка access_password и уникальный индекс добавлены");
  }

  // Добавляем avatar_url в players
  if (!playersColumns.avatar_url) {
    await db.schema.alterTable("players", (table) => {
      table.string("avatar_url", 255).nullable();
    });
    console.log("Колонка avatar_url добавлена в таблицу players");
  }

  // Добавляем avatar_url в npcs
  const npcsColumns = await db.table("npcs").columnInfo();
  if (!npcsColumns.avatar_url) {
    await db.schema.alterTable("npcs", (table) => {
      table.string("avatar_url", 255).nullable();
    });
    console.log("Колонка avatar_url добавлена в таблицу npcs");
  }

  // Добавляем колонку remaining_cooldown_turns в player_abilities
  const playerAbilitiesColumns = await db
    .table("player_abilities")
    .columnInfo();
  if (!playerAbilitiesColumns.remaining_cooldown_turns) {
    await db.schema.alterTable("player_abilities", (table) => {
      table.integer("remaining_cooldown_turns").defaultTo(0);
    });
    console.log(
      "Колонка remaining_cooldown_turns добавлена в player_abilities",
    );
  }

  // Добавляем колонку remaining_cooldown_turns в npc_abilities
  const npcAbilitiesColumns = await db.table("npc_abilities").columnInfo();
  if (!npcAbilitiesColumns.remaining_cooldown_turns) {
    await db.schema.alterTable("npc_abilities", (table) => {
      table.integer("remaining_cooldown_turns").defaultTo(0);
    });
    console.log("Колонка remaining_cooldown_turns добавлена в npc_abilities");
  }

  // Проверяем и добавляем race_id в таблицу npcs
  if (!npcsColumns.race_id) {
    await db.schema.alterTable("npcs", (table) => {
      table
        .integer("race_id")
        .references("id")
        .inTable("races")
        .onDelete("SET NULL");
    });
    console.log("Колонка race_id добавлена в таблицу npcs");
  }

  // Проверяем и добавляем колонку tags в таблицу effects
  const effectsColumns = await db.table("effects").columnInfo();
  if (!effectsColumns.tags) {
    await db.schema.alterTable("effects", (table) => {
      table.text("tags").defaultTo("[]");
    });
    console.log("Колонка tags добавлена в таблицу effects");
  }

  // Добавляем колонку remaining_cooldown_days в player_abilities
  const playerAbilitiesColumns2 = await db
    .table("player_abilities")
    .columnInfo();
  if (!playerAbilitiesColumns2.remaining_cooldown_days) {
    await db.schema.alterTable("player_abilities", (table) => {
      table.integer("remaining_cooldown_days").defaultTo(0);
    });
    console.log("Колонка remaining_cooldown_days добавлена в player_abilities");
  }

  // Добавляем колонку remaining_cooldown_days в npc_abilities
  const npcAbilitiesColumns2 = await db.table("npc_abilities").columnInfo();
  if (!npcAbilitiesColumns2.remaining_cooldown_days) {
    await db.schema.alterTable("npc_abilities", (table) => {
      table.integer("remaining_cooldown_days").defaultTo(0);
    });
    console.log("Колонка remaining_cooldown_days добавлена в npc_abilities");
  }

  // === НОВАЯ МИГРАЦИЯ ДЛЯ ПРЕДМЕТОВ (без удаления старых колонок) ===
  const itemsColumns = await db.table("items").columnInfo();

  // Добавляем is_deletable, is_usable, infinite_uses, если их нет
  if (!itemsColumns.is_deletable) {
    await db.schema.alterTable("items", (table) => {
      table.boolean("is_deletable").notNullable().defaultTo(1);
    });
    console.log("Колонка is_deletable добавлена в таблицу items");
  }
  if (!itemsColumns.is_usable) {
    await db.schema.alterTable("items", (table) => {
      table.boolean("is_usable").notNullable().defaultTo(1);
    });
    console.log("Колонка is_usable добавлена в таблицу items");
  }
  if (!itemsColumns.infinite_uses) {
    await db.schema.alterTable("items", (table) => {
      table.boolean("infinite_uses").notNullable().defaultTo(0);
    });
    console.log("Колонка infinite_uses добавлена в таблицу items");
  }

  // Создаём таблицу item_effects, если её нет
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
    console.log("Таблица item_effects создана (миграция)");
  }

  // Перенос данных из старых колонок active_effect_id / passive_effect_id в item_effects
  const itemEffectsCount = await db("item_effects")
    .count("id as count")
    .first();
  if (Number(itemEffectsCount?.count) === 0) {
    const itemsWithOldEffects = await db("items")
      .select("id", "active_effect_id", "passive_effect_id")
      .whereNotNull("active_effect_id")
      .orWhereNotNull("passive_effect_id");
    for (const item of itemsWithOldEffects) {
      if (item.active_effect_id) {
        await db("item_effects")
          .insert({
            item_id: item.id,
            effect_id: item.active_effect_id,
            effect_type: "active",
            created_at: db.fn.now(),
          })
          .onConflict(["item_id", "effect_id", "effect_type"])
          .ignore();
      }
      if (item.passive_effect_id) {
        await db("item_effects")
          .insert({
            item_id: item.id,
            effect_id: item.passive_effect_id,
            effect_type: "passive",
            created_at: db.fn.now(),
          })
          .onConflict(["item_id", "effect_id", "effect_type"])
          .ignore();
      }
    }
    if (itemsWithOldEffects.length > 0) {
      console.log(
        `Перенесено ${itemsWithOldEffects.length} предметов из старых колонок в item_effects`,
      );
    }
  }
}

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
        table.text("access_password");
        table.string("avatar_url", 255).nullable();
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
        table.text("tags").defaultTo("[]");
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
        // Старые колонки (оставляем, но не используем)
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
        // НОВЫЕ ПОЛЯ
        table.boolean("is_deletable").notNullable().defaultTo(1);
        table.boolean("is_usable").notNullable().defaultTo(1);
        table.boolean("infinite_uses").notNullable().defaultTo(0);
        // ---
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

    // Таблица combat_participants (порядок участников в бою)
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
        table.integer("order_index").notNullable(); // позиция в очереди (0-based)
        table.boolean("is_current_turn").defaultTo(false);
        table.timestamp("joined_at").defaultTo(db.fn.now());
        // Уникальный индекс для предотвращения дублей (session_id + entity_type + entity_id)
        table.unique(["session_id", "entity_type", "entity_id"]);
        // Индекс для сортировки по order_index
        table.index(["session_id", "order_index"]);
      });
      console.log("Таблица combat_participants создана");
    }

    await addMissingColumns();

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
