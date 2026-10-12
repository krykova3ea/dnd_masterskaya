# D&D Мастерская

Веб-сервис для мастера настольных ролевых игр — картотека игровых персонажей, локаций, предметов и других сущностей с поддержкой произвольной иерархии, связей и загрузки изображений.

## Стек технологий (PERN + TypeScript + Docker)

| Технология | Назначение |
|---|---|
| **PostgreSQL 17** | Реляционная база данных |
| **Express.js** (Node.js 20) | REST API сервер |
| **React** + React Router | SPA клиентская часть |
| **TypeScript** | Типизация (фронтенд и бэкенд) |
| **SCSS** | Препроцессор CSS (`@use`, CSS variables) |
| **Vite** | Сборка и транспиляция (JSX/TS/SCSS → браузерный JS) |
| **Multer** | Загрузка изображений (JPEG, PNG, WebP) |
| **Helmet** | HTTP-заголовки безопасности |
| **Vitest** + Testing Library + Supertest | Тестирование (72 теста) |
| **Docker** | Контейнеризация для развёртывания |

## Структура проекта

```
Diplom/
├── client/              # React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/  # EntityTree, EntityNode, FilterPanel, EntityForm,
│   │   │                # AttributeEditor, RelationEditor, SearchBar,
│   │   │                # Breadcrumbs, Button, ErrorBoundary
│   │   ├── pages/       # MainPage, EntityEditorPage, EntityDetailPage,
│   │   │                # DashboardPage, NotFoundPage
│   │   ├── api/         # API-клиент (fetch)
│   │   ├── types/       # TypeScript типы
│   │   ├── styles/      # SCSS (_variables, global, components)
│   │   └── test/        # Vitest + Testing Library (26 тестов)
│   └── vite.config.ts
├── server/              # Express + TypeScript
│   └── src/
│       ├── routes/      # REST маршруты (entities, export, stats, relations)
│       ├── controllers/ # CRUD, рекурсивное удаление, изображения, связи
│       ├── middleware/  # Multer (загрузка файлов)
│       ├── db/          # Пул соединений PostgreSQL
│       ├── types/       # TypeScript типы
│       ├── app.ts       # Express-приложение (экспорт для тестов)
│       └── server.ts    # Точка входа (listen)
│   └── tests/           # Vitest + Supertest (46 тестов)
├── db/
│   ├── schema.sql       # Схема БД (entities + attributes + relations)
│   └── seed.sql         # Начальные данные (Фаэрун)
├── Dockerfile           # Multi-stage сборка (USER node)
├── docker-compose.yml   # PostgreSQL + приложение
├── .dockerignore        # Исключения из Docker-контекста
└── docs/                # Пояснительная записка (.docx)
```

## Локальный запуск (разработка)

### Предварительные требования

- Node.js 20+ (рекомендуется установка через [nvm](https://github.com/nvm-sh/nvm))
- PostgreSQL 15+

### 1. Инициализация базы данных

```bash
psql -U postgres -d dnd_workshop -f db/schema.sql
psql -U postgres -d dnd_workshop -f db/seed.sql
```

(При необходимости сначала создайте базу: `psql -U postgres -c "CREATE DATABASE dnd_workshop;"`)

### 2. Запуск сервера

```bash
cd server
cp .env.example .env   # при необходимости отредактируйте
npm install
npm run dev            # http://localhost:3001
```

### 3. Запуск клиента

```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

Откройте `http://localhost:5173` в браузере. Vite проксирует API-запросы на `localhost:3001`.

## Развёртывание через Docker

```bash
docker compose up --build
```

Приложение будет доступно на `http://localhost:3001`. База данных инициализируется автоматически при первом запуске.

## База данных

### Схема

```sql
CREATE TABLE entities (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    type          VARCHAR(50)  NOT NULL,
    parent_id     INTEGER REFERENCES entities(id) ON DELETE RESTRICT,
    description   TEXT,
    importance    VARCHAR(30)  NOT NULL DEFAULT 'Средняя',
    image_url     VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE attributes (
    id          SERIAL PRIMARY KEY,
    entity_id   INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    attr_key    VARCHAR(50)  NOT NULL,
    attr_value  VARCHAR(255) NOT NULL
);

CREATE TABLE relations (
    id            SERIAL PRIMARY KEY,
    source_id     INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    target_id     INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    relation_type VARCHAR(50)  NOT NULL,
    description   TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### API

| Метод | Маршрут | Описание |
|---|---|---|
| GET | `/api/entities` | Список сущностей (фильтры: ?type, ?importance, ?date_from, ?date_to, ?parent_id, ?search; пагинация: ?page, ?limit) |
| GET | `/api/entities/:id` | Сущность с атрибутами |
| GET | `/api/entities/:id/ancestors` | Цепочка предков (хлебные крошки) |
| POST | `/api/entities` | Создать сущность (валидация типа) |
| PUT | `/api/entities/:id` | Обновить (partial update, валидация типа) |
| DELETE | `/api/entities/:id` | Удалить (409 если есть дети; ?recursive=true — каскад) |
| POST | `/api/entities/:id/image` | Загрузить изображение (multipart/form-data, max 5 МБ) |
| DELETE | `/api/entities/:id/image` | Удалить изображение |
| GET | `/api/entities/:id/attributes` | Атрибуты сущности |
| POST | `/api/entities/:id/attributes` | Добавить атрибут |
| PUT | `/api/entities/:id/attributes/:attrId` | Обновить атрибут (проверка entity_id) |
| DELETE | `/api/entities/:id/attributes/:attrId` | Удалить атрибут (проверка entity_id) |
| GET | `/api/entities/:id/relations` | Связи сущности (исходящие + входящие) |
| POST | `/api/entities/:id/relations` | Создать связь |
| DELETE | `/api/relations/:relationId` | Удалить связь |
| GET | `/api/stats` | Статистика (по типам, важности, последние) |
| GET | `/api/export` | Экспорт всех данных в JSON |
| POST | `/api/import` | Импорт данных (полная замена, bulk insert) |
| GET | `/api/health` | Health check |

## Тестирование

```bash
# Серверные тесты (46 тестов: CRUD, атрибуты, связи, импорт, изображения)
cd server && npm test

# Клиентские тесты (26 тестов: формат, Button, SearchBar, Breadcrumbs, EntityTree, NotFoundPage)
cd client && npm test
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3001` | Порт сервера |
| `DB_HOST` | `localhost` | Хост PostgreSQL |
| `DB_PORT` | `5432` | Порт PostgreSQL |
| `DB_USER` | `postgres` | Пользователь БД |
| `DB_PASSWORD` | `postgres` | Пароль БД |
| `DB_NAME` | `dnd_workshop` | Имя БД |
| `UPLOAD_DIR` | `./uploads` | Директория для загруженных изображений |
| `CORS_ORIGIN` | `http://localhost:5173` | Разрешённый CORS origin |
