import * as authRepository from '../repositories/auth.js';
import bcrypt from 'bcrypt';
import {
	hashRefreshToken,
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
	refreshCookieOptions
} from '../utils/jwt.js';

export const login = async (req, res) => {
	const { username, password } = req.body;
	try {
		const rows = await authRepository.selectUserByUsername({ username });

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

			await authRepository.insertNewRefreshToken({ user_id, token_hash, expires_at });

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
};

export const register = async (req, res) => {
	const { username, email, password } = req.body;
	try {
		const hashed = await bcrypt.hash(password, 12);
		const rows = await authRepository.registerNewUser({ username, email, hashed });
		const user_id = rows[0].id;
		const accessToken = signAccessToken(user_id);

		const { refreshToken, expires_at } = signRefreshToken(user_id);
		const token_hash = hashRefreshToken(refreshToken);

		await authRepository.insertNewRefreshToken({ user_id, token_hash, expires_at });

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
};

export const getUserData = async (req, res) => {
	const id = req.user_id;
	try {
		const rows = await authRepository.getUserData({ id });
		const data = rows[0];
		res.json(data);
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to get user data' });
	}
};

export const updateUserData = async (req, res) => {
	const id = req.user_id;
	const { username, email, display_name, password } = req.body;
	try {
		await authRepository.updateUserData({ id, username, email, display_name, password });
		res.status(200).json({ message: 'User data updated' });
	} catch (err) {
		if (err.code === 'NO_FIELDS') {
			return res.status(400).json({ error: 'No fields to update' });
		}
		if (err.code === '23505') {
			return res.status(409).json({ error: 'Username or email already in use' });
		}
		console.log(err);
		res.status(500).json({ error: 'Failed to update user data' });
	}
};

export const refreshUserAuthToken = async (req, res) => {
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
		const returnedTokenRows = await authRepository.getAuthToken({ hashed });
		const returned_token = returnedTokenRows[0];

		if (!returned_token) {
			res.clearCookie('refresh', refreshCookieOptions);
			return res.status(401).json({ error: 'Unauthorized' });
		}
		// Check if token is expired
		const now = new Date();
		const id = returned_token.id;

		if (returned_token.expires_at < now) {
			await authRepository.deleteAuthTokenFromID({ id });
			res.clearCookie('refresh', refreshCookieOptions);
			return res.status(401).json({ error: 'Unauthorized' });
		}
		// Refresh token
		const user_id = payload.sub
		const accessToken = signAccessToken(user_id);

		const { refreshToken, expires_at } = signRefreshToken(user_id);
		const token_hash = hashRefreshToken(refreshToken);
		await authRepository.refreshAuthToken({ id, user_id, token_hash, expires_at });

		res.cookie(
			'refresh',
			refreshToken,
			{
				...refreshCookieOptions,
				maxAge: 604800000
			}
		);

		const user = await authRepository.selectUserIdAndUsername({ id: user_id });
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

};

export const logout = async (req, res) => {
	const refresh_token = req.cookies.refresh;
	if (!refresh_token) {
		res.clearCookie('refresh', refreshCookieOptions);
		return res.sendStatus(204);
	}
	try {
		const hashed = hashRefreshToken(refresh_token);
		await authRepository.deleteAuthTokenFromHash({ hashed });
		res.clearCookie('refresh', refreshCookieOptions);
		return res.sendStatus(204);
	} catch (err) {
		console.log(err);
		res.clearCookie('refresh', refreshCookieOptions);
		return res.sendStatus(204);
	}
};