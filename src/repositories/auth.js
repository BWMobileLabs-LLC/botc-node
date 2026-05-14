import db from '../config/db.js';
import bcrypt from 'bcrypt';

export const selectUserByUsername = async ({ username }) => {
	const { rows } = await db.query(
		`SELECT password_hash, id FROM users
			WHERE username = $1
			LIMIT 1`,
		[username]
	);
	return rows;
}

export const insertNewRefreshToken = async ({ user_id, token_hash, expires_at }) => {
	await db.query(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		[user_id, token_hash, expires_at]
	);
}

export const registerNewUser = async ({ username, email, hashed }) => {
	const { rows } = await db.query(
		`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)
			RETURNING id`,
		[username, email, hashed]
	);
	return rows;
}

export const getUserData = async ({ id }) => {
	const { rows } = await db.query(
		`SELECT id, username, email, display_name, created_at FROM users
			WHERE id = $1`,
		[id]
	);
	return rows;
}

export const updateUserData = async ({ id, username, email, display_name, password }) => {
	const sets = [];
	const params = [];

	if (username !== undefined) {
		sets.push(`username = $${params.length + 1}`);
		params.push(username);
	}
	if (email !== undefined) {
		sets.push(`email = $${params.length + 1}`);
		params.push(email);
	}
	if (display_name !== undefined) {
		sets.push(`display_name = $${params.length + 1}`);
		params.push(display_name);
	}
	if (password != null && String(password).length > 0) {
		sets.push(`password_hash = $${params.length + 1}`);
		params.push(await bcrypt.hash(password, 12));
	}
	if (sets.length === 0) {
		const err = new Error('No fields to update');
		err.code = 'NO_FIELDS';
		throw err;
	}

	sets.push(`updated_at = NOW()`);
	params.push(id);
	const idPlaceholder = params.length;

	await db.query(
		`UPDATE users SET ${sets.join(', ')} WHERE id = $${idPlaceholder}`,
		params
	);
}

export const selectUserIdAndUsername = async ({ id }) => {
	const { rows } = await db.query(
		`SELECT id, username FROM users WHERE id = $1 LIMIT 1`,
		[id]
	);
	return rows[0] ?? null;
};

export const getAuthToken = async ({ hashed }) => {
	const { rows } = await db.query(
		`SELECT * FROM refresh_tokens
			WHERE token_hash = $1
			LIMIT 1`,
		[hashed]
	);
	return rows;
}

export const deleteAuthTokenFromID = async ({ id }) => {
	await db.query(
		`DELETE FROM refresh_tokens
		WHERE id = $1`,
		[id]
	);
}

export const deleteAuthTokenFromHash = async ({ hashed }) => {
	await db.query(
		`DELETE FROM refresh_tokens WHERE token_hash = $1`,
		[hashed]
	);
};

export const refreshAuthToken = async ({ id, user_id, token_hash, expires_at }) => {
	const client = await db.connect();
	try {
		await client.query(`BEGIN`);
		const { rows } = await client.query(
			`SELECT * FROM refresh_tokens
				WHERE id = $1
				FOR UPDATE`,
			[id]
		);
		if (rows.length === 0) {
			throw new Error('No refresh tokens found');
		}
		await client.query(
			`DELETE FROM refresh_tokens
				WHERE id = $1`,
			[id]
		);
		await client.query(
			`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
			[user_id, token_hash, expires_at]
		);
		await client.query(`COMMIT`);
	} catch (err) {
		await client.query(`ROLLBACK`);
		throw err;
	} finally {
		client.release()
	}
}