
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
	return knex.schema.alterTable('games', (table) => {
		table.string('phase', 20).defaultTo('night').alter();
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
	return knex.schema.alterTable('games', (table) => {
		table.string('phase', 20).defaultTo('day').alter();
	});
};
