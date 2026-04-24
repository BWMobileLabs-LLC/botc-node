import { Router } from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { escapePgLikePattern } from '../utils/escapePgLikePattern.js';

const router = Router();

/** Max characters accepted for script name search (after trim). */
const SCRIPT_SEARCH_MAX_LEN = 200;

// List 20 scripts
/**
 * SELECT scripts.id, name, description, is_official, username AS author
 * FROM scripts
 * JOIN users ON users.id = scripts.owner_id
 * LIMIT 20
 */
router.get('/', async (req, res) => {
	try {
		const scripts = await db('scripts')
			.select('scripts.id', 'name', 'description', 'is_official', 'username as author')
			.join('users', 'users.id', 'scripts.owner_id')
			.limit(20)
			.orderBy('scripts.created_at', 'asc');
		res.json(scripts);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
});

// Insert new script
/**
 * INSERT INTO scripts (owner_id, name, description, is_official)
 * VALUES (user_id, script_title, description, false) # Only seeded scripts are official
 * 
 * SELECT id, name FROM characters
 * WHERE name in (character_1, character_2, etc)
 * 
 * INSERT INTO script_characters (script_id, character_id)
 * VALUES (script_id, character_id)
 */
router.post('/', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { script_title, description, character_names } = req.body;
	try {
		const [script] = await db('scripts')
			.insert({
				owner_id: user_id,
				name: script_title,
				description,
				is_official: false
			})
			.returning('id');

		const rows = await db('characters').select('id', 'name').whereIn('name', character_names);
		const orderedRows = character_names.map((n) => rows.find((row) => row.name === n));
		const scriptCharacters = orderedRows.map((row, index) => ({
			script_id: script.id,
			character_id: row.id,
			sort_order: index
		}));

		await db('script_characters').insert(scriptCharacters);

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
		const scripts = await db('scripts')
			.select('scripts.id', 'name', 'description', 'is_official', 'username as author')
			.join('users', 'users.id', 'scripts.owner_id')
			.where('owner_id', id);
		res.json(scripts);
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
		const rows = await db('scripts')
			.select('scripts.id', 'scripts.name', 'description', 'is_official', 'username as author')
			.join('users', 'users.id', 'scripts.owner_id')
			.whereRaw(`scripts.name ILIKE ? ESCAPE '\\'`, [pattern])
			.orderBy('scripts.created_at', 'asc')
			.limit(50);
		return res.status(200).json(rows);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Could not search scripts' });
	}
});

// Get specific script details
/**
 * SELECT s.name, s.is_official, u.username AS author, c.name AS character_name, c.type, c.ability
 * FROM scripts s
 * JOIN users u ON u.id = s.owner_id
 * JOIN script_characters sc ON sc.script_id = s.id
 * JOIN characters c ON c.id = sc.character_id
 * WHERE s.id = :id
 */
router.get('/:id', async (req, res) => {
	const { id } = req.params
	try {
		// Get all rows
		const rows = await db('scripts as s')
			.select(
				'c.id',
				's.name',
				's.description',
				's.is_official',
				'u.username as author',
				'c.name as character_name',
				'c.type',
				'c.ability',
			)
			.join('users as u', 'u.id', 's.owner_id')
			.join('script_characters as sc', 'sc.script_id', 's.id')
			.join('characters as c', 'c.id', 'sc.character_id')
			.where('s.id', id)
			.orderBy('sc.sort_order');
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
	const { id } = req.params
	const { script_title, description, character_names } = req.body;

	try {
		// First see if user owns script they are trying to edit
		const script_owner = await db('scripts').select('owner_id').where('id', id).first();
		if (script_owner.owner_id !== user_id) {
			return res.status(403).json({ message: 'Unauthorized' });
		}

		const rows = await db('characters').select('id', 'name').whereIn('name', character_names);
		const orderedRows = character_names.map((n) => rows.find((row) => row.name === n));
		const scriptCharacters = orderedRows.map((row, index) => ({
			script_id: id,
			character_id: row.id,
			sort_order: index
		}));

		await db.transaction(async (trx) => {
			const script = await trx('scripts')
				.where('id', id)
				.update({
					name: script_title,
					description: description,
					updated_at: db.fn.now()
				});
			if (!script) {
				throw new Error("Script not found");
			}
			await trx('script_characters')
				.where('script_id', id)
				.del();

			await trx('script_characters').insert(scriptCharacters);
		});
		return res.json({
			message: 'Script updated',
			script_id: id
		})
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to update script' });
	}
});

router.delete('/:id', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params

	try {
		// First see if user owns script they are trying to delete
		const script_owner = await db('scripts').select('owner_id').where('id', id).first();
		if (script_owner.owner_id !== user_id) {
			return res.status(403).json({ message: 'Unauthorized' });
		}
		await db('scripts')
			.where('id', id)
			.del();
		res.sendStatus(204);
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to delete script' });
	}
});

export default router;