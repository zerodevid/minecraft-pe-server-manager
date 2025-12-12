import fs from 'fs';
import path from 'path';
import { BDS_DIR } from '../config';

export const BAN_FILE = path.join(BDS_DIR, 'banned-players.json');

interface BanEntry {
  name?: string;
  xuid?: string;
  [key: string]: any;
}

interface BanWrapper {
  type: 'array' | 'object';
  data?: any;
  key?: string;
}

function sanitizeText(value: any) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\r\n]/g, ' ').trim();
}

function readBanPayload(): { entries: BanEntry[]; wrapper: BanWrapper } {
  if (!fs.existsSync(BAN_FILE)) {
    return { entries: [], wrapper: { type: 'array' } };
  }

  try {
    const raw = fs.readFileSync(BAN_FILE, 'utf-8').trim();
    if (!raw) {
      return { entries: [], wrapper: { type: 'array' } };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { entries: parsed, wrapper: { type: 'array' } };
    }
    const candidates = ['banned_players', 'bannedPlayers', 'banlist', 'players'];
    const key = candidates.find((candidate) => Array.isArray(parsed?.[candidate]));
    if (key) {
      return { entries: parsed[key], wrapper: { type: 'object', key, data: parsed } };
    }
    return { entries: [], wrapper: { type: 'array' } };
  } catch (error: any) {
    console.error(`[playerManager] Unable to parse ${BAN_FILE}: ${error.message}`);
    return { entries: [], wrapper: { type: 'array' } };
  }
}

function writeBanPayload(entries: BanEntry[], wrapper: BanWrapper) {
  const normalizedEntries = entries.map((entry) => {
    const payload: BanEntry = {};
    if (entry?.name) {
      payload.name = sanitizeText(entry.name) || entry.xuid || 'unknown';
    }
    if (entry?.xuid) {
      payload.xuid = sanitizeText(entry.xuid);
    }
    if (!payload.name) {
      payload.name = payload.xuid || 'unknown';
    }
    return payload;
  });

  if (wrapper?.type === 'object' && wrapper?.data && wrapper?.key) {
    const clone = { ...wrapper.data, [wrapper.key]: normalizedEntries };
    fs.writeFileSync(BAN_FILE, JSON.stringify(clone, null, 2));
    return;
  }

  fs.writeFileSync(BAN_FILE, JSON.stringify(normalizedEntries, null, 2));
}

export function listBans() {
  const { entries } = readBanPayload();
  return entries.map((entry) => ({
    name: sanitizeText(entry?.name) || 'Unknown',
    xuid: sanitizeText(entry?.xuid),
  }));
}

export function upsertBanEntry({ name, xuid }: { name?: string; xuid?: string }) {
  const safeName = sanitizeText(name);
  const safeXuid = sanitizeText(xuid);
  const { entries, wrapper } = readBanPayload();
  const index = entries.findIndex((entry) => {
    const matchesName = safeName && sanitizeText(entry?.name).toLowerCase() === safeName.toLowerCase();
    const matchesXuid = safeXuid && sanitizeText(entry?.xuid) === safeXuid;
    return matchesName || matchesXuid;
  });

  const payload: BanEntry = {
    ...(safeName ? { name: safeName } : {}),
    ...(safeXuid ? { xuid: safeXuid } : {}),
  };

  if (!Object.keys(payload).length) {
    throw new Error('Player name or XUID is required.');
  }

  if (index >= 0) {
    entries[index] = { ...entries[index], ...payload };
  } else {
    entries.push(payload);
  }

  writeBanPayload(entries, wrapper);
  return payload;
}

export function removeBanEntry({ name, xuid }: { name?: string; xuid?: string }) {
  const safeName = sanitizeText(name);
  const safeXuid = sanitizeText(xuid);
  const { entries, wrapper } = readBanPayload();

  let removedEntry: BanEntry | null = null;
  const filtered = entries.filter((entry) => {
    const entryName = sanitizeText(entry?.name);
    const entryXuid = sanitizeText(entry?.xuid);
    const matches =
      (safeName && entryName.toLowerCase() === safeName.toLowerCase()) ||
      (safeXuid && entryXuid === safeXuid);
    if (matches && !removedEntry) {
      removedEntry = entry;
    }
    return !matches;
  });

  if (!removedEntry) {
    return { removed: false };
  }

  writeBanPayload(filtered, wrapper);
  return { removed: true, entry: removedEntry };
}

export default {
  listBans,
  upsertBanEntry,
  removeBanEntry,
  BAN_FILE,
};
