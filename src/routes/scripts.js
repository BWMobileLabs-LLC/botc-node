import { Router } from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

import * as scriptsController from '../controllers/scripts.js';

const router = Router();

// List 20 scripts
router.get('/', scriptsController.fetchScripts);

// Get the 3 base scripts
router.get('/base-scripts', scriptsController.fetchBaseScripts);

// Insert new script
router.post('/', authMiddleware, scriptsController.createNewScript);

// List all scripts created by a user
router.get('/my_scripts', authMiddleware, scriptsController.fetchScriptsByUser);

// Search by name (must be registered before GET /:id or "search" is captured as an id)
router.get('/search', scriptsController.searchScripts);

// Get specific script details
router.get('/:id', scriptsController.getScriptDetails);

// Update a specific script
router.put('/:id', authMiddleware, scriptsController.updateScript);

router.delete('/:id', authMiddleware, scriptsController.deleteScript);

export default router;