import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import entitiesRouter from './routes/entities';
import exportRouter from './routes/export';
import statsRouter from './routes/stats';
import relationsRouter from './routes/relations';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Раздача загруженных изображений
app.use('/uploads', express.static(UPLOAD_DIR));

// API маршруты
app.use('/api/entities', entitiesRouter);
app.use('/api', exportRouter);
app.use('/api/stats', statsRouter);
app.use('/api', relationsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dnd-workshop-api' });
});

// В production-режиме раздаём собранную клиентскую часть
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback: все не-API маршруты отдают index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
