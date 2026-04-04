// server/src/server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import knex from "knex";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Создана директория для БД: ${dataDir}`);
}

const app = express();
const server = http.createServer(app);

// Настройка CORS для работы с клиентом на другом порту
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

// Базовый route для проверки работы сервера
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Настройка Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const db = knex({
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
        if (err) {
          console.error("Ошибка включения внешних ключей:", err);
        }
        conn.run("PRAGMA journal_mode = WAL;", done);
      });
    },
  },
});

const initializeDatabase = async () => {
  try {
    // Таблица игроков
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
      });
      console.log("Таблица players создана");
    }

    // Таблица эффектов
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
        table.integer("modifier"); // положительное или отрицательное значение
        table.integer("duration_turns").nullable(); // NULL для постоянных эффектов
        table.integer("duration_days").nullable();
        table.boolean("is_permanent").defaultTo(false);
      });
      console.log("Таблица effects создана");
    }

    // Таблица способностей
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

    // Таблица связи игроков и способностей
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

    // Таблица предметов
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

    // Таблица связи игроков и предметов
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

    // Таблица активных эффектов на игроках
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
        table.integer("source_id").nullable(); // ID способности, предмета или NULL для админа
        table.integer("remaining_turns").nullable();
        table.integer("remaining_days").nullable();
        table.timestamp("applied_at").defaultTo(db.fn.now());

        table.index(["player_id", "effect_id"]);
      });
      console.log("Таблица player_active_effects создана");
    }

    // Таблица NPC
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
        table.integer("aggression").defaultTo(0).checkIn(["0", "1", "2"]); // 0 - спокойный, 1 - напуган, 2 - агрессивный

        table.timestamp("created_at").defaultTo(db.fn.now());
      });
      console.log("Таблица npcs создана");
    }

    // Таблица способностей NPC
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

    // Таблица предметов NPC
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

    // Таблица активных эффектов на NPC
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

    // Создание индексов для производительности
    await db
      .raw(
        `
      CREATE INDEX IF NOT EXISTS idx_player_abilities ON player_abilities(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_items ON player_items(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_effects ON player_active_effects(player_id);
      CREATE INDEX IF NOT EXISTS idx_abilities_type ON abilities(ability_type);
      CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
      -- Индексы для NPC
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
  } catch (error) {
    console.error("Критическая ошибка инициализации БД:", error);
    process.exit(1);
  }
};

// Middleware
app.use(bodyParser.json({ limit: "10mb" })); // Защита от перегрузки большими запросами

// Функция расчета итоговых характеристик NPC
function calculateNpcFinalStats(
  baseNpc: any,
  activeEffects: any[],
  items: any[],
) {
  const finalStats = {
    health: baseNpc.health,
    max_health: baseNpc.max_health,
    armor: baseNpc.armor,
    strength: baseNpc.strength,
    agility: baseNpc.agility,
    intelligence: baseNpc.intelligence,
    physique: baseNpc.physique,
    wisdom: baseNpc.wisdom,
    charisma: baseNpc.charisma,
  };

  // Применяем активные эффекты
  activeEffects.forEach((effect) => {
    if (effect.attribute && effect.modifier) {
      const currentValue =
        finalStats[effect.attribute as keyof typeof finalStats];
      if (currentValue !== undefined) {
        finalStats[effect.attribute as keyof typeof finalStats] =
          currentValue + effect.modifier;
      }
    }
  });

  // Применяем пассивные эффекты от экипированных предметов
  items
    .filter((item) => item.is_equipped && item.passive_effect)
    .forEach((item) => {
      const effect = item.passive_effect;
      if (effect.attribute && effect.modifier) {
        const currentValue =
          finalStats[effect.attribute as keyof typeof finalStats];
        if (currentValue !== undefined) {
          finalStats[effect.attribute as keyof typeof finalStats] =
            currentValue + effect.modifier;
        }
      }
    });

  return finalStats;
}

// Функция получения полных данных NPC
async function getFullNpcData(npcId: string) {
  try {
    const npc = await db("npcs").where("id", npcId).first();
    if (!npc) return null;

    const [abilities, items, activeEffects] = await Promise.all([
      // Способности NPC
      db("npc_abilities")
        .where("npc_id", npcId)
        .where("is_active", true)
        .join("abilities", "npc_abilities.ability_id", "abilities.id")
        .leftJoin("effects", "abilities.effect_id", "effects.id")
        .select(
          "abilities.*",
          "npc_abilities.obtained_at",
          "npc_abilities.is_active",
          db.raw("effects.* as effect"), // Получаем эффект способности
        ),
      // Предметы NPC
      db("npc_items")
        .where("npc_id", npcId)
        .join("items", "npc_items.item_id", "items.id")
        .leftJoin(
          "effects as active_effect",
          "items.active_effect_id",
          "active_effect.id",
        )
        .leftJoin(
          "effects as passive_effect",
          "items.passive_effect_id",
          "passive_effect.id",
        )
        .select(
          "items.*",
          "npc_items.quantity",
          "npc_items.is_equipped",
          "npc_items.obtained_at",
          "active_effect.name as active_effect_name",
          "active_effect.modifier as active_effect_modifier",
          "active_effect.attribute as active_effect_attribute",
          "passive_effect.name as passive_effect_name",
          "passive_effect.modifier as passive_effect_modifier",
          "passive_effect.attribute as passive_effect_attribute",
        ),
      // Активные эффекты на NPC
      db("npc_active_effects")
        .where("npc_id", npcId)
        .where(function () {
          this.where("remaining_turns", ">", 0)
            .orWhere("remaining_days", ">", 0)
            .orWhereNull("remaining_turns")
            .orWhereNull("remaining_days");
        })
        .join("effects", "npc_active_effects.effect_id", "effects.id")
        .select(
          "effects.*",
          "npc_active_effects.source_type",
          "npc_active_effects.source_id",
          "npc_active_effects.remaining_turns",
          "npc_active_effects.remaining_days",
          "npc_active_effects.applied_at",
        ),
    ]);

    // Вычисляем финальные статы
    const finalStats = calculateNpcFinalStats(npc, activeEffects, items);

    return {
      ...npc,
      final_stats: finalStats,
      abilities,
      items,
      active_effects: activeEffects,
    };
  } catch (error) {
    console.error("Ошибка получения полных данных NPC:", error);
    throw error;
  }
}

// Функция для проверки/создания эффекта "Испуг"
async function ensureFrightenedEffect() {
  let effect = await db("effects").where("name", "Испуг").first();
  if (!effect) {
    const [newEffect] = await db("effects")
      .insert({
        name: "Испуг",
        description: "Цель испугана, её уровень агрессии повышен до 1",
        attribute: null,
        modifier: 0,
        duration_turns: 3,
        duration_days: null,
        is_permanent: false,
      })
      .returning("*");
    effect = newEffect;
    console.log("Эффект 'Испуг' создан автоматически");
  }
  return effect;
}

// API эндпоинты для игроков
app.get("/api/players", async (req, res) => {
  try {
    const players = await db("players").select("*");
    res.json(players);
  } catch (error) {
    console.error("Ошибка получения игроков:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// API Получение игрока по id
app.get("/api/players/:id", async (req, res) => {
  try {
    const player = await db("players").where({ id: req.params.id }).first();

    if (!player) {
      return res.status(404).json({
        error: "Игрок не найден",
      });
    }

    res.json({
      success: true,
      player,
    });
  } catch (error) {
    console.error("Ошибка получения игрока:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
    });
  }
});

// API Получение полной информации игрока по id
app.get("/api/players/:id/details", async (req, res) => {
  try {
    const playerId = req.params.id;

    // 1. Получаем базовую информацию о персонаже
    const player = await db("players").where({ id: playerId }).first();

    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    // 2. Получаем способности персонажа
    const abilities = await db("player_abilities")
      .where("player_abilities.player_id", playerId)
      .where("player_abilities.is_active", true)
      .join("abilities", "player_abilities.ability_id", "abilities.id")
      .select(
        "abilities.*",
        "player_abilities.obtained_at",
        "player_abilities.is_active",
      );

    // 2. Для каждой способности подгружаем её эффект отдельно
    for (const ability of abilities) {
      if (ability.effect_id) {
        const effect = await db("effects")
          .where("id", ability.effect_id)
          .first();
        ability.effect = effect || null;
      } else {
        ability.effect = null;
      }
      // Удаляем временное поле effect_id, если оно не нужно фронту, но лучше оставить
    }

    // 3. Получаем предметы персонажа
    const items = await db("player_items")
      .where("player_items.player_id", playerId)
      .join("items", "player_items.item_id", "items.id")
      .select(
        "items.*",
        "player_items.quantity",
        "player_items.is_equipped",
        "player_items.obtained_at",
      );

    for (const item of items) {
      if (item.active_effect_id) {
        const effect = await db("effects")
          .where("id", item.active_effect_id)
          .first();
        item.active_effect = effect || null;
      } else {
        item.active_effect = null;
      }
      if (item.passive_effect_id) {
        const effect = await db("effects")
          .where("id", item.passive_effect_id)
          .first();
        item.passive_effect = effect || null;
      } else {
        item.passive_effect = null;
      }
    }

    // 4. Получаем активные эффекты на персонаже
    await db("player_active_effects")
      .where("player_id", playerId)
      .where(function () {
        this.where("remaining_turns", 0).orWhere("remaining_days", 0);
      })
      .delete();

    // Теперь получаем только актуальные
    const activeEffects = await db("player_active_effects")
      .where("player_active_effects.player_id", playerId)
      .where(function () {
        this.where("remaining_turns", ">", 0)
          .orWhere("remaining_days", ">", 0)
          .orWhereNull("remaining_turns")
          .orWhereNull("remaining_days");
      })
      .join("effects", "player_active_effects.effect_id", "effects.id")
      .select(
        "effects.*",
        "player_active_effects.source_type",
        "player_active_effects.source_id",
        "player_active_effects.remaining_turns",
        "player_active_effects.remaining_days",
        "player_active_effects.applied_at",
      );

    // 5. Рассчитываем итоговые характеристики с учетом эффектов
    const finalStats = calculateFinalStats(player, activeEffects, items);

    // 6. Формируем ответ
    const response = {
      success: true,
      player: {
        ...player,
        final_stats: finalStats,
      },
      abilities: abilities.map((ability) => ({
        ...ability,
        effect: ability.effect || null, // ← используем поле, которое мы заполнили
      })),
      items: items.map((item) => ({
        ...item,
        active_effect: item.active_effect || null,
        passive_effect: item.passive_effect || null,
      })),
      active_effects: activeEffects,
      summary: {
        total_abilities: abilities.length,
        total_items: items.reduce((sum, item) => sum + item.quantity, 0),
        active_effects_count: activeEffects.length,
        equipped_items_count: items.filter((item) => item.is_equipped).length,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Ошибка получения деталей игрока:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Функция для расчета итоговых характеристик
function calculateFinalStats(
  basePlayer: any,
  activeEffects: any[],
  items: any[],
) {
  const stats = { ...basePlayer };

  // Копируем базовые характеристики
  const finalStats = {
    health: stats.health,
    max_health: stats.max_health,
    armor: stats.armor,
    strength: stats.strength,
    agility: stats.agility,
    intelligence: stats.intelligence,
    physique: stats.physique,
    wisdom: stats.wisdom,
    charisma: stats.charisma,
  };

  // Применяем активные эффекты
  activeEffects.forEach((effect) => {
    if (effect.attribute && effect.modifier) {
      const currentValue =
        finalStats[effect.attribute as keyof typeof finalStats];
      if (currentValue !== undefined) {
        finalStats[effect.attribute as keyof typeof finalStats] =
          currentValue + effect.modifier;
      }
    }
  });

  // Применяем пассивные эффекты от экипированных предметов
  items
    .filter((item) => item.is_equipped && item.passive_effect)
    .forEach((item) => {
      const effect = item.passive_effect;
      if (effect.attribute && effect.modifier) {
        const currentValue =
          finalStats[effect.attribute as keyof typeof finalStats];
        if (currentValue !== undefined) {
          finalStats[effect.attribute as keyof typeof finalStats] =
            currentValue + effect.modifier;
        }
      }
    });

  return finalStats;
}

// API Получение полной информации игрока по id
app.get("/api/players/:id/full", async (req, res) => {
  try {
    const player = await getFullPlayerData(req.params.id);

    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    res.json(player);
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Внутренняя ошибка" });
  }
});

// API эндпоинт для создания игрока
app.post("/api/players", async (req, res) => {
  const {
    name,
    gender = "male",
    health = 50,
    max_health = 50,
    armor = 10,
    strength = 0,
    agility = 0,
    intelligence = 0,
    physique = 0,
    wisdom = 0,
    charisma = 0,
    history = "",
    is_online = false,
    is_card_shown = true,
  } = req.body;

  // Валидация входных данных
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      error: "Имя обязательно для создания игрока",
    });
  }

  if (name.length > 50) {
    return res.status(400).json({
      error: "Имя не должно превышать 50 символов",
    });
  }

  if (gender !== "male" && gender !== "female") {
    return res.status(400).json({
      error: 'Пол должен быть "male" или "female"',
    });
  }

  // Валидация числовых значений
  const numericFields = {
    health,
    max_health,
    armor,
    strength,
    agility,
    intelligence,
    physique,
    wisdom,
    charisma,
  };

  for (const [field, value] of Object.entries(numericFields)) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return res.status(400).json({
        error: `Поле "${field}" должно быть целым числом`,
      });
    }
  }

  // Проверка на положительные значения здоровья
  if (health <= 0) {
    return res.status(400).json({
      error: "Здоровье должно быть положительным числом",
    });
  }

  if (max_health <= 0) {
    return res.status(400).json({
      error: "Максимальное здоровье должно быть положительным числом",
    });
  }

  if (health > max_health) {
    return res.status(400).json({
      error: "Текущее здоровье не может превышать максимальное здоровье",
    });
  }

  try {
    // Создание игрока в базе данных
    const [player] = await db("players")
      .insert({
        name: name.trim(),
        gender,
        health,
        max_health,
        armor,
        strength,
        agility,
        intelligence,
        physique,
        wisdom,
        charisma,
        history: history || "",
        in_battle: false,
        is_online: Boolean(is_online),
        is_card_shown: Boolean(is_card_shown),
        created_at: db.fn.now(),
      })
      .returning("*");

    console.log(`Игрок "${player.name}" создан с ID: ${player.id}`);

    // Отправляем уведомление всем подключенным клиентам через Socket.IO
    io.emit("player:created", player);

    // Возвращаем созданного игрока
    res.status(201).json({
      success: true,
      message: "Игрок успешно создан",
      player,
    });
  } catch (error: any) {
    console.error("Ошибка создания игрока:", error);

    // Обработка уникального ограничения имени
    if (
      error.message.includes("UNIQUE constraint failed") ||
      error.code === "SQLITE_CONSTRAINT"
    ) {
      return res.status(409).json({
        error: "Игрок с таким именем уже существует",
      });
    }

    // Обработка проверочных ограничений (CHECK constraints)
    if (error.message.includes("CHECK constraint failed")) {
      if (error.message.includes("gender")) {
        return res.status(400).json({
          error: 'Пол должен быть "male" или "female"',
        });
      }
      return res.status(400).json({
        error: "Некорректные значения характеристик игрока",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при создании игрока",
    });
  }
});

// API Редактирование игрока по id
app.patch("/api/players/:id", async (req, res) => {
  try {
    const playerId = req.params.id;

    // Проверяем существование игрока
    const existingPlayer = await db("players").where({ id: playerId }).first();

    if (!existingPlayer) {
      return res.status(404).json({
        success: false,
        error: "Игрок не найден",
      });
    }

    // Получаем данные из тела запроса
    const updateData = req.body;

    // Удаляем запрещенные для изменения поля
    delete updateData.id;
    delete updateData.created_at;

    // Проверяем, есть ли данные для обновления
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Нет данных для обновления",
      });
    }

    // Валидация данных (опционально)
    if (
      updateData.health !== undefined &&
      updateData.max_health !== undefined
    ) {
      if (updateData.health > updateData.max_health) {
        return res.status(400).json({
          success: false,
          error: "Текущее здоровье не может превышать максимальное",
        });
      }
    }

    // Обновляем игрока в базе данных
    const updatedCount = await db("players")
      .where({ id: playerId })
      .update(updateData);

    if (updatedCount === 0) {
      return res.status(500).json({
        success: false,
        error: "Не удалось обновить игрока",
      });
    }

    // Получаем обновленного игрока
    const updatedPlayer = await db("players").where({ id: playerId }).first();

    res.json({
      success: true,
      message: "Игрок успешно обновлен",
      player: updatedPlayer,
    });
  } catch (error: any) {
    console.error("Ошибка обновления игрока:", error);

    // Проверяем сообщение от триггера
    if (
      error.message &&
      error.message.includes("Health cannot exceed max health")
    ) {
      return res.status(400).json({
        success: false,
        error: "Текущее здоровье не может превышать максимальное",
      });
    }

    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера",
    });
  }
});

// PUT /api/players/:id - обновление игрока
app.put("/api/players/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    gender,
    health,
    max_health,
    armor,
    strength,
    agility,
    intelligence,
    physique,
    wisdom,
    charisma,
    history,
    in_battle,
    is_online,
    is_card_shown,
  } = req.body;

  // Валидация ID
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      error: "Некорректный идентификатор игрока",
    });
  }

  try {
    // Проверяем существование игрока
    const existingPlayer = await db("players").where("id", id).first();
    if (!existingPlayer) {
      return res.status(404).json({
        error: "Игрок не найден",
      });
    }

    // Валидация данных
    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          error: "Имя игрока обязательно",
        });
      }

      if (name.length > 50) {
        return res.status(400).json({
          error: "Имя не должно превышать 50 символов",
        });
      }
    }

    if (gender !== undefined && gender !== "male" && gender !== "female") {
      return res.status(400).json({
        error: 'Пол должен быть "male" или "female"',
      });
    }

    // Валидация здоровья
    if (health !== undefined && (typeof health !== "number" || health < 0)) {
      return res.status(400).json({
        error: "Здоровье должно быть неотрицательным числом",
      });
    }

    if (
      max_health !== undefined &&
      (typeof max_health !== "number" || max_health <= 0)
    ) {
      return res.status(400).json({
        error: "Максимальное здоровье должно быть положительным числом",
      });
    }

    if (
      health !== undefined &&
      max_health !== undefined &&
      health > max_health
    ) {
      return res.status(400).json({
        error: "Текущее здоровье не может превышать максимальное",
      });
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (gender !== undefined) updateData.gender = gender;
    if (health !== undefined) updateData.health = health;
    if (max_health !== undefined) updateData.max_health = max_health;
    if (armor !== undefined) updateData.armor = armor;
    if (strength !== undefined) updateData.strength = strength;
    if (agility !== undefined) updateData.agility = agility;
    if (intelligence !== undefined) updateData.intelligence = intelligence;
    if (physique !== undefined) updateData.physique = physique;
    if (wisdom !== undefined) updateData.wisdom = wisdom;
    if (charisma !== undefined) updateData.charisma = charisma;
    if (history !== undefined) updateData.history = history || "";
    if (in_battle !== undefined) updateData.in_battle = Boolean(in_battle);
    if (is_online !== undefined) updateData.is_online = Boolean(is_online);
    if (is_card_shown !== undefined)
      updateData.is_card_shown = Boolean(is_card_shown);

    const [updatedPlayer] = await db("players")
      .where("id", id)
      .update(updateData)
      .returning("*");

    console.log(
      `Игрок "${updatedPlayer.name}" (ID: ${updatedPlayer.id}) обновлен`,
    );

    // Отправляем уведомление через Socket.IO
    io.emit("player:updated", updatedPlayer);

    res.json({
      success: true,
      message: "Игрок успешно обновлен",
      player: updatedPlayer,
    });
  } catch (error: any) {
    console.error("Ошибка обновления игрока:", error);

    if (error.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({
        error: "Игрок с таким именем уже существует",
      });
    }

    res.status(500).json({
      error: "Внутренняя ошибка сервера при обновлении игрока",
    });
  }
});

// DELETE /api/players/:id - удаление игрока
app.delete("/api/players/:id", async (req, res) => {
  const { id } = req.params;

  // Валидация ID
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      error: "Некорректный идентификатор игрока",
    });
  }

  try {
    // Проверяем существование игрока
    const existingPlayer = await db("players").where("id", id).first();
    if (!existingPlayer) {
      return res.status(404).json({
        error: "Игрок не найден",
      });
    }

    await db("players").where("id", id).delete();

    console.log(`Игрок "${existingPlayer.name}" (ID: ${id}) удален`);

    // Отправляем уведомление через Socket.IO
    io.emit("player:deleted", Number(id));

    res.json({
      success: true,
      message: "Игрок успешно удален",
      deleted_id: id,
    });
  } catch (error) {
    console.error("Ошибка удаления игрока:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера при удалении игрока",
    });
  }
});

// API эндпоинты для эффектов
app.get("/api/effects", async (req, res) => {
  try {
    const effects = await db("effects").select("*");

    res.json(effects);
  } catch (error) {
    console.error("Ошибка получения эффектов:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// API Получение игрока по id
app.get("/api/effects/:id", async (req, res) => {
  try {
    const effect = await db("effects").where({ id: req.params.id }).first();

    if (!effect) {
      return res.status(404).json({
        error: "Эффект не найден",
      });
    }

    res.json({
      success: true,
      effect,
    });
  } catch (error) {
    console.error("Ошибка получения эффекта:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
    });
  }
});

// API эндпоинт для создания эффекта
app.post("/api/effects", async (req, res) => {
  const {
    name,
    description = "",
    attribute = null,
    modifier = 0,
    duration_turns = null,
    duration_days = null,
    is_permanent = false,
  } = req.body;

  // Валидация обязательных полей
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      error: "Название обязательно для создания эффекта",
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      error: "Название не должно превышать 100 символов",
    });
  }

  // Валидация атрибута (если указан)
  const allowedAttributes = [
    "health",
    "max_health",
    "armor",
    "strength",
    "agility",
    "intelligence",
    "physique",
    "wisdom",
    "charisma",
  ];

  if (attribute && !allowedAttributes.includes(attribute)) {
    return res.status(400).json({
      error: `Недопустимый атрибут. Допустимые значения: ${allowedAttributes.join(", ")}`,
    });
  }

  // Валидация числовых значений
  const numericFields = {
    modifier,
    duration_turns,
    duration_days,
  };

  for (const [field, value] of Object.entries(numericFields)) {
    if (
      value !== null &&
      (typeof value !== "number" || !Number.isInteger(value))
    ) {
      return res.status(400).json({
        error: `Поле "${field}" должно быть целым числом или null`,
      });
    }
  }

  // Валидация модификатора
  if (modifier < -100 || modifier > 100) {
    return res.status(400).json({
      error: "Модификатор должен быть в диапазоне от -100 до 100",
    });
  }

  // Валидация длительности для непостоянных эффектов
  if (!is_permanent) {
    if (duration_turns === null && duration_days === null) {
      return res.status(400).json({
        error:
          "Для непостоянных эффектов укажите длительность в ходах (duration_turns) или днях (duration_days)",
      });
    }

    if (duration_turns !== null && duration_turns <= 0) {
      return res.status(400).json({
        error: "Длительность в ходах должна быть положительным числом",
      });
    }

    if (duration_days !== null && duration_days <= 0) {
      return res.status(400).json({
        error: "Длительность в днях должна быть положительным числом",
      });
    }
  } else {
    // Для постоянных эффектов длительность должна быть null
    if (duration_turns !== null || duration_days !== null) {
      return res.status(400).json({
        error: "Постоянные эффекты не могут иметь длительность",
      });
    }
  }

  // Валидация флага is_permanent
  if (typeof is_permanent !== "boolean") {
    return res.status(400).json({
      error: "Поле is_permanent должно быть булевым значением",
    });
  }

  // Валидация описания
  if (description && typeof description !== "string") {
    return res.status(400).json({
      error: "Описание должно быть строкой",
    });
  }

  try {
    // Создание эффекта в базе данных
    const [effect] = await db("effects")
      .insert({
        name: name.trim(),
        description: description || null,
        attribute: attribute || null,
        modifier,
        duration_turns: is_permanent ? null : duration_turns,
        duration_days: is_permanent ? null : duration_days,
        is_permanent,
      })
      .returning("*");

    console.log(`Эффект "${effect.name}" создан с ID: ${effect.id}`);

    // Отправляем уведомление всем подключенным клиентам через Socket.IO
    if (io) {
      io.emit("effect:created", effect);
    }

    // Возвращаем созданный эффект
    res.status(201).json({
      success: true,
      message: "Эффект успешно создан",
      effect,
    });
  } catch (error: any) {
    console.error("Ошибка создания эффекта:", error);

    // Обработка уникального ограничения имени
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Эффект с таким названием уже существует",
      });
    }

    // Обработка проверочных ограничений (CHECK constraints)
    if (
      (error.message && error.message.includes("CHECK constraint failed")) ||
      (error.message && error.message.includes("check constraint"))
    ) {
      if (error.message.includes("attribute")) {
        return res.status(400).json({
          error: "Недопустимый атрибут эффекта",
        });
      }

      return res.status(400).json({
        error: "Некорректные значения параметров эффекта",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при создании эффекта",
    });
  }
});

// PUT /api/effects/:id - обновление эффекта
app.put("/api/effects/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description = "",
    attribute = null,
    modifier = 0,
    duration_turns = null,
    duration_days = null,
    is_permanent = false,
  } = req.body;

  // Валидация ID
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      error: "Некорректный идентификатор эффекта",
    });
  }

  try {
    // Проверяем существование эффекта
    const existingEffect = await db("effects").where("id", id).first();
    if (!existingEffect) {
      return res.status(404).json({
        error: "Эффект не найден",
      });
    }

    // Валидация данных
    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          error: "Название обязательно для обновления эффекта",
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          error: "Название не должно превышать 100 символов",
        });
      }
    }

    // Валидация атрибута (если указан)
    const allowedAttributes = [
      "health",
      "max_health",
      "armor",
      "strength",
      "agility",
      "intelligence",
      "physique",
      "wisdom",
      "charisma",
    ];

    if (
      attribute !== undefined &&
      attribute !== null &&
      !allowedAttributes.includes(attribute)
    ) {
      return res.status(400).json({
        error: `Недопустимый атрибут. Допустимые значения: ${allowedAttributes.join(", ")}`,
      });
    }

    // Валидация числовых значений
    const numericFields = {
      modifier,
      duration_turns,
      duration_days,
    };

    for (const [field, value] of Object.entries(numericFields)) {
      if (
        value !== null &&
        (typeof value !== "number" || !Number.isInteger(value))
      ) {
        return res.status(400).json({
          error: `Поле "${field}" должно быть целым числом или null`,
        });
      }
    }

    // Валидация модификатора
    if (modifier !== undefined && (modifier < -100 || modifier > 100)) {
      return res.status(400).json({
        error: "Модификатор должен быть в диапазоне от -100 до 100",
      });
    }

    // Валидация длительности для непостоянных эффектов
    if (is_permanent !== undefined && !is_permanent) {
      if (duration_turns === null && duration_days === null) {
        return res.status(400).json({
          error:
            "Для непостоянных эффектов укажите длительность в ходах (duration_turns) или днях (duration_days)",
        });
      }

      if (duration_turns !== null && duration_turns <= 0) {
        return res.status(400).json({
          error: "Длительность в ходах должна быть положительным числом",
        });
      }

      if (duration_days !== null && duration_days <= 0) {
        return res.status(400).json({
          error: "Длительность в днях должна быть положительным числом",
        });
      }
    } else if (is_permanent !== undefined && is_permanent) {
      // Для постоянных эффектов длительность должна быть null
      if (duration_turns !== null || duration_days !== null) {
        return res.status(400).json({
          error: "Постоянные эффекты не могут иметь длительность",
        });
      }
    }

    // Валидация флага is_permanent
    if (is_permanent !== undefined && typeof is_permanent !== "boolean") {
      return res.status(400).json({
        error: "Поле is_permanent должно быть булевым значением",
      });
    }

    // Валидация описания
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        error: "Описание должно быть строкой",
      });
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (attribute !== undefined) updateData.attribute = attribute || null;
    if (modifier !== undefined) updateData.modifier = modifier;
    if (duration_turns !== undefined)
      updateData.duration_turns = is_permanent ? null : duration_turns;
    if (duration_days !== undefined)
      updateData.duration_days = is_permanent ? null : duration_days;
    if (is_permanent !== undefined) updateData.is_permanent = is_permanent;

    // Обновляем эффект в базе данных
    const [updatedEffect] = await db("effects")
      .where("id", id)
      .update(updateData)
      .returning("*");

    console.log(
      `Эффект "${updatedEffect.name}" (ID: ${updatedEffect.id}) обновлен`,
    );

    // Отправляем уведомление через Socket.IO
    io.emit("effect:updated", updatedEffect);

    res.json({
      success: true,
      message: "Эффект успешно обновлен",
      effect: updatedEffect,
    });
  } catch (error: any) {
    console.error("Ошибка обновления эффекта:", error);

    // Обработка уникального ограничения имени
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Эффект с таким названием уже существует",
      });
    }

    // Обработка проверочных ограничений (CHECK constraints)
    if (
      (error.message && error.message.includes("CHECK constraint failed")) ||
      (error.message && error.message.includes("check constraint"))
    ) {
      if (error.message.includes("attribute")) {
        return res.status(400).json({
          error: "Недопустимый атрибут эффекта",
        });
      }

      return res.status(400).json({
        error: "Некорректные значения параметров эффекта",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при обновлении эффекта",
    });
  }
});

// PATCH /api/effects/:id - частичное обновление эффекта
app.patch("/api/effects/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Валидация ID
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      error: "Некорректный идентификатор эффекта",
    });
  }

  try {
    // Проверяем существование эффекта
    const existingEffect = await db("effects").where("id", id).first();
    if (!existingEffect) {
      return res.status(404).json({
        error: "Эффект не найден",
      });
    }

    // Удаляем запрещенные для изменения поля
    delete updateData.id;

    // Проверяем, есть ли данные для обновления
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Нет данных для обновления",
      });
    }

    // Валидация отдельных полей при их наличии
    if (updateData.name !== undefined) {
      if (
        !updateData.name ||
        typeof updateData.name !== "string" ||
        updateData.name.trim().length === 0
      ) {
        return res.status(400).json({
          error: "Название обязательно и не может быть пустым",
        });
      }

      if (updateData.name.length > 100) {
        return res.status(400).json({
          error: "Название не должно превышать 100 символов",
        });
      }
      updateData.name = updateData.name.trim();
    }

    // Валидация атрибута
    const allowedAttributes = [
      "health",
      "max_health",
      "armor",
      "strength",
      "agility",
      "intelligence",
      "physique",
      "wisdom",
      "charisma",
    ];

    if (updateData.attribute !== undefined) {
      if (
        updateData.attribute !== null &&
        !allowedAttributes.includes(updateData.attribute)
      ) {
        return res.status(400).json({
          error: `Недопустимый атрибут. Допустимые значения: ${allowedAttributes.join(", ")}`,
        });
      }
    }

    // Валидация модификатора
    if (updateData.modifier !== undefined) {
      if (
        typeof updateData.modifier !== "number" ||
        updateData.modifier < -100 ||
        updateData.modifier > 100
      ) {
        return res.status(400).json({
          error: "Модификатор должен быть числом в диапазоне от -100 до 100",
        });
      }
    }

    // Валидация длительности
    if (
      updateData.duration_turns !== undefined &&
      updateData.duration_turns !== null
    ) {
      if (
        typeof updateData.duration_turns !== "number" ||
        updateData.duration_turns <= 0
      ) {
        return res.status(400).json({
          error: "Длительность в ходах должна быть положительным числом",
        });
      }
    }

    if (
      updateData.duration_days !== undefined &&
      updateData.duration_days !== null
    ) {
      if (
        typeof updateData.duration_days !== "number" ||
        updateData.duration_days <= 0
      ) {
        return res.status(400).json({
          error: "Длительность в днях должна быть положительным числом",
        });
      }
    }

    // Валидация is_permanent
    if (
      updateData.is_permanent !== undefined &&
      typeof updateData.is_permanent !== "boolean"
    ) {
      return res.status(400).json({
        error: "Поле is_permanent должно быть булевым значением",
      });
    }

    // Проверка согласованности данных
    if (updateData.is_permanent !== undefined && updateData.is_permanent) {
      // Для постоянных эффектов длительность должна быть null
      if (
        updateData.duration_turns !== undefined &&
        updateData.duration_turns !== null
      ) {
        return res.status(400).json({
          error: "Постоянные эффекты не могут иметь длительность",
        });
      }
      if (
        updateData.duration_days !== undefined &&
        updateData.duration_days !== null
      ) {
        return res.status(400).json({
          error: "Постоянные эффекты не могут иметь длительность",
        });
      }

      // Устанавливаем длительность в null, если эффект становится постоянным
      if (
        updateData.is_permanent &&
        !updateData.duration_turns &&
        !updateData.duration_days
      ) {
        updateData.duration_turns = null;
        updateData.duration_days = null;
      }
    } else if (
      updateData.is_permanent !== undefined &&
      !updateData.is_permanent
    ) {
      // Для непостоянных эффектов должна быть указана хотя бы одна длительность
      if (
        (updateData.duration_turns === undefined ||
          updateData.duration_turns === null) &&
        (updateData.duration_days === undefined ||
          updateData.duration_days === null)
      ) {
        // Проверяем текущие значения
        if (!existingEffect.duration_turns && !existingEffect.duration_days) {
          return res.status(400).json({
            error: "Для непостоянных эффектов укажите длительность",
          });
        }
      }
    }

    // Валидация описания
    if (
      updateData.description !== undefined &&
      typeof updateData.description !== "string"
    ) {
      return res.status(400).json({
        error: "Описание должно быть строкой",
      });
    }

    // Обновляем эффект
    const updatedCount = await db("effects").where("id", id).update(updateData);

    if (updatedCount === 0) {
      return res.status(500).json({
        success: false,
        error: "Не удалось обновить эффект",
      });
    }

    // Получаем обновленный эффект
    const updatedEffect = await db("effects").where("id", id).first();

    // Отправляем уведомление через Socket.IO
    io.emit("effect:updated", updatedEffect);

    res.json({
      success: true,
      message: "Эффект успешно обновлен",
      effect: updatedEffect,
    });
  } catch (error: any) {
    console.error("Ошибка частичного обновления эффекта:", error);

    // Обработка уникального ограничения имени
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Эффект с таким названием уже существует",
      });
    }

    // Обработка проверочных ограничений
    if (
      (error.message && error.message.includes("CHECK constraint failed")) ||
      (error.message && error.message.includes("check constraint"))
    ) {
      return res.status(400).json({
        error: "Некорректные значения параметров эффекта",
      });
    }

    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера",
    });
  }
});

// DELETE /api/effects/:id - удаление эффекта
app.delete("/api/effects/:id", async (req, res) => {
  const { id } = req.params;

  // Валидация ID
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      error: "Некорректный идентификатор эффекта",
    });
  }

  try {
    // Проверяем существование эффекта
    const existingEffect = await db("effects").where("id", id).first();
    if (!existingEffect) {
      return res.status(404).json({
        error: "Эффект не найден",
      });
    }

    // Проверяем, используется ли эффект в способностях
    const abilitiesUsingEffect = await db("abilities")
      .where("effect_id", id)
      .first();

    if (abilitiesUsingEffect) {
      return res.status(409).json({
        error: `Невозможно удалить эффект, так как он используется в способности "${abilitiesUsingEffect.name}". Сначала удалите или измените связанные способности.`,
      });
    }

    // Проверяем, используется ли эффект в предметах (активный эффект)
    const itemsUsingActiveEffect = await db("items")
      .where("active_effect_id", id)
      .first();

    if (itemsUsingActiveEffect) {
      return res.status(409).json({
        error: `Невозможно удалить эффект, так как он используется в предмете "${itemsUsingActiveEffect.name}" как активный эффект. Сначала удалите или измените связанные предметы.`,
      });
    }

    // Проверяем, используется ли эффект в предметах (пассивный эффект)
    const itemsUsingPassiveEffect = await db("items")
      .where("passive_effect_id", id)
      .first();

    if (itemsUsingPassiveEffect) {
      return res.status(409).json({
        error: `Невозможно удалить эффект, так как он используется в предмете "${itemsUsingPassiveEffect.name}" как пассивный эффект. Сначала удалите или измените связанные предметы.`,
      });
    }

    // Проверяем, используется ли эффект в активных эффектах игроков
    const playerEffects = await db("player_active_effects")
      .where("effect_id", id)
      .first();

    if (playerEffects) {
      return res.status(409).json({
        error: `Невозможно удалить эффект, так как он активен у игроков. Сначала удалите эффект у всех игроков.`,
      });
    }

    // Удаляем эффект
    await db("effects").where("id", id).delete();

    console.log(`Эффект "${existingEffect.name}" (ID: ${id}) удален`);

    // Отправляем уведомление через Socket.IO
    io.emit("effect:deleted", Number(id));

    res.json({
      success: true,
      message: "Эффект успешно удален",
      deleted_id: id,
    });
  } catch (error) {
    console.error("Ошибка удаления эффекта:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера при удалении эффекта",
    });
  }
});

// API эндпоинты для способностей
app.get("/api/abilities", async (req, res) => {
  try {
    const abilities = await db("abilities").select("*");

    res.json(abilities);
  } catch (error) {
    console.error("Ошибка получения способностей:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// GET /api/abilities/:id - получение конкретной способности
app.get("/api/abilities/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const ability = await db("abilities").where("id", id).first();

    if (!ability) {
      return res.status(404).json({
        error: `Способность с ID ${id} не найдена`,
      });
    }

    res.json(ability);
  } catch (error) {
    console.error("Ошибка получения способности:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/abilities - создание новой способности
app.post("/api/abilities", async (req, res) => {
  const {
    name,
    description = "",
    ability_type = "active",
    cooldown_turns = 0,
    cooldown_days = 0,
    effect_id = null,
  } = req.body;

  // Валидация обязательных полей
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      error: "Название обязательно для создания способности",
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      error: "Название не должно превышать 100 символов",
    });
  }

  // Валидация типа способности
  if (ability_type !== "active" && ability_type !== "passive") {
    return res.status(400).json({
      error: 'Тип способности должен быть "active" или "passive"',
    });
  }

  // Валидация числовых значений
  const numericFields = { cooldown_turns, cooldown_days };

  for (const [field, value] of Object.entries(numericFields)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return res.status(400).json({
        error: `Поле "${field}" должно быть неотрицательным целым числом`,
      });
    }
  }

  // Проверка существования эффекта (если указан)
  if (effect_id !== null) {
    try {
      const effectExists = await db("effects").where("id", effect_id).first();
      if (!effectExists) {
        return res.status(404).json({
          error: `Эффект с ID ${effect_id} не найден`,
        });
      }
    } catch (error) {
      console.error("Ошибка проверки эффекта:", error);
      return res.status(500).json({
        error: "Ошибка сервера при проверке эффекта",
      });
    }
  }

  // Валидация описания
  if (description && typeof description !== "string") {
    return res.status(400).json({
      error: "Описание должно быть строкой",
    });
  }

  try {
    // Создание способности в базе данных
    const [ability] = await db("abilities")
      .insert({
        name: name.trim(),
        description: description || null,
        ability_type,
        cooldown_turns,
        cooldown_days,
        effect_id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    console.log(`Способность "${ability.name}" создана с ID: ${ability.id}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("ability:created", ability);
    }

    // Возвращаем созданную способность
    res.status(201).json({
      success: true,
      message: "Способность успешно создана",
      ability,
    });
  } catch (error: any) {
    console.error("Ошибка создания способности:", error);

    // Обработка уникального ограничения имени
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Способность с таким названием уже существует",
      });
    }

    // Обработка внешнего ключа
    if (
      (error.message &&
        error.message.includes("FOREIGN KEY constraint failed")) ||
      (error.message && error.message.includes("foreign key constraint"))
    ) {
      return res.status(404).json({
        error: "Связанный эффект не найден",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при создании способности",
    });
  }
});

// PUT /api/abilities/:id - обновление способности
app.put("/api/abilities/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description = "",
    ability_type = "active",
    cooldown_turns = 0,
    cooldown_days = 0,
    effect_id = null,
  } = req.body;

  try {
    // Проверка существования способности
    const existingAbility = await db("abilities").where("id", id).first();
    if (!existingAbility) {
      return res.status(404).json({
        error: `Способность с ID ${id} не найдена`,
      });
    }

    // Валидация обязательных полей
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          error: "Название обязательно и не может быть пустым",
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          error: "Название не должно превышать 100 символов",
        });
      }
    }

    // Валидация типа способности
    if (ability_type !== undefined) {
      if (ability_type !== "active" && ability_type !== "passive") {
        return res.status(400).json({
          error: 'Тип способности должен быть "active" или "passive"',
        });
      }
    }

    // Валидация числовых значений
    const numericFields: { cooldown_turns?: number; cooldown_days?: number } =
      {};
    if (cooldown_turns !== undefined)
      numericFields.cooldown_turns = cooldown_turns;
    if (cooldown_days !== undefined)
      numericFields.cooldown_days = cooldown_days;

    for (const [field, value] of Object.entries(numericFields)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        return res.status(400).json({
          error: `Поле "${field}" должно быть неотрицательным целым числом`,
        });
      }
    }

    // Проверка существования эффекта (если указан)
    if (effect_id !== undefined && effect_id !== null) {
      try {
        const effectExists = await db("effects").where("id", effect_id).first();
        if (!effectExists) {
          return res.status(404).json({
            error: `Эффект с ID ${effect_id} не найден`,
          });
        }
      } catch (error) {
        console.error("Ошибка проверки эффекта:", error);
        return res.status(500).json({
          error: "Ошибка сервера при проверке эффекта",
        });
      }
    }

    // Валидация описания
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        error: "Описание должно быть строкой",
      });
    }

    // Подготовка данных для обновления
    const updateData: {
      updated_at: any;
      name?: string;
      description?: string | null;
      ability_type?: "active" | "passive";
      cooldown_turns?: number;
      cooldown_days?: number;
      effect_id?: number | null;
    } = {
      updated_at: db.fn.now(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (ability_type !== undefined) updateData.ability_type = ability_type;
    if (cooldown_turns !== undefined)
      updateData.cooldown_turns = cooldown_turns;
    if (cooldown_days !== undefined) updateData.cooldown_days = cooldown_days;
    if (effect_id !== undefined) updateData.effect_id = effect_id;

    // Обновление способности
    const [updatedAbility] = await db("abilities")
      .where("id", id)
      .update(updateData)
      .returning("*");

    console.log(`Способность "${updatedAbility.name}" (ID: ${id}) обновлена`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("ability:updated", updatedAbility);
    }

    // Возвращаем обновленную способность
    res.json({
      success: true,
      message: "Способность успешно обновлена",
      ability: updatedAbility,
    });
  } catch (error) {
    console.error("Ошибка обновления способности:", error);

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при обновлении способности",
    });
  }
});

// DELETE /api/abilities/:id - удаление способности
app.delete("/api/abilities/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Проверка существования способности
    const existingAbility = await db("abilities").where("id", id).first();
    if (!existingAbility) {
      return res.status(404).json({
        error: `Способность с ID ${id} не найдена`,
      });
    }

    // Проверка, используется ли способность игроками
    const playersWithAbility = await db("player_abilities")
      .where("ability_id", id)
      .first();

    if (playersWithAbility) {
      return res.status(409).json({
        error: `Невозможно удалить способность, так как она назначена игрокам "${playersWithAbility.player_id}". Сначала удалите её у всех игроков.`,
      });
    }

    // Удаление способности
    await db("abilities").where("id", id).delete();

    console.log(`Способность "${existingAbility.name}" (ID: ${id}) удалена`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("ability:deleted", { id });
    }

    // Возвращаем успешный ответ
    res.json({
      success: true,
      message: "Способность успешно удалена",
    });
  } catch (error) {
    console.error("Ошибка удаления способности:", error);

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при удалении способности",
    });
  }
});

// GET /api/player-abilities - получение всех связей игроков и способностей
app.get("/api/player-abilities", async (req, res) => {
  try {
    const {
      player_id,
      ability_id,
      is_active,
      with_details = "false",
    } = req.query;

    let query = db("player_abilities").select("*");

    // Фильтрация
    if (player_id) {
      query = query.where("player_id", Number(player_id));
    }

    if (ability_id) {
      query = query.where("ability_id", Number(ability_id));
    }

    if (is_active !== undefined) {
      query = query.where("is_active", is_active === "true");
    }

    const playerAbilities = await query.orderBy("obtained_at", "desc");

    // Если нужно получить детали игроков и способностей
    if (with_details === "true") {
      for (const pa of playerAbilities) {
        pa.player = await db("players").where("id", pa.player_id).first();
        pa.ability = await db("abilities").where("id", pa.ability_id).first();
      }
    }

    res.json({
      success: true,
      data: playerAbilities,
      count: playerAbilities.length,
    });
  } catch (error) {
    console.error("Ошибка получения связей игроков и способностей:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера при получении связей",
    });
  }
});

// POST /api/player-abilities - привязка способности к игроку
app.post("/api/player-abilities", async (req, res) => {
  const { player_id, ability_id, is_active = true } = req.body;

  let is_passive: Boolean;
  let effect_id: string;

  // Валидация обязательных полей
  if (!player_id || typeof player_id !== "number" || player_id <= 0) {
    return res.status(400).json({
      error: "player_id должен быть положительным числом",
    });
  }

  if (!ability_id || typeof ability_id !== "number" || ability_id <= 0) {
    return res.status(400).json({
      error: "ability_id должен быть положительным числом",
    });
  }

  // Проверка существования игрока
  try {
    const playerExists = await db("players").where("id", player_id).first();
    if (!playerExists) {
      return res.status(404).json({
        error: `Игрок с ID ${player_id} не найден`,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки игрока:", error);
    return res.status(500).json({
      error: "Ошибка сервера при проверке игрока",
    });
  }

  // Проверка существования способности
  try {
    const abilityExists = await db("abilities").where("id", ability_id).first();
    if (!abilityExists) {
      return res.status(404).json({
        error: `Способность с ID ${ability_id} не найден`,
      });
    } else {
      // Проверка существования пассивного эффекта у способности
      const effectExists = await db("effects")
        .where("id", abilityExists.effect_id)
        .first();
      if (!effectExists) {
        return res.status(404).json({
          error: `Эффект с ID ${ability_id} не найден`,
        });
      }
      effect_id = abilityExists.effect_id;
      is_passive = abilityExists.ability_type == "passive" ? true : false;
    }
  } catch (error) {
    console.error("Ошибка проверки способности:", error);
    return res.status(500).json({
      error: "Ошибка сервера при проверке способности",
    });
  }

  // Проверка, не привязана ли уже эта способность к игроку
  try {
    const existingLink = await db("player_abilities")
      .where({ player_id, ability_id })
      .first();

    if (existingLink) {
      // Обновляем существующую запись
      const [updatedLink] = await db("player_abilities")
        .where({ player_id, ability_id })
        .update({
          is_active,
          obtained_at: db.fn.now(),
        })
        .returning("*");

      console.log(
        `Связь игрока ${player_id} и способности ${ability_id} обновлена`,
      );

      if (io) {
        io.emit("player_ability:updated", updatedLink);
      }

      return res.json({
        success: true,
        message: "Связь игрока и способности обновлена",
        player_ability: updatedLink,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки существующей связи:", error);
  }

  // Валидация is_active
  if (typeof is_active !== "boolean") {
    return res.status(400).json({
      error: "Поле is_active должно быть булевым значением",
    });
  }

  try {
    // Создание связи в базе данных
    const [playerAbility] = await db("player_abilities")
      .insert({
        player_id,
        ability_id,
        is_active,
        obtained_at: db.fn.now(),
      })
      .returning("*");

    console.log(`Способность ${ability_id} привязана к игроку ${player_id}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_ability:created", playerAbility);
    }

    if (is_passive) {
      const [playerEffect] = await db("player_active_effects")
        .insert({
          player_id,
          effect_id,
          source_type: "ability",
          source_id: ability_id,
          remaining_turns: null,
          remaining_days: null,
          applied_at: db.fn.now(),
        })
        .returning("*");

      console.log(
        `Пассивный эффект ${effect_id} привязан к игроку ${player_id}`,
      );

      // Отправляем уведомление через Socket.IO
      if (io) {
        io.emit("player_effect:created", playerEffect);
      }
    }

    // Возвращаем созданную связь
    res.status(201).json({
      success: true,
      message: "Способность успешно привязана к игроку",
      player_ability: playerAbility,
    });
  } catch (error: any) {
    console.error("Ошибка создания связи игрока и способности:", error);

    // Обработка ограничения первичного ключа
    if (
      (error.message &&
        error.message.includes("PRIMARY KEY constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Эта способность уже привязана к игроку",
      });
    }

    // Обработка внешних ключей
    if (
      (error.message &&
        error.message.includes("FOREIGN KEY constraint failed")) ||
      (error.message && error.message.includes("foreign key constraint"))
    ) {
      return res.status(404).json({
        error: "Игрок или способность не найдены",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при создании связи",
    });
  }
});

// API эндпоинты для предметов
app.get("/api/items", async (req, res) => {
  try {
    const items = await db("items").select("*");

    res.json(items);
  } catch (error) {
    console.error("Ошибка получения предметов:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/items - создание нового предмета
app.post("/api/items", async (req, res) => {
  const {
    name,
    description = "",
    rarity = "common",
    base_quantity = 1,
    active_effect_id = null,
    passive_effect_id = null,
  } = req.body;

  // Валидация обязательных полей
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      error: "Название обязательно для создания предмета",
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      error: "Название не должно превышать 100 символов",
    });
  }

  // Валидация редкости
  const allowedRarities = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "mythical",
    "story",
  ];
  if (!allowedRarities.includes(rarity)) {
    return res.status(400).json({
      error: `Недопустимая редкость. Допустимые значения: ${allowedRarities.join(", ")}`,
    });
  }

  // Валидация числовых значений
  if (
    typeof base_quantity !== "number" ||
    !Number.isInteger(base_quantity) ||
    base_quantity < 1
  ) {
    return res.status(400).json({
      error: "Базовое количество должно быть положительным целым числом",
    });
  }

  // Проверка существования эффектов (если указаны)
  const checkEffect = async (effectId: number | null, fieldName: string) => {
    if (effectId !== null) {
      try {
        const effectExists = await db("effects").where("id", effectId).first();
        if (!effectExists) {
          return `Эффект с ID ${effectId} не найден`;
        }
      } catch (error) {
        console.error(`Ошибка проверки эффекта (${fieldName}):`, error);
        return "Ошибка сервера при проверке эффекта";
      }
    }
    return null;
  };

  const activeEffectError = await checkEffect(
    active_effect_id,
    "active_effect_id",
  );
  if (activeEffectError) {
    return res.status(404).json({ error: activeEffectError });
  }

  const passiveEffectError = await checkEffect(
    passive_effect_id,
    "passive_effect_id",
  );
  if (passiveEffectError) {
    return res.status(404).json({ error: passiveEffectError });
  }

  // Валидация описания
  if (description && typeof description !== "string") {
    return res.status(400).json({
      error: "Описание должно быть строкой",
    });
  }

  try {
    // Создание предмета в базе данных
    const [item] = await db("items")
      .insert({
        name: name.trim(),
        description: description || null,
        rarity,
        base_quantity,
        active_effect_id,
        passive_effect_id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    console.log(`Предмет "${item.name}" создан с ID: ${item.id}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("item:created", item);
    }

    // Возвращаем созданный предмет
    res.status(201).json({
      success: true,
      message: "Предмет успешно создан",
      item,
    });
  } catch (error: any) {
    console.error("Ошибка создания предмета:", error);

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при создании предмета",
    });
  }
});

// GET /api/items/:id - получение конкретного предмета
app.get("/api/items/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const item = await db("items").where("id", id).first();

    if (!item) {
      return res.status(404).json({
        error: `Предмет с ID ${id} не найден`,
      });
    }

    res.json(item);
  } catch (error) {
    console.error("Ошибка получения предмета:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PUT /api/items/:id - обновление предмета
app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description = "",
    rarity = "common",
    base_quantity = 1,
    active_effect_id = null,
    passive_effect_id = null,
  } = req.body;

  try {
    // Проверка существования предмета
    const existingItem = await db("items").where("id", id).first();
    if (!existingItem) {
      return res.status(404).json({
        error: `Предмет с ID ${id} не найден`,
      });
    }

    // Валидация обязательных полей
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          error: "Название обязательно и не может быть пустым",
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          error: "Название не должно превышать 100 символов",
        });
      }
    }

    // Валидация редкости
    const allowedRarities = [
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
      "mythical",
      "story",
    ];
    if (rarity !== undefined && !allowedRarities.includes(rarity)) {
      return res.status(400).json({
        error: `Недопустимая редкость. Допустимые значения: ${allowedRarities.join(", ")}`,
      });
    }

    // Валидация числовых значений
    if (base_quantity !== undefined) {
      if (
        typeof base_quantity !== "number" ||
        !Number.isInteger(base_quantity) ||
        base_quantity < 1
      ) {
        return res.status(400).json({
          error: "Базовое количество должно быть положительным целым числом",
        });
      }

      if (base_quantity > 999) {
        return res.status(400).json({
          error: "Базовое количество не должно превышать 999",
        });
      }
    }

    // Проверка существования эффектов (если указаны)
    const checkEffect = async (effectId: number | null, fieldName: string) => {
      if (effectId !== null && effectId !== undefined) {
        try {
          const effectExists = await db("effects")
            .where("id", effectId)
            .first();
          if (!effectExists) {
            return `Эффект с ID ${effectId} не найден`;
          }
        } catch (error) {
          console.error(`Ошибка проверки эффекта (${fieldName}):`, error);
          return "Ошибка сервера при проверке эффекта";
        }
      }
      return null;
    };

    if (active_effect_id !== undefined) {
      const activeEffectError = await checkEffect(
        active_effect_id,
        "active_effect_id",
      );
      if (activeEffectError) {
        return res.status(404).json({ error: activeEffectError });
      }
    }

    if (passive_effect_id !== undefined) {
      const passiveEffectError = await checkEffect(
        passive_effect_id,
        "passive_effect_id",
      );
      if (passiveEffectError) {
        return res.status(404).json({ error: passiveEffectError });
      }
    }

    // Проверка уникальности эффектов
    if (
      active_effect_id !== undefined &&
      passive_effect_id !== undefined &&
      active_effect_id !== null &&
      passive_effect_id !== null &&
      active_effect_id === passive_effect_id
    ) {
      return res.status(400).json({
        error: "Активный и пассивный эффекты не могут быть одинаковыми",
      });
    }

    // Валидация описания
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        error: "Описание должно быть строкой",
      });
    }

    // Подготовка данных для обновления
    const updateData: {
      updated_at: any;
      name?: string;
      description?: string | null;
      rarity?: string;
      base_quantity?: number;
      active_effect_id?: number | null;
      passive_effect_id?: number | null;
    } = {
      updated_at: db.fn.now(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (rarity !== undefined) updateData.rarity = rarity;
    if (base_quantity !== undefined) updateData.base_quantity = base_quantity;
    if (active_effect_id !== undefined)
      updateData.active_effect_id = active_effect_id;
    if (passive_effect_id !== undefined)
      updateData.passive_effect_id = passive_effect_id;

    // Обновление предмета
    const [updatedItem] = await db("items")
      .where("id", id)
      .update(updateData)
      .returning("*");

    console.log(`Предмет "${updatedItem.name}" (ID: ${id}) обновлен`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("item:updated", updatedItem);
    }

    // Возвращаем обновленный предмет
    res.json({
      success: true,
      message: "Предмет успешно обновлен",
      item: updatedItem,
    });
  } catch (error: any) {
    console.error("Ошибка обновления предмета:", error);

    // Обработка уникального ограничения имени
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Предмет с таким названием уже существует",
      });
    }

    // Обработка внешнего ключа
    if (
      (error.message &&
        error.message.includes("FOREIGN KEY constraint failed")) ||
      (error.message && error.message.includes("foreign key constraint"))
    ) {
      return res.status(404).json({
        error: "Связанный эффект не найден",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при обновлении предмета",
    });
  }
});

// DELETE /api/items/:id - удаление предмета
app.delete("/api/items/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Проверка существования предмета
    const existingItem = await db("items").where("id", id).first();
    if (!existingItem) {
      return res.status(404).json({
        error: `Предмет с ID ${id} не найден`,
      });
    }

    // Проверка, используется ли предмет игроками
    const playersWithItem = await db("player_items")
      .where("item_id", id)
      .first();

    if (playersWithItem) {
      return res.status(409).json({
        error: `Невозможно удалить предмет, так как он назначен игрокам. Сначала удалите его у всех игроков.`,
      });
    }

    // Удаление предмета
    await db("items").where("id", id).delete();

    console.log(`Предмет "${existingItem.name}" (ID: ${id}) удален`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("item:deleted", { id: Number(id) });
    }

    // Возвращаем успешный ответ
    res.json({
      success: true,
      message: "Предмет успешно удален",
    });
  } catch (error) {
    console.error("Ошибка удаления предмета:", error);

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при удалении предмета",
    });
  }
});

// PATCH /api/items/:id - частичное обновление предмета
app.patch("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Проверка существования предмета
    const existingItem = await db("items").where("id", id).first();
    if (!existingItem) {
      return res.status(404).json({
        error: `Предмет с ID ${id} не найден`,
      });
    }

    // Удаляем запрещенные для изменения поля
    delete updateData.id;
    delete updateData.created_at;

    // Проверяем, есть ли данные для обновления
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Нет данных для обновления",
      });
    }

    // Валидация отдельных полей при их наличии
    if (updateData.name !== undefined) {
      if (
        typeof updateData.name !== "string" ||
        updateData.name.trim().length === 0
      ) {
        return res.status(400).json({
          error: "Название обязательно и не может быть пустым",
        });
      }

      if (updateData.name.length > 100) {
        return res.status(400).json({
          error: "Название не должно превышать 100 символов",
        });
      }
      updateData.name = updateData.name.trim();
    }

    if (updateData.rarity !== undefined) {
      const allowedRarities = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
        "mythical",
        "story",
      ];
      if (!allowedRarities.includes(updateData.rarity)) {
        return res.status(400).json({
          error: `Недопустимая редкость. Допустимые значения: ${allowedRarities.join(", ")}`,
        });
      }
    }

    if (updateData.base_quantity !== undefined) {
      if (
        typeof updateData.base_quantity !== "number" ||
        !Number.isInteger(updateData.base_quantity) ||
        updateData.base_quantity < 1
      ) {
        return res.status(400).json({
          error: "Базовое количество должно быть положительным целым числом",
        });
      }

      if (updateData.base_quantity > 999) {
        return res.status(400).json({
          error: "Базовое количество не должно превышать 999",
        });
      }
    }

    if (
      updateData.description !== undefined &&
      typeof updateData.description !== "string"
    ) {
      return res.status(400).json({
        error: "Описание должно быть строкой",
      });
    }

    // Проверка существования эффектов
    if (
      updateData.active_effect_id !== undefined ||
      updateData.passive_effect_id !== undefined
    ) {
      const checkEffect = async (
        effectId: number | null,
        fieldName: string,
      ) => {
        if (effectId !== null && effectId !== undefined) {
          try {
            const effectExists = await db("effects")
              .where("id", effectId)
              .first();
            if (!effectExists) {
              return `Эффект с ID ${effectId} не найден`;
            }
          } catch (error) {
            console.error(`Ошибка проверки эффекта (${fieldName}):`, error);
            return "Ошибка сервера при проверке эффекта";
          }
        }
        return null;
      };

      if (updateData.active_effect_id !== undefined) {
        const activeEffectError = await checkEffect(
          updateData.active_effect_id,
          "active_effect_id",
        );
        if (activeEffectError) {
          return res.status(404).json({ error: activeEffectError });
        }
      }

      if (updateData.passive_effect_id !== undefined) {
        const passiveEffectError = await checkEffect(
          updateData.passive_effect_id,
          "passive_effect_id",
        );
        if (passiveEffectError) {
          return res.status(404).json({ error: passiveEffectError });
        }
      }

      // Проверка уникальности эффектов
      if (
        updateData.active_effect_id !== undefined &&
        updateData.passive_effect_id !== undefined &&
        updateData.active_effect_id !== null &&
        updateData.passive_effect_id !== null &&
        updateData.active_effect_id === updateData.passive_effect_id
      ) {
        return res.status(400).json({
          error: "Активный и пассивный эффекты не могут быть одинаковыми",
        });
      }
    }

    // Добавляем timestamp обновления
    updateData.updated_at = db.fn.now();

    // Обновляем предмет
    const updatedCount = await db("items").where("id", id).update(updateData);

    if (updatedCount === 0) {
      return res.status(500).json({
        success: false,
        error: "Не удалось обновить предмет",
      });
    }

    // Получаем обновленный предмет
    const updatedItem = await db("items").where("id", id).first();

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("item:updated", updatedItem);
    }

    res.json({
      success: true,
      message: "Предмет успешно обновлен",
      item: updatedItem,
    });
  } catch (error: any) {
    console.error("Ошибка частичного обновления предмета:", error);

    // Обработка уникального ограничения имени
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      return res.status(409).json({
        error: "Предмет с таким названием уже существует",
      });
    }

    // Обработка внешнего ключа
    if (
      (error.message &&
        error.message.includes("FOREIGN KEY constraint failed")) ||
      (error.message && error.message.includes("foreign key constraint"))
    ) {
      return res.status(404).json({
        error: "Связанный эффект не найден",
      });
    }

    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера",
    });
  }
});

// GET /api/player-items - получение всех связей игроков и предметов
app.get("/api/player-items", async (req, res) => {
  try {
    const {
      player_id,
      item_id,
      is_equipped,
      with_details = "false",
    } = req.query;

    let query = db("player_items").select("*");

    // Фильтрация
    if (player_id) {
      query = query.where("player_id", Number(player_id));
    }

    if (item_id) {
      query = query.where("item_id", Number(item_id));
    }

    if (is_equipped !== undefined) {
      query = query.where("is_equipped", is_equipped === "true");
    }

    const playerItems = await query.orderBy("obtained_at", "desc");

    // Если нужно получить детали
    if (with_details === "true") {
      for (const pi of playerItems) {
        pi.player = await db("players").where("id", pi.player_id).first();
        pi.item = await db("items").where("id", pi.item_id).first();
      }
    }

    res.json({
      success: true,
      data: playerItems,
      count: playerItems.length,
    });
  } catch (error) {
    console.error("Ошибка получения инвентаря игроков:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера при получении инвентаря",
    });
  }
});

// POST /api/player-items - добавление предмета игроку
app.post("/api/player-items", async (req, res) => {
  const { player_id, item_id, quantity = 1, is_equipped = false } = req.body;

  // Валидация обязательных полей
  if (!player_id || typeof player_id !== "number" || player_id <= 0) {
    return res.status(400).json({
      error: "player_id должен быть положительным числом",
    });
  }

  if (!item_id || typeof item_id !== "number" || item_id <= 0) {
    return res.status(400).json({
      error: "item_id должен быть положительным числом",
    });
  }

  // Проверка существования игрока
  try {
    const playerExists = await db("players").where("id", player_id).first();
    if (!playerExists) {
      return res.status(404).json({
        error: `Игрок с ID ${player_id} не найден`,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки игрока:", error);
    return res.status(500).json({
      error: "Ошибка сервера при проверке игрока",
    });
  }

  // Проверка существования предмета
  try {
    const itemExists = await db("items").where("id", item_id).first();
    if (!itemExists) {
      return res.status(404).json({
        error: `Предмет с ID ${item_id} не найден`,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки предмета:", error);
    return res.status(500).json({
      error: "Ошибка сервера при проверке предмета",
    });
  }

  // Валидация числовых значений
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return res.status(400).json({
      error: "Количество должно быть положительным целым числом",
    });
  }

  // Валидация is_equipped
  if (typeof is_equipped !== "boolean") {
    return res.status(400).json({
      error: "Поле is_equipped должно быть булевым значением",
    });
  }

  // Проверяем, есть ли уже такой предмет у игрока
  try {
    const existingItem = await db("player_items")
      .where({ player_id, item_id })
      .first();

    if (existingItem) {
      // Обновляем количество существующего предмета
      const newQuantity = existingItem.quantity + quantity;
      const [updatedItem] = await db("player_items")
        .where("id", existingItem.id)
        .update({
          quantity: newQuantity,
          is_equipped: is_equipped || existingItem.is_equipped,
        })
        .returning("*");

      console.log(
        `Количество предмета ${item_id} у игрока ${player_id} обновлено до ${newQuantity}`,
      );

      if (io) {
        io.emit("player_item:updated", updatedItem);
      }

      return res.json({
        success: true,
        message: "Количество предмета обновлено",
        player_item: updatedItem,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки существующего предмета:", error);
  }

  try {
    // Создание записи в базе данных
    const [playerItem] = await db("player_items")
      .insert({
        player_id,
        item_id,
        quantity,
        is_equipped,
        obtained_at: db.fn.now(),
      })
      .returning("*");

    console.log(
      `Предмет ${item_id} добавлен игроку ${player_id} в количестве ${quantity}`,
    );

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_item:created", playerItem);
    }

    // Возвращаем созданную запись
    res.status(201).json({
      success: true,
      message: "Предмет успешно добавлен игроку",
      player_item: playerItem,
    });
  } catch (error: any) {
    console.error("Ошибка добавления предмета игроку:", error);

    // Обработка ограничения уникальности
    if (
      (error.message && error.message.includes("UNIQUE constraint failed")) ||
      error.code === "SQLITE_CONSTRAINT" ||
      (error.message &&
        error.message.includes(
          "duplicate key value violates unique constraint",
        ))
    ) {
      // Эта ошибка не должна возникать, так как мы проверяли существование
      return res.status(409).json({
        error: "Этот предмет уже есть у игрока",
      });
    }

    // Обработка внешних ключей
    if (
      (error.message &&
        error.message.includes("FOREIGN KEY constraint failed")) ||
      (error.message && error.message.includes("foreign key constraint"))
    ) {
      return res.status(404).json({
        error: "Игрок или предмет не найдены",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при добавлении предмета",
    });
  }
});

// GET /api/player-active-effects - получение активных эффектов игроков
app.get("/api/player-active-effects", async (req, res) => {
  try {
    const {
      player_id,
      effect_id,
      source_type,
      with_details = "false",
    } = req.query;

    let query = db("player_active_effects").select("*");

    // Фильтрация
    if (player_id) {
      query = query.where("player_id", Number(player_id));
    }

    if (effect_id) {
      query = query.where("effect_id", Number(effect_id));
    }

    if (
      source_type &&
      ["ability", "item", "admin"].includes(source_type as string)
    ) {
      query = query.where("source_type", source_type);
    }

    const playerEffects = await query.orderBy("applied_at", "desc");

    // Если нужно получить детали
    if (with_details === "true") {
      for (const pe of playerEffects) {
        pe.player = await db("players").where("id", pe.player_id).first();
        pe.effect = await db("effects").where("id", pe.effect_id).first();
      }
    }

    res.json({
      success: true,
      data: playerEffects,
      count: playerEffects.length,
    });
  } catch (error) {
    console.error("Ошибка получения активных эффектов:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера при получении активных эффектов",
    });
  }
});

// POST /api/player-active-effects - применение эффекта к игроку
app.post("/api/player-active-effects", async (req, res) => {
  const {
    player_id,
    effect_id,
    source_type = "admin",
    source_id = null,
    remaining_turns = null,
    remaining_days = null,
  } = req.body;

  // Валидация обязательных полей
  if (!player_id || typeof player_id !== "number" || player_id <= 0) {
    return res.status(400).json({
      error: "player_id должен быть положительным числом",
    });
  }

  if (!effect_id || typeof effect_id !== "number" || effect_id <= 0) {
    return res.status(400).json({
      error: "effect_id должен быть положительным числом",
    });
  }

  // Проверка существования игрока
  try {
    const playerExists = await db("players").where("id", player_id).first();
    if (!playerExists) {
      return res.status(404).json({
        error: `Игрок с ID ${player_id} не найден`,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки игрока:", error);
    return res.status(500).json({
      error: "Ошибка сервера при проверке игрока",
    });
  }

  // Проверка существования эффекта
  try {
    const effectExists = await db("effects").where("id", effect_id).first();
    if (!effectExists) {
      return res.status(404).json({
        error: `Эффект с ID ${effect_id} не найден`,
      });
    }
  } catch (error) {
    console.error("Ошибка проверки эффекта:", error);
    return res.status(500).json({
      error: "Ошибка сервера при проверке эффекта",
    });
  }

  // Валидация source_type
  const allowedSourceTypes = ["ability", "item", "admin"];
  if (!allowedSourceTypes.includes(source_type)) {
    return res.status(400).json({
      error: `Недопустимый источник. Допустимые значения: ${allowedSourceTypes.join(", ")}`,
    });
  }

  // Валидация source_id
  if (source_id !== null && (typeof source_id !== "number" || source_id <= 0)) {
    return res.status(400).json({
      error: "source_id должен быть положительным числом",
    });
  }

  // Валидация длительности
  const numericFields = { remaining_turns, remaining_days };

  for (const [field, value] of Object.entries(numericFields)) {
    if (
      value !== null &&
      (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    ) {
      return res.status(400).json({
        error: `Поле "${field}" должно быть неотрицательным целым числом или null`,
      });
    }
  }

  // Проверка, что хотя бы одна длительность указана (если эффект не постоянный)
  if (remaining_turns === null && remaining_days === null) {
    // Проверяем, является ли эффект постоянным
    const effect = await db("effects").where("id", effect_id).first();
    if (effect && !effect.is_permanent) {
      return res.status(400).json({
        error:
          "Для непостоянных эффектов укажите remaining_turns или remaining_days",
      });
    }
  }

  try {
    // Применение эффекта к игроку
    const [playerEffect] = await db("player_active_effects")
      .insert({
        player_id,
        effect_id,
        source_type,
        source_id,
        remaining_turns,
        remaining_days,
        applied_at: db.fn.now(),
      })
      .returning("*");

    console.log(`Эффект ${effect_id} применен к игроку ${player_id}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_effect:created", playerEffect);
    }

    // Возвращаем созданную запись
    res.status(201).json({
      success: true,
      message: "Эффект успешно применен к игроку",
      player_effect: playerEffect,
    });
  } catch (error: any) {
    console.error("Ошибка применения эффекта к игроку:", error);

    // Обработка внешних ключей
    if (
      (error.message &&
        error.message.includes("FOREIGN KEY constraint failed")) ||
      (error.message && error.message.includes("foreign key constraint"))
    ) {
      return res.status(404).json({
        error: "Игрок или эффект не найдены",
      });
    }

    // Общая ошибка сервера
    res.status(500).json({
      error: "Внутренняя ошибка сервера при применении эффекта",
    });
  }
});

// POST /api/players/:playerId/items/batch - массовое добавление предметов
app.post("/api/players/:playerId/items/batch", async (req, res) => {
  const { playerId } = req.params;
  const { items } = req.body; // items = [{ item_id: number, quantity: number }]

  if (!playerId) {
    return res.status(400).json({ error: "Неверный ID игрока" });
  }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items должен быть массивом" });
  }

  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    const results = [];

    for (const itemData of items) {
      const { item_id, quantity = 1 } = itemData;

      // Проверка существования предмета
      const item = await db("items").where("id", item_id).first();
      if (!item) {
        results.push({ item_id, error: "Предмет не найден" });
        continue;
      }

      // Проверяем, есть ли уже такой предмет у игрока
      const existingItem = await db("player_items")
        .where({ player_id: playerId, item_id })
        .first();

      if (existingItem) {
        // Обновляем количество
        const newQuantity = existingItem.quantity + quantity;
        const [updatedItem] = await db("player_items")
          .where("id", existingItem.id)
          .update({ quantity: newQuantity })
          .returning("*");

        results.push({
          item_id,
          success: true,
          message: "Количество обновлено",
          data: updatedItem,
        });

        if (io) {
          io.emit("player_item:updated", updatedItem);
        }
      } else {
        // Создаем новую запись
        const [newItem] = await db("player_items")
          .insert({
            player_id: playerId,
            item_id,
            quantity,
            is_equipped: false,
            obtained_at: db.fn.now(),
          })
          .returning("*");

        results.push({
          item_id,
          success: true,
          message: "Предмет добавлен",
          data: newItem,
        });

        if (io) {
          io.emit("player_item:created", newItem);
        }
      }
    }

    // Обновляем данные игрока через сокет
    if (io) {
      const fullPlayer = await getFullPlayerData(playerId);
      io.emit("player:updated", fullPlayer);
    }

    res.json({
      success: true,
      message: "Операция завершена",
      results,
    });
  } catch (error) {
    console.error("Ошибка массового добавления предметов:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/players/:playerId/abilities/batch - массовое добавление способностей
app.post("/api/players/:playerId/abilities/batch", async (req, res) => {
  const { playerId } = req.params;
  const { ability_ids } = req.body; // ability_ids = [number]

  // Валидация ID игрока
  const player_id = parseInt(playerId);
  if (!playerId || !player_id || player_id <= 0) {
    return res.status(400).json({
      error: "playerId должен быть положительным числом",
    });
  }

  // Валидация массива способностей
  if (!Array.isArray(ability_ids)) {
    return res.status(400).json({
      error: "ability_ids должен быть массивом чисел",
    });
  }

  if (ability_ids.length === 0) {
    return res.status(400).json({
      error: "Массив ability_ids не должен быть пустым",
    });
  }

  // Проверка валидности каждого ID в массиве
  for (const ability_id of ability_ids) {
    if (typeof ability_id !== "number" || ability_id <= 0) {
      return res.status(400).json({
        error: `ability_id ${ability_id} должен быть положительным числом`,
      });
    }
  }

  try {
    // Проверка существования игрока
    const playerExists = await db("players").where("id", player_id).first();
    if (!playerExists) {
      return res.status(404).json({
        error: `Игрок с ID ${player_id} не найден`,
      });
    }

    const results = [];

    // Обработка каждой способности в массиве
    for (const ability_id of ability_ids) {
      try {
        // Проверка существования способности и её эффекта
        const ability = await db("abilities").where("id", ability_id).first();

        if (!ability) {
          results.push({
            ability_id,
            success: false,
            error: `Способность с ID ${ability_id} не найдена`,
          });
          continue;
        }

        // Проверка существования эффекта для способности
        const effectExists = await db("effects")
          .where("id", ability.effect_id)
          .first();

        if (!effectExists) {
          results.push({
            ability_id,
            success: false,
            error: `Эффект с ID ${ability.effect_id} для способности ${ability_id} не найден`,
          });
          continue;
        }

        const is_passive = ability.ability_type === "passive";

        // Проверка, не привязана ли уже эта способность к игроку
        const existingLink = await db("player_abilities")
          .where({ player_id, ability_id })
          .first();

        if (existingLink) {
          // Обновляем существующую запись
          const [updatedLink] = await db("player_abilities")
            .where({ player_id, ability_id })
            .update({
              is_active: true,
              obtained_at: db.fn.now(),
            })
            .returning("*");

          console.log(
            `Связь игрока ${player_id} и способности ${ability_id} обновлена`,
          );

          // Отправка события обновления
          if (io) {
            io.emit("player_ability:updated", updatedLink);
          }

          results.push({
            ability_id,
            success: true,
            message: "Связь игрока и способности обновлена",
            action: "updated",
            player_ability: updatedLink,
          });
          continue;
        }

        // Создание новой связи в базе данных
        const [playerAbility] = await db("player_abilities")
          .insert({
            player_id,
            ability_id,
            is_active: true,
            obtained_at: db.fn.now(),
          })
          .returning("*");

        console.log(
          `Способность ${ability_id} привязана к игроку ${player_id}`,
        );

        // Отправляем уведомление через Socket.IO
        if (io) {
          io.emit("player_ability:created", playerAbility);
        }

        // Если способность пассивная, создаем соответствующий эффект
        if (is_passive) {
          const [playerEffect] = await db("player_active_effects")
            .insert({
              player_id,
              effect_id: ability.effect_id,
              source_type: "ability",
              source_id: ability_id,
              remaining_turns: null,
              remaining_days: null,
              applied_at: db.fn.now(),
            })
            .returning("*");

          console.log(
            `Пассивный эффект ${ability.effect_id} привязан к игроку ${player_id}`,
          );

          // Отправляем уведомление через Socket.IO
          if (io) {
            io.emit("player_effect:created", playerEffect);
          }
        }

        results.push({
          ability_id,
          success: true,
          message: "Способность успешно привязана к игроку",
          action: "created",
          player_ability: playerAbility,
        });
      } catch (error) {
        console.error(`Ошибка обработки способности ${ability_id}:`, error);

        let errorMessage = "Внутренняя ошибка сервера";

        results.push({
          ability_id,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Обновляем данные игрока через сокет
    if (io) {
      try {
        const fullPlayer = await getFullPlayerData(player_id.toString());
        io.emit("player:updated", fullPlayer);
      } catch (error) {
        console.error("Ошибка получения полных данных игрока:", error);
      }
    }

    // Статистика обработки
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Обработка завершена. Успешно: ${successful}, с ошибками: ${failed}`,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error("Общая ошибка массового добавления способностей:", error);

    res.status(500).json({
      error: "Внутренняя ошибка сервера при массовом добавлении способностей",
    });
  }
});

// POST /api/players/:playerId/effects/batch - массовое добавление эффектов
app.post("/api/players/:playerId/effects/batch", async (req, res) => {
  const { playerId } = req.params;
  const { effect_ids } = req.body; // effect_ids = [number]

  if (!playerId) {
    return res.status(400).json({ error: "Неверный ID игрока" });
  }

  if (!Array.isArray(effect_ids)) {
    return res.status(400).json({ error: "effect_ids должен быть массивом" });
  }

  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    const results = [];

    for (const effect_id of effect_ids) {
      // Проверка существования эффекта
      const effect = await db("effects").where("id", effect_id).first();
      if (!effect) {
        results.push({ effect_id, error: "Эффект не найден" });
        continue;
      }

      // Проверяем, есть ли уже такой эффект у игрока
      const existingEffect = await db("player_active_effects")
        .where({ player_id: playerId, effect_id })
        .first();

      if (existingEffect) {
        results.push({
          effect_id,
          success: true,
          message: "Эффект уже есть у игрока",
        });
        continue;
      }

      // Определяем длительность
      const remaining_turns = effect.duration_turns;
      const remaining_days = effect.duration_days;

      // Создаем новую запись
      const [newEffect] = await db("player_active_effects")
        .insert({
          player_id: playerId,
          effect_id,
          source_type: "admin",
          source_id: null,
          remaining_turns,
          remaining_days,
          applied_at: db.fn.now(),
        })
        .returning("*");

      results.push({
        effect_id,
        success: true,
        message: "Эффект добавлен",
        data: newEffect,
      });

      if (io) {
        io.emit("player_effect:created", newEffect);
      }
    }

    // Обновляем данные игрока через сокет
    if (io) {
      const fullPlayer = await getFullPlayerData(playerId);
      io.emit("player:updated", fullPlayer);
    }

    res.json({
      success: true,
      message: "Операция завершена",
      results,
    });
  } catch (error) {
    console.error("Ошибка массового добавления эффектов:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// DELETE /api/players/:playerId/items/:itemId - удаление предмета у игрока
app.delete("/api/players/:playerId/items/:itemId", async (req, res) => {
  const { playerId, itemId } = req.params;

  if (!playerId || !itemId) {
    return res.status(400).json({ error: "Неверные параметры" });
  }

  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    const item = await db("items").where("id", itemId).first();
    if (!item) {
      return res.status(404).json({ error: "Предмет не найден" });
    }

    // Проверяем, есть ли предмет у игрока
    const playerItem = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .first();

    if (!playerItem) {
      return res.status(404).json({ error: "У игрока нет этого предмета" });
    }

    // Удаляем предмет
    await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .delete();

    console.log(`Предмет ${itemId} удален у игрока ${playerId}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_item:deleted", { player_id: playerId, item_id: itemId });

      // Обновляем данные игрока
      const fullPlayer = await getFullPlayerData(playerId);
      io.emit("player:updated", fullPlayer);
    }

    res.json({
      success: true,
      message: "Предмет успешно удален",
    });
  } catch (error) {
    console.error("Ошибка удаления предмета:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// DELETE /api/players/:playerId/abilities/:abilityId - удаление способности у игрока
app.delete("/api/players/:playerId/abilities/:abilityId", async (req, res) => {
  const { playerId, abilityId } = req.params;

  if (!playerId || !abilityId) {
    return res.status(400).json({ error: "Неверные параметры" });
  }

  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    const ability = await db("abilities").where("id", abilityId).first();
    if (!ability) {
      return res.status(404).json({ error: "Способность не найдена" });
    }

    // Проверяем, есть ли способность у игрока
    const playerAbility = await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .first();

    if (!playerAbility) {
      return res.status(404).json({ error: "У игрока нет этой способности" });
    }

    // Удаляем способность
    await db("player_abilities")
      .where({ player_id: playerId, ability_id: abilityId })
      .delete();

    console.log(`Способность ${abilityId} удалена у игрока ${playerId}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_ability:deleted", {
        player_id: playerId,
        ability_id: abilityId,
      });

      // Обновляем данные игрока
      const fullPlayer = await getFullPlayerData(playerId);
      io.emit("player:updated", fullPlayer);
    }

    res.json({
      success: true,
      message: "Способность успешно удалена",
    });
  } catch (error) {
    console.error("Ошибка удаления способности:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// DELETE /api/players/:playerId/effects/:effectId - удаление эффекта у игрока
app.delete("/api/players/:playerId/effects/:effectId", async (req, res) => {
  const { playerId, effectId } = req.params;

  if (!playerId || !effectId) {
    return res.status(400).json({ error: "Неверные параметры" });
  }

  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    const effect = await db("effects").where("id", effectId).first();
    if (!effect) {
      return res.status(404).json({ error: "Эффект не найден" });
    }

    // Удаляем эффект (только с source_type='admin')
    const deletedCount = await db("player_active_effects")
      .where({
        player_id: playerId,
        effect_id: effectId,
        source_type: "admin",
      })
      .delete();

    if (deletedCount === 0) {
      return res
        .status(404)
        .json({ error: "Эффект не найден у игрока или не может быть удален" });
    }

    console.log(`Эффект ${effectId} удален у игрока ${playerId}`);

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_effect:deleted", {
        player_id: playerId,
        effect_id: effectId,
      });

      // Обновляем данные игрока
      const fullPlayer = await getFullPlayerData(playerId);
      io.emit("player:updated", fullPlayer);
    }

    res.json({
      success: true,
      message: "Эффект успешно удален",
    });
  } catch (error) {
    console.error("Ошибка удаления эффекта:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PUT /api/players/:playerId/items/:itemId/equip - переключение статуса экипировки предмета
app.put("/api/players/:playerId/items/:itemId/equip", async (req, res) => {
  const { playerId, itemId } = req.params;
  const { is_equipped } = req.body;

  if (!playerId || !itemId) {
    return res.status(400).json({ error: "Неверные параметры" });
  }

  if (typeof is_equipped !== "boolean") {
    return res
      .status(400)
      .json({ error: "is_equipped должен быть булевым значением" });
  }

  try {
    const player = await db("players").where("id", playerId).first();
    if (!player) {
      return res.status(404).json({ error: "Игрок не найден" });
    }

    // Проверяем, есть ли предмет у игрока
    const playerItem = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .first();

    if (!playerItem) {
      return res.status(404).json({ error: "У игрока нет этого предмета" });
    }

    // Обновляем статус экипировки
    const [updatedItem] = await db("player_items")
      .where({ player_id: playerId, item_id: itemId })
      .update({ is_equipped })
      .returning("*");

    console.log(
      `Статус экипировки предмета ${itemId} у игрока ${playerId} изменен на ${is_equipped}`,
    );

    // Отправляем уведомление через Socket.IO
    if (io) {
      io.emit("player_item:updated", updatedItem);

      // Обновляем данные игрока
      const fullPlayer = await getFullPlayerData(playerId);
      io.emit("player:updated", fullPlayer);
    }

    res.json({
      success: true,
      message: "Статус экипировки обновлен",
      player_item: updatedItem,
    });
  } catch (error) {
    console.error("Ошибка обновления экипировки:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PUT /api/players/:playerId/abilities/:abilityId/toggle - переключение активности способности
app.put(
  "/api/players/:playerId/abilities/:abilityId/toggle",
  async (req, res) => {
    const { playerId, abilityId } = req.params;
    const { is_active } = req.body;

    if (!playerId || !abilityId) {
      return res.status(400).json({ error: "Неверные параметры" });
    }

    if (typeof is_active !== "boolean" && typeof is_active !== "number") {
      return res.status(400).json({
        error: "is_active должен быть булевым значением или числом (0/1)",
      });
    }

    // Нормализуем значение
    const isActiveValue =
      typeof is_active === "boolean" ? (is_active ? 1 : 0) : is_active;

    try {
      const player = await db("players").where("id", playerId).first();
      if (!player) {
        return res.status(404).json({ error: "Игрок не найден" });
      }

      // Проверяем, есть ли способность у игрока
      const playerAbility = await db("player_abilities")
        .where({ player_id: playerId, ability_id: abilityId })
        .first();

      if (!playerAbility) {
        return res.status(404).json({ error: "У игрока нет этой способности" });
      }

      // Обновляем активность
      const [updatedAbility] = await db("player_abilities")
        .where({ player_id: playerId, ability_id: abilityId })
        .update({ is_active: isActiveValue })
        .returning("*");

      console.log(
        `Активность способности ${abilityId} у игрока ${playerId} изменена на ${isActiveValue}`,
      );

      // Отправляем уведомление через Socket.IO
      if (io) {
        io.emit("player_ability:updated", updatedAbility);

        // Обновляем данные игрока
        const fullPlayer = await getFullPlayerData(playerId);
        io.emit("player:updated", fullPlayer);
      }

      res.json({
        success: true,
        message: "Активность способности обновлена",
        player_ability: updatedAbility,
      });
    } catch (error) {
      console.error("Ошибка обновления активности способности:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  },
);
// ... остальные эндпоинты и Socket.IO обработка

// Функция для получения полных данных игрока
async function getFullPlayerData(playerId: string) {
  try {
    const playerData = await db("players")
      .where("players.id", playerId)
      .first();

    if (!playerData) return null;

    // Используем Promise.all для параллельного выполнения запросов
    const [abilities, items, effects] = await Promise.all([
      // Способности
      db("player_abilities")
        .where("player_id", playerData.id)
        .join("abilities", "ability_id", "abilities.id")
        .select("abilities.*", "player_abilities.is_active"),

      // Предметы с эффектами
      db("player_items")
        .where("player_id", playerData.id)
        .join("items", "item_id", "items.id")
        .leftJoin("effects as ae", "items.active_effect_id", "ae.id")
        .leftJoin("effects as pe", "items.passive_effect_id", "pe.id")
        .select(
          "items.*",
          "player_items.quantity",
          "player_items.is_equipped",
          "ae.name as active_effect_name",
          "pe.name as passive_effect_name",
        ),

      // Активные эффекты
      db("player_active_effects")
        .where("player_id", playerData.id)
        .join("effects", "effect_id", "effects.id")
        .select("effects.*", "player_active_effects.remaining_turns"),
    ]);

    return {
      ...playerData,
      abilities,
      items,
      active_effects: effects,
    };
  } catch (error) {
    console.error("Ошибка:", error);
    throw error; // Пробрасываем ошибку дальше
  }
}

// GET /api/npcs - список всех NPC
app.get("/api/npcs", async (req, res) => {
  try {
    const npcs = await db("npcs").select("*");
    res.json(npcs);
  } catch (error) {
    console.error("Ошибка получения NPC:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/npcs/:id - один NPC
app.get("/api/npcs/:id", async (req, res) => {
  try {
    const npc = await db("npcs").where({ id: req.params.id }).first();
    if (!npc) {
      return res.status(404).json({ error: "NPC не найден" });
    }
    res.json({ success: true, npc });
  } catch (error) {
    console.error("Ошибка получения NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/npcs - создание NPC
app.post("/api/npcs", async (req, res) => {
  const {
    name,
    gender = "male",
    health = 50,
    max_health = 50,
    armor = 10,
    strength = 0,
    agility = 0,
    intelligence = 0,
    physique = 0,
    wisdom = 0,
    charisma = 0,
    history = "",
    in_battle = false,
    is_online = false,
    is_card_shown = true,
    aggression = 0,
  } = req.body;

  // Валидация
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Имя обязательно для создания NPC" });
  }
  if (name.length > 50) {
    return res
      .status(400)
      .json({ error: "Имя не должно превышать 50 символов" });
  }
  if (gender !== "male" && gender !== "female") {
    return res
      .status(400)
      .json({ error: 'Пол должен быть "male" или "female"' });
  }
  if (health <= 0 || max_health <= 0) {
    return res
      .status(400)
      .json({ error: "Здоровье должно быть положительным" });
  }
  if (health > max_health) {
    return res
      .status(400)
      .json({ error: "Текущее здоровье не может превышать максимальное" });
  }
  if (aggression < 0 || aggression > 2) {
    return res.status(400).json({ error: "Агрессия должна быть от 0 до 2" });
  }

  try {
    const [npc] = await db("npcs")
      .insert({
        name: name.trim(),
        gender,
        health,
        max_health,
        armor,
        strength,
        agility,
        intelligence,
        physique,
        wisdom,
        charisma,
        history: history || "",
        in_battle: Boolean(in_battle),
        is_online: Boolean(is_online),
        is_card_shown: Boolean(is_card_shown),
        aggression,
        created_at: db.fn.now(),
      })
      .returning("*");

    console.log(`NPC "${npc.name}" создан с ID: ${npc.id}`);
    io.emit("npc:created", npc);
    res.status(201).json({ success: true, message: "NPC успешно создан", npc });
  } catch (error: any) {
    console.error("Ошибка создания NPC:", error);
    if (error.message.includes("UNIQUE constraint failed")) {
      return res
        .status(409)
        .json({ error: "NPC с таким именем уже существует" });
    }
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PUT /api/npcs/:id - полное обновление NPC
app.put("/api/npcs/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    gender,
    health,
    max_health,
    armor,
    strength,
    agility,
    intelligence,
    physique,
    wisdom,
    charisma,
    history,
    in_battle,
    is_online,
    is_card_shown,
    aggression,
  } = req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Некорректный идентификатор NPC" });
  }

  try {
    const existing = await db("npcs").where("id", id).first();
    if (!existing) {
      return res.status(404).json({ error: "NPC не найден" });
    }

    const updateData: any = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Имя не может быть пустым" });
      }
      if (name.length > 50)
        return res.status(400).json({ error: "Имя слишком длинное" });
      updateData.name = name.trim();
    }
    if (gender !== undefined) {
      if (gender !== "male" && gender !== "female") {
        return res
          .status(400)
          .json({ error: 'Пол должен быть "male" или "female"' });
      }
      updateData.gender = gender;
    }
    if (health !== undefined) {
      if (health <= 0)
        return res.status(400).json({ error: "Здоровье должно быть > 0" });
      updateData.health = health;
    }
    if (max_health !== undefined) {
      if (max_health <= 0)
        return res
          .status(400)
          .json({ error: "Максимальное здоровье должно быть > 0" });
      updateData.max_health = max_health;
    }
    if (
      health !== undefined &&
      max_health !== undefined &&
      health > max_health
    ) {
      return res
        .status(400)
        .json({ error: "Здоровье не может превышать максимальное" });
    }
    if (armor !== undefined) updateData.armor = armor;
    if (strength !== undefined) updateData.strength = strength;
    if (agility !== undefined) updateData.agility = agility;
    if (intelligence !== undefined) updateData.intelligence = intelligence;
    if (physique !== undefined) updateData.physique = physique;
    if (wisdom !== undefined) updateData.wisdom = wisdom;
    if (charisma !== undefined) updateData.charisma = charisma;
    if (history !== undefined) updateData.history = history || "";
    if (in_battle !== undefined) updateData.in_battle = Boolean(in_battle);
    if (is_online !== undefined) updateData.is_online = Boolean(is_online);
    if (is_card_shown !== undefined)
      updateData.is_card_shown = Boolean(is_card_shown);
    if (aggression !== undefined) {
      if (aggression < 0 || aggression > 2) {
        return res
          .status(400)
          .json({ error: "Агрессия должна быть от 0 до 2" });
      }
      updateData.aggression = aggression;
    }

    const [updatedNpc] = await db("npcs")
      .where("id", id)
      .update(updateData)
      .returning("*");
    console.log(`NPC "${updatedNpc.name}" (ID: ${id}) обновлен`);
    io.emit("npc:updated", updatedNpc);
    res.json({
      success: true,
      message: "NPC успешно обновлен",
      npc: updatedNpc,
    });
  } catch (error: any) {
    console.error("Ошибка обновления NPC:", error);
    if (error.message.includes("UNIQUE constraint failed")) {
      return res
        .status(409)
        .json({ error: "NPC с таким именем уже существует" });
    }
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PATCH /api/npcs/:id - частичное обновление NPC
app.patch("/api/npcs/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Некорректный идентификатор NPC" });
  }

  try {
    const existing = await db("npcs").where("id", id).first();
    if (!existing) {
      return res.status(404).json({ error: "NPC не найден" });
    }

    delete updateData.id;
    delete updateData.created_at;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    // Валидация полей
    if (updateData.name !== undefined) {
      if (
        typeof updateData.name !== "string" ||
        updateData.name.trim().length === 0
      ) {
        return res.status(400).json({ error: "Имя не может быть пустым" });
      }
      if (updateData.name.length > 50)
        return res.status(400).json({ error: "Имя слишком длинное" });
      updateData.name = updateData.name.trim();
    }
    if (
      updateData.gender !== undefined &&
      updateData.gender !== "male" &&
      updateData.gender !== "female"
    ) {
      return res
        .status(400)
        .json({ error: 'Пол должен быть "male" или "female"' });
    }
    if (updateData.health !== undefined && updateData.health <= 0) {
      return res.status(400).json({ error: "Здоровье должно быть > 0" });
    }
    if (updateData.max_health !== undefined && updateData.max_health <= 0) {
      return res
        .status(400)
        .json({ error: "Максимальное здоровье должно быть > 0" });
    }
    if (
      (updateData.health !== undefined &&
        updateData.health > existing.max_health) ||
      (updateData.max_health !== undefined &&
        existing.health > updateData.max_health) ||
      (updateData.health !== undefined &&
        updateData.max_health !== undefined &&
        updateData.health > updateData.max_health)
    ) {
      return res
        .status(400)
        .json({ error: "Текущее здоровье не может превышать максимальное" });
    }
    if (
      updateData.aggression !== undefined &&
      (updateData.aggression < 0 || updateData.aggression > 2)
    ) {
      return res.status(400).json({ error: "Агрессия должна быть от 0 до 2" });
    }

    await db("npcs").where("id", id).update(updateData);
    const updatedNpc = await db("npcs").where("id", id).first();
    io.emit("npc:updated", updatedNpc);
    res.json({
      success: true,
      message: "NPC успешно обновлен",
      npc: updatedNpc,
    });
  } catch (error: any) {
    console.error("Ошибка частичного обновления NPC:", error);
    if (error.message.includes("UNIQUE constraint failed")) {
      return res
        .status(409)
        .json({ error: "NPC с таким именем уже существует" });
    }
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// DELETE /api/npcs/:id - удаление NPC с проверкой связей
app.delete("/api/npcs/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Некорректный идентификатор NPC" });
  }

  try {
    const existing = await db("npcs").where("id", id).first();
    if (!existing) {
      return res.status(404).json({ error: "NPC не найден" });
    }

    // Проверяем связанные записи
    const [abilitiesCount, itemsCount, effectsCount] = await Promise.all([
      db("npc_abilities").where("npc_id", id).first(),
      db("npc_items").where("npc_id", id).first(),
      db("npc_active_effects").where("npc_id", id).first(),
    ]);

    if (abilitiesCount || itemsCount || effectsCount) {
      return res.status(409).json({
        error:
          "Невозможно удалить NPC, так как у него есть связанные способности, предметы или эффекты. Сначала удалите их.",
      });
    }

    await db("npcs").where("id", id).delete();
    console.log(`NPC "${existing.name}" (ID: ${id}) удален`);
    io.emit("npc:deleted", Number(id));
    res.json({ success: true, message: "NPC успешно удален", deleted_id: id });
  } catch (error) {
    console.error("Ошибка удаления NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// ==================== СПЕЦИАЛЬНЫЕ ЭНДПОИНТЫ ДЛЯ АГРЕССИИ ====================

// POST /api/npcs/:id/intimidate - только для aggression === 0
app.post("/api/npcs/:id/intimidate", async (req, res) => {
  const { id } = req.params;

  try {
    const npc = await db("npcs").where("id", id).first();
    if (!npc) {
      return res.status(404).json({ error: "NPC не найден" });
    }
    if (npc.aggression !== 0) {
      return res
        .status(400)
        .json({
          error:
            "Запугивание возможно только для спокойных NPC (aggression = 0)",
        });
    }

    // Обновляем агрессию до 1
    const [updatedNpc] = await db("npcs")
      .where("id", id)
      .update({ aggression: 1 })
      .returning("*");

    // Добавляем эффект "Испуг", если его нет
    const effect = await ensureFrightenedEffect();

    // Проверяем, есть ли уже такой эффект у NPC
    const existingEffect = await db("npc_active_effects")
      .where({ npc_id: id, effect_id: effect.id })
      .first();

    if (!existingEffect) {
      await db("npc_active_effects").insert({
        npc_id: id,
        effect_id: effect.id,
        source_type: "admin",
        source_id: null,
        remaining_turns: effect.duration_turns,
        remaining_days: effect.duration_days,
        applied_at: db.fn.now(),
      });
    }

    io.emit("npc:intimidated", updatedNpc);
    io.emit("npc:updated", updatedNpc);
    res.json({
      success: true,
      message: "NPC успешно запуган",
      npc: updatedNpc,
    });
  } catch (error) {
    console.error("Ошибка запугивания NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/npcs/:id/modify-aggression - изменение агрессии для aggression === 1
app.post("/api/npcs/:id/modify-aggression", async (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;

  if (delta === undefined || typeof delta !== "number") {
    return res.status(400).json({ error: "Параметр delta (число) обязателен" });
  }

  try {
    const npc = await db("npcs").where("id", id).first();
    if (!npc) {
      return res.status(404).json({ error: "NPC не найден" });
    }
    if (npc.aggression !== 1) {
      return res
        .status(400)
        .json({
          error:
            "Изменение агрессии возможно только для напуганных NPC (aggression = 1)",
        });
    }

    const newAggression = npc.aggression + delta;
    if (newAggression < 0 || newAggression > 2) {
      return res
        .status(400)
        .json({ error: "Результат агрессии должен быть в диапазоне 0-2" });
    }

    const [updatedNpc] = await db("npcs")
      .where("id", id)
      .update({ aggression: newAggression })
      .returning("*");
    io.emit("npc:aggression-changed", updatedNpc);
    io.emit("npc:updated", updatedNpc);
    res.json({ success: true, message: "Агрессия изменена", npc: updatedNpc });
  } catch (error) {
    console.error("Ошибка изменения агрессии NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/npcs/:id/calm - успокоение для aggression === 2
app.post("/api/npcs/:id/calm", async (req, res) => {
  const { id } = req.params;
  const { playerId, abilityId } = req.body;

  try {
    const npc = await db("npcs").where("id", id).first();
    if (!npc) {
      return res.status(404).json({ error: "NPC не найден" });
    }
    if (npc.aggression !== 2) {
      return res
        .status(400)
        .json({
          error:
            "Успокоение возможно только для агрессивных NPC (aggression = 2)",
        });
    }

    // Если переданы playerId и abilityId, проверяем способность "Успокоение"
    if (playerId && abilityId) {
      const ability = await db("abilities").where("id", abilityId).first();
      if (!ability || ability.name !== "Успокоение") {
        return res
          .status(403)
          .json({
            error: "У игрока нет способности 'Успокоение' или она не найдена",
          });
      }
      const hasAbility = await db("player_abilities")
        .where({ player_id: playerId, ability_id: abilityId, is_active: true })
        .first();
      if (!hasAbility) {
        return res
          .status(403)
          .json({ error: "У игрока нет активной способности 'Успокоение'" });
      }
    } else if (playerId || abilityId) {
      return res
        .status(400)
        .json({
          error:
            "Для проверки способности нужно указать и playerId, и abilityId",
        });
    }

    const [updatedNpc] = await db("npcs")
      .where("id", id)
      .update({ aggression: 1 })
      .returning("*");
    io.emit("npc:calmed", updatedNpc);
    io.emit("npc:updated", updatedNpc);
    res.json({ success: true, message: "NPC успокоен", npc: updatedNpc });
  } catch (error) {
    console.error("Ошибка успокоения NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// PATCH /api/npcs/:id/aggression - прямой сеттер агрессии
app.patch("/api/npcs/:id/aggression", async (req, res) => {
  const { id } = req.params;
  const { aggression } = req.body;

  if (
    aggression === undefined ||
    typeof aggression !== "number" ||
    aggression < 0 ||
    aggression > 2
  ) {
    return res
      .status(400)
      .json({ error: "Поле aggression должно быть числом от 0 до 2" });
  }

  try {
    const npc = await db("npcs").where("id", id).first();
    if (!npc) {
      return res.status(404).json({ error: "NPC не найден" });
    }

    const [updatedNpc] = await db("npcs")
      .where("id", id)
      .update({ aggression })
      .returning("*");
    io.emit("npc:aggression-changed", updatedNpc);
    io.emit("npc:updated", updatedNpc);
    res.json({ success: true, message: "Агрессия обновлена", npc: updatedNpc });
  } catch (error) {
    console.error("Ошибка обновления агрессии NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// ==================== РАСШИРЕННАЯ ИНФОРМАЦИЯ О NPC ====================

// GET /api/npcs/:id/details
app.get("/api/npcs/:id/details", async (req, res) => {
  const { id } = req.params;

  try {
    const fullNpc = await getFullNpcData(id);
    if (!fullNpc) {
      return res.status(404).json({ error: "NPC не найден" });
    }

    res.json({
      success: true,
      npc: fullNpc,
      summary: {
        total_abilities: fullNpc.abilities.length,
        total_items: fullNpc.items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ),
        active_effects_count: fullNpc.active_effects.length,
        equipped_items_count: fullNpc.items.filter(
          (item: any) => item.is_equipped,
        ).length,
      },
    });
  } catch (error) {
    console.error("Ошибка получения деталей NPC:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Инициализация БД перед запуском сервера
initializeDatabase()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
      console.log(`База данных: ${path.join(dataDir, "game.db")}`);
    });
  })
  .catch((error) => {
    console.error("Не удалось инициализировать базу данных", error);
    process.exit(1);
  });
