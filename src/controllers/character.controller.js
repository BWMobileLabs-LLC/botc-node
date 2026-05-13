import * as characterRepository from '../repositories/character.repository.js';

export const list = async (req, res) => {
	const typeRaw = req.query.type ?? req.body?.type;
	const type =
		typeof typeRaw === 'string' && typeRaw.trim() !== '' ? typeRaw.trim() : null;

	try {
		const rows = await characterRepository.listCharacters({ type });
		return res.json(rows);
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error fetching characters' });
	}
};
