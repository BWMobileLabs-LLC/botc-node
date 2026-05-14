import * as gameRepository from '../repositories/games.js';
import { nanoid } from 'nanoid';

const MAX_INVITE_ATTEMPTS = 15;

const createGameWithUniqueInvite = async ({ storytellerId, gameName, scriptId }) => {
	for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
		const inviteCode = nanoid(6);
		try {
			return await gameRepository.insertGame({ storytellerId, gameName, scriptId, inviteCode });
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

export const getCurrentGameState = async (req, res) => {
	const user_id = req.user_id;
	try {
		const stRows = await gameRepository.getStorytellerGameRows({ user_id });
		const st_game = stRows[0];

		if (st_game) {
			return res.status(200).json({
				game_id: st_game.id,
				invite_code: st_game.invite_code,
				is_storyteller: true,
			});
		}

		const pgRows = await gameRepository.getPlayerGameRows({ user_id });
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
};

export const createNewGame = async (req, res, io) => {
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
};

export const joinGame = async (req, res, io) => {
	const user_id = req.user_id;
	const { invite_code } = req.body;

	try {
		const rows = await gameRepository.getGameByInviteCode({ invite_code });
		const game = rows[0];

		if (!game) {
			return res.sendStatus(404);
		}

		await gameRepository.addPlayerToGame({ id: game.id, user_id });

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
};

export const leaveGame = async (req, res, io) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const rowCount = await gameRepository.deletePlayerFromGame({ game_id: id, user_id });

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
};

export const patchGame = async (req, res, io) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { script_id, name, phase, day_number, status } = req.body;

	try {
		const game = await gameRepository.getGameAsStoryteller({ user_id, id });

		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		await gameRepository.updateGame({
			id,
			active_script_id: script_id ?? game.active_script_id,
			name: name ?? game.name,
			status: status ?? game.status,
			phase: phase ?? game.phase,
			day_number: day_number ?? game.day_number,
		});

		io.to(`game:${id}`).emit('game:state_updated', {
			game_id: id,
			updated_by: user_id,
		});
		return res.status(200).json({ message: 'Game updated' });
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: 'Failed to update game' });
	}
};

export const patchGamePlayer = async (req, res, io) => {
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
		const gameRow = await gameRepository.getStorytellerGameId({ user_id, gameID });
		if (!gameRow) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		const player = await gameRepository.getGamePlayerByGameAndUser({ gameID, playerID });

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

		await gameRepository.updateGamePlayer({
			characterId,
			seatOrder,
			is_alive: is_alive ?? player.is_alive,
			has_ghost_vote: has_ghost_vote ?? player.has_ghost_vote,
			vote_used: vote_used ?? player.vote_used,
			notes: notes ?? player.notes,
			alignmentVal,
			gameID,
			playerID,
		});

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
};

export const getGameById = async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const game = await gameRepository.getGameById({ id });

		if (!game) {
			return res.sendStatus(404);
		}

		const storyteller = await gameRepository.getUsernameById({ id: game.storyteller_id });
		const players = await gameRepository.listGamePlayersDetailed({ game_id: id });

		const isStoryteller = game.storyteller_id === user_id;

		if (isStoryteller) {
			const tokens = await gameRepository.listGameReminderTokensJoined({ game_id: id });

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
};

export const getGameReminders = async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const game = await gameRepository.getGameScriptForReminders({ id, storyteller_id: user_id });

		if (!game) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		if (!game.active_script_id) {
			return res.status(200).json([]);
		}

		const rows = await gameRepository.listRemindersForActiveScript({ game_id: id });

		return res.status(200).json(rows ?? []);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Failed to get reminder tokens for script' });
	}
};

export const postGameReminder = async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { reminder_token_id, player_id, text } = req.body;

	try {
		const owns = await gameRepository.storytellerOwnsGame({ id, user_id });
		if (!owns) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		await gameRepository.insertPlacedReminderToken({
			game_id: id,
			player_id,
			reminder_token_id,
			text,
		});
		return res.sendStatus(200);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: `Failed to place reminder token ${reminder_token_id}` });
	}
};

export const deleteGameReminder = async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { reminder_token_id } = req.body;

	try {
		const owns = await gameRepository.storytellerOwnsGame({ id, user_id });
		if (!owns) {
			return res.status(401).json({ message: 'You are not the storyteller of this game' });
		}

		await gameRepository.deletePlacedReminderToken({ reminder_token_id, game_id: id });
		return res.sendStatus(200);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Failed to delete reminder token' });
	}
};

export const deleteGame = async (req, res, io) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const rowCount = await gameRepository.deleteGameByStoryteller({ user_id, id });

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
};
