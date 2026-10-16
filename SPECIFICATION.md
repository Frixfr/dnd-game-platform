# Спецификация проекта «D&D Assistant»

> Документ подготовлен как справочная спецификация для разработчиков и нейросетей (AI-агентов).
> Цель — дать полное, точное и быстрое представление об архитектуре, данных, API и правилах
> работы приложения, чтобы можно было вносить изменения, не читая весь код заново.
>
> Все факты проверены по исходному коду репозитория (состояние основной ветки).
> Разделы «Замысел автора» (product intent) уточнены владельцем проекта 2026-10-16 —
> см. раздел 12; при конфликте README/кода с замыслом приоритет у раздела 12.
> Дата актуальности: 2026-10-16.

---

## 1. Обзор продукта

**D&D Assistant** — веб-приложение для проведения настольных ролевых игр в стиле D&D.
Два типа пользователей:

- **Мастер (DM)** — создаёт и ведёт игровые комнаты, управляет игроками, NPC, расами,
  способностями, эффектами, предметами, картами и боем; видит логи действий.
- **Игрок** — входит по имени персонажа (и при необходимости паролю), видит свой лист
  персонажа (read-only), инвентарь, способности, эффекты, карту, заметки; может
  использовать активные способности и предметы, отправлять мастеру запросы на лечение/урон.

Ключевая концепция изоляции данных — **комнаты (rooms)**: практически все сущности БД
привязаны к `room_id` (FK на `rooms` с `ON DELETE CASCADE`). Мастер работает только
внутри одной выбранной комнаты; JWT-токен мастера содержит `roomId`.

### Технологический стек

| Слой | Технологии |
|---|---|
| Фронтенд (`client/`) | React 19, Vite (rolldown-vite 7), TypeScript ~5.9, Tailwind CSS 3.4, Zustand 5, React Router 7, Axios, Socket.IO client 4.8, lucide-react |
| Бэкенд (`server/`) | Node.js, Express 5, TypeScript 5.9 (ESM, `"type": "module"`), SQLite через Knex 3.1, Socket.IO 4.8, jsonwebtoken, bcryptjs, multer + sharp (загрузка/обработка аватаров и карт) |
| Хранение файлов | Локальная ФС: `server/uploads/avatars/`, изображения карт |
| БД | SQLite, файл `server/data/game.db`; схема создаётся/миграционируется кодом в `server/src/db/init.ts` при каждом старте сервера (отдельных knex-миграций фактически нет) |

Проект — монорепо из двух независимых npm-пакетов: `client/` и `server/`
(корневой `package.json` почти пустой, общих скриптов запуска нет).

---

## 2. Запуск, сборка, окружение

### Переменные окружения (`.env` в корне, пример — `.env.example`)

```
PORT=5000                          # порт бэкенда
HOST=localhost
CLIENT_ORIGIN=http://localhost:3000  # CORS origin для Socket.IO
VITE_BACKEND_URL=http://localhost:5000  # target для dev-прокси Vite (/api, /uploads, /socket.io)
VITE_API_URL=/api                  # базовый URL REST (через прокси)
# VITE_SOCKET_URL=                 # пустое = same origin (через прокси)
```

Также читаются сервером (не обязательны, есть значения по умолчанию):
- `MASTER_PASSWORD` — пароль мастера (по умолчанию `dm123`, hardcoded-fallback в `routes/master.ts`);
- `JWT_SECRET` — секрет подписи JWT (по умолчанию `super-secret-key-change-in-production`).

### Команды

```bash
# dev (два терминала)
cd server && npm run dev      # nodemon + tsx, http://localhost:5000
cd client && npm run dev      # vite, http://localhost:3000 (проксирует /api, /uploads, /socket.io)

# production
cd client && npm run build    # tsc && vite build -> client/dist
cd server && npm run build    # tsc -> server/dist
cd server && npm start        # node dist/server.js
```

Сброс БД: удалить файл `server/data/game.db` и перезапустить сервер.

---

## 3. Структура репозитория

```
/workspace
├── .env.example            # шаблон переменных окружения
├── README.md               # инструкция по установке/запуску (основной user-guide)
├── package.json            # корневой (почти пустой, dnd-game-platform)
├── client/                 # React SPA
│   ├── vite.config.ts      # dev-прокси /api, /uploads, /socket.io -> VITE_BACKEND_URL
│   └── src/
│       ├── App.tsx         # маршрутизация + инициализация сокета + propagation roomId в сторы
│       ├── api/            # client.ts (axios), masterApi.ts, roomsApi.ts
│       ├── components/
│       │   ├── game/       # MapEditor, MapViewer, HealDamageRequestModal, QuickAbilitiesList,
│       │   │               # ActiveEffectsWidget, CompactInventory, TransferItemPopover, StatWithTooltip
│       │   ├── layout/     # MasterLayout, PlayerLayout, Sidebar, Navbar, MobileTabBar,
│       │   │               # PlayerSidebar, StickyHealthBar, LogsButton(?), MasterRequestsListener
│       │   ├── ui/         # модалки и карточки CRUD (Create/Edit*Modal для player/npc/item/ability/
│       │   │               # effect/race/room, *Card, *Manager, Toast, Pagination, ConfirmModal и т.д.)
│       │   └── ProtectedRoute.tsx  # защита маршрутов мастера (requireRoom: bool)
│       ├── contexts/NotificationProvider.tsx  # контекст toast-уведомлений
│       ├── lib/            # config.ts, socket.ts (синглтон сокета), socketCleanup.ts, mapSubscriptions.ts
│       ├── pages/          # см. раздел 6 (маршруты)
│       ├── stores/         # Zustand-сторы: room, player, npc, ability, effect, item, race, combat,
│       │                   # map, log, playerSession, playerRoom
│       └── types/index.ts  # все TS-интерфейсы клиента (Player, NPC, Effect, Ability, Item, ...)
└── server/                 # Express API + Socket.IO
    ├── data/game.db        # SQLite (создаётся автоматически)
    ├── uploads/avatars/    # загруженные аватарки
    └── src/
        ├── server.ts       # точка входа: startApp() + listen(PORT, HOST)
        ├── app.ts          # express-конфиг, CORS, монтирование роутеров, порядок авторизации
        ├── config/jwt.ts   # jwtConfig.secret, тип JwtPayload { role, roomId?, playerId? }
        ├── db/index.ts     # экспорт knex-инстанса `db` (sqlite3)
        ├── db/init.ts      # initializeDatabase(): создание таблиц + ad-hoc миграции hasColumn/alterTable
        ├── middleware/authMaster.ts  # проверка Bearer JWT (role=master), аттачит req.user/req.roomId
        ├── middleware/upload.ts      # multer (+sharp) для аватаров/карт
        ├── routes/         # 18 роутеров (см. раздел 5)
        ├── controllers/    # тонкий слой над services
        ├── services/       # бизнес-логика (playersService — крупнейший, ~1100 строк)
        ├── socket/index.ts # initSocket, комнаты сокетов, emitToAll/emitToRoom
        ├── utils/helpers.ts# calculateFinalStats(Generic), getFullPlayerData, getFullNpcData,
        │                   # ensureFrightenedEffect, applyInstantHealthChange
        └── types/index.ts  # серверные типы
```

---

## 4. Модель данных (SQLite, `server/src/db/init.ts`)

Все таблицы пересоздаются «лениво»: при старте проверяется `hasTable`/`hasColumn`
и при необходимости создаётся таблица или добавляется колонка. **Любая новая колонка
должна добавляться именно этим способом в `init.ts`** (отдельных миграционных файлов нет).

### Таблица `rooms` (центр изоляции)
| Колонка | Тип | Примечание |
|---|---|---|
| id | increments PK | |
| name | string(100) NOT NULL | |
| password_hash | string(255) nullable | bcrypt-хеш пароля комнаты |
| is_active_for_players | boolean default false | открыта ли комната для входа игроков |
| created_at / updated_at | timestamp | |

### `effects` — модификаторы статов (ячейко-универсальная валюта билдов)
- `name(100) UNIQUE` ⚠️ **БАГ #1** — уникальность глобальная, должно быть `UNIQUE(room_id, name)` (см. 12.5, 12.8)
- `description`
- `attribute` CHECK in: `health, max_health, armor, strength, agility, intelligence, physique, wisdom, charisma`
- `modifier INTEGER` (может быть отрицательным)
- `duration_turns`, `duration_days` (nullable), `is_permanent`, `is_instant`
- `tags` TEXT JSON-массив строкой (`"[]"` по умолчанию)
- `room_id` FK→rooms CASCADE

### `races` + `race_effects`
- `races`: id, `name(50) UNIQUE` ⚠️ **БАГ #1**, description, created_at, room_id FK.
- `race_effects`: связующая таблица (race_id, effect_id) PK-пара, CASCADE. Раса даёт персонажу набор эффектов.

### `players`
- id, `name(50)`, gender CHECK(`male`,`female`), health(50), max_health(50), armor(10),
  strength/agility/intelligence/physique/wisdom/charisma (default 0), history TEXT,
  in_battle, is_online, `is_card_shown` (видна ли карточка игрокам при входе), created_at,
  race_id FK→races SET NULL, `access_password` TEXT (хеш пароля входа игрока), avatar_url, notes TEXT,
  room_id FK→rooms CASCADE.

### `abilities`
- id, `name(100) UNIQUE` ⚠️ **БАГ #1**, description, `ability_type` CHECK(`active`,`passive`),
  cooldown_turns, cooldown_days, effect_id FK→effects SET NULL, timestamps, room_id FK.

### `player_abilities` (M:M players↔abilities + состояние кулдауна)
- PK (player_id, ability_id), obtained_at, is_active, `remaining_cooldown_turns`, `remaining_cooldown_days`.

### `items`
- id, `name(100)`, description, `rarity` CHECK(`common, uncommon, rare, epic, legendary, mythical, story`),
  base_quantity, `active_effect_id` FK→effects, `passive_effect_id` FK→effects,
  is_deletable, is_usable, infinite_uses, timestamps, room_id FK.

### `item_effects`
- id, item_id FK, effect_id FK, `effect_type` CHECK(`active`,`passive`), unique(item_id,effect_id,effect_type).

### `player_items` (инвентарь)
- id, player_id FK, item_id FK, quantity, `is_equipped`, obtained_at, unique(player_id,item_id).
- Экипированный предмет (`is_equipped=1`) влияет на статы через `passive_effect_id`.

### `player_active_effects` (наложенные временные эффекты)
- id, player_id FK, effect_id FK, `source_type` CHECK(`ability`,`item`,`admin`), source_id nullable,
  `remaining_turns` (уменьшается в конце раунда боя), `remaining_days` (уменьшается только
  командой мастера advanceDay), applied_at, index(player_id, effect_id).

### `npcs` — зеркало `players` + поле `aggression` CHECK(0,1,2) (0 спокоен, 1 напряжён, 2 агрессивен)
+ те же поля (health/max_health/armor/6 статов/history/in_battle/is_online/is_card_shown/race_id/avatar_url/room_id).
`name(50) UNIQUE` ⚠️ **БАГ #1** (глобальная уникальность имён NPC между всеми комнатами).

### Зеркальные M:M таблицы NPC
`npc_abilities`, `npc_items`, `npc_active_effects` — идентичны player-версиям (fk на npcs).

### `maps` + `map_tokens`
- `maps`: id, name(100), image_url(255), `show_to_players` bool, `original_width/height` INT NOT NULL
  (реальные пиксельные размеры загруженного изображения), timestamps, room_id FK.
- `map_tokens`: id, map_id FK CASCADE, `entity_type` CHECK(`player`,`npc`), entity_id,
  x FLOAT, y FLOAT (координаты в процентах/долях от размера карты), `is_grayscale` bool,
  `scale` float default 1, updated_at, unique(map_id, entity_type, entity_id).

### `logs`
- id, action_type(20), player_id nullable, npc_id nullable, entity_name(100), action_name(100),
  details TEXT, created_at, room_id FK, индексы room_id и created_at.
- **Назначение (замысел автора):** это именно **журнал действий** (audit log) мастера, а НЕ чат.
  Чат, если и будет добавлен, — отдельная система, отдельно от `logs` (см. раздел 12.6).

### `combat_sessions` + `combat_participants`
- sessions: id, is_active default true, created_at, ended_at nullable, room_id FK.
- participants: id, session_id FK CASCADE, `entity_type` CHECK(`player`,`npc`), entity_id,
  `order_index` (порядок инициативы), `is_current_turn`, joined_at, unique(session_id,entity_type,entity_id).

---

## 5. REST API (базовый префикс `/api`)

### 5.1 Авторизация и комнаты

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| POST | `/api/master/login` | — | `{password}` → бессрочный JWT `{token}` (role=master, без roomId). Пароль: env `MASTER_PASSWORD` (по умолч. `dm123`) |
| GET | `/api/rooms` | master | список комнат (без password_hash, полем `has_password`) |
| POST | `/api/rooms` | master | создать комнату `{name, password?}` (bcrypt) |
| POST | `/api/rooms/:id/enter` | — | войти в комнату (проверка пароля комнаты) → новый JWT с `roomId` |
| PUT | `/api/rooms/:id` | master | переименовать / сменить/снять пароль (только своей комнаты: `req.roomId === id`) |
| POST | `/api/rooms/:id/set-active` | master | открыть/закрыть комнату для игроков (`is_active_for_players`) |
| DELETE | `/api/rooms/:id` | master | удалить комнату (CASCADE удаляет все данные комнаты!) |
| GET | `/api/health` | — | `{status:"OK",timestamp}` |

**Порядок монтирования в `app.ts` важен:** публичные роутеры (`/api/master`, `/api/rooms`,
`/api/public`, два публичных GET карт) регистрируются ДО `app.use(authMaster, ...)` для
остальных `/api/*` роутеров. Внутри `rooms.ts` authMaster навешан per-route.

### 5.2 Основные CRUD-роутеры (все требуют `authMaster`, всё привязано к roomId из токена)

Шаблон для каждой сущности: `GET /` (список), `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
(+ `PATCH /:id` у effects/items/npcs/players).

| Префикс | Сущность | Особые эндпоинты |
|---|---|---|
| `/api/players` | игроки | `GET /:id/details` (полные данные + final_stats), `PATCH /:id`, `POST /:id/set-password`, `POST /:id/items/batch`, `/:id/abilities/batch`, `/:id/effects/batch`, `PUT /:playerId/items/:itemId/equip`, `POST /:playerId/items/:itemId/use`, `DELETE /:playerId/items/:itemId`, `DELETE /:playerId/effects/:effectId`, `POST\|PUT\|DELETE /:id/avatar` (multer+sharp) |
| `/api/npcs` | NPC | то же + `GET /:id/details`, `POST /:id/duplicate`, `POST /:id/intimidate`, `POST /:id/calm`, `POST /:id/modify-aggression`, `PUT /:id/aggression`, `PUT /:id/abilities/:abilityId/toggle` |
| `/api/races` | расы | `race_effects` управляются через body create/update |
| `/api/abilities` | способности | `POST /:id/use` — использование активной способности (мастер за бойца) |
| `/api/effects` | эффекты | `PATCH /:id` частичное обновление |
| `/api/items` | предметы | `PATCH /:id` |
| `/api/player-abilities`, `/api/player-items`, `/api/player-active-effects` | прямые операции над связями игроков | `GET /`, `POST /`, `DELETE /` (по id в теле/query) |
| `/api/npc-abilities`, `/api/npc-items`, `/api/npc-effects` | то же для NPC | + `PUT /:id/equip`, `POST /:npcId/items/:npcItemId/use` |
| `/api/maps` | карты | `POST /` (multipart, поле `image`), `PUT /:id`, `DELETE /:id`, `GET /active`, `GET /:id` (с токенами), `GET /:mapId/tokens`, `POST /:mapId/tokens` (addOrUpdateToken), `GET /entities/available` |
| `/api/combat` | бой | см. 5.3 |
| `/api/logs` | логи | `GET /` (список комнаты) |

### 5.3 Боевой API (`/api/combat`, authMaster)

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/start` | начать новую сессию боя (старая завершается) |
| GET | `/active` | активная сессия с участниками |
| POST | `/participant` | добавить участника `{entity_type, entity_id, order_index?}` |
| POST | `/reorder` | изменить порядок инициативы |
| POST | `/next-turn` | ход к следующему участнику |
| POST | `/end-round` | конец раунда: −1 remaining_turns у эффектов и кулдаунов, удаление доживших до 0 |
| POST | `/advance-day` | «завершить день»: −1 remaining_days, удаление истёкших |
| POST | `/health` | изменение HP `{entity_type, entity_id, delta}` (лечение/урон) |
| POST | `/effect` | наложить эффект на участника |
| POST | `/use-ability` | применить способность в бою (расходует заряд, ставит кулдаун, снимает/кладёт hp, создаёт лог) |

**Семантика боя (замысел автора):**
- **Раунд** = все участники сходили; технически конец раунда наступает, когда ход переходит
  к последнему по инициативе (`order_index`) участнику.
- **Новые участники**, вступающие в уже идущий бой, включаются в очередь так же, как при
  старте боя — то есть получают позицию по инициативе в общем порядке (не «вставляются в текущий ход»).
- **Броски кубиков** игроки делают вне сайта; мастер вводит результат вручную (например, через
  `POST /health`). Планируется доработка: результат броска должен **суммироваться с характеристикой**
  персонажа (какая именно характеристика/формула — автор ещё не определил; реализовывать без уточнения нельзя).

### 5.4 Публичные эндпоинты для игроков (без JWT мастера)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/public/players` | список карточек игроков активных комнат (`is_card_shown=1`) |
| POST | `/api/public/players/login` | вход игрока `{name, password?}` → выдаётся идентификатор сессии (проверка `access_password`, если задан) |
| POST | `/api/public/players/:id/set-password` | установка пароля персонажа самим игроком (публично) |
| GET | `/api/maps/public/active` | активная карта для игроков (без служебных данных) |
| GET | `/api/maps/public/:id` | карта + токены (публичный вид) |

Удаление сущностей с зависимостями возвращает **409 Conflict**.

---

## 6. Фронтенд: маршруты и состояние

### Маршруты (`client/src/App.tsx`)

| Путь | Компонент | Доступ |
|---|---|---|
| `/` | LoginPage | все (выбор: Мастер / Игрок) |
| `/rooms` | MyRoomsPage | ProtectedRoute(requireRoom=false) — мастер без комнаты |
| `/master/*` | MasterLayout → index (Dashboard), items, abilities, effects, npcs, races, combat, maps | ProtectedRoute(requireRoom=true) |
| `/player/select` | PlayerSelectionPage | игрок (выбор карточки + пароль) |
| `/player/:playerId/*` | PlayerLayout → index (лист персонажа), inventory, abilities, effects, map, notes | игрок |
| `/map` | PublicMapPage | все (публичное просмотр active-карты) |

### Zustand-сторы (`client/src/stores/`)
`roomStore` (текущая комната + токен мастера; localStorage), `playerStore`, `npcStore`,
`abilityStore`, `effectStore`, `itemStore`, `raceStore`, `combatStore`, `mapStore`,
`logStore`, `playerSessionStore` (сессия игрока), `playerRoomStore`.

**Важный механизм:** каждый «данные-стор» имеет `setRoomId(roomId)`. В `App.tsx` при старте
и по подписке на `roomStore.currentRoom` roomId рассылается во все сторы — сторы фильтруют
данные и события сокета по комнате. Подписки сокетов инициализируются в MasterLayout/PlayerLayout
(не в App), синглтон сокета (`lib/socket.ts`) живёт всю жизнь приложения и никогда не
дисконнектится в cleanup-ах страниц (намеренно, см. комментарии в App.tsx).

HTTP-клиент: `api/client.ts` (axios, baseURL `VITE_API_URL=/api`, интерцептор добавляет
`Authorization: Bearer <мастерский токен>`).

---

## 7. Realtime (Socket.IO)

### Клиент → сервер (входящие события, `server/src/socket/index.ts`)
- `master:auth` (token) — обратная совместимость; верификация JWT, авто-join в `room:${roomId}`; ответ `master:auth:success {roomId|null}` / `master:auth:error`.
- `join-room` `{roomId:number|null}` — основной способ подписки мастера; null → выход из всех `room:*`. Ответ `joined-room`.
- `leave-room` — выход из комнат.
- `join-player` / `leave-player` (playerId) — подписка сокета игрока на свою комнату событий `player:${id}`.
- `join-map` / `leave-map` (mapId) — подписка на `map:${id}` (перетаскивание токенов в реальном времени).
- `heal-damage-request` — запрос игрока на лечение/урон; сервер пересылает его всем
  сокета мастера в `room:${roomId}` (слушается компонентом `MasterRequestsListener`).

### Сервер → клиент (исходящие события)
Эмитятся в `room:${roomId}` (мастер и подписанные) либо адресно в `player:${playerId}`:
- CRUD-события сущностей: `player:created|updated|deleted`, `npc:created|updated|deleted`,
  `ability:*`, `effect:*`, `item:*`, `race:*`, `map:created|updated|deleted|active-changed`,
  `combat:updated`, `log:new`, `room:active-changed`.
- Карта: `map:tokens-updated` (в `map:${mapId}`), `map:active-tokens-updated` (публично).
- **Правило:** при `player:updated` / `npc:updated` всегда передаётся полный объект,
  собранный через `getFullPlayerData()` / `getFullNpcData()` (со includes и `final_stats`).

---

## 8. Бизнес-правила (критично для корректных изменений)

1. **Пересчёт статов — только на бэкенде.** `utils/helpers.ts: calculateFinalStatsGeneric`
   суммирует базовые статы + эффекты расы (`race_effects`) + пассивки экипированных предметов
   (`player_items.is_equipped=1 → items.passive_effect_id`) + активные эффекты
   (`player_active_effects`). Результат отдаётся как `final_stats`; фронт ничего не считает сам.
2. **Instant-эффекты** (`effects.is_instant=1`, обычно по `health`) применяются сразу
   (`applyInstantHealthChange`) и не хранятся как длящиеся.
3. **Циклы времени:** `remaining_turns` уменьшается в `endRound` боя; `remaining_days` —
   только вручную мастером (`POST /api/combat/advance-day`). При достижении 0 запись эффекта/кулдауна удаляется.
   **Замысел автора (подтверждён):** «завершение дня» нажимает мастер вручную вне боя,
   когда игровой день заканчивается по сюжету. Автоматизации (триггеры, расписание) не планируется —
   фича должна остаться ручной.
4. **Пассивные способности** при назначению игроку/NPC автоматически создают запись активного эффекта.
5. **Кулдауны** активностей хранятся в `*_abilities.remaining_cooldown_turns/days`;
   `use-ability` блокирует использование при кулдауне > 0.
6. **Aggression NPC** (0/1/2): `intimidate` поднимает напряжение, `calm` сбрасывает;
   запуганный NPC получает эффект «Испуг» (`ensureFrightenedEffect` создаёт системный эффект при необходимости).
7. **Предметы:** `is_usable`, `infinite_uses`, `is_deletable`; `use` уменьшает quantity
   (и удаляет запись при 0, если не infinite). Передача предмета другому — transfer-эндпоинты/popovers.
8. **Здоровье:** триггеры БД `check_health_limit` удалены; контроль clamping HP — в сервисах.
9. **Удаление с FK-зависимостями** — проверка связей и `409 Conflict` (например, раса, на которой держатся игроки).
10. **Комната мастера:** все сервисы принимают `roomId` и фильтруют запросы по нему;
    попытка работать с чужой комнатой → 403 (см. `rooms.ts` PUT).
11. **Аватарки/карты:** multer принимает upload, `sharp` обрабатывает, файл кладётся в
    `server/uploads/...`, в БД хранится только относительный URL (`avatar_url`, `image_url`),
    раздаётся статикой `app.use("/uploads", express.static("uploads"))`.
12. **Видимость карты для игрока (замысел автора):** игрок должен видеть на карте **всех**
    участников — карта для него полностью открыта. Туман войны и скрытие отдельных токенов
    **не реализованы и отложены в бэклог** (см. раздел 12) — не добавлять молча.
13. **Шаблоны данных — per-room (замысел автора):** эффекты, способности, предметы, расы и NPC
    существуют **отдельно в каждой комнате**; глобальных/общих шаблонов между комнатами нет
    (уникальность `name` в таблицах effects/abilities/npcs/races действует в рамках таблицы,
    но сущности всегда привязаны к одной `room_id`). При рефакторинге НЕ переводить их в
    глобальные шаблоны без явного решения автора.

---

## 9. Аутентификация — текущее состояние (временные решения)

- Мастер: пароль из env (`dm123` by default) → бессрочный JWT `{role:"master", roomId?}`.
  Никакого refresh/истечения нет.
- Комната: опциональный bcrypt-пароль, вход `POST /api/rooms/:id/enter`.
- Игрок: логин по имени + опциональный `access_password` персонажа (bcrypt), сессия хранится
  на клиенте в `playerSessionStore`; эндпоинты игрока публичные (изоляция слабая — осознанный MVP).
- В `JwtPayload` заложен вариант `role:"player"` — задел на будущее.

**Замысел автора (подтверждён):**
- Игрок входит по паролю **персонажа**, который привязан к **активной комнате**
  (`rooms.is_active_for_players = true`) — именно так и должно работать; вход без активной комнаты невозможен.
- Регистрация аккаунтов **не планируется** («пока без этого», автор ещё обдумывает). Не предлагать
  реализацию регистрации/email-подтверждений, пока автор не примет решение.
- Ролевая модель — **сознательная жёсткая двойственность**: ровно две роли, «Мастер» и «Игрок».
  Никаких со-мастеров, наблюдателей, администраторов и прочих промежуточных ролей закладывать не нужно.

⚠️ При доработках не следует ломать предположение «токен мастера бессрочный», если не
добавляется нормальный flow обновления токена.

---

## 10. Известные особенности и «подводные камни»

- `db/init.ts` содержит десятки ad-hoc миграций (`hasColumn → alterTable`) — новый код схемы
  добавляется туда же, в том же стиле.
- Корневой `package.json` — заглушка; зависимости ставятся отдельно в `client/` и `server/`.
- Vite override: используется `rolldown-vite` вместо обычного vite.
- Express 5: параметры `req.params` могут быть массивами — в `rooms.ts` есть хелпер `parseIdParam`.
- Удаление комнаты каскадно уничтожает ВСЕ её данные — UI требует подтверждения.
- README ссылается на файлы `Структура файлов бэк.txt`, `Структура файлов фронт.txt`,
  `Ключевые правила.txt` — в репозитории их нет (устаревшая ссылка).
- `server/package.json` содержит скрипты `migrate:*` на несуществующий `src/database/knexfile.ts` — нерабочие relic-скрипты.
- Функциональность «карта для игрока» частично: MapViewer существует, но редактор токенов — основная фича мастера.
- ⚠️ **БАГ #1 (подтверждён автором, будет исправлен):** глобальные `UNIQUE`-индексы на `name`
  в справочниках `effects`, `races`, `abilities`, `npcs` нарушают принцип per-room изоляции
  (см. 12.5): во второй комнате нельзя создать сущность с именем, уже занятым в первой.
  Исправление описано в 12.8.

## 11. Глоссарий

| Термин | Значение |
|---|---|
| Комната (room) | Изолированное игровое пространство, единица мультиарендности |
| Эффект (effect) | Модификатор одного атрибута стата, с длительностью в ходах/днях |
| Способность (ability) | Активная (с кулдауном, ссылается на effect) или пассивная |
| Предмет (item) | Инвентарный объект; active/passive эффекты; редкость |
| Токен карты | Фишка игрока/NPC на изображении карты (x,y,scale,is_grayscale) |
| Раунд / Ход | Единицы боевого времени; end-round списывает remaining_turns |
| Advance day | Команда мастера: списание remaining_days вне боя |
| Final stats | Итоговые статы, рассчитанные сервером (base + race + equipment + effects) |

---

## 12. Замысел автора и дорожная карта (уточнения владельца, 2026-10-16)

Этот раздел — «product intent»: как автор видит систему. Для нейросети это приоритетный
контекст при принятии дизайн-решений.

### 12.1 Время и эффекты
- «Завершить день» (`advance-day`) — ручная кнопка мастера **вне боя**, нажимается в конце
  игрового дня по сюжету. Автоматизации не планируется; фича навсегда остаётся ручной.

### 12.2 Бой и броски
- Кубики бросаются **вне сайта** (физические/чужие инструменты), результат вводит мастер вручную.
- Запланировано: результат броска должен суммироваться с характеристикой персонажа.
  Формула/характеристика **ещё не выбраны** — не реализовывать до уточнения автором.
- Раунд = полный проход очереди инициативы (конец раунда — после последнего по инициативе).
- Вступление новых бойцов в идущий бой — по той же схеме, что и стартовое распределение.

### 12.3 Доступ и роли
- Игрок входит по паролю персонажа, привязанному к активной комнате. Подтверждено как корректное поведение.
- Регистрация аккаунтов: решение за автором, сейчас её нет и не добавлять.
- Роли: сознательная жёсткая двойственность Мастер/Игрок. Третьи роли не проектировать.

### 12.4 Карты
- Сейчас и должно быть: игрок видит карту полностью и видит **всех** токенов.
- В будущем (по желанию): чат, туман войны, скрытие отдельных токенов.

### 12.5 Данные комнат
- Все справочные сущности (эффекты, способности, предметы, расы, NPC) — per-room,
  у каждой комнаты свой набор. Глобальных шаблонов нет.
- ⚠️ Реализация индексов `name` сейчас НЕ соответствует этому замыслу — см. БАГ #1 (12.8).

### 12.6 Логи vs чат
- `logs` — журнал действий, не переделывать в чат. Чат (когда появится) — отдельная подсистема
  с собственными таблицами/событиями сокета.

### 12.7 Приоритеты развития (бэклог автора)
0. **БАГ #1 — исправить глобальные UNIQUE-индексы на name** (см. 12.8).
1. **Чат** (мастер ↔ игроки, вероятно realtime через Socket.IO; отдельно от логов).
2. **Туман войны / скрытие токенов** на карте для игроков.
3. Суммирование бросков кубиков с характеристикой (формула TBD).

> Правило для AI-агентов: новые фичи из этого бэклога реализовывать только по явному запросу
> автора; остальной функционал менять консервативно, сохраняя описанные выше инварианты.

### 12.8 БАГ #1 (подтверждён автором): глобальная уникальность `name` вместо per-room

**Суть.** Замысел (12.5): у каждой комнаты свой набор справочных сущностей. Но в схеме БД
(`server/src/db/init.ts`) таблицы `effects` (строка ~45), `races` (~94), `abilities` (~195)
и `npcs` (~388) объявлены с `.unique()` на колонке `name` — индекс глобален между всеми
комнатами. Следствие: во второй комнате невозможно создать, например, эффект или NPC
«Огненная стрела», если такое имя уже есть в первой (SQLite/Postgres вернут ошибку
UNIQUE constraint violation).

**Целевое поведение.** Уникальность имени — в пределах одной комнаты: `UNIQUE(room_id, name)`.

**План исправления (для AI-агента):**
1. В `db/init.ts` в ad-hoc-стиле существующих миграций (проверка через `sqlite_master` /
   `hasIndex`, try/catch для идемпотентности):
   - удалить старый одиночный unique-индекс на `name` у четырёх таблиц;
   - создать `CREATE UNIQUE INDEX IF NOT EXISTS <table>_name_room_unique ON <table>(room_id, name);`
   (Knex: `db.schema.alterTable(...)` c `table.unique(["room_id", "name"], ...)`, но в SQLite
   drop индекса делается напрямую `db.raw("DROP INDEX ...")`).
2. Проверить роутеры/сторы: нигде не должно быть логики «имя свободно» на основе глобального
   поиска; конфликты проверять в границах `roomId` (можно опираться на ConstraintError
   при INSERT вместо предварительной проверки).
3. Миграция безопасна при пустых/непересекающихся данных; при наличии дублей внутри одной
   комнаты (крайне маловероятно) миграция упадёт — это ожидаемо и сигнализирует о «грязных» данных.
4. После фикса обновить раздел 4 (пометки ⚠️ снять) и убрать пункт 0 из бэклога 12.7.
