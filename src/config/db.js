import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
	host: process.env.PGHOST,
	port: Number(process.env.PGPORT) || 5432,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD || undefined,
	database: process.env.PGDATABASE,
	max: 10,
	connectionTimeoutMillis: 10000,
	idletimeoutMillis: 30000,
});

export const closeDb = async () => {
	await pool.end();
	console.log('Database connection pool closed.');
};

export default pool;