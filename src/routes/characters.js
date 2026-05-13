import { Router } from 'express';
import * as characterController from '../controllers/character.js';

const router = Router();

router.get('/', characterController.list);

export default router;
