// server/src/app.ts

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initializeDatabase } from "./db/init.js";
import { initSocket } from "./socket/index.js";

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

const app = express();
const server = createServer(app);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // В разработке разрешаем всё (или проверяем на локальные адреса)
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Подключение роутеров
app.use("/api/players", playersRouter);
app.use("/api/effects", effectsRouter);
app.use("/api/abilities", abilitiesRouter);
app.use("/api/items", itemsRouter);
app.use("/api/npcs", npcsRouter);
app.use("/api/player-abilities", playerAbilitiesRouter);
app.use("/api/player-items", playerItemsRouter);
app.use("/api/player-active-effects", playerEffectsRouter);
app.use("/api/npc-abilities", npcAbilitiesRoutes);
app.use("/api/npc-items", npcItemsRoutes);
app.use("/api/npc-effects", npcEffectsRoutes);
app.use("/api/races", racesRouter);

// Функция для запуска приложения (инициализация БД и сокетов)
export async function startApp() {
  await initializeDatabase();
  initSocket(server);
  return server;
}

export default app;
