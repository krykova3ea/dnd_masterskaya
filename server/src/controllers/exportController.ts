import { Request, Response } from 'express';
import pool from '../db/pool';

// Экспорт всех данных в JSON
export async function exportData(_req: Request, res: Response): Promise<void> {
  try {
    const entitiesResult = await pool.query('SELECT * FROM entities ORDER BY id');
    const attributesResult = await pool.query('SELECT * FROM attributes ORDER BY id');

    let relationsResult: { rows: unknown[] } = { rows: [] };
    try {
      relationsResult = await pool.query('SELECT * FROM relations ORDER BY id');
    } catch {
      // Таблица relations может не существовать
    }

    const data = {
      entities: entitiesResult.rows,
      attributes: attributesResult.rows,
      relations: relationsResult.rows,
      exported_at: new Date().toISOString(),
    };

    res.json(data);
  } catch (err) {
    console.error('Ошибка экспорта:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Импорт данных из JSON (полная замена)
export async function importData(req: Request, res: Response): Promise<void> {
  const { entities, attributes, relations } = req.body;

  if (!Array.isArray(entities) || !Array.isArray(attributes)) {
    res.status(400).json({ error: 'Неверный формат данных: ожидаются массивы entities и attributes' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Очистка существующих данных
    await client.query('DELETE FROM attributes');
    try {
      await client.query('DELETE FROM relations');
    } catch {
      // Таблицы relations может не существовать
    }
    await client.query('DELETE FROM entities');

    // Сброс последовательностей
    await client.query("SELECT setval('entities_id_seq', 1, false)");
    await client.query("SELECT setval('attributes_id_seq', 1, false)");

    // Импорт сущностей (сохраняем оригинальные ID для целостности иерархии)
    if (entities.length > 0) {
      const entityCols = 8;
      const entityPlaceholders: string[] = [];
      const entityValues: unknown[] = [];
      entities.forEach((e: Record<string, unknown>, i: number) => {
        const base = i * entityCols;
        entityPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`);
        entityValues.push(e.id, e.name, e.type, e.parent_id, e.description, e.importance, e.image_url, e.created_at);
      });
      await client.query(
        `INSERT INTO entities (id, name, type, parent_id, description, importance, image_url, created_at)
         VALUES ${entityPlaceholders.join(', ')}`,
        entityValues
      );
    }

    // Импорт атрибутов
    if (attributes.length > 0) {
      const attrCols = 4;
      const attrPlaceholders: string[] = [];
      const attrValues: unknown[] = [];
      attributes.forEach((a: Record<string, unknown>, i: number) => {
        const base = i * attrCols;
        attrPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
        attrValues.push(a.id, a.entity_id, a.attr_key, a.attr_value);
      });
      await client.query(
        `INSERT INTO attributes (id, entity_id, attr_key, attr_value)
         VALUES ${attrPlaceholders.join(', ')}`,
        attrValues
      );
    }

    // Импорт связей (если есть)
    if (Array.isArray(relations) && relations.length > 0) {
      try {
        await client.query("SELECT setval('relations_id_seq', 1, false)");
        const relCols = 6;
        const relPlaceholders: string[] = [];
        const relValues: unknown[] = [];
        relations.forEach((r: Record<string, unknown>, i: number) => {
          const base = i * relCols;
          relPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
          relValues.push(r.id, r.source_id, r.target_id, r.relation_type, r.description, r.created_at);
        });
        await client.query(
          `INSERT INTO relations (id, source_id, target_id, relation_type, description, created_at)
           VALUES ${relPlaceholders.join(', ')}`,
          relValues
        );
      } catch {
        // Таблицы relations может не существовать
      }
    }

    // Обновление последовательностей до максимальных ID
    const maxEntityId = await client.query('SELECT MAX(id) FROM entities');
    if (maxEntityId.rows[0].max) {
      await client.query("SELECT setval('entities_id_seq', $1, true)", [maxEntityId.rows[0].max]);
    }
    const maxAttrId = await client.query('SELECT MAX(id) FROM attributes');
    if (maxAttrId.rows[0].max) {
      await client.query("SELECT setval('attributes_id_seq', $1, true)", [maxAttrId.rows[0].max]);
    }
    // B3 fix: сброс sequence для relations
    try {
      const maxRelId = await client.query('SELECT MAX(id) FROM relations');
      if (maxRelId.rows[0].max) {
        await client.query("SELECT setval('relations_id_seq', $1, true)", [maxRelId.rows[0].max]);
      }
    } catch {
      // Таблицы relations может не существовать
    }

    await client.query('COMMIT');

    res.json({
      message: 'Импорт завершён успешно',
      entities_count: entities.length,
      attributes_count: attributes.length,
      relations_count: Array.isArray(relations) ? relations.length : 0,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка импорта:', err);
    res.status(500).json({ error: 'Ошибка при импорте данных' });
  } finally {
    client.release();
  }
}
