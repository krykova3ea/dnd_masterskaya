import { Router } from 'express';
import { getRelations, createRelation, deleteRelation } from '../controllers/relationController';

const router = Router();

router.get('/entities/:id/relations', getRelations);
router.post('/entities/:id/relations', createRelation);
router.delete('/relations/:relationId', deleteRelation);

export default router;
