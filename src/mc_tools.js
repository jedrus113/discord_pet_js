const mc = require('minecraft-protocol');


// Known Aternos "offline" indicators
const ATERNOS_OFFLINE_MOTD_PATTERNS = [
  /server\s+is\s+sleeping/i,
  /server\s+is\s+starting/i,
  /server\s+is\s+loading/i,
  /server\s+is\s+offline/i,
  /an\s+aternos\s+server/i,       // generic placeholder MOTD
  /start\s+the\s+server/i,
  /join\s+to\s+start/i,
  /waiting\s+for\s+server/i,
  /server\s+not\s+found/i,
  /preparing\s+server/i,
];

const ATERNOS_OFFLINE_VERSION_PATTERNS = [
  /offline/i,
  /⚠/,                            // warning symbol in version name
  /aternos/i,                     // proxy self-identifying
];

/**
 * Recursively extract plain text from a Minecraft JSON chat component.
 */
function extractMotdText(description) {
  if (typeof description === 'string') return description;
  if (!description) return '';

  let text = description.text ?? '';

  if (Array.isArray(description.extra)) {
    for (const component of description.extra) {
      text += extractMotdText(component);
    }
  }

  // Some servers return { translate: "...", with: [...] }
  if (description.translate) {
    text += description.translate;
  }

  return text;
}

/**
 * Determine whether the ping response indicates a truly online server
 * vs. an Aternos proxy responding on behalf of a sleeping server.
 */
function isAternosServerTrulyOnline(result) {
  const versionName = result.version?.name ?? '';
  const protocol = result.version?.protocol ?? -1;
  const maxPlayers = result.players?.max ?? 0;
  const onlinePlayers = result.players?.online ?? 0;
  const motdText = extractMotdText(result.description).trim();

  // 1. Check MOTD for known "offline" phrases
  for (const pattern of ATERNOS_OFFLINE_MOTD_PATTERNS) {
    if (pattern.test(motdText)) {
      return {
        truly_online: false,
        reason: `MOTD matches offline pattern: ${pattern}`,
        motd: motdText,
      };
    }
  }

  // 2. Check version name for offline indicators
  for (const pattern of ATERNOS_OFFLINE_VERSION_PATTERNS) {
    if (pattern.test(versionName)) {
      return {
        truly_online: false,
        reason: `Version name matches offline pattern: "${versionName}"`,
        motd: motdText,
      };
    }
  }

  // 3. Protocol -1 or 0 almost always means the proxy is faking a response
  if (protocol <= 0) {
    return {
      truly_online: false,
      reason: `Protocol is ${protocol} (proxy/placeholder)`,
      motd: motdText,
    };
  }

  // 4. Max players of 0 — real running servers have max > 0
  if (maxPlayers === 0) {
    return {
      truly_online: false,
      reason: 'Max players is 0 (server not running)',
      motd: motdText,
    };
  }

  // 5. Passed all checks — server appears genuinely online
  return { truly_online: true, reason: null, motd: motdText };
}

/**
 * Check whether an address belongs to Aternos.
 */
function isAternosHost(host) {
  return /\.?aternos\.me$/i.test(host);
}

/**
 * Fetch Minecraft server status with Aternos-aware detection.
 *
 * @param {string} address - "host" or "host:port"
 * @returns {Promise<object>}
 */
async function fetchMcStats(address) {
  const [host, portStr] = address.split(':');
  const port = portStr ? parseInt(portStr, 10) : 25565;
  const isAternos = isAternosHost(host);

  const RETRIES = 2;               // fewer retries — Aternos proxy answers fast
  const TIMEOUT = isAternos ? 6000 : 8000;
  const RETRY_DELAY = 1500;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const result = await mc.ping({
        host,
        port,
        version: false,
        closeTimeout: TIMEOUT,
      });

      // ── Aternos-specific: determine if truly online ──
      if (isAternos) {
        const check = isAternosServerTrulyOnline(result);

        if (!check.truly_online) {
          console.log(
            `[Aternos] Server ${address} responded but is NOT truly online. ` +
            `Reason: ${check.reason}`
          );

          return {
            online: false,
            aternos_sleeping: true,
            aternos_reason: check.reason,
            version: result.version?.name ?? null,
            protocol: result.version?.protocol ?? null,
            players: { online: 0, max: 0, list: [] },
            motd: check.motd,
            raw_response: result,   // keep raw data for debugging
          };
        }
      }

      // ── Server is genuinely online ──
      return {
        online: true,
        aternos_sleeping: false,
        version: result.version?.name ?? null,
        protocol: result.version?.protocol ?? null,
        players: {
          online: result.players?.online ?? 0,
          max: result.players?.max ?? 0,
          list: (result.players?.sample ?? []).map(p => ({
            name: p.name,
            uuid: p.id,
          })),
        },
        motd: result.description,
      };
    } catch (err) {
      console.error(
        `[Attempt ${attempt}/${RETRIES}] Ping failed for ${address}: ${err.message}`
      );
      if (attempt < RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  // ── All attempts failed — truly unreachable ──
  return {
    online: false,
    aternos_sleeping: false,
    players: { online: 0, max: 0, list: [] },
  };
}


module.exports = {
    fetchMcStats,
};
  