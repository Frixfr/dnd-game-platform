// server/src/app.ts

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initializeDatabase } from "./db/init.js";
import { initSocket } from "./socket/index.js";
import { authMaster } from "./middleware/authMaster.js";

// Импорт роутеров
import playersRouter from "./routes/players.js";
import effectsRouter from "./routes/effects.js";
import abilitiesRouter from "./routes/abilities.js";
import itemsRouter from "./routes/items.js";
import npcsRouter from "./routes/npcs.js";
import playerAbilitiesRouter from "./routes/playerAbilities.js";
import playerItemsRouter from "./routes/playerItems.js";
import playerEffectsRouter from "./routes/playerEffects.js";
import npcAbilitiesRoutes from "./routes/npcAbilities.js";
import npcItemsRoutes from "./routes/npcItems.js";
import npcEffectsRoutes from "./routes/npcEffects.js";
import racesRouter from "./routes/races.js";
import combatRouter from "./routes/combat.js";
import logsRouter from "./routes/logs.js";
import mapsRouter from "./routes/maps.js";
import masterRouter from "./routes/master.js";
import roomsRouter from "./routes/rooms.js";

const app = express();
const server = createServer(app);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("http://172.");
      callback(null, allowed);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static("uploads"));

// Health check (без авторизации)
app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Публичные роутеры (без авторизации)
app.use("/api/master", masterRouter); // только /login
app.use("/api/rooms", roomsRouter); // /enter не требует authMaster, остальное требует

// Роутеры, требующие авторизации мастера с roomId
// Применяем authMaster ко всем остальным маршрутам
app.use("/api/players", authMaster, playersRouter);
app.use("/api/effects", authMaster, effectsRouter);
app.use("/api/abilities", authMaster, abilitiesRouter);
app.use("/api/items", authMaster, itemsRouter);
app.use("/api/npcs", authMaster, npcsRouter);
app.use("/api/player-abilities", authMaster, playerAbilitiesRouter);
app.use("/api/player-items", authMaster, playerItemsRouter);
app.use("/api/player-active-effects", authMaster, playerEffectsRouter);
app.use("/api/npc-abilities", authMaster, npcAbilitiesRoutes);
app.use("/api/npc-items", authMaster, npcItemsRoutes);
app.use("/api/npc-effects", authMaster, npcEffectsRoutes);
app.use("/api/races", authMaster, racesRouter);
app.use("/api/combat", authMaster, combatRouter);
app.use("/api/logs", authMaster, logsRouter);
app.use("/api/maps", authMaster, mapsRouter);

// Функция для запуска приложения (инициализация БД и сокетов)
export async function startApp() {
  await initializeDatabase();
  const io = initSocket(server);
  // Передаём io в app для использования в роутерах
  app.set("io", io);
  return server;
}

export default app;
