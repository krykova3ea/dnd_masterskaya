import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'dnd_workshop',
});

pool.on('error', (err) => {
  console.error('Неожиданная ошибка пула подключений PostgreSQL:', err);
  process.exit(-1);
});

export default pool;
