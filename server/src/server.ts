// server/src/server.ts

import app, { startApp } from "./app.js";

const PORT = process.env.PORT || 5000;

startApp()
  .then((server) => {
    server.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Ошибка при старте приложения:", err);
    process.exit(1);
  });
