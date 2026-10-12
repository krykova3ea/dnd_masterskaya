import { Request, Response } from 'express';
import pool from '../db/pool';
import { Entity, CreateEntityDTO, UpdateEntityDTO, EntityFilters } from '../types';

const VALID_ENTITY_TYPES = ['Мир', 'Локация', 'Персонаж', 'Предмет', 'Квест', 'Организация', 'Заклинание'];

// Получить все сущности с фильтрацией
export async function getEntities(req: Request, res: Response): Promise<void> {
  try {
    const { type, importance, date_from, date_to, parent_id, search, page, limit } = req.query as EntityFilters & { page?: string; limit?: string };

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`e.type = $${paramIdx++}`);
      params.push(type);
    }
    if (importance) {
      conditions.push(`e.importance = $${paramIdx++}`);
      params.push(importance);
    }
    if (date_from) {
      conditions.push(`e.created_at >= $${paramIdx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`e.created_at <= $${paramIdx++}`);
      params.push(date_to);
    }
    if (parent_id) {
      if (parent_id === 'null' || parent_id === '0') {
        conditions.push('e.parent_id IS NULL');
      } else {
        conditions.push(`e.parent_id = $${paramIdx++}`);
        params.push(parseInt(parent_id, 10));
      }
    }
    if (search) {
      conditions.push(`(e.name ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Пагинация (опциональная — если указан page)
    const pageNum = page ? parseInt(page, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 0;

    if (pageNum > 0 && limitNum > 0) {
      const offset = (pageNum - 1) * limitNum;
      const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM entities e ${whereClause}`, params);
      const total = countResult.rows[0].count;

      const query = `
        SELECT e.*, (
          SELECT COUNT(*) FROM entities c WHERE c.parent_id = e.id
        ) AS children_count
        FROM entities e
        ${whereClause}
        ORDER BY e.name
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;
      params.push(limitNum, offset);
      const result = await pool.query(query, params);

      res.set('X-Total-Count', String(total));
      res.set('X-Page', String(pageNum));
      res.set('X-Per-Page', String(limitNum));
      res.set('X-Total-Pages', String(Math.ceil(total / limitNum)));
      res.json(result.rows);
    } else {
      const query = `
        SELECT e.*, (
          SELECT COUNT(*) FROM entities c WHERE c.parent_id = e.id
        ) AS children_count
        FROM entities e
        ${whereClause}
        ORDER BY e.name
      `;
      const result = await pool.query(query, params);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Ошибка при получении сущностей:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Получить одну сущность по id (с атрибутами)
export async function getEntityById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const entityResult = await pool.query('SELECT * FROM entities WHERE id = $1', [id]);

    if (entityResult.rows.length === 0) {
      res.status(404).json({ error: 'Сущность не найдена' });
      return;
    }

    const attrsResult = await pool.query(
      'SELECT * FROM attributes WHERE entity_id = $1 ORDER BY id',
      [id]
    );

    const entity = entityResult.rows[0];
    entity.attributes = attrsResult.rows;
    res.json(entity);
  } catch (err) {
    console.error('Ошибка при получении сущности:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Получить цепочку предков сущности (для хлебных крошек)
export async function getEntityAncestors(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await pool.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, name, type, parent_id, 0 AS depth
        FROM entities WHERE id = $1
        UNION ALL
        SELECT e.id, e.name, e.type, e.parent_id, a.depth + 1
        FROM entities e
        INNER JOIN ancestors a ON e.id = a.parent_id
      )
      SELECT id, name, type, parent_id FROM ancestors ORDER BY depth DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении предков:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Создать сущность
export async function createEntity(req: Request, res: Response): Promise<void> {
  try {
    const { name, type, parent_id, description, importance }: CreateEntityDTO = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Поля "name" и "type" обязательны' });
      return;
    }

    if (!VALID_ENTITY_TYPES.includes(type)) {
      res.status(400).json({ error: `Недопустимый тип. Допустимые: ${VALID_ENTITY_TYPES.join(', ')}` });
      return;
    }

    // Проверка существования родителя
    if (parent_id) {
      const parentCheck = await pool.query('SELECT id FROM entities WHERE id = $1', [parent_id]);
      if (parentCheck.rows.length === 0) {
        res.status(400).json({ error: 'Указанный родитель не существует' });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO entities (name, type, parent_id, description, importance)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        type,
        parent_id || null,
        description || null,
        importance || 'Средняя'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании сущности:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Обновить сущность
export async function updateEntity(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, type, parent_id, description, importance }: UpdateEntityDTO = req.body;

    // Проверка существования
    const existing = await pool.query('SELECT * FROM entities WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Сущность не найдена' });
      return;
    }

    // Предотвращение циклических ссылок (сущность не может быть своим же родителем)
    if (parent_id && parent_id === id) {
      res.status(400).json({ error: 'Сущность не может быть своим собственным родителем' });
      return;
    }

    // Валидация типа
    if (type && !VALID_ENTITY_TYPES.includes(type)) {
      res.status(400).json({ error: `Недопустимый тип. Допустимые: ${VALID_ENTITY_TYPES.join(', ')}` });
      return;
    }

    // Проверка, что новый родитель не является потомком текущей сущности
    if (parent_id && parent_id !== id) {
      const descendantCheck = await pool.query(
        `WITH RECURSIVE descendants AS (
          SELECT id FROM entities WHERE parent_id = $1
          UNION
          SELECT e.id FROM entities e
          INNER JOIN descendants d ON e.parent_id = d.id
        )
        SELECT id FROM descendants WHERE id = $2`,
        [id, parent_id]
      );
      if (descendantCheck.rows.length > 0) {
        res.status(400).json({ error: 'Нельзя указать потомка в качестве родителя (циклическая ссылка)' });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE entities
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           parent_id = $3,
           description = COALESCE($4, description),
           importance = COALESCE($5, importance)
       WHERE id = $6
       RETURNING *`,
      [
        name || null,
        type || null,
        parent_id !== undefined ? (parent_id || null) : existing.rows[0].parent_id,
        description !== undefined ? description : existing.rows[0].description,
        importance || null,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении сущности:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Удалить сущность
// По умолчанию: блокирует удаление, если есть дочерние сущности (409 Conflict)
// При ?recursive=true: рекурсивно удаляет всех потомков
export async function deleteEntity(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const recursive = req.query.recursive === 'true';

    // Проверка существования
    const existing = await pool.query('SELECT * FROM entities WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Сущность не найдена' });
      return;
    }

    // Подсчёт прямых потомков
    const childrenResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM entities WHERE parent_id = $1',
      [id]
    );
    const childrenCount = childrenResult.rows[0].count;

    if (childrenCount > 0 && !recursive) {
      // Блокировка: есть дочерние сущности
      const allDescendants = await pool.query(
        `WITH RECURSIVE descendants AS (
          SELECT id FROM entities WHERE parent_id = $1
          UNION
          SELECT e.id FROM entities e
          INNER JOIN descendants d ON e.parent_id = d.id
        )
        SELECT COUNT(*)::int AS count FROM descendants`,
        [id]
      );
      res.status(409).json({
        error: 'Сущность содержит дочерние элементы',
        children_count: childrenCount,
        total_descendants: allDescendants.rows[0].count,
        hint: 'Используйте ?recursive=true для каскадного удаления'
      });
      return;
    }

    if (recursive && childrenCount > 0) {
      // Рекурсивное удаление: собираем всех потомков и удаляем
      const descendants = await pool.query(
        `WITH RECURSIVE descendants AS (
          SELECT id FROM entities WHERE parent_id = $1
          UNION
          SELECT e.id FROM entities e
          INNER JOIN descendants d ON e.parent_id = d.id
        )
        SELECT id FROM descendants`,
        [id]
      );

      const descendantIds = descendants.rows.map((r: { id: number }) => r.id);

      // Атрибуты удалятся автоматически (ON DELETE CASCADE)
      // Сначала снимаем parent_id у потомков, затем удаляем
      // Используем транзакцию
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Удаляем всех потомков (атрибуты удалятся через CASCADE)
        await client.query(
          `DELETE FROM entities WHERE id = ANY($1::int[])`,
          [descendantIds]
        );

        // Удаляем саму сущность
        await client.query('DELETE FROM entities WHERE id = $1', [id]);

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      res.json({
        message: 'Сущность и все потомки удалены',
        deleted_descendants: descendantIds.length
      });
      return;
    }

    // Простое удаление (нет потомков)
    await pool.query('DELETE FROM entities WHERE id = $1', [id]);
    res.json({ message: 'Сущность удалена' });
  } catch (err) {
    console.error('Ошибка при удалении сущности:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// ============================================================================
// Атрибуты
// ============================================================================

// Получить атрибуты сущности
export async function getAttributes(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);
    const result = await pool.query(
      'SELECT * FROM attributes WHERE entity_id = $1 ORDER BY id',
      [entityId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении атрибутов:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Добавить атрибут
export async function addAttribute(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);
    const { attr_key, attr_value } = req.body;

    if (!attr_key || !attr_value) {
      res.status(400).json({ error: 'Поля "attr_key" и "attr_value" обязательны' });
      return;
    }

    // Проверка существования сущности
    const entityCheck = await pool.query('SELECT id FROM entities WHERE id = $1', [entityId]);
    if (entityCheck.rows.length === 0) {
      res.status(404).json({ error: 'Сущность не найдена' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO attributes (entity_id, attr_key, attr_value)
       VALUES ($1, $2, $3) RETURNING *`,
      [entityId, attr_key, attr_value]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при добавлении атрибута:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Обновить атрибут
export async function updateAttribute(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);
    const attrId = parseInt(req.params.attrId, 10);
    const { attr_key, attr_value } = req.body;

    const result = await pool.query(
      `UPDATE attributes
       SET attr_key = COALESCE($1, attr_key),
           attr_value = COALESCE($2, attr_value)
       WHERE id = $3 AND entity_id = $4
       RETURNING *`,
      [attr_key || null, attr_value || null, attrId, entityId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Атрибут не найден' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при обновлении атрибута:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Удалить атрибут
export async function deleteAttribute(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);
    const attrId = parseInt(req.params.attrId, 10);
    const result = await pool.query(
      'DELETE FROM attributes WHERE id = $1 AND entity_id = $2 RETURNING id',
      [attrId, entityId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Атрибут не найден' });
      return;
    }

    res.json({ message: 'Атрибут удалён' });
  } catch (err) {
    console.error('Ошибка при удалении атрибута:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
