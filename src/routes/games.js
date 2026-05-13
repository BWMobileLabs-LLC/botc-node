import { Router } from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { nanoid } from 'nanoid';

const createGamesRouter = (io) => {
	const router = Router();

	const MAX_INVITE_ATTEMPTS = 15;

	const insertGame = async ({ storytellerId, gameName, scriptId, inviteCode }) => {
		const { rows } = await db.query(
			`INSERT INTO games (storyteller_id, active_script_id, invite_code, name)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id`,
			[storytellerId, scriptId ?? null, inviteCode, gameName]
		);
		return { id: rows[0].id, inviteCode };
	};

	const createGameWithUniqueInvite = async ({ storytellerId, gameName, scriptId }) => {
		for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
			const inviteCode = nanoid(6);
			try {
				return await insertGame({ storytellerId, gameName, scriptId, inviteCode });
			} catch (err) {
				if (err.code === '23505') {
					continue;
				}
				throw err;
			}
		}
		const err = new Error('Failed to generate unique invite code');
		err.code = 'INVITE_EXHAUSTED';
		throw err;
	};

	// Active game for this user (storyteller row and/or game_players row)
	router.get('/current_game', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		try {
			const { rows: stRows } = await db.query(
				`SELECT id, invite_code FROM games
				 WHERE storyteller_id = $1 AND status IN ('lobby', 'in_progress')
				 ORDER BY updated_at DESC
				 LIMIT 1`,
				[user_id]
			);
			const st_game = stRows[0];

			if (st_game) {
				return res.status(200).json({
					game_id: st_game.id,
					invite_code: st_game.invite_code,
					is_storyteller: true,
				});
			}

			const { rows: pgRows } = await db.query(
				`SELECT gp.game_id, g.invite_code
				 FROM game_players gp
				 JOIN games g ON g.id = gp.game_id
				 WHERE gp.user_id = $1 AND g.status IN ('lobby', 'in_progress')
				 ORDER BY g.updated_at DESC
				 LIMIT 1`,
				[user_id]
			);
			const player_game = pgRows[0];

			if (player_game) {
				return res.status(200).json({
					game_id: player_game.game_id,
					invite_code: player_game.invite_code,
					is_storyteller: false,
				});
			}

			return res.status(200).json({ game_id: null, invite_code: null, is_storyteller: null });
		} catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Couldn\'t check current game status' });
		}
	});

	router.post('/', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { game_name, script_id } = req.body;

		try {
			const { id, inviteCode } = await createGameWithUniqueInvite({
				storytellerId: user_id,
				gameName: game_name,
				scriptId: script_id,
			});

			io.to(`game:${id}`).emit('game:created', {
				game_id: id,
				storyteller_id: user_id,
			});
			return res.status(200).json({
				game_id: id,
				invite_code: inviteCode,
			});
		} catch (err) {
			console.log(err);
			return res.status(500).json({ error: 'Failed to create game' });
		}
	});

	router.post('/join', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { invite_code } = req.body;

		try {
			const { rows } = await db.query(
				`SELECT id, name, invite_code FROM games WHERE invite_code = $1 LIMIT 1`,
				[invite_code]
			);
			const game = rows[0];

			if (!game) {
				return res.sendStatus(404);
			}

			await db.query(
				`INSERT INTO game_players (game_id, user_id) VALUES ($1, $2)`,
				[game.id, user_id]
			);

			io.to(`game:${game.id}`).emit('game:player_joined', {
				game_id: game.id,
				user_id,
			});

			return res.status(200).json({
				message: `Joined game ${game.name}`,
				game_id: game.id,
				invite_code: game.invite_code,
			});
		} catch (err) {
			console.log(err);
			return res.status(500).json({ error: 'Failed to join game' });
		}
	});

	router.post('/:id/leave', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;

		try {
			const { rowCount } = await db.query(
				`DELETE FROM game_players WHERE game_id = $1 AND user_id = $2`,
				[id, user_id]
			);

			if (rowCount === 0) {
				return res.sendStatus(404);
			}

			io.to(`game:${id}`).emit('game:player_left', {
				game_id: id,
				user_id,
			});

			return res.status(200).json({ message: 'You have left the game' });
		} catch (err) {
			console.log(err);
			return res.status(500).json({ error: 'Failed to leave game' });
		}
	});

	router.patch('/:id', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;
		const { script_id, name, phase, day_number, status } = req.body;

		try {
			const { rows: gameRows } = await db.query(
				`SELECT * FROM games WHERE storyteller_id = $1 AND id = $2 LIMIT 1`,
				[user_id, id]
			);
			const game = gameRows[0];

			if (!game) {
				return res.status(401).json({ message: 'You are not the storyteller of this game' });
			}

			await db.query(
				`UPDATE games SET
					active_script_id = $1,
					name = $2,
					status = $3::game_status,
					phase = $4,
					day_number = $5,
					updated_at = NOW()
				 WHERE id = $6`,
				[
					script_id ?? game.active_script_id,
					name ?? game.name,
					status ?? game.status,
					phase ?? game.phase,
					day_number ?? game.day_number,
					id,
				]
			);

			io.to(`game:${id}`).emit('game:state_updated', {
				game_id: id,
				updated_by: user_id,
			});
			return res.status(200).json({ message: 'Game updated' });
		} catch (err) {
			console.log(err);
			return res.status(500).json({ error: 'Failed to update game' });
		}
	});

	router.patch('/:gameID/player/:playerID', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { gameID, playerID } = req.params;
		const {
			character_id,
			seat_order,
			is_alive,
			has_ghost_vote,
			vote_used,
			notes,
			alignment,
		} = req.body;

		try {
			const { rows: gameRows } = await db.query(
				`SELECT id FROM games WHERE storyteller_id = $1 AND id = $2 LIMIT 1`,
				[user_id, gameID]
			);
			if (!gameRows[0]) {
				return res.status(401).json({ message: 'You are not the storyteller of this game' });
			}

			const { rows: playerRows } = await db.query(
				`SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2 LIMIT 1`,
				[gameID, playerID]
			);
			const player = playerRows[0];

			if (!player) {
				return res.status(404).json({ message: 'Player not found' });
			}

			const characterId = Object.prototype.hasOwnProperty.call(req.body, 'character_id')
				? character_id
				: player.character_id;
			const seatOrder = Object.prototype.hasOwnProperty.call(req.body, 'seat_order')
				? seat_order
				: player.seat_order;
			const alignmentVal = Object.prototype.hasOwnProperty.call(req.body, 'alignment')
				? alignment
				: player.alignment;

			await db.query(
				`UPDATE game_players SET
					character_id = $1,
					seat_order = $2,
					is_alive = $3,
					has_ghost_vote = $4,
					vote_used = $5,
					notes = $6,
					alignment = $7::player_alignment,
					updated_at = NOW()
				 WHERE game_id = $8 AND user_id = $9`,
				[
					characterId,
					seatOrder,
					is_alive ?? player.is_alive,
					has_ghost_vote ?? player.has_ghost_vote,
					vote_used ?? player.vote_used,
					notes ?? player.notes,
					alignmentVal,
					gameID,
					playerID,
				]
			);

			io.to(`game:${gameID}`).emit('game:state_updated', {
				game_id: gameID,
				updated_by: user_id,
			});
			return res.status(200).json({ message: 'Player updated' });
		} catch (err) {
			if (err.code === '23505' && err.constraint === 'game_players_game_id_seat_order_unique') {
				return res.status(403).json({
					error: 'The seat you tried to assign this player is already occupied',
				});
			}

			console.log(err);
			return res.status(500).json({ error: 'Failed to update game player' });
		}
	});

	router.get('/:id', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;

		try {
			const { rows: gameRows } = await db.query(
				`SELECT * FROM games WHERE id = $1 LIMIT 1`,
				[id]
			);
			const game = gameRows[0];

			if (!game) {
				return res.sendStatus(404);
			}

			const { rows: stRows } = await db.query(
				`SELECT username FROM users WHERE id = $1 LIMIT 1`,
				[game.storyteller_id]
			);
			const storyteller = stRows[0];

			const { rows: players } = await db.query(
				`SELECT
					gp.id,
					gp.user_id,
					gp.character_id,
					u.username,
					u.display_name,
					gp.seat_order AS seat,
					gp.is_alive,
					gp.has_ghost_vote,
					gp.vote_used,
					gp.notes,
					gp.alignment,
					c.name AS character_name,
					c.type AS character_type
				 FROM game_players gp
				 LEFT JOIN users u ON u.id = gp.user_id
				 LEFT JOIN characters c ON gp.character_id = c.id
				 WHERE gp.game_id = $1
				 ORDER BY gp.seat_order ASC`,
				[id]
			);

			const isStoryteller = game.storyteller_id === user_id;

			if (isStoryteller) {
				const { rows: tokens } = await db.query(
					`SELECT
						grt.id,
						grt.target_player_id,
						grt.reminder_def_id,
						grt.custom_text,
						grt.created_at,
						rtd.text AS def_text,
						ch.name AS def_character_name
					 FROM game_reminder_tokens grt
					 LEFT JOIN reminder_token_definitions rtd ON grt.reminder_def_id = rtd.id
					 LEFT JOIN characters ch ON ch.id = rtd.character_id
					 WHERE grt.game_id = $1
					 ORDER BY grt.created_at ASC`,
					[id]
				);

				const remindersByPlayer = new Map();
				for (const t of tokens) {
					const list = remindersByPlayer.get(t.target_player_id) ?? [];
					const displayText = String(t.custom_text ?? t.def_text ?? '').trim();
					list.push({
						id: t.id,
						reminder_def_id: t.reminder_def_id,
						text: displayText,
						icon_character_name: t.def_character_name ?? null,
						icon_text: t.def_text != null ? String(t.def_text) : null,
						created_at: t.created_at,
					});
					remindersByPlayer.set(t.target_player_id, list);
				}

				return res.status(200).json({
					game: {
						name: game.name,
						status: game.status,
						day: `${game.phase} ${game.day_number}`,
						storyteller: storyteller?.username,
						script_id: game.active_script_id,
						is_storyteller: true,
					},
					players: players.map((p) => ({
						...p,
						reminder: remindersByPlayer.get(p.id) ?? [],
					})),
				});
			}

			return res.status(200).json({
				game: {
					name: game.name,
					status: game.status,
					day: `${game.phase} ${game.day_number}`,
					storyteller: storyteller?.username,
					script_id: game.active_script_id,
					is_storyteller: false,
				},
				players: players.map((p) => ({
					username: p.username,
					display_name: p.display_name,
					seat: p.seat,
					is_alive: p.is_alive,
					...(!p.is_alive && { has_ghost_vote: p.has_ghost_vote }),
				})),
			});
		} catch (err) {
			console.log(err);
			return res.status(500).json({ error: 'Failed to fetch game data' });
		}
	});

	router.get('/:id/reminders', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;

		try {
			const { rows: gameRows } = await db.query(
				`SELECT id, active_script_id FROM games WHERE id = $1 AND storyteller_id = $2 LIMIT 1`,
				[id, user_id]
			);
			const game = gameRows[0];

			if (!game) {
				return res.status(401).json({ message: 'You are not the storyteller of this game' });
			}

			if (!game.active_script_id) {
				return res.status(200).json([]);
			}

			const { rows } = await db.query(
				`SELECT rtd.id, rtd.text, rtd.character_id, c.name, sc.sort_order
				 FROM games g
				 JOIN script_characters sc ON sc.script_id = g.active_script_id
				 JOIN characters c ON c.id = sc.character_id
				 JOIN reminder_token_definitions rtd ON rtd.character_id = c.id
				 WHERE g.id = $1
				 ORDER BY sc.sort_order ASC, c.name ASC, rtd.text ASC`,
				[id]
			);

			return res.status(200).json(rows ?? []);
		} catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Failed to get reminder tokens for script' });
		}
	});

	router.post('/:id/reminders', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;
		const { reminder_token_id, player_id, text } = req.body;

		try {
			const { rows: gameRows } = await db.query(
				`SELECT id FROM games WHERE id = $1 AND storyteller_id = $2 LIMIT 1`,
				[id, user_id]
			);
			if (!gameRows[0]) {
				return res.status(401).json({ message: 'You are not the storyteller of this game' });
			}

			await db.query(
				`INSERT INTO game_reminder_tokens (game_id, target_player_id, reminder_def_id, custom_text)
				 VALUES ($1, $2, $3, $4)`,
				[id, player_id, reminder_token_id, text ?? null]
			);
			return res.sendStatus(200);
		} catch (err) {
			console.log(err);
			return res.status(500).json({ message: `Failed to place reminder token ${reminder_token_id}` });
		}
	});

	/** Placed token row delete — must be registered before `DELETE /:id` (delete whole game). */
	router.delete('/:id/reminders', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;
		const { reminder_token_id } = req.body;

		try {
			const { rows: gameRows } = await db.query(
				`SELECT id FROM games WHERE id = $1 AND storyteller_id = $2 LIMIT 1`,
				[id, user_id]
			);
			if (!gameRows[0]) {
				return res.status(401).json({ message: 'You are not the storyteller of this game' });
			}

			await db.query(
				`DELETE FROM game_reminder_tokens WHERE id = $1 AND game_id = $2`,
				[reminder_token_id, id]
			);
			return res.sendStatus(200);
		} catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Failed to delete reminder token' });
		}
	});

	router.delete('/:id', authMiddleware, async (req, res) => {
		const user_id = req.user_id;
		const { id } = req.params;

		try {
			const { rowCount } = await db.query(
				`DELETE FROM games WHERE storyteller_id = $1 AND id = $2`,
				[user_id, id]
			);

			if (rowCount === 0) {
				return res.status(403).json({
					message:
						'Game could not be deleted. Make sure the game is active and that you are the storyteller.',
				});
			}

			io.to(`game:${id}`).emit('game:ended', { game_id: id });
			res.sendStatus(204);
		} catch (err) {
			console.log(err);
			return res.status(500).json({ error: 'Failed to delete game' });
		}
	});
	return router;
};

export default createGamesRouter;
