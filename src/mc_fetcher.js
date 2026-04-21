const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { fetchMcStats } = require('./mc_tools')
const { fetch } = require('undici'); // built into Node 18+, or use node-fetch
const { log } = require('./utils/logger');


// ─── Config ──────────────────────────────────────────────────────────────────

const STATIC_MC_DC_CHANNEL = '1343304774346604635'; // replace with real channel ID
const POLL_INTERVAL_MS     = 5 * 60_000;
const OFFLINE_TIMEOUT_MS   = 60 * 1000;

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * Map<serverId, {
 *   timeoutId:   ReturnType<typeof setTimeout> | null,
 *   offlineSince: number | null,
 *   botMessage:  Discord.Message          — the bot's reply we keep editing
 * }>
 */
const watchers = new Map();

// ─── Public API ──────────────────────────────────────────────────────────────

/** Called from index.js — checks whether this message is relevant to us */
function isMinecraftHostMessage(message) {
  return message.channelId === STATIC_MC_DC_CHANNEL;
}

/** Called from index.js — parses the server address and kicks off a watcher */
async function handleMinecraftHostMessage(message) {
  const address = parseServerAddress(message.content);
  if (!address) return;

  if (watchers.has(address)) {
    await message.reply(`Already watching **${address}** ⏳`);
    return;
  }

  log(`[MC] Starting watcher for ${address}`);

  // Register watcher entry before first tick
  watchers.set(address, { channel: message.channel, timeoutId: null, offlineSince: null, botMessage: null, failed_init_counter: 0 });

  // Kick off the recursive loop immediately
  await pollOnce(address);
}

async function makeMessage(watcher) {
  // Send initial "loading" message with a Stop button
  const botMessage = await watcher.channel.send({
    embeds:     [buildEmbed(watcher.address, null)],
    components: [buildStopButton(watcher.address)],
  });
  return botMessage;
}

/** Called when the Stop button is pressed (wire this up in your interaction handler) */
async function handleStopButton(interaction) {
  // customId format: "mc_stop:<address>"
  const address = interaction.customId.split(':')[1];
  stopWatcher(address);
  await interaction.update({
    embeds:     [buildEmbed(address, null, '🛑 Stopped watching')],
    components: [],
  });
  log(`[MC] Watcher stopped by user for ${address}`);
}

// ─── Core loop (Option B — recursive setTimeout) ─────────────────────────────

async function pollOnce(address) {
  const watcher = watchers.get(address);
  if (!watcher) return; // was stopped externally

  let stats = null;
  try {
    stats = await fetchMcStats(address);
    log(`[MC] ${address} → ${JSON.stringify(stats)}`);
  } catch (err) {
    log(`[MC] Fetch error for ${address}: ${err}`);
  }

  // ── Offline timeout logic ─────────────────────────────────────────────────
  if (!stats?.online) {
    watcher.offlineSince ??= Date.now();
    const offlineMs = Date.now() - watcher.offlineSince;

    if (offlineMs >= OFFLINE_TIMEOUT_MS) {
      log(`[MC] ${address} offline for 24h — auto-stopping watcher`);
      if (watcher.botMessage) {
        await watcher.botMessage.edit({
          embeds:     [buildEmbed(address, stats, '⏹ Auto-stopped: offline for too long')],
          components: [],
        });
      }
      watchers.delete(address);
      return; // ← no reschedule: loop ends here
    }
  } else {
    watcher.offlineSince = null; // came back online — reset the clock
  }

  // ── Update the Discord message ────────────────────────────────────────────
  try {
    if (!watcher.botMessage && stats?.online) watcher.botMessage = await makeMessage(watcher);
    if (watcher.botMessage) {
      await watcher.botMessage.edit({
        embeds:     [buildEmbed(address, stats)],
        components: [buildStopButton(address)],
      });
    } else {
      // if still not initialized watcher.botMessage then newer it was successfully made
      watcher.failed_init_counter += 1;
      if (watcher.failed_init_counter > 10) {
        // maybe thats not aternos srever?
        log(`[MC] maybe that (${address}) is not aternos server? Exiting checkerd..`);
        return;
      }
    }
  } catch (err) {
    log(`[MC] Failed to edit message for ${address}:`);
  }

  // ── Schedule next tick ────────────────────────────────────────────────────
  watcher.timeoutId = setTimeout(() => pollOnce(address), POLL_INTERVAL_MS);
}

function stopWatcher(address) {
  const watcher = watchers.get(address);
  if (!watcher) return;
  clearTimeout(watcher.timeoutId);
  watchers.delete(address);
}



// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Very naive: grab first token that looks like a hostname[:port] */
function parseServerAddress(content) {
  const match = content.match(/([a-zA-Z0-9._-]+(?::\d+)?)/);
  return match?.[1] ?? null;
}

function buildEmbed(address, stats, footer = null) {
  const embed = new EmbedBuilder().setTitle(`🖥 ${address}`);

  if (!stats) {
    embed.setDescription('...').setColor(0x888888);
  } else if (!stats.online) {
    const watcher     = watchers.get(address);
    const offlineMs   = watcher?.offlineSince ? Date.now() - watcher.offlineSince : 0;
    const offlineHrs  = Math.floor(offlineMs / 3_600_000);
    embed
      .setDescription('🔴 Offline')
      .addFields({ name: 'Offline for', value: offlineHrs > 0 ? `~${offlineHrs}h` : 'just now' })
      .setColor(0xff4444);
  } else {
    const playerList = stats.players?.list?.map(p => p.name).join(', ') || 'none';
    embed
      .setDescription('🟢 Online')
      .addFields(
        { name: 'Version',  value: stats.version  ?? 'unknown', inline: true },
        { name: 'Players',  value: `${stats.players?.online ?? 0} / ${stats.players?.max ?? '?'}`, inline: true },
        { name: 'Online',   value: playerList },
      )
      .setColor(0x44ff88);
  }

  if (footer) embed.setFooter({ text: footer });
  embed.setTimestamp();
  return embed;
}

function buildStopButton(address) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mc_stop:${address}`)
      .setLabel('Stop watching')
      .setStyle(ButtonStyle.Danger),
  );
}

module.exports = {
  handleStopButton,
  handleMinecraftHostMessage,
  isMinecraftHostMessage,
};
