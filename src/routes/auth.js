import { Router } from 'express';
import db from '../config/db.js';
import bcrypt from 'bcrypt';
import {
	hashRefreshToken,
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
	refreshCookieOptions
} from '../utils/jwt.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
	const { username, password } = req.body;
	try {
		const { rows } = await db.query(
			`SELECT password_hash, id FROM users
			WHERE username = $1
			LIMIT 1`,
			[username]
		);

		const storedHash = rows[0]?.password_hash;
		if (rows.length === 0 || !storedHash) {
			res.status(401).json({ error: 'Username or password is incorrect' });
			return;
		}
		let match = await bcrypt.compare(password, storedHash);

		if (match) {
			const user_id = rows[0].id
			const accessToken = signAccessToken(user_id);

			const { refreshToken, expires_at } = signRefreshToken(user_id);
			const token_hash = hashRefreshToken(refreshToken);

			await db.query(
				`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
				[user_id, token_hash, expires_at]
			);

			res.cookie(
				'refresh',
				refreshToken,
				{
					...refreshCookieOptions,
					maxAge: 604800000
				}
			);
			res.json({
				user: {
					id: user_id,
					username
				},
				accessToken
			});
			return;
		} else {
			res.status(401).json({ error: 'Username or password is incorrect' });
		}
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to perform auth' });
	}
});

router.post('/register', async (req, res) => {
	const { username, email, password } = req.body;
	try {
		const hashed = await bcrypt.hash(password, 12);
		const { rows } = await db.query(
			`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)
			RETURNING id`,
			[username, email, hashed]
		);
		const user_id = rows[0].id;
		const accessToken = signAccessToken(user_id);

		const { refreshToken, expires_at } = signRefreshToken(user_id);
		const token_hash = hashRefreshToken(refreshToken);

		await db.query(
			`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
			[user_id, token_hash, expires_at]
		);

		res.cookie(
			'refresh',
			refreshToken,
			{
				...refreshCookieOptions,
				maxAge: 604800000
			}
		);

		res.json({
			user: {
				id: user_id,
				username
			},
			accessToken
		});
	} catch (err) {
		if (err.code === '23505') {
			// duplicate username or email
			return res.status(409).json({ error: 'Username or email already in use' });
		}
		console.log(err);
		res.status(500).json({ error: 'Failed to perform auth' });
	}
});

// Get user data from username
router.get('/me', authMiddleware, async (req, res) => {
	const id = req.user_id;
	try {
		const { rows } = await db.query(
			`SELECT id, username, email, display_name, created_at FROM users
			WHERE id = $1`,
			[id]
		);
		const data = rows[0];
		res.json(data);
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to get user data' });
	}
});

// Update user data (partial body OK — only present fields are written)
router.put('/me', authMiddleware, async (req, res) => {
	const id = req.user_id;
	const { username, email, display_name, password } = req.body;
	try {
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
			return res.status(400).json({ error: 'No fields to update' });
		}

		sets.push(`updated_at = NOW()`);
		params.push(id);
		const idPlaceholder = params.length;

		await db.query(
			`UPDATE users SET ${sets.join(', ')} WHERE id = $${idPlaceholder}`,
			params
		);

		res.status(200).json({ message: 'User data updated' });
	} catch (err) {
		if (err.code === '23505') {
			return res.status(409).json({ error: 'Username or email already in use' });
		}
		console.log(err);
		res.status(500).json({ error: 'Failed to update user data' });
	}
});

router.post('/refresh', async (req, res) => {
	const refresh_token = req.cookies.refresh;
	if (!refresh_token) {
		res.clearCookie('refresh', refreshCookieOptions);
		return res.status(401).json({ error: 'Unauthorized' });
	}
	try {
		// Check token is valid
		const payload = verifyRefreshToken(refresh_token);
		if (payload.typ !== 'refresh') {
			res.clearCookie('refresh', refreshCookieOptions);
			return res.status(401).json({ error: 'Unauthorized' });
		}
		// Check token is in table
		const hashed = hashRefreshToken(refresh_token);
		const { rows: returnedTokenRows } = await db.query(
			`SELECT * FROM refresh_tokens
			WHERE token_hash = $1
			LIMIT 1`,
			[hashed]
		);
		const returned_token = returnedTokenRows[0];

		if (!returned_token) {
			res.clearCookie('refresh', refreshCookieOptions);
			return res.status(401).json({ error: 'Unauthorized' });
		}
		// Check if token is expired
		const now = new Date();
		if (returned_token.expires_at < now) {
			await db.query(
				`DELETE FROM refresh_tokens
				WHERE id = $1`,
				[returned_token.id]
			);
			res.clearCookie('refresh', refreshCookieOptions);
			return res.status(401).json({ error: 'Unauthorized' });
		}
		// Refresh token
		const user_id = payload.sub
		const accessToken = signAccessToken(user_id);

		const { refreshToken, expires_at } = signRefreshToken(user_id);
		const token_hash = hashRefreshToken(refreshToken);

		const client = await db.connect();
		try {
			await client.query(`BEGIN`);
			const { rows: lockedRows } = await client.query(
				`SELECT * FROM refresh_tokens
				WHERE id = $1
				FOR UPDATE`,
				[returned_token.id]
			);
			if (lockedRows.length === 0) {
				throw new Error('No refresh tokens found');
			}
			await client.query(
				`DELETE FROM refresh_tokens
				WHERE id = $1`,
				[returned_token.id]
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

		res.cookie(
			'refresh',
			refreshToken,
			{
				...refreshCookieOptions,
				maxAge: 604800000
			}
		);

		const { rows: userRow } = await db.query(
			`SELECT id, username FROM users
			WHERE id = $1
			LIMIT 1`,
			[user_id]
		);
		const user = userRow[0];
		return res.json({
			user_id,
			accessToken,
			user: user
				? { id: user.id, username: user.username }
				: { id: user_id, username: '' }
		});

	} catch (err) {
		console.log(err);
		res.clearCookie('refresh', refreshCookieOptions);
		return res.status(401).json({ error: 'Unauthorized' });
	}

});

router.post('/logout', async (req, res) => {
	const refresh_token = req.cookies.refresh;
	if (!refresh_token) {
		res.clearCookie('refresh', refreshCookieOptions);
		return res.sendStatus(204);
	}
	try {
		const hashed = hashRefreshToken(refresh_token);
		await db.query(
			`DELETE FROM refresh_tokens WHERE token_hash = $1`,
			[hashed]
		);
		res.clearCookie('refresh', refreshCookieOptions);
		return res.sendStatus(204);
	} catch (err) {
		console.log(err);
		res.clearCookie('refresh', refreshCookieOptions);
		return res.sendStatus(204);
	}
});

export default router;