import { Router } from 'express';
import {
  getEntities,
  getEntityById,
  getEntityAncestors,
  createEntity,
  updateEntity,
  deleteEntity,
  getAttributes,
  addAttribute,
  updateAttribute,
  deleteAttribute,
} from '../controllers/entityController';
import { uploadImage, deleteImage } from '../controllers/imageController';
import { upload } from '../middleware/upload';

const router = Router();

// CRUD для сущностей
router.get('/', getEntities);
router.get('/:id', getEntityById);
router.get('/:id/ancestors', getEntityAncestors);
router.post('/', createEntity);
router.put('/:id', updateEntity);
router.delete('/:id', deleteEntity);

// Изображения сущности
router.post('/:id/image', upload.single('image'), uploadImage);
router.delete('/:id/image', deleteImage);

// Атрибуты сущности
router.get('/:id/attributes', getAttributes);
router.post('/:id/attributes', addAttribute);
router.put('/:id/attributes/:attrId', updateAttribute);
router.delete('/:id/attributes/:attrId', deleteAttribute);

export default router;
