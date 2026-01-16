import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

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
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Обработка подключений WebSocket
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Отключились:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});