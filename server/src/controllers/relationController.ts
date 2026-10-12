import { Request, Response } from 'express';
import pool from '../db/pool';

// Получить все связи сущности (исходящие и входящие)
export async function getRelations(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);

    const result = await pool.query(
      `SELECT r.*,
        s.name AS source_name, s.type AS source_type,
        t.name AS target_name, t.type AS target_type,
        CASE WHEN r.source_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction
       FROM relations r
       JOIN entities s ON r.source_id = s.id
       JOIN entities t ON r.target_id = t.id
       WHERE r.source_id = $1 OR r.target_id = $1
       ORDER BY r.created_at DESC`,
      [entityId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении связей:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Создать связь
export async function createRelation(req: Request, res: Response): Promise<void> {
  try {
    const sourceId = parseInt(req.params.id, 10);
    const { target_id, relation_type, description } = req.body;

    if (!target_id || !relation_type) {
      res.status(400).json({ error: 'Поля "target_id" и "relation_type" обязательны' });
      return;
    }

    if (sourceId === target_id) {
      res.status(400).json({ error: 'Сущность не может быть связана сама с собой' });
      return;
    }

    // Проверка существования обеих сущностей
    const entityCheck = await pool.query(
      'SELECT id FROM entities WHERE id IN ($1, $2)',
      [sourceId, target_id]
    );
    if (entityCheck.rows.length < 2) {
      res.status(404).json({ error: 'Одна или обе сущности не найдены' });
      return;
    }

    // Проверка дубликата
    const dupCheck = await pool.query(
      'SELECT id FROM relations WHERE source_id = $1 AND target_id = $2 AND relation_type = $3',
      [sourceId, target_id, relation_type]
    );
    if (dupCheck.rows.length > 0) {
      res.status(409).json({ error: 'Такая связь уже существует' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO relations (source_id, target_id, relation_type, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [sourceId, target_id, relation_type, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка при создании связи:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Удалить связь
export async function deleteRelation(req: Request, res: Response): Promise<void> {
  try {
    const relationId = parseInt(req.params.relationId, 10);
    const result = await pool.query('DELETE FROM relations WHERE id = $1 RETURNING id', [relationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Связь не найдена' });
      return;
    }

    res.json({ message: 'Связь удалена' });
  } catch (err) {
    console.error('Ошибка при удалении связи:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
