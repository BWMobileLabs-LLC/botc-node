import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import db from './config/db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { verifyAccessToken } from './utils/jwt.js';

//Routes
import scriptsRouter from './routes/scripts.js';
import authRouter from './routes/auth.js';
import characterRouter from './routes/characters.js';
import gamesRouter from './routes/games.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());



// Create HTTP server
const httpServer = createServer(app);

// Attach socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  }
});

// Routes
app.use('/api/scripts', scriptsRouter);
app.use('/api/auth', authRouter);
app.use('/api/characters', characterRouter);
app.use('/api/games', gamesRouter(io));

io.use((socket, next) => {
  try {
    const raw = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const payload = verifyAccessToken(token);
    socket.user_id = payload.sub;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

// Socket logic
io.on('connection', (socket) => {
  console.log('socket connected: ', socket.id);

  // Join game event
  socket.on('game:join', async ({ game_id }) => {
    if (!game_id) {
      return;
    }
    try {
      const player = await db('game_players')
        .where({
          'user_id': socket.user_id,
          'game_id': game_id
        })
        .first();

      if (!player) {
        // Might be storyteller
        const storyteller = await db('games')
          .where({
            'id': game_id,
            'storyteller_id': socket.user_id
          })
          .first();

        if (!storyteller) {
          return;
        }
      }
      socket.join(`game:${game_id}`);
      socket.emit('game:joined', { game_id });
    } catch (error) {
      console.log(error);
    }
  });

  // Leave game event
  socket.on('game:leave', ({ game_id }) => {
    if (!game_id) {
      return;
    }
    socket.leave(`game:${game_id}`);
    socket.emit('game:left', { game_id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});