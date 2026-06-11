/**
 * Register POXY WORLD slash commands to a single guild (instant propagation).
 * Usage: npm run deploy-commands
 */
require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Missing DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, or DISCORD_GUILD_ID');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Show RNG proof for a provably-fair round')
    .addStringOption((opt) =>
      opt.setName('round_id').setDescription('RNG round UUID').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('dragon')
    .setDescription('Look up a dragon by serial number')
    .addStringOption((opt) =>
      opt.setName('serial').setDescription('Serial e.g. PX-ABC123').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Global POXY WORLD platform statistics'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top 10 collectors by XP'),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands to guild ${guildId}…`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
