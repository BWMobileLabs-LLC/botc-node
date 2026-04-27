import { Router } from 'express';
import db from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { nanoid } from 'nanoid';

const router = Router();

const MAX_INVITE_ATTEMPTS = 15;

// Helper functions
const insertGame = async (knex, { storytellerId, gameName, scriptId, inviteCode }) => {
	const [row] = await knex('games')
		.insert({
			storyteller_id: storytellerId,
			active_script_id: scriptId ?? null,
			invite_code: inviteCode,
			name: gameName,
		})
		.returning('id');
	return { id: row.id, inviteCode };
};

const createGameWithUniqueInvite = async (knex, { storytellerId, gameName, scriptId }) => {
	for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
		const inviteCode = nanoid(6);
		try {
			return await insertGame(knex, { storytellerId, gameName, scriptId, inviteCode });
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

// Routes

// Active game for this user (storyteller row and/or game_players row)
router.get('/current_game', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	try {
		const st_game = await db('games')
			.select('id', 'invite_code')
			.where('storyteller_id', user_id)
			.whereIn('status', ['lobby', 'in_progress'])
			.orderBy('updated_at', 'desc')
			.first();

		if (st_game) {
			return res.status(200).json({
				game_id: st_game.id,
				invite_code: st_game.invite_code,
				is_storyteller: true,
			});
		}

		const player_game = await db('game_players as gp')
			.select('gp.game_id', 'g.invite_code')
			.join('games as g', 'g.id', 'gp.game_id')
			.where('gp.user_id', user_id)
			.whereIn('g.status', ['lobby', 'in_progress'])
			.orderBy('g.updated_at', 'desc')
			.first();

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

// Create a game (return an invite code)
router.post('/', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { game_name, script_id } = req.body;

	try {
		const { id, inviteCode } = await createGameWithUniqueInvite(db, {
			storytellerId: user_id,
			gameName: game_name,
			scriptId: script_id,
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
		const game = await db('games')
			.where('invite_code', invite_code)
			.select('id', 'name', 'invite_code')
			.first();

		if (!game) {
			return res.sendStatus(404);
		}

		await db('game_players').insert({
			game_id: game.id,
			user_id: user_id
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
		const deleted = await db('game_players')
			.where({ 'game_id': id, 'user_id': user_id })
			.del();

		if (deleted === 0) {
			return res.sendStatus(404);
		}

		return res.status(200).json({ message: 'You have left the game' });
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: 'Failed to leave game' });
	}
});

// Update game, storyteller only
router.patch('/:id', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { script_id, name, phase, day_number, status } = req.body;

	try {
		const game = await db('games')
			.where({
				'storyteller_id': user_id,
				'id': id
			})
			.first();

		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}
		await db('games')
			.where('id', id)
			.update({
				active_script_id: script_id ?? game.active_script_id,
				name: name ?? game.name,
				status: status ?? game.status,
				phase: phase ?? game.phase,
				day_number: day_number ?? game.day_number,
				updated_at: db.fn.now()
			});

		return res.status(200).json({ message: 'Game updated' });
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: 'Failed to update game' });
	}
});

// Update player, storyteller only
router.patch("/:gameID/player/:playerID", authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { gameID, playerID } = req.params;
	const { character_id, seat_order, is_alive, has_ghost_vote, vote_used, notes } = req.body;

	try {
		const game = await db('games')
			.where({
				'storyteller_id': user_id,
				'id': gameID
			})
			.first();

		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		const player = await db('game_players')
			.where({
				'game_id': gameID,
				'user_id': playerID
			})
			.first();

		if (!player) {
			return res.status(404).json({ message: 'Player not found' });
		}

		const update = {
			is_alive: is_alive ?? player.is_alive,
			has_ghost_vote: has_ghost_vote ?? player.has_ghost_vote,
			vote_used: vote_used ?? player.vote_used,
			notes: notes ?? player.notes,
			updated_at: db.fn.now(),
		};
		if (Object.prototype.hasOwnProperty.call(req.body, 'character_id')) {
			update.character_id = character_id;
		} else {
			update.character_id = player.character_id;
		}
		if (Object.prototype.hasOwnProperty.call(req.body, 'seat_order')) {
			update.seat_order = seat_order;
		} else {
			update.seat_order = player.seat_order;
		}

		await db('game_players')
			.where({
				'game_id': gameID,
				'user_id': playerID
			})
			.update(update);

		return res.status(200).json({ message: 'Player updated' });

	} catch (err) {
		if (err.code === '23505' && err.constraint === 'game_players_game_id_seat_order_unique') {
			return res.status(403).json({ error: 'The seat you tried to assign this player is already occupied' });
		}

		console.log(err);
		return res.status(500).json({ error: 'Failed to update game player' });
	}
});

router.get('/:id', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const game = await db('games')
			.where('id', id)
			.first();

		if (!game) {
			return res.sendStatus(404);
		}

		const storyteller = await db('users')
			.where('id', game.storyteller_id)
			.first();

		const players = await db('game_players as gp')
			.select(
				'gp.id',
				'gp.user_id',
				'gp.character_id',
				'username',
				'display_name',
				'seat_order as seat',
				'is_alive',
				'has_ghost_vote',
				'vote_used',
				'notes',
				'c.name as character_name'
			)
			.leftJoin('users as u', 'u.id', 'gp.user_id')
			.leftJoin('characters as c', 'gp.character_id', 'c.id')
			.where('game_id', id)
			.orderBy('seat_order', 'asc');

		const isStoryteller = game.storyteller_id === user_id;

		if (isStoryteller) {
			const tokens = await db('game_reminder_tokens as grt')
				.where('grt.game_id', id)
				.leftJoin('reminder_token_definitions as rtd', 'grt.reminder_def_id', 'rtd.id')
				.leftJoin('characters as ch', 'ch.id', 'rtd.character_id')
				.select(
					'grt.id',
					'grt.target_player_id',
					'grt.reminder_def_id',
					'grt.custom_text',
					'grt.created_at',
					'rtd.text as def_text',
					'ch.name as def_character_name'
				)
				.orderBy('grt.created_at', 'asc');

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
					created_at: t.created_at
				});
				remindersByPlayer.set(t.target_player_id, list);
			}

			return res.status(200).json({
				game: {
					name: game.name,
					status: game.status,
					day: `${game.phase} ${game.day_number}`,
					storyteller: storyteller.username,
					script_id: game.active_script_id,
					is_storyteller: true
				},
				players: players.map((p) => ({
					...p,
					reminder: remindersByPlayer.get(p.id) ?? []
				}))
			})
		} else {
			return res.status(200).json({
				game: {
					name: game.name,
					status: game.status,
					day: `${game.phase} ${game.day_number}`,
					storyteller: storyteller.username,
					script_id: game.active_script_id,
					is_storyteller: false
				},
				players: players.map(p => ({
					username: p.username,
					display_name: p.display_name,
					seat: p.seat,
					is_alive: p.is_alive,
					...(!p.is_alive && { has_ghost_vote: p.has_ghost_vote }),
				}))
			})
		}

	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: 'Failed to fetch game data' });
	}
});

// Get reminder tokens for script
router.get('/:id/reminders', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const game = await db('games')
			.where({ id, storyteller_id: user_id })
			.first();

		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		if (!game.active_script_id) {
			return res.status(200).json([]);
		}

		const rows = await db('games as g')
			.select('rtd.id', 'rtd.text', 'rtd.character_id', 'c.name', 'sc.sort_order')
			.join('script_characters as sc', 'sc.script_id', 'g.active_script_id')
			.join('characters as c', 'c.id', 'sc.character_id')
			.join('reminder_token_definitions as rtd', 'rtd.character_id', 'c.id')
			.where('g.id', id)
			.orderBy('sc.sort_order', 'asc')
			.orderBy('c.name', 'asc')
			.orderBy('rtd.text', 'asc');

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
		const game = await db('games')
			.where({ id, storyteller_id: user_id })
			.first();
		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		await db('game_reminder_tokens')
			.insert({
				game_id: id,
				target_player_id: player_id,
				reminder_def_id: reminder_token_id,
				custom_text: text ?? null
			})
		return res.sendStatus(200);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: `Failed to place reminder token ${reminder_token_id}` })
	}
});

/** Placed token row delete — must be registered before `DELETE /:id` (delete whole game). */
router.delete('/:id/reminders', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { reminder_token_id } = req.body;

	try {
		const game = await db('games')
			.where({ id, storyteller_id: user_id })
			.first();
		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		await db('game_reminder_tokens')
			.where({
				id: reminder_token_id,
				game_id: id,
			})
			.del();
		return res.sendStatus(200);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Failed to delete reminder token' });
	}
});

// End a game
router.delete('/:id', authMiddleware, async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const deleted = await db('games')
			.where({
				'storyteller_id': user_id,
				'id': id
			})
			.del();

		if (deleted === 0) {
			return res.status(403).json({ message: 'Game could not be deleted. Make sure the game is active and that you are the storyteller.' });
		}

		res.sendStatus(204);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: 'Failed to delete game' });
	}
});

export default router;
