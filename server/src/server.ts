// server/src/server.ts
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import knex from 'knex';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Создана директория для БД: ${dataDir}`);
}

const app = express();
const server = http.createServer(app);

// Настройка CORS для работы с клиентом на другом порту
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Базовый route для проверки работы сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Настройка Socket.IO
const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(dataDir, 'game.db')
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    afterCreate: (conn: any, done: Function) => {
      conn.run('PRAGMA foreign_keys = ON;', (err: any) => {
        if (err) {
          console.error('Ошибка включения внешних ключей:', err);
        }
        conn.run('PRAGMA journal_mode = WAL;', done);
      });
    }
  }
});

const initializeDatabase = async () => {
  try {
    // Таблица игроков
    if (!(await db.schema.hasTable('players'))) {
      await db.schema.createTable('players', table => {
        table.increments('id').primary();
        table.string('name', 50).notNullable().unique();
        table.string('gender', 10).checkIn(['male', 'female']);
        
        table.integer('health').defaultTo(50);
        table.integer('max_health').defaultTo(50);
        table.integer('armor').defaultTo(10);
        table.integer('strength').defaultTo(0);
        table.integer('agility').defaultTo(0);
        table.integer('intelligence').defaultTo(0);
        table.integer('physique').defaultTo(0);
        table.integer('wisdom').defaultTo(0);
        table.integer('charisma').defaultTo(0);

        table.text('history');
        
        table.boolean('in_battle').defaultTo(false);
        table.boolean('is_online').defaultTo(false);
        table.boolean('is_card_shown').defaultTo(true);
        
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('Таблица players создана');
    }

    // Таблица эффектов
    if (!(await db.schema.hasTable('effects'))) {
      await db.schema.createTable('effects', table => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description');
        table.string('attribute', 20).checkIn([
          'health', 'max_health', 'armor', 'strength', 
          'agility', 'intelligence', 'physique', 
          'wisdom', 'charisma'
        ]);
        table.integer('modifier'); // положительное или отрицательное значение
        table.integer('duration_turns').nullable(); // NULL для постоянных эффектов
        table.integer('duration_days').nullable();
        table.boolean('is_permanent').defaultTo(false);
      });
      console.log('Таблица effects создана');
    }

    // Таблица способностей
    if (!(await db.schema.hasTable('abilities'))) {
      await db.schema.createTable('abilities', table => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description');
        table.string('ability_type', 10).checkIn(['active', 'passive']).defaultTo('active');
        table.integer('cooldown_turns').defaultTo(0);
        table.integer('cooldown_days').defaultTo(0);
        table.integer('effect_id').references('id').inTable('effects').onDelete('SET NULL');
        
        table.timestamps(true, true);
      });
      console.log('Таблица abilities создана');
    }

    // Таблица связи игроков и способностей
    if (!(await db.schema.hasTable('player_abilities'))) {
      await db.schema.createTable('player_abilities', table => {
        table.integer('player_id').references('id').inTable('players').onDelete('CASCADE');
        table.integer('ability_id').references('id').inTable('abilities').onDelete('CASCADE');
        table.timestamp('obtained_at').defaultTo(db.fn.now());
        table.boolean('is_active').defaultTo(true);
        
        table.primary(['player_id', 'ability_id']);
      });
      console.log('Таблица player_abilities создана');
    }

    // Таблица предметов
    if (!(await db.schema.hasTable('items'))) {
      await db.schema.createTable('items', table => {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.text('description');
        table.string('rarity', 20).checkIn([
          'common', 'uncommon', 'rare', 'epic', 
          'legendary', 'mythical', 'story'
        ]).defaultTo('common');
        table.integer('base_quantity').defaultTo(1);
        table.integer('active_effect_id').references('id').inTable('effects').onDelete('SET NULL');
        table.integer('passive_effect_id').references('id').inTable('effects').onDelete('SET NULL');
        
        table.timestamps(true, true);
      });
      console.log('Таблица items создана');
    }

    // Таблица связи игроков и предметов
    if (!(await db.schema.hasTable('player_items'))) {
      await db.schema.createTable('player_items', table => {
        table.increments('id').primary();
        table.integer('player_id').references('id').inTable('players').onDelete('CASCADE');
        table.integer('item_id').references('id').inTable('items').onDelete('CASCADE');
        table.integer('quantity').defaultTo(1);
        table.boolean('is_equipped').defaultTo(false);
        table.timestamp('obtained_at').defaultTo(db.fn.now());
        
        table.unique(['player_id', 'item_id']);
      });
      console.log('Таблица player_items создана');
    }

    // Таблица активных эффектов на игроках
    if (!(await db.schema.hasTable('player_active_effects'))) {
      await db.schema.createTable('player_active_effects', table => {
        table.increments('id').primary();
        table.integer('player_id').references('id').inTable('players').onDelete('CASCADE');
        table.integer('effect_id').references('id').inTable('effects').onDelete('CASCADE');
        table.string('source_type', 10).checkIn(['ability', 'item', 'admin']);
        table.integer('source_id').nullable(); // ID способности, предмета или NULL для админа
        table.integer('remaining_turns').nullable();
        table.integer('remaining_days').nullable();
        table.timestamp('applied_at').defaultTo(db.fn.now());
        
        table.index(['player_id', 'effect_id']);
      });
      console.log('Таблица player_active_effects создана');
    }

    // Создание индексов для производительности
    await db.raw(`
      CREATE INDEX IF NOT EXISTS idx_player_abilities ON player_abilities(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_items ON player_items(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_effects ON player_active_effects(player_id);
      CREATE INDEX IF NOT EXISTS idx_abilities_type ON abilities(ability_type);
      CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
    `).catch(err => console.log('Ошибка создания индексов:', err));

    // Триггер для проверки здоровья
    await db.raw(`
      CREATE TRIGGER IF NOT EXISTS check_health_limit 
      BEFORE UPDATE ON players
      FOR EACH ROW
      WHEN NEW.health > NEW.max_health
      BEGIN
        SELECT RAISE(ABORT, 'Health cannot exceed max health');
      END;
    `).catch(err => console.log('Ошибка создания триггера:', err));

  } catch (error) {
    console.error('Критическая ошибка инициализации БД:', error);
    process.exit(1);
  }
};

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Защита от перегрузки большими запросами

// API эндпоинты для игроков
app.get('/api/players', async (req, res) => {
  try {
    const players = await db('players').select('*');
    res.json(players);
  } catch (error) {
    console.error('Ошибка получения игроков:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API Получение игрока по id
app.get('/api/players/:id', async (req, res) => {
  try {
    const player = await db('players')
      .where({ id: req.params.id })
      .first();
    
    if (!player) {
      return res.status(404).json({ 
        error: 'Игрок не найден' 
      });
    }
    
    res.json({
      success: true,
      player
    });
  } catch (error) {
    console.error('Ошибка получения игрока:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// API Получение полной информации игрока по id
app.get('/api/players/:id/details', async (req, res) => {
  try {
    const playerId = req.params.id;

    // 1. Получаем базовую информацию о персонаже
    const player = await db('players')
      .where({ id: playerId })
      .first();

    if (!player) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }

    // 2. Получаем способности персонажа
    const abilities = await db('player_abilities')
      .where('player_abilities.player_id', playerId)
      .where('player_abilities.is_active', true) // Только активные способности
      .join('abilities', 'player_abilities.ability_id', 'abilities.id')
      .leftJoin('effects', 'abilities.effect_id', 'effects.id')
      .select(
        'abilities.*',
        'player_abilities.obtained_at',
        'player_abilities.is_active',
        db.raw('effects.* as effect_details')
      );

    // 3. Получаем предметы персонажа
    const items = await db('player_items')
      .where('player_items.player_id', playerId)
      .join('items', 'player_items.item_id', 'items.id')
      .leftJoin('effects as active_effect', 'items.active_effect_id', 'active_effect.id')
      .leftJoin('effects as passive_effect', 'items.passive_effect_id', 'passive_effect.id')
      .select(
        'items.*',
        'player_items.quantity',
        'player_items.is_equipped',
        'player_items.obtained_at',
        db.raw('active_effect.* as active_effect_details'),
        db.raw('passive_effect.* as passive_effect_details')
      );

    // 4. Получаем активные эффекты на персонаже
    const activeEffects = await db('player_active_effects')
      .where('player_active_effects.player_id', playerId)
      .where(function() {
        // Фильтруем только активные эффекты (еще не истекли)
        this.where('remaining_turns', '>', 0)
            .orWhere('remaining_days', '>', 0)
            .orWhereNull('remaining_turns')
            .orWhereNull('remaining_days');
      })
      .join('effects', 'player_active_effects.effect_id', 'effects.id')
      .select(
        'effects.*',
        'player_active_effects.source_type',
        'player_active_effects.source_id',
        'player_active_effects.remaining_turns',
        'player_active_effects.remaining_days',
        'player_active_effects.applied_at'
      );

    // 5. Рассчитываем итоговые характеристики с учетом эффектов
    const finalStats = calculateFinalStats(player, activeEffects, items);

    // 6. Формируем ответ
    const response = {
      success: true,
      player: {
        ...player,
        final_stats: finalStats
      },
      abilities: abilities.map(ability => ({
        ...ability,
        effect: ability.effect_details || null
      })),
      items: items.map(item => ({
        ...item,
        active_effect: item.active_effect_details || null,
        passive_effect: item.passive_effect_details || null
      })),
      active_effects: activeEffects,
      summary: {
        total_abilities: abilities.length,
        total_items: items.reduce((sum, item) => sum + item.quantity, 0),
        active_effects_count: activeEffects.length,
        equipped_items_count: items.filter(item => item.is_equipped).length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Ошибка получения деталей игрока:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Функция для расчета итоговых характеристик
function calculateFinalStats(basePlayer: any, activeEffects: any[], items: any[]) {
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
    charisma: stats.charisma
  };
  
  // Применяем активные эффекты
  activeEffects.forEach(effect => {
    if (effect.attribute && effect.modifier) {
      const currentValue = finalStats[effect.attribute as keyof typeof finalStats];
      if (currentValue !== undefined) {
        finalStats[effect.attribute as keyof typeof finalStats] = currentValue + effect.modifier;
      }
    }
  });
  
  // Применяем пассивные эффекты от экипированных предметов
  items
    .filter(item => item.is_equipped && item.passive_effect_details)
    .forEach(item => {
      const effect = item.passive_effect_details;
      if (effect.attribute && effect.modifier) {
        const currentValue = finalStats[effect.attribute as keyof typeof finalStats];
        if (currentValue !== undefined) {
          finalStats[effect.attribute as keyof typeof finalStats] = currentValue + effect.modifier;
        }
      }
    });
  
  return finalStats;
}

// API Получение полной информации игрока по id
app.get('/api/players/:id/full', async (req, res) => {
  try {
    const player = await db('players')
      .where('players.id', req.params.id)
      .first()
      .then(async (playerData) => {
        if (!playerData) return null;
        
        // Используем Promise.all для параллельного выполнения запросов
        const [abilities, items, effects] = await Promise.all([
          // Способности
          db('player_abilities')
            .where('player_id', playerData.id)
            .join('abilities', 'ability_id', 'abilities.id')
            .select('abilities.*', 'player_abilities.is_active'),
          
          // Предметы с эффектами
          db('player_items')
            .where('player_id', playerData.id)
            .join('items', 'item_id', 'items.id')
            .leftJoin('effects as ae', 'items.active_effect_id', 'ae.id')
            .leftJoin('effects as pe', 'items.passive_effect_id', 'pe.id')
            .select(
              'items.*',
              'player_items.quantity',
              'player_items.is_equipped',
              'ae.name as active_effect_name',
              'pe.name as passive_effect_name'
            ),
          
          // Активные эффекты
          db('player_active_effects')
            .where('player_id', playerData.id)
            .join('effects', 'effect_id', 'effects.id')
            .select('effects.*', 'player_active_effects.remaining_turns')
        ]);
        
        return {
          ...playerData,
          abilities,
          items,
          active_effects: effects
        };
      });
    
    if (!player) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// API эндпоинт для создания игрока
app.post('/api/players', async (req, res) => {
  const { 
    name, 
    gender = 'male',
    health = 50,
    max_health = 50,
    armor = 10,
    strength = 0,
    agility = 0,
    intelligence = 0,
    physique = 0,
    wisdom = 0,
    charisma = 0,
    history = '',
    is_online = false,
    is_card_shown = true
  } = req.body;
  
  // Валидация входных данных
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Имя обязательно для создания игрока' 
    });
  }
  
  if (name.length > 50) {
    return res.status(400).json({ 
      error: 'Имя не должно превышать 50 символов' 
    });
  }
  
  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ 
      error: 'Пол должен быть "male" или "female"' 
    });
  }
  
  // Валидация числовых значений
  const numericFields = {
    health, max_health, armor, strength, agility, 
    intelligence, physique, wisdom, charisma
  };
  
  for (const [field, value] of Object.entries(numericFields)) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return res.status(400).json({ 
        error: `Поле "${field}" должно быть целым числом` 
      });
    }
  }
  
  // Проверка на положительные значения здоровья
  if (health <= 0) {
    return res.status(400).json({ 
      error: 'Здоровье должно быть положительным числом' 
    });
  }
  
  if (max_health <= 0) {
    return res.status(400).json({ 
      error: 'Максимальное здоровье должно быть положительным числом' 
    });
  }
  
  if (health > max_health) {
    return res.status(400).json({ 
      error: 'Текущее здоровье не может превышать максимальное здоровье' 
    });
  }
  
  try {
    // Создание игрока в базе данных
    const [player] = await db('players')
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
        history: history || '',
        in_battle: false,
        is_online: Boolean(is_online),
        is_card_shown: Boolean(is_card_shown),
        created_at: db.fn.now()
      })
      .returning('*');
    
    console.log(`Игрок "${player.name}" создан с ID: ${player.id}`);
    
    // Отправляем уведомление всем подключенным клиентам через Socket.IO
    io.emit('player:created', player);
    
    // Возвращаем созданного игрока
    res.status(201).json({
      success: true,
      message: 'Игрок успешно создан',
      player
    });
    
  } catch (error: any) {
    console.error('Ошибка создания игрока:', error);
    
    // Обработка уникального ограничения имени
    if (error.message.includes('UNIQUE constraint failed') || 
        error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ 
        error: 'Игрок с таким именем уже существует' 
      });
    }
    
    // Обработка проверочных ограничений (CHECK constraints)
    if (error.message.includes('CHECK constraint failed')) {
      if (error.message.includes('gender')) {
        return res.status(400).json({ 
          error: 'Пол должен быть "male" или "female"' 
        });
      }
      return res.status(400).json({ 
        error: 'Некорректные значения характеристик игрока' 
      });
    }
    
    // Общая ошибка сервера
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при создании игрока' 
    });
  }
});

// API Редактирование игрока по id
app.patch('/api/players/:id', async (req, res) => {
  try {
    const playerId = req.params.id;
    
    // Проверяем существование игрока
    const existingPlayer = await db('players')
      .where({ id: playerId })
      .first();
    
    if (!existingPlayer) {
      return res.status(404).json({ 
        success: false,
        error: 'Игрок не найден' 
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
        error: 'Нет данных для обновления'
      });
    }
    
    // Валидация данных (опционально)
    if (updateData.health !== undefined && updateData.max_health !== undefined) {
      if (updateData.health > updateData.max_health) {
        return res.status(400).json({
          success: false,
          error: 'Текущее здоровье не может превышать максимальное'
        });
      }
    }
    
    // Обновляем игрока в базе данных
    const updatedCount = await db('players')
      .where({ id: playerId })
      .update(updateData);
    
    if (updatedCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'Не удалось обновить игрока'
      });
    }
    
    // Получаем обновленного игрока
    const updatedPlayer = await db('players')
      .where({ id: playerId })
      .first();
    
    res.json({
      success: true,
      message: 'Игрок успешно обновлен',
      player: updatedPlayer
    });
    
  } catch (error) {
    console.error('Ошибка обновления игрока:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// API удаление игрока
app.delete('/api/players/:id', async (req, res) => {
  try {
    const deleted = await db('players')
      .where({ id: req.params.id })
      .delete();
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'Игрок не найден' 
      });
    }
    
    io.emit('player:deleted', { id: req.params.id });
    
    res.json({
      success: true,
      message: 'Игрок успешно удален'
    });

    console.log(`Игрок удален с ID: ${req.params.id}`);
  } catch (error) {
    console.error('Ошибка удаления игрока:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// ... остальные эндпоинты и Socket.IO обработка

// Инициализация БД перед запуском сервера
initializeDatabase().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`База данных: ${path.join(dataDir, 'game.db')}`);
  });
}).catch(error => {
  console.error('Не удалось инициализировать базу данных', error);
  process.exit(1);
});