-- ============================================================================
-- D&D Мастерская — Схема базы данных
-- СУБД: PostgreSQL
-- ============================================================================

-- Таблица сущностей (универсальная: персонаж, локация, предмет, квест и др.)
-- Любая сущность может содержать внутри себя другие сущности (parent_id).
CREATE TABLE IF NOT EXISTS entities (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    type          VARCHAR(50)  NOT NULL,
    parent_id     INTEGER REFERENCES entities(id) ON DELETE RESTRICT,
    description   TEXT,
    importance    VARCHAR(30)  NOT NULL DEFAULT 'Средняя',
    image_url     VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Таблица атрибутов (гибкая схема — произвольные пары ключ-значение)
-- Позволяет добавлять любые характеристики: сила/ловкость, вес/цена и т.д.
CREATE TABLE IF NOT EXISTS attributes (
    id          SERIAL PRIMARY KEY,
    entity_id   INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    attr_key    VARCHAR(50)  NOT NULL,
    attr_value  VARCHAR(255) NOT NULL
);

-- Индексы для часто используемых фильтров
CREATE INDEX IF NOT EXISTS idx_entities_type       ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_importance ON entities(importance);
CREATE INDEX IF NOT EXISTS idx_entities_parent     ON entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_created    ON entities(created_at);
CREATE INDEX IF NOT EXISTS idx_attributes_entity   ON attributes(entity_id);

-- Ограничение: важность — предопределённые значения
ALTER TABLE entities DROP CONSTRAINT IF EXISTS chk_importance;
ALTER TABLE entities ADD CONSTRAINT chk_importance
    CHECK (importance IN ('Низкая', 'Средняя', 'Высокая', 'Ключевая для сюжета'));

-- Ограничение: тип — предопределённые значения
ALTER TABLE entities DROP CONSTRAINT IF EXISTS chk_type;
ALTER TABLE entities ADD CONSTRAINT chk_type
    CHECK (type IN ('Мир', 'Локация', 'Персонаж', 'Предмет', 'Квест', 'Организация', 'Заклинание'));

-- Таблица связей между сущностями (направленные: source → target)
-- Помимо иерархии (parent_id) позволяет задавать произвольные связи:
-- "владеет", "союзник", "член", "находится в" и т.д.
CREATE TABLE IF NOT EXISTS relations (
    id            SERIAL PRIMARY KEY,
    source_id     INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    target_id     INTEGER REFERENCES entities(id) ON DELETE CASCADE,
    relation_type VARCHAR(50)  NOT NULL,
    description   TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
