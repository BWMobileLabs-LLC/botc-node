
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
	return knex.schema.alterTable('characters', (table) => {
		table.string('wiki_link_name', 255);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
	return knex.schema.alterTable('characters', (table) => {
		table.dropColumn('wiki_link_name');
	});
};
