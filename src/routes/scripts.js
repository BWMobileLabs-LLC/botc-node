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

router.delete('/:id', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const { rows: ownerRows } = await db.query(
			`SELECT owner_id FROM scripts WHERE id = $1 LIMIT 1`,
			[id]
		);
		const script_owner = ownerRows[0];
		if (!script_owner) {
			return res.status(404).json({ message: 'Script not found' });
		}
		if (script_owner.owner_id !== user_id) {
			return res.status(403).json({ message: 'Unauthorized' });
		}
		await db.query(`DELETE FROM scripts WHERE id = $1`, [id]);
		res.sendStatus(204);
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to delete script' });
	}
});

export default router;