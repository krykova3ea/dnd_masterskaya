#!/bin/sh
set -e

echo "Ожидание запуска PostgreSQL..."
until node -e "
  const { Client } = require('pg');
  const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  c.connect().then(() => c.end()).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "PostgreSQL недоступен, повтор через 2с..."
  sleep 2
done

echo "PostgreSQL доступен. Проверка схемы..."

# Проверяем, есть ли таблица entities; если нет — создаём схему и наполняем данными
node -e "
  const { Client } = require('pg');
  const fs = require('fs');
  const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  c.connect()
    .then(() => c.query(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entities')\"))
    .then(r => {
      if (!r.rows[0].exists) {
        console.log('Таблица entities не найдена. Создаём схему...');
        const schema = fs.readFileSync('./db/schema.sql', 'utf8');
        return c.query(schema).then(() => {
          console.log('Схема создана. Загружаем начальные данные...');
          const seed = fs.readFileSync('./db/seed.sql', 'utf8');
          return c.query(seed);
        });
      }
      console.log('Схема уже существует, пропуск инициализации.');
    })
    .then(() => c.end())
    .then(() => console.log('Инициализация БД завершена.'))
    .catch(err => { console.error('Ошибка инициализации БД:', err); process.exit(1); });
"

echo "Запуск сервера..."
node dist/server.js
