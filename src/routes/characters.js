import { Router } from 'express';
import db from '../config/db.js';

const router = Router();

// Get all characters (ordered alphabetically and grouped by type)
router.get("/", async (req, res) => {
	const typeRaw = req.query.type ?? req.body?.type;
	const type =
		typeof typeRaw === 'string' && typeRaw.trim() !== '' ? typeRaw.trim() : null;
	try {
		const selectSQL = `SELECT id, name, type, ability, wiki_link_name FROM characters`
		const orderBySQL = `ORDER BY
			CASE type
				WHEN 'townsfolk' THEN 1
				WHEN 'outsider' THEN 2
				WHEN 'minion' THEN 3
				WHEN 'demon' THEN 4
				WHEN 'traveller' THEN 5
			END,
			name ASC`
		let sql;
		let params;
		if (type) {
			sql = `${selectSQL} WHERE type = $1 ${orderBySQL}`;
			params = [type];
		} else {
			sql = `${selectSQL} ${orderBySQL}`;
			params = []
		}

		const { rows } = await db.query(sql, params);

		return res.json(rows);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error fetching characters' });
	}
});

export default router;