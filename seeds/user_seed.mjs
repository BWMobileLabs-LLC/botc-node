import bcrypt from 'bcrypt';

export const seed = async (knex) => {
  // Deletes ALL existing entries
  await knex('users').del();

  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_ADMIN_PASSWORD is required for user seed');
  }
  const hashed = await bcrypt.hash(seedPassword, 12);

  // Inserts seed entries
  await knex('users').insert([
    {
      username: 'botc_admin',
      email: 'bwallace@bwmobilelabs.com',
      password_hash: hashed,
      display_name: 'BOTC Admin'
    }
  ]);
};
