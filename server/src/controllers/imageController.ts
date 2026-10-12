import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db/pool';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export { UPLOAD_DIR };

export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);
    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    const entityCheck = await pool.query('SELECT id, image_url FROM entities WHERE id = $1', [entityId]);
    if (entityCheck.rows.length === 0) {
      res.status(404).json({ error: 'Сущность не найдена' });
      return;
    }

    const oldImageUrl = entityCheck.rows[0].image_url;
    if (oldImageUrl) {
      const oldFilename = path.basename(oldImageUrl);
      const oldPath = path.join(UPLOAD_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE entities SET image_url = $1 WHERE id = $2', [imageUrl, entityId]);

    res.json({ image_url: imageUrl });
  } catch (err) {
    console.error('Ошибка при загрузке изображения:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
  try {
    const entityId = parseInt(req.params.id, 10);

    const entityResult = await pool.query('SELECT image_url FROM entities WHERE id = $1', [entityId]);
    if (entityResult.rows.length === 0) {
      res.status(404).json({ error: 'Сущность не найдена' });
      return;
    }

    const imageUrl = entityResult.rows[0].image_url;
    if (!imageUrl) {
      res.status(404).json({ error: 'У сущности нет изображения' });
      return;
    }

    const filename = path.basename(imageUrl);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('UPDATE entities SET image_url = NULL WHERE id = $1', [entityId]);

    res.json({ message: 'Изображение удалено' });
  } catch (err) {
    console.error('Ошибка при удалении изображения:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
