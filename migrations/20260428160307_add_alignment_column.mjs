
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
	return await knex.schema.alterTable('game_players', (table) => {
		table.enu('alignment', ['good', 'evil'], {
			useNative: true,
			enumName: 'player_alignment'
		}).notNullable()
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
	await knex.schema.alterTable('game_players', (table) => {
		table.dropColumn('alignment');
	});
	await knex.raw('DROP TYPE IF EXISTS player_alignment');
};
