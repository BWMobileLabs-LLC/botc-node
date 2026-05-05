import 'dotenv/config';

/**
 * @type { import('knex').Knex.Config }
 */
const config = {
  client: 'pg',
  connection: {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE,
  },
  migrations: {
    directory: './migrations',
    extension: 'mjs',
    loadExtensions: ['.mjs'],
  },
  seeds: {
    directory: './seeds',
    extension: 'mjs',
    loadExtensions: ['.mjs'],
  },
};

export default {
  development: config,
  production: config
};