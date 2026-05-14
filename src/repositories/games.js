import db from '../config/db.js';

export const getStorytellerGameRows = async ({ user_id }) => {
	const { rows } = await db.query(
		`SELECT id, invite_code FROM games
		WHERE storyteller_id = $1 AND status IN ('lobby', 'in_progress')
		ORDER BY updated_at DESC
		LIMIT 1`,
		[user_id]
	);
	return rows;
};

export const getPlayerGameRows = async ({ user_id }) => {
	const { rows } = await db.query(
		`SELECT gp.game_id, g.invite_code
		FROM game_players gp
		JOIN games g ON g.id = gp.game_id
		WHERE gp.user_id = $1 AND g.status IN ('lobby', 'in_progress')
		ORDER BY g.updated_at DESC
		LIMIT 1`,
		[user_id]
	);
	return rows;
};

export const insertGame = async ({ storytellerId, gameName, scriptId, inviteCode }) => {
	const { rows } = await db.query(
		`INSERT INTO games (storyteller_id, active_script_id, invite_code, name)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id`,
		[storytellerId, scriptId ?? null, inviteCode, gameName]
	);
	return { id: rows[0].id, inviteCode };
};

export const getGameByInviteCode = async ({ invite_code }) => {
	const { rows } = await db.query(
		`SELECT id, name, invite_code FROM games WHERE invite_code = $1 LIMIT 1`,
		[invite_code]
	);
	return rows;
};

export const addPlayerToGame = async ({ id, user_id }) => {
	await db.query(`INSERT INTO game_players (game_id, user_id) VALUES ($1, $2)`, [id, user_id]);
};

export const deletePlayerFromGame = async ({ game_id, user_id }) => {
	const { rowCount } = await db.query(
		`DELETE FROM game_players WHERE game_id = $1 AND user_id = $2`,
		[game_id, user_id]
	);
	return rowCount;
};

export const getGameAsStoryteller = async ({ user_id, id }) => {
	const { rows } = await db.query(
		`SELECT * FROM games WHERE storyteller_id = $1 AND id = $2 LIMIT 1`,
		[user_id, id]
	);
	return rows[0] ?? null;
};

export const updateGame = async ({
	id,
	active_script_id,
	name,
	status,
	phase,
	day_number,
}) => {
	await db.query(
		`UPDATE games SET
			active_script_id = $1,
			name = $2,
			status = $3::game_status,
			phase = $4,
			day_number = $5,
			updated_at = NOW()
		 WHERE id = $6`,
		[active_script_id, name, status, phase, day_number, id]
	);
};

export const getStorytellerGameId = async ({ user_id, gameID }) => {
	const { rows } = await db.query(
		`SELECT id FROM games WHERE storyteller_id = $1 AND id = $2 LIMIT 1`,
		[user_id, gameID]
	);
	return rows[0] ?? null;
};

export const getGamePlayerByGameAndUser = async ({ gameID, playerID }) => {
	const { rows } = await db.query(
		`SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2 LIMIT 1`,
		[gameID, playerID]
	);
	return rows[0] ?? null;
};

export const updateGamePlayer = async ({
	characterId,
	seatOrder,
	is_alive,
	has_ghost_vote,
	vote_used,
	notes,
	alignmentVal,
	gameID,
	playerID,
}) => {
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
			is_alive,
			has_ghost_vote,
			vote_used,
			notes,
			alignmentVal,
			gameID,
			playerID,
		]
	);
};

export const getGameById = async ({ id }) => {
	const { rows } = await db.query(`SELECT * FROM games WHERE id = $1 LIMIT 1`, [id]);
	return rows[0] ?? null;
};

export const getUsernameById = async ({ id }) => {
	const { rows } = await db.query(`SELECT username FROM users WHERE id = $1 LIMIT 1`, [id]);
	return rows[0] ?? null;
};

export const listGamePlayersDetailed = async ({ game_id }) => {
	const { rows } = await db.query(
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
		[game_id]
	);
	return rows;
};

export const listGameReminderTokensJoined = async ({ game_id }) => {
	const { rows } = await db.query(
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
		[game_id]
	);
	return rows;
};

export const getGameScriptForReminders = async ({ id, storyteller_id }) => {
	const { rows } = await db.query(
		`SELECT id, active_script_id FROM games WHERE id = $1 AND storyteller_id = $2 LIMIT 1`,
		[id, storyteller_id]
	);
	return rows[0] ?? null;
};

export const listRemindersForActiveScript = async ({ game_id }) => {
	const { rows } = await db.query(
		`SELECT rtd.id, rtd.text, rtd.character_id, c.name, sc.sort_order
		 FROM games g
		 JOIN script_characters sc ON sc.script_id = g.active_script_id
		 JOIN characters c ON c.id = sc.character_id
		 JOIN reminder_token_definitions rtd ON rtd.character_id = c.id
		 WHERE g.id = $1
		 ORDER BY sc.sort_order ASC, c.name ASC, rtd.text ASC`,
		[game_id]
	);
	return rows;
};

export const storytellerOwnsGame = async ({ id, user_id }) => {
	const { rows } = await db.query(
		`SELECT id FROM games WHERE id = $1 AND storyteller_id = $2 LIMIT 1`,
		[id, user_id]
	);
	return rows[0] != null;
};

export const insertPlacedReminderToken = async ({
	game_id,
	player_id,
	reminder_token_id,
	text,
}) => {
	await db.query(
		`INSERT INTO game_reminder_tokens (game_id, target_player_id, reminder_def_id, custom_text)
		 VALUES ($1, $2, $3, $4)`,
		[game_id, player_id, reminder_token_id, text ?? null]
	);
};

export const deletePlacedReminderToken = async ({ reminder_token_id, game_id }) => {
	await db.query(`DELETE FROM game_reminder_tokens WHERE id = $1 AND game_id = $2`, [
		reminder_token_id,
		game_id,
	]);
};

export const deleteGameByStoryteller = async ({ user_id, id }) => {
	const { rowCount } = await db.query(`DELETE FROM games WHERE storyteller_id = $1 AND id = $2`, [
		user_id,
		id,
	]);
	return rowCount;
};
