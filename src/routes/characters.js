import { Router } from 'express';
import db from '../config/db.js';

const router = Router();

// Get all characters (ordered alphabetically and grouped by type)
/**
 * SELECT id, name, type, ability, wiki_link_name FROM characters
 * ORDER BY
 * 	CASE type
 * 		WHEN 'townsfolk' THEN 1
 * 		WHEN 'outsider' THEN 2
 * 		WHEN 'minion' THEN 3
 * 		WHEN 'demon' THEN 4
 * 		WHEN 'traveller' THEN 5
 * 	END,
 * name ASC
 */
router.get("/", async (req, res) => {
	const typeRaw = req.query.type ?? req.body?.type;
	const type =
		typeof typeRaw === 'string' && typeRaw.trim() !== '' ? typeRaw.trim() : null;
	try {
		const characters = await db('characters')
			.select('id', 'name', 'type', 'ability', 'wiki_link_name')
			.modify((qb) => {
				if (type) qb.where('type', type);
			})
			.orderByRaw(`
				CASE type
					WHEN 'townsfolk' THEN 1
					WHEN 'outsider' THEN 2
					WHEN 'minion' THEN 3
					WHEN 'demon' THEN 4
					WHEN 'traveller' THEN 5
				END
			`)
			.orderBy('name', 'asc');
		return res.json(characters);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error fetching characters' });
	}
});

// Get specific character
router.get("/:id", async (req, res) => {
	const { id } = req.params;
	try {
		const character = await db('characters')
			.select('id', 'name', 'type', 'ability', 'flavor_text', 'wiki_link_name')
			.where('id', id).first();
		return res.json(character);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error fetching characters' });
	}
});

export default router;