import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

import * as gameController from '../controllers/games.js';

const createGamesRouter = (io) => {
	const router = Router();

	router.get('/current_game', authMiddleware, gameController.getCurrentGameState);

	router.post('/', authMiddleware, (req, res) => gameController.createNewGame(req, res, io));

	router.post('/join', authMiddleware, (req, res) => gameController.joinGame(req, res, io));

	router.post('/:id/leave', authMiddleware, (req, res) => gameController.leaveGame(req, res, io));

	router.patch('/:id', authMiddleware, (req, res) => gameController.patchGame(req, res, io));

	router.patch('/:gameID/player/:playerID', authMiddleware, (req, res) =>
		gameController.patchGamePlayer(req, res, io)
	);

	router.get('/:id', authMiddleware, gameController.getGameById);

	router.get('/:id/reminders', authMiddleware, gameController.getGameReminders);

	router.post('/:id/reminders', authMiddleware, gameController.postGameReminder);

	/** Must be registered before `DELETE /:id` (delete whole game). */
	router.delete('/:id/reminders', authMiddleware, gameController.deleteGameReminder);

	router.delete('/:id', authMiddleware, (req, res) => gameController.deleteGame(req, res, io));

	return router;
};

export default createGamesRouter;
