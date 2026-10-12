import { Request, Response } from 'express';
import pool from '../db/pool';

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const totalEntities = await pool.query('SELECT COUNT(*)::int AS count FROM entities');
    const totalAttributes = await pool.query('SELECT COUNT(*)::int AS count FROM attributes');

    const byType = await pool.query(
      'SELECT type, COUNT(*)::int AS count FROM entities GROUP BY type ORDER BY count DESC'
    );

    const byImportance = await pool.query(
      `SELECT importance, COUNT(*)::int AS count FROM entities
       GROUP BY importance
       ORDER BY CASE importance
         WHEN 'Ключевая для сюжета' THEN 1
         WHEN 'Высокая' THEN 2
         WHEN 'Средняя' THEN 3
         WHEN 'Низкая' THEN 4
       END`
    );

    const recent = await pool.query(
      `SELECT *, (SELECT COUNT(*) FROM entities c WHERE c.parent_id = e.id) AS children_count
       FROM entities e ORDER BY created_at DESC LIMIT 5`
    );

    res.json({
      total_entities: totalEntities.rows[0].count,
      total_attributes: totalAttributes.rows[0].count,
      by_type: byType.rows,
      by_importance: byImportance.rows,
      recent: recent.rows,
    });
  } catch (err) {
    console.error('Ошибка получения статистики:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
