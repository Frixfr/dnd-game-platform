// server/src/server.ts

import { startApp } from "./app.js";

const PORT = Number(process.env.PORT) || 5000; // преобразуем в число
const HOST = process.env.HOST || "0.0.0.0";

startApp()
  .then((server) => {
    server.listen(PORT, HOST, () => {
      console.log(`Сервер запущен на ${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Ошибка при старте приложения:", err);
    process.exit(1);
  });
