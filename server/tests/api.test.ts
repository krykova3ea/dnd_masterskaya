import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool from '../src/db/pool';

const api = request(app);

describe('GET /api/entities', () => {
  it('возвращает список сущностей', async () => {
    const res = await api.get('/api/entities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('каждая сущность имеет обязательные поля', async () => {
    const res = await api.get('/api/entities');
    const entity = res.body[0];
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('name');
    expect(entity).toHaveProperty('type');
    expect(entity).toHaveProperty('importance');
    expect(entity).toHaveProperty('children_count');
  });

  it('фильтрует по типу', async () => {
    const res = await api.get('/api/entities?type=Мир');
    expect(res.status).toBe(200);
    expect(res.body.every((e: { type: string }) => e.type === 'Мир')).toBe(true);
  });

  it('фильтрует по важности', async () => {
    const res = await api.get('/api/entities?importance=Средняя');
    expect(res.status).toBe(200);
    expect(res.body.every((e: { importance: string }) => e.importance === 'Средняя')).toBe(true);
  });

  it('ищет по названию', async () => {
    const res = await api.get('/api/entities?search=Фаэр');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some((e: { name: string }) => e.name.includes('Фаэр'))).toBe(true);
  });

  it('фильтрует по parent_id', async () => {
    const res = await api.get('/api/entities?parent_id=1');
    expect(res.status).toBe(200);
    expect(res.body.every((e: { parent_id: number }) => e.parent_id === 1)).toBe(true);
  });

  it('фильтрует корневые сущности (parent_id=null)', async () => {
    const res = await api.get('/api/entities?parent_id=null');
    expect(res.status).toBe(200);
    expect(res.body.every((e: { parent_id: number | null }) => e.parent_id === null)).toBe(true);
  });
});

describe('GET /api/entities/:id', () => {
  it('возвращает сущность с атрибутами', async () => {
    const res = await api.get('/api/entities/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('attributes');
    expect(Array.isArray(res.body.attributes)).toBe(true);
  });

  it('возвращает 404 для несуществующей сущности', async () => {
    const res = await api.get('/api/entities/99999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/entities/:id/ancestors', () => {
  it('возвращает цепочку предков', async () => {
    const res = await api.get('/api/entities/1/ancestors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(1);
  });
});

describe('POST /api/entities', () => {
  let createdId: number;

  afterEach(async () => {
    if (createdId) {
      await pool.query('DELETE FROM entities WHERE id = $1', [createdId]);
      createdId = 0;
    }
  });

  it('создаёт сущность', async () => {
    const res = await api
      .post('/api/entities')
      .send({ name: 'Тест-Создание', type: 'Предмет', parent_id: null, importance: 'Низкая' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Тест-Создание');
    expect(res.body.type).toBe('Предмет');
    expect(res.body.importance).toBe('Низкая');
    createdId = res.body.id;
  });

  it('возвращает 400 без name', async () => {
    const res = await api.post('/api/entities').send({ type: 'Предмет' });
    expect(res.status).toBe(400);
  });

  it('возвращает 400 без type', async () => {
    const res = await api.post('/api/entities').send({ name: 'Тест' });
    expect(res.status).toBe(400);
  });

  it('возвращает 400 при несуществующем родителе', async () => {
    const res = await api
      .post('/api/entities')
      .send({ name: 'Тест', type: 'Предмет', parent_id: 99999 });
    expect(res.status).toBe(400);
  });

  it('возвращает 400 при невалидном типе', async () => {
    const res = await api
      .post('/api/entities')
      .send({ name: 'Тест', type: 'НесуществующийТип' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Недопустимый тип');
  });
});

describe('PUT /api/entities/:id', () => {
  let createdId: number;

  beforeEach(async () => {
    const res = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Обновление', 'Предмет', 'Средняя') RETURNING id`
    );
    createdId = res.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM entities WHERE id = $1', [createdId]);
  });

  it('обновляет имя сущности', async () => {
    const res = await api
      .put(`/api/entities/${createdId}`)
      .send({ name: 'Обновлённое имя' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Обновлённое имя');
  });

  it('позволяет очистить описание', async () => {
    const res = await api
      .put(`/api/entities/${createdId}`)
      .send({ description: '' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('');
  });

  it('сохраняет описание при partial update', async () => {
    await pool.query('UPDATE entities SET description = $1 WHERE id = $2', ['Тестовое описание', createdId]);
    const res = await api
      .put(`/api/entities/${createdId}`)
      .send({ name: 'Новое имя без описания' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Новое имя без описания');
    expect(res.body.description).toBe('Тестовое описание');
  });

  it('возвращает 400 при невалидном типе', async () => {
    const res = await api
      .put(`/api/entities/${createdId}`)
      .send({ type: 'НесуществующийТип' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Недопустимый тип');
  });

  it('запрещает циклическую ссылку (self as parent)', async () => {
    const res = await api
      .put(`/api/entities/${createdId}`)
      .send({ parent_id: createdId });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('родителем');
  });

  it('возвращает 404 для несуществующей сущности', async () => {
    const res = await api.put('/api/entities/99999').send({ name: 'Тест' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/entities/:id', () => {
  it('удаляет сущность без потомков', async () => {
    const createRes = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Удаление', 'Предмет', 'Низкая') RETURNING id`
    );
    const id = createRes.rows[0].id;

    const res = await api.delete(`/api/entities/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('удалена');

    const check = await pool.query('SELECT id FROM entities WHERE id = $1', [id]);
    expect(check.rows.length).toBe(0);
  });

  it('блокирует удаление с потомками (409)', async () => {
    const res = await api.delete('/api/entities/1');
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('children_count');
    expect(res.body).toHaveProperty('hint');
  });

  it('рекурсивно удаляет с потомками', async () => {
    const parent = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Родитель', 'Мир', 'Низкая') RETURNING id`
    );
    const parentId = parent.rows[0].id;

    const child = await pool.query(
      `INSERT INTO entities (name, type, parent_id, importance) VALUES ('Тест-Дочь', 'Локация', $1, 'Низкая') RETURNING id`,
      [parentId]
    );
    const childId = child.rows[0].id;

    const res = await api.delete(`/api/entities/${parentId}?recursive=true`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('потомки');

    const checkParent = await pool.query('SELECT id FROM entities WHERE id = $1', [parentId]);
    const checkChild = await pool.query('SELECT id FROM entities WHERE id = $1', [childId]);
    expect(checkParent.rows.length).toBe(0);
    expect(checkChild.rows.length).toBe(0);
  });

  it('возвращает 404 для несуществующей сущности', async () => {
    const res = await api.delete('/api/entities/99999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/stats', () => {
  it('возвращает статистику', async () => {
    const res = await api.get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_entities');
    expect(res.body).toHaveProperty('total_attributes');
    expect(res.body).toHaveProperty('by_type');
    expect(res.body).toHaveProperty('by_importance');
    expect(res.body).toHaveProperty('recent');
    expect(res.body.total_entities).toBeGreaterThan(0);
    expect(Array.isArray(res.body.by_type)).toBe(true);
    expect(Array.isArray(res.body.recent)).toBe(true);
  });
});

describe('GET /api/export', () => {
  it('экспортирует все данные', async () => {
    const res = await api.get('/api/export');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entities');
    expect(res.body).toHaveProperty('attributes');
    expect(res.body).toHaveProperty('relations');
    expect(res.body).toHaveProperty('exported_at');
    expect(Array.isArray(res.body.entities)).toBe(true);
    expect(res.body.entities.length).toBeGreaterThan(0);
  });
});

describe('Relations', () => {
  let sourceId: number;
  let targetId: number;
  let relationId: number;

  beforeAll(async () => {
    const s = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Источник', 'Персонаж', 'Средняя') RETURNING id`
    );
    sourceId = s.rows[0].id;

    const t = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Цель', 'Персонаж', 'Средняя') RETURNING id`
    );
    targetId = t.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM entities WHERE id IN ($1, $2)', [sourceId, targetId]);
  });

  afterEach(async () => {
    if (relationId) {
      await pool.query('DELETE FROM relations WHERE id = $1', [relationId]);
      relationId = 0;
    }
  });

  it('создаёт связь', async () => {
    const res = await api
      .post(`/api/entities/${sourceId}/relations`)
      .send({ target_id: targetId, relation_type: 'союзник', description: 'тест' });
    expect(res.status).toBe(201);
    expect(res.body.source_id).toBe(sourceId);
    expect(res.body.target_id).toBe(targetId);
    relationId = res.body.id;
  });

  it('запрещает дубликат связи', async () => {
    const create = await api
      .post(`/api/entities/${sourceId}/relations`)
      .send({ target_id: targetId, relation_type: 'союзник' });
    relationId = create.body.id || 0;

    const res = await api
      .post(`/api/entities/${sourceId}/relations`)
      .send({ target_id: targetId, relation_type: 'союзник' });
    expect(res.status).toBe(409);
  });

  it('получает связи сущности', async () => {
    const res = await api.get(`/api/entities/${sourceId}/relations`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('удаляет связь', async () => {
    const create = await api
      .post(`/api/entities/${sourceId}/relations`)
      .send({ target_id: targetId, relation_type: 'враг' });
    const relId = create.body.id;

    const res = await api.delete(`/api/relations/${relId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('удалена');
  });
});

describe('Attributes', () => {
  let entityId: number;
  let otherEntityId: number;
  let attrId: number;

  beforeEach(async () => {
    const e = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Атрибуты', 'Предмет', 'Средняя') RETURNING id`
    );
    entityId = e.rows[0].id;

    const o = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Другая', 'Предмет', 'Средняя') RETURNING id`
    );
    otherEntityId = o.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM entities WHERE id IN ($1, $2)', [entityId, otherEntityId]);
  });

  it('создаёт атрибут', async () => {
    const res = await api
      .post(`/api/entities/${entityId}/attributes`)
      .send({ attr_key: 'Сила', attr_value: '18' });
    expect(res.status).toBe(201);
    expect(res.body.attr_key).toBe('Сила');
    expect(res.body.attr_value).toBe('18');
    expect(res.body.entity_id).toBe(entityId);
    attrId = res.body.id;
  });

  it('возвращает 400 без attr_key', async () => {
    const res = await api
      .post(`/api/entities/${entityId}/attributes`)
      .send({ attr_value: '18' });
    expect(res.status).toBe(400);
  });

  it('обновляет атрибут', async () => {
    const create = await api
      .post(`/api/entities/${entityId}/attributes`)
      .send({ attr_key: 'Сила', attr_value: '18' });
    attrId = create.body.id;

    const res = await api
      .put(`/api/entities/${entityId}/attributes/${attrId}`)
      .send({ attr_key: 'Ловкость', attr_value: '16' });
    expect(res.status).toBe(200);
    expect(res.body.attr_key).toBe('Ловкость');
    expect(res.body.attr_value).toBe('16');
  });

  it('запрещает обновление через чужой entity ID (404)', async () => {
    const create = await api
      .post(`/api/entities/${entityId}/attributes`)
      .send({ attr_key: 'Сила', attr_value: '18' });
    attrId = create.body.id;

    const res = await api
      .put(`/api/entities/${otherEntityId}/attributes/${attrId}`)
      .send({ attr_key: 'Ловкость', attr_value: '16' });
    expect(res.status).toBe(404);
  });

  it('удаляет атрибут', async () => {
    const create = await api
      .post(`/api/entities/${entityId}/attributes`)
      .send({ attr_key: 'Сила', attr_value: '18' });
    attrId = create.body.id;

    const res = await api.delete(`/api/entities/${entityId}/attributes/${attrId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('удалён');
  });

  it('возвращает 404 при удалении несуществующего атрибута', async () => {
    const res = await api.delete(`/api/entities/${entityId}/attributes/99999`);
    expect(res.status).toBe(404);
  });

  it('запрещает удаление через чужой entity ID (404)', async () => {
    const create = await api
      .post(`/api/entities/${entityId}/attributes`)
      .send({ attr_key: 'Сила', attr_value: '18' });
    attrId = create.body.id;

    const res = await api.delete(`/api/entities/${otherEntityId}/attributes/${attrId}`);
    expect(res.status).toBe(404);

    await pool.query('DELETE FROM attributes WHERE id = $1', [attrId]);
  });
});

describe('Import', () => {
  it('экспорт → импорт → проверка целостности', async () => {
    const exportRes = await api.get('/api/export');
    const data = exportRes.body;

    const res = await api.post('/api/import').send(data);
    expect(res.status).toBe(200);
    expect(res.body.entities_count).toBe(data.entities.length);
    expect(res.body.attributes_count).toBe(data.attributes.length);
    expect(res.body.relations_count).toBe(data.relations.length);

    const verifyRes = await api.get('/api/export');
    expect(verifyRes.body.entities.length).toBe(data.entities.length);
    expect(verifyRes.body.attributes.length).toBe(data.attributes.length);
  });

  it('импорт пустых массивов', async () => {
    const backup = (await api.get('/api/export')).body;

    const res = await api.post('/api/import').send({ entities: [], attributes: [] });
    expect(res.status).toBe(200);
    expect(res.body.entities_count).toBe(0);
    expect(res.body.attributes_count).toBe(0);

    await api.post('/api/import').send(backup);
  });

  it('возвращает 400 при неверном формате', async () => {
    const res = await api.post('/api/import').send({ entities: 'не массив' });
    expect(res.status).toBe(400);
  });
});

describe('Image upload', () => {
  let entityId: number;

  beforeEach(async () => {
    const e = await pool.query(
      `INSERT INTO entities (name, type, importance) VALUES ('Тест-Изображение', 'Персонаж', 'Средняя') RETURNING id`
    );
    entityId = e.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM entities WHERE id = $1', [entityId]);
  });

  it('загружает PNG изображение', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const res = await api
      .post(`/api/entities/${entityId}/image`)
      .attach('image', pngBuffer, 'test.png');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('image_url');
    expect(res.body.image_url).toMatch(/^\/uploads\//);
  });

  it('возвращает 404 при загрузке на несуществующую сущность', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const res = await api
      .post('/api/entities/99999/image')
      .attach('image', pngBuffer, 'test.png');
    expect(res.status).toBe(404);
  });

  it('удаляет изображение', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await api.post(`/api/entities/${entityId}/image`).attach('image', pngBuffer, 'test.png');

    const res = await api.delete(`/api/entities/${entityId}/image`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('удалено');
  });

  it('возвращает 404 при удалении без изображения', async () => {
    const res = await api.delete(`/api/entities/${entityId}/image`);
    expect(res.status).toBe(404);
  });
});

describe('Health check', () => {
  it('GET /api/health возвращает ok', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
