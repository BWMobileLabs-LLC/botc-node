import { Router } from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { escapePgLikePattern } from '../utils/escapePgLikePattern.js';

const router = Router();

/** Max characters accepted for script name search (after trim). */
const SCRIPT_SEARCH_MAX_LEN = 200;

// List 20 scripts
router.get('/', async (req, res) => {
	try {
		const { rows } = await db.query(
			`SELECT s.id, name, description, is_official, username AS author FROM scripts s
			JOIN users u ON u.id = s.owner_id
			WHERE is_official = false
			ORDER BY s.created_at DESC
			LIMIT 20`
		);
		res.json(rows);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
});

router.get('/base-scripts', async (req, res) => {
	try {
		const { rows } = await db.query(
			`SELECT s.id, name, description, is_official, username AS author FROM scripts s
			JOIN users u ON u.id = s.owner_id
			WHERE is_official = true
			ORDER BY s.created_at ASC`
		);
		res.json(rows);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
})

// Insert new script
router.post('/', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { script_title, description, character_names } = req.body;
	try {
		const { rows: scriptRows } = await db.query(
			`INSERT INTO scripts (owner_id, name, description, is_official) VALUES ($1, $2, $3, $4)
			RETURNING id`,
			[user_id, script_title, description, false]
		);
		const script = scriptRows[0];

		const { rows } = await db.query(
			`SELECT id, name FROM characters WHERE name = ANY($1)`,
			[character_names]
		);
		const orderedRows = character_names.map((n) => rows.find((row) => row.name === n));
		const scriptCharacters = orderedRows.map((row, index) => ({
			script_id: script.id,
			character_id: row.id,
			sort_order: index
		}));

		let placeholders = [];
		let params = [];
		let n = 1;

		for (const row of scriptCharacters) {
			placeholders.push(`($${n++}, $${n++}, $${n++})`);
			params.push(row.script_id, row.character_id, row.sort_order)
		}

		await db.query(
			`INSERT INTO script_characters (script_id, character_id, sort_order) VALUES ${placeholders.join(', ')}`,
			params
		);

		res.json({
			message: 'Script Created',
			script_id: script.id
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({ message: 'Failed to create script.' });
	}
});

// List all scripts created by a user
/**
 * SELECT scripts.id, name, description, is_official, username AS author
 * FROM scripts
 * JOIN users ON users.id = scripts.owner_id
 * WHERE owner_id = id (from token)
 */
router.get('/my_scripts', authMiddleware, async (req, res) => {
	const id = req.user_id;
	try {
		const { rows } = await db.query(
			`SELECT s.id, name, description, is_official, username as author FROM scripts s
			JOIN users u ON u.id = s.owner_id
			WHERE owner_id = $1`,
			[id]
		);
		res.json(rows);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
});

// Search by name (must be registered before GET /:id or "search" is captured as an id)
router.get('/search', async (req, res) => {
	const raw = req.query.q ?? req.query.search_string;
	let q = typeof raw === 'string' ? raw.trim() : '';
	try {
		if (!q) {
			return res.json([]);
		}
		if (q.length > SCRIPT_SEARCH_MAX_LEN) {
			q = q.slice(0, SCRIPT_SEARCH_MAX_LEN);
		}
		const pattern = `%${escapePgLikePattern(q)}%`;
		const { rows } = await db.query(
			`SELECT s.id, s.name, description, is_official, username AS author FROM scripts s
			JOIN users u ON u.id = s.owner_id
			WHERE s.name ILIKE $1 ESCAPE '\\'
			ORDER BY s.created_at ASC
			LIMIT 50`,
			[pattern]
		)
		return res.status(200).json(rows);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Could not search scripts' });
	}
});

// Get specific script details
router.get('/:id', async (req, res) => {
	const { id } = req.params
	try {
		// Get all rows
		const { rows } = await db.query(
			`SELECT
				c.id,
				s.name,
				s.description,
				s.is_official,
				u.username AS author,
				c.name AS character_name,
				c.type,
				c.ability
			FROM scripts s
			JOIN users u ON u.id = s.owner_id
			JOIN script_characters sc ON sc.script_id = s.id
			JOIN characters c ON c.id = sc.character_id
			WHERE s.id = $1
			ORDER BY sc.sort_order`,
			[id]
		);
		// Shape response
		const script = rows.reduce((acc, row) => {
			if (!acc) {
				acc = {
					name: row.name,
					description: row.description,
					is_official: row.is_official,
					author: row.author,
					characters: []
				}
			}

			acc.characters.push({
				id: row.id,
				name: row.character_name,
				type: row.type,
				ability: row.ability
			})

			return acc;
		}, null);
		res.json(script);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
});

// Update a specific script
router.put('/:id', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { script_title, description, character_names } = req.body;

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

		const { rows: charRows } = await db.query(
			`SELECT id, name FROM characters WHERE name = ANY($1)`,
			[character_names]
		);
		const orderedRows = character_names.map((n) => charRows.find((row) => row.name === n));
		const scriptCharacters = orderedRows.map((row, index) => ({
			script_id: id,
			character_id: row.id,
			sort_order: index
		}));

		const client = await db.connect();
		try {
			await client.query('BEGIN');
			const updateResult = await client.query(
				`UPDATE scripts SET name = $1, description = $2, updated_at = NOW() WHERE id = $3`,
				[script_title, description, id]
			);
			if (updateResult.rowCount === 0) {
				throw new Error('Script not found');
			}
			await client.query(`DELETE FROM script_characters WHERE script_id = $1`, [id]);

			if (scriptCharacters.length > 0) {
				const placeholders = [];
				const params = [];
				let n = 1;
				for (const row of scriptCharacters) {
					placeholders.push(`($${n++}, $${n++}, $${n++})`);
					params.push(row.script_id, row.character_id, row.sort_order);
				}
				await client.query(
					`INSERT INTO script_characters (script_id, character_id, sort_order) VALUES ${placeholders.join(', ')}`,
					params
				);
			}

			await client.query('COMMIT');
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}

		return res.json({
			message: 'Script updated',
			script_id: id
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to update script' });
	}
});

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