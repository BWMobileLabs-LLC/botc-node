import { Router } from 'express';
import * as characterController from '../controllers/character.controller.js';

const router = Router();

router.get('/', characterController.list);

export default router;
