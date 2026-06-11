/**
 * POXY WORLD Discord Bot — D1 slash commands + D2 Supabase Realtime auto-events.
 */
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// ── Environment ───────────────────────────────────────────────────────────────

const {
  DISCORD_BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  RARE_DROPS_CHANNEL_ID,
  MARKET_FEED_CHANNEL_ID,
  ANNOUNCEMENTS_CHANNEL_ID,
} = process.env;

const REQUIRED = [
  'DISCORD_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

// ── Clients ─────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Constants ───────────────────────────────────────────────────────────────

const RARITY_COLORS = {
  common: 0x64748b,
  uncommon: 0x22c55e,
  rare: 0x3b82f6,
  epic: 0xa855f7,
  legendary: 0xf59e0b,
  mythic: 0xec4899,
  secret: 0xffffff,
  diamond: 0x3b82f6,
  stellar: 0xf59e0b,
};

const RARE_TIERS = new Set(['legendary', 'mythic', 'secret']);
const DROP_EMOJI = { legendary: '⚡', mythic: '💎', secret: '✨' };
const BIG_TRADE_PX = 500;
const PX_TO_GBP = 0.05;

let lastAnnouncedEventId = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSerial(raw) {
  const s = String(raw || '').trim().replace(/^#/, '').toUpperCase();
  return s.startsWith('PX-') ? s : `PX-${s}`;
}

async function getChannel(channelId) {
  if (!channelId) return null;
  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || !ch.isTextBased()) return null;
  return ch;
}

async function sendEmbed(channelId, embed) {
  const ch = await getChannel(channelId);
  if (!ch) {
    console.warn('Channel unavailable:', channelId);
    return;
  }
  await ch.send({ embeds: [embed] });
}

async function sendText(channelId, content) {
  const ch = await getChannel(channelId);
  if (!ch) return;
  await ch.send({ content });
}

async function fetchUsername(userId) {
  const { data } = await sb
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  return data?.username || 'Unknown';
}

// ── D1: Slash command handlers ────────────────────────────────────────────────

async function handleVerify(interaction, roundId) {
  await interaction.deferReply();

  const id = String(roundId).trim().toLowerCase();
  const { data: round, error } = await sb
    .from('rng_rounds')
    .select('id, commit_hash, result_hash, status, committed_at, revealed_at, user_id')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('verify query error:', error.message);
    return interaction.editReply('Could not load round data.');
  }
  if (!round) return interaction.editReply('Round not found.');

  const { data: drop } = await sb
    .from('user_poxy')
    .select('serial_number, poxy_tier, case_origin')
    .eq('rng_round_id', id)
    .maybeSingle();

  const resultTier = drop?.poxy_tier || 'pending';

  const embed = new EmbedBuilder()
    .setTitle('🔍 RNG Verification')
    .setColor(0x00f5a0)
    .addFields(
      { name: 'Round ID', value: `\`${round.id}\``, inline: false },
      { name: 'Commit Hash', value: `\`${round.commit_hash}\``, inline: false },
      {
        name: 'Result Hash',
        value: `\`${round.result_hash || 'pending'}\``,
        inline: false,
      },
      { name: 'Result Tier', value: String(resultTier).toUpperCase(), inline: true },
      { name: 'Status', value: round.status, inline: true },
      {
        name: 'Verify',
        value: '✅ Cryptographically provable — https://poxy-gens.vercel.app/#/verify',
        inline: false,
      },
    )
    .setFooter({ text: 'POXY WORLD — Provably Fair' });

  if (drop?.serial_number) {
    embed.addFields({
      name: 'Minted Drop',
      value: `${drop.serial_number} · ${drop.case_origin || 'case'}`,
      inline: false,
    });
  }

  return interaction.editReply({ embeds: [embed] });
}

async function handleDragon(interaction, serial) {
  await interaction.deferReply();

  const sn = normalizeSerial(serial);
  const { data: dragon, error } = await sb
    .from('user_poxy')
    .select(
      'id, serial_number, poxy_tier, dna_hash, case_origin, dropped_at, user_id, profiles(username)',
    )
    .ilike('serial_number', sn)
    .maybeSingle();

  if (error) {
    console.error('dragon query error:', error.message);
    return interaction.editReply('Could not load dragon data.');
  }
  if (!dragon) return interaction.editReply('Dragon not found.');

  const tier = String(dragon.poxy_tier || 'common').toLowerCase();
  const hash = dragon.dna_hash || '';
  const owner = dragon.profiles?.username || (await fetchUsername(dragon.user_id));

  const embed = new EmbedBuilder()
    .setTitle(`🐉 ${dragon.serial_number}`)
    .setColor(RARITY_COLORS[tier] || RARITY_COLORS.common)
    .addFields(
      { name: 'Tier', value: tier.toUpperCase(), inline: true },
      { name: 'Owner', value: `@${owner}`, inline: true },
      { name: 'Origin', value: dragon.case_origin || '—', inline: true },
      {
        name: 'DNA Hash',
        value: hash ? `\`${hash.slice(0, 16)}…\`` : '—',
        inline: false,
      },
    )
    .setFooter({
      text: `Minted: ${new Date(dragon.dropped_at).toLocaleDateString('en-GB')}`,
    });

  return interaction.editReply({ embeds: [embed] });
}

async function handleStats(interaction) {
  await interaction.deferReply();

  const [overviewRes, gen1Res, tradesRes] = await Promise.all([
    sb.rpc('get_supply_overview'),
    sb.rpc('get_gen1_supply_status'),
    sb.from('marketplace').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
  ]);

  if (overviewRes.error) {
    console.error('stats overview error:', overviewRes.error.message);
    return interaction.editReply('Could not load platform stats.');
  }

  const overview = Array.isArray(overviewRes.data)
    ? overviewRes.data[0]
    : overviewRes.data;
  const gen1 = gen1Res.data || {};
  const totalTrades = tradesRes.count ?? 0;

  const embed = new EmbedBuilder()
    .setTitle('📊 POXY WORLD Stats')
    .setColor(0xe879f9)
    .addFields(
      {
        name: 'Total Players',
        value: String(overview?.total_players ?? 0),
        inline: true,
      },
      {
        name: 'Dragons Minted',
        value: String(overview?.total_minted ?? 0),
        inline: true,
      },
      { name: 'Total Trades', value: String(totalTrades), inline: true },
      {
        name: 'Gen1 Remaining',
        value: String(gen1.total_remaining ?? '—'),
        inline: true,
      },
      {
        name: 'PC in Circulation',
        value: String(overview?.total_pc_circulation ?? 0),
        inline: true,
      },
      {
        name: 'Total Burned',
        value: String(overview?.total_burned ?? 0),
        inline: true,
      },
    )
    .setFooter({ text: 'Live from Supabase · get_supply_overview + gen1 status' });

  return interaction.editReply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
  await interaction.deferReply();

  const { data, error } = await sb
    .from('profiles')
    .select('username, xp_level, xp_total')
    .order('xp_total', { ascending: false })
    .limit(10);

  if (error) {
    console.error('leaderboard error:', error.message);
    return interaction.editReply('Could not load leaderboard.');
  }

  const medals = ['🥇', '🥈', '🥉'];
  const list =
    data
      ?.map(
        (p, i) =>
          `${medals[i] || `${i + 1}.`} **@${p.username || 'player'}** — LVL ${p.xp_level ?? 0} (${p.xp_total ?? 0} XP)`,
      )
      .join('\n') || 'No data';

  const embed = new EmbedBuilder()
    .setTitle('🏆 Top Collectors')
    .setDescription(list)
    .setColor(0xf59e0b);

  return interaction.editReply({ embeds: [embed] });
}

// ── D2: Auto-events ─────────────────────────────────────────────────────────

async function notifyRareDrop(row) {
  if (!RARE_DROPS_CHANNEL_ID) return;

  const tier = String(row.poxy_tier || '').toLowerCase();
  if (!RARE_TIERS.has(tier)) return;

  const username = await fetchUsername(row.user_id);
  const emoji = DROP_EMOJI[tier] || '🐉';

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${tier.toUpperCase()} DROP!`)
    .setDescription(`**@${username}** just opened a ${tier} dragon!`)
    .setColor(RARITY_COLORS[tier] || 0xf59e0b)
    .addFields(
      { name: 'Serial', value: row.serial_number || '—', inline: true },
      { name: 'Case', value: row.case_origin || '—', inline: true },
    )
    .setFooter({ text: 'POXY WORLD — Rare Drops' });

  await sendEmbed(RARE_DROPS_CHANNEL_ID, embed);
}

async function notifyBigTrade(listing) {
  if (!MARKET_FEED_CHANNEL_ID) return;

  const price = Number(listing.price);
  if (!Number.isFinite(price) || price < BIG_TRADE_PX) return;

  const { data: poxy } = await sb
    .from('user_poxy')
    .select('serial_number')
    .eq('id', listing.poxy_id)
    .maybeSingle();

  const serial = poxy?.serial_number || 'Unknown';
  const gbp = (price * PX_TO_GBP).toFixed(2);

  await sendText(
    MARKET_FEED_CHANNEL_ID,
    `💰 **${serial}** sold for **${price} PX** (~£${gbp})`,
  );
}

async function notifyEventStart(event) {
  if (!ANNOUNCEMENTS_CHANNEL_ID || !event?.id || event.id === 'none') return;
  if (event.id === lastAnnouncedEventId) return;

  lastAnnouncedEventId = event.id;

  await sendText(
    ANNOUNCEMENTS_CHANNEL_ID,
    `🎉 **${event.label || event.id}** has started! ${event.sub || ''}`,
  );
}

async function pollEconomyEvent() {
  const { data, error } = await sb.rpc('get_economy_event');
  if (error) {
    console.error('economy event poll error:', error.message);
    return;
  }
  const event = data || {};
  if (event.id && event.id !== 'none') {
    await notifyEventStart(event);
  }
}

function setupRealtime() {
  const channel = sb.channel('poxy-discord-bot');

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'user_poxy' },
    (payload) => {
      notifyRareDrop(payload.new).catch((e) =>
        console.error('rare drop notify:', e),
      );
    },
  );

  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'marketplace' },
    (payload) => {
      const next = payload.new;
      const prev = payload.old;
      if (next?.status === 'sold' && prev?.status !== 'sold') {
        notifyBigTrade(next).catch((e) =>
          console.error('big trade notify:', e),
        );
      }
    },
  );

  channel.subscribe((status, err) => {
    if (err) console.error('Realtime subscribe error:', err);
    console.log('Supabase Realtime status:', status);
  });
}

// ── Discord event wiring ──────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setupRealtime();
  pollEconomyEvent().catch((e) => console.error('initial event poll:', e));
  setInterval(() => {
    pollEconomyEvent().catch((e) => console.error('event poll:', e));
  }, 60 * 60 * 1000);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'verify':
        return handleVerify(interaction, interaction.options.getString('round_id'));
      case 'dragon':
        return handleDragon(interaction, interaction.options.getString('serial'));
      case 'stats':
        return handleStats(interaction);
      case 'leaderboard':
        return handleLeaderboard(interaction);
      default:
        return interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (e) {
    console.error(`Command ${interaction.commandName} failed:`, e);
    const msg = { content: 'Something went wrong. Try again later.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(DISCORD_BOT_TOKEN);
