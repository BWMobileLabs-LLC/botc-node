import db from '../config/db.js';

export const fetchScripts = async ({ is_official, order }) => {
	const base = `SELECT s.id, name, description, is_official, username AS author FROM scripts s
		JOIN users u ON u.id = s.owner_id
		WHERE is_official = $1`
	let orderSql
	if (order) {
		orderSql = `ORDER BY s.created_at ${order}`;
	}
	const limit = `LIMIT 20`;
	let query
	if (orderSql) {
		query = `${base} ${orderSql} ${limit}`
	} else {
		query = `${base} ${limit}`
	}
	const { rows } = await db.query(
		query,
		[is_official]
	);
	return rows;
}

export const createNewScript = async ({ user_id, script_title, description, character_names }) => {
	const client = await db.connect();
	try {
		await client.query('BEGIN');
		const { rows: scriptRows } = await client.query(
			`INSERT INTO scripts (owner_id, name, description, is_official) VALUES ($1, $2, $3, $4)
			RETURNING id`,
			[user_id, script_title, description, false]
		);
		const script = scriptRows[0];

		const { rows } = await client.query(
			`SELECT id, name FROM characters WHERE name = ANY($1)`,
			[character_names]
		);
		const orderedRows = character_names.map((n) => rows.find((row) => row.name === n));
		if (orderedRows.some((row) => !row)) {
			const err = new Error('Unknown character name in list');
			err.code = 'UNKNOWN_CHARACTER';
			throw err;
		}
		const scriptCharacters = orderedRows.map((row, index) => ({
			script_id: script.id,
			character_id: row.id,
			sort_order: index
		}));

		if (scriptCharacters.length === 0) {
			const err = new Error('character_names must be a non-empty array');
			err.code = 'NO_CHARACTERS';
			throw err;
		}

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
		await client.query('COMMIT');
		return { script_id: script.id };
	} catch (err) {
		await client.query('ROLLBACK').catch(() => { });
		throw err;
	} finally {
		client.release();
	}
};

export const fetchUserScripts = async ({ id }) => {
	const { rows } = await db.query(
		`SELECT s.id, name, description, is_official, username as author FROM scripts s
			JOIN users u ON u.id = s.owner_id
			WHERE owner_id = $1`,
		[id]
	);
	return rows;
}

export const searchScriptsByPattern = async ({ pattern }) => {
	const { rows } = await db.query(
		`SELECT s.id, s.name, description, is_official, username AS author FROM scripts s
		JOIN users u ON u.id = s.owner_id
		WHERE s.name ILIKE $1 ESCAPE '\\'
		ORDER BY s.created_at ASC
		LIMIT 50`,
		[pattern]
	);
	return rows;
}

export const getScriptDetails = async ({ id }) => {
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
	return rows;
}

export const updateScript = async ({ id, user_id, character_names, script_title, description }) => {
	const { rows: ownerRows } = await db.query(
		`SELECT owner_id FROM scripts WHERE id = $1 LIMIT 1`,
		[id]
	);
	const script_owner = ownerRows[0];
	if (!script_owner) {
		throw new Error('Script not found');
	}
	if (script_owner.owner_id !== user_id) {
		throw new Error('Unauthorized');
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
}

export const checkForOwner = async ({ id }) => {
	const { rows } = await db.query(
		`SELECT owner_id FROM scripts WHERE id = $1 LIMIT 1`,
		[id]
	);
	return rows;
}

export const deleteScript = async ({ id }) => {
	await db.query(`DELETE FROM scripts WHERE id = $1`, [id]);
}