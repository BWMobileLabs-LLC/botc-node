import * as scriptRepository from '../repositories/scripts.js';
import { escapePgLikePattern } from '../utils/escapePgLikePattern.js';


/** Max characters accepted for script name search (after trim). */
const SCRIPT_SEARCH_MAX_LEN = 200;

export const fetchScripts = async (req, res) => {
	try {
		const rows = await scriptRepository.fetchScripts({ is_official: false, order: 'DESC' });
		res.json(rows);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
};

export const fetchBaseScripts = async (req, res) => {
	try {
		const rows = await scriptRepository.fetchScripts({ is_official: true, order: 'ASC' });
		res.json(rows);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
}

export const createNewScript = async (req, res) => {
	const user_id = req.user_id;
	const { script_title, description, character_names } = req.body;
	try {
		const { script_id } = await scriptRepository.createNewScript({
			user_id,
			script_title,
			description,
			character_names,
		});

		res.json({
			message: 'Script Created',
			script_id,
		});
	} catch (err) {
		if (err.code === 'UNKNOWN_CHARACTER' || err.code === 'NO_CHARACTERS') {
			return res.status(400).json({ message: err.message });
		}
		console.log(err);
		res.status(500).json({ message: 'Failed to create script.' });
	}
}

export const fetchScriptsByUser = async (req, res) => {
	const id = req.user_id;
	try {
		const rows = await scriptRepository.fetchUserScripts({ id });
		res.json(rows);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
};

export const searchScripts = async (req, res) => {
	const raw = req.query.q ?? req.query.search_string;
	let q = typeof raw === 'string' ? raw.trim() : '';
	try {
		if (!q) {
			return res.json([]);
		}
		if (q.length > SCRIPT_SEARCH_MAX_LEN) {
			q = q.slice(0, SCRIPT_SEARCH_MAX_LEN);
		}
		const pattern = `%${escapePgLikePattern(q)}%`;
		const rows = await scriptRepository.searchScriptsByPattern({ pattern })
		return res.status(200).json(rows);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Could not search scripts' });
	}
}

export const getScriptDetails = async (req, res) => {
	const { id } = req.params
	try {
		// Get all rows
		const rows = await scriptRepository.getScriptDetails({ id })
		// Shape response
		const script = rows.reduce((acc, row) => {
			if (!acc) {
				acc = {
					name: row.name,
					description: row.description,
					is_official: row.is_official,
					author: row.author,
					characters: []
				}
			}

			acc.characters.push({
				id: row.id,
				name: row.character_name,
				type: row.type,
				ability: row.ability
			})

			return acc;
		}, null);
		res.json(script);
	} catch (err) {
		console.log(err)
		res.status(500).json({ error: 'Failed to list scripts' });
	}
};

export const updateScript = async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;
	const { script_title, description, character_names } = req.body;

	try {
		await scriptRepository.updateScript({ id, user_id, character_names, script_title, description });
	} catch (err) {
		if (err.message == 'Script not found') {
			return res.status(404).json({ message: 'Script not found' });
		} else if (err.message == 'Unauthorized') {
			return res.status(403).json({ message: 'Unauthorized' });

		}
		console.log(err);
		res.status(500).json({ error: 'Failed to update script' });

	}
	return res.json({
		message: 'Script updated',
		script_id: id
	});
}

export const deleteScript = async (req, res) => {
	const user_id = req.user_id;
	const { id } = req.params;

	try {
		const ownerRows = await scriptRepository.checkForOwner({ id });
		const script_owner = ownerRows[0];
		if (!script_owner) {
			return res.status(404).json({ message: 'Script not found' });
		}
		if (script_owner.owner_id !== user_id) {
			return res.status(403).json({ message: 'Unauthorized' });
		}
		await scriptRepository.deleteScript({ id });
		res.sendStatus(204);
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: 'Failed to delete script' });
	}
};