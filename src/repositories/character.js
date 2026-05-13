import db from '../config/db.js';

/**
 * @param {{ type: string | null }} opts - `type` null means no filter
 * @returns {Promise<object[]>}
 */
export const listCharacters = async ({ type }) => {
	const selectSQL = `SELECT id, name, type, ability, wiki_link_name FROM characters`;
	const orderBySQL = `ORDER BY
			CASE type
				WHEN 'townsfolk' THEN 1
				WHEN 'outsider' THEN 2
				WHEN 'minion' THEN 3
				WHEN 'demon' THEN 4
				WHEN 'traveller' THEN 5
			END,
			name ASC`;

	let sql;
	let params;
	if (type) {
		sql = `${selectSQL} WHERE type = $1 ${orderBySQL}`;
		params = [type];
	} else {
		sql = `${selectSQL} ${orderBySQL}`;
		params = [];
	}

	const { rows } = await db.query(sql, params);
	return rows;
};
