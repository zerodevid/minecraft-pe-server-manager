import fs from 'fs';
import path from 'path';
import { BDS_DIR } from '../config';

const SERVER_PROPERTIES = path.join(BDS_DIR, 'server.properties');

interface PropertyOption {
  label: string;
  value: string;
}

interface PropertyDefinition {
  key: string;
  label: string;
  description: string;
  input: string;
  valueType: 'string' | 'number' | 'boolean';
  section: string;
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  maxLength?: number;
  options?: PropertyOption[];
}

interface PropertySection {
  id: string;
  title: string;
  description: string;
  fields: string[];
}

const PROPERTY_DEFINITIONS: PropertyDefinition[] = [
  {
    key: 'server-name',
    label: 'Server Name / MOTD',
    description: 'Displayed in the multiplayer list and server selection screen.',
    input: 'text',
    valueType: 'string',
    section: 'identity',
    placeholder: 'Dedicated Server',
    defaultValue: 'Dedicated Server',
  },
  {
    key: 'max-players',
    label: 'Max Players',
    description: 'Maximum number of people allowed to join simultaneously.',
    input: 'number',
    valueType: 'number',
    min: 1,
    max: 128,
    section: 'identity',
    defaultValue: 10,
  },
  {
    key: 'server-port',
    label: 'IPv4 Port',
    description: 'Port used for IPv4 connections.',
    input: 'number',
    valueType: 'number',
    min: 1,
    max: 65535,
    section: 'identity',
    defaultValue: 19132,
  },
  {
    key: 'server-portv6',
    label: 'IPv6 Port',
    description: 'Port used for IPv6 connections.',
    input: 'number',
    valueType: 'number',
    min: 1,
    max: 65535,
    section: 'identity',
    defaultValue: 19133,
  },
  {
    key: 'online-mode',
    label: 'Online Mode (Xbox Live)',
    description: 'Require Xbox Live authentication for remote players.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'identity',
    defaultValue: true,
  },
  {
    key: 'allow-list',
    label: 'Require Allow List',
    description: 'Only allow players included in allowlist.json to join.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'identity',
    defaultValue: false,
  },
  {
    key: 'enable-lan-visibility',
    label: 'LAN Broadcast',
    description: 'Advertise this server over LAN discovery.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'identity',
    defaultValue: true,
  },
  {
    key: 'gamemode',
    label: 'Game Mode',
    description: 'Default experience for new players.',
    input: 'select',
    valueType: 'string',
    section: 'gameplay',
    defaultValue: 'survival',
    options: [
      { label: 'Survival', value: 'survival' },
      { label: 'Creative', value: 'creative' },
      { label: 'Adventure', value: 'adventure' },
    ],
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    description: 'Controls mob damage, hunger, etc.',
    input: 'select',
    valueType: 'string',
    section: 'gameplay',
    defaultValue: 'easy',
    options: [
      { label: 'Peaceful', value: 'peaceful' },
      { label: 'Easy', value: 'easy' },
      { label: 'Normal', value: 'normal' },
      { label: 'Hard', value: 'hard' },
    ],
  },
  {
    key: 'force-gamemode',
    label: 'Force Game Mode',
    description: 'Apply the server game mode even if the world saved something else.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'gameplay',
    defaultValue: false,
  },
  {
    key: 'allow-cheats',
    label: 'Allow Cheats',
    description: 'Permit commands such as /give or /op.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'gameplay',
    defaultValue: false,
  },
  {
    key: 'default-player-permission-level',
    label: 'Default Permission (OP)',
    description: 'Role assigned to new players. Operator gives OP by default.',
    input: 'select',
    valueType: 'string',
    section: 'gameplay',
    defaultValue: 'member',
    options: [
      { label: 'Visitor', value: 'visitor' },
      { label: 'Member', value: 'member' },
      { label: 'Operator', value: 'operator' },
    ],
  },
  {
    key: 'pvp',
    label: 'PvP Damage',
    description: 'Allow players to damage each other.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'gameplay',
    defaultValue: false,
  },
  {
    key: 'chat-restriction',
    label: 'Chat Restriction',
    description: 'Control how chat behaves for non-operators.',
    input: 'select',
    valueType: 'string',
    section: 'gameplay',
    defaultValue: 'None',
    options: [
      { label: 'None', value: 'None' },
      { label: 'Dropped', value: 'Dropped' },
      { label: 'Disabled', value: 'Disabled' },
    ],
  },
  {
    key: 'level-type',
    label: 'Level Type',
    description: 'Choose DEFAULT for normal terrain or FLAT for superflat worlds.',
    input: 'select',
    valueType: 'string',
    section: 'world',
    defaultValue: 'DEFAULT',
    options: [
      { label: 'Default', value: 'DEFAULT' },
      { label: 'Flat', value: 'FLAT' },
    ],
  },
  {
    key: 'level-seed',
    label: 'World Seed',
    description: 'Seed used for world generation (leave empty for random).',
    input: 'text',
    valueType: 'string',
    section: 'world',
    allowEmpty: true,
    defaultValue: '',
  },
  {
    key: 'tick-distance',
    label: 'Tick Distance',
    description: 'How many chunks from players will keep running.',
    input: 'number',
    valueType: 'number',
    min: 4,
    max: 12,
    section: 'world',
    defaultValue: 4,
  },
  {
    key: 'view-distance',
    label: 'View Distance',
    description: 'Maximum chunk radius sent to clients.',
    input: 'number',
    valueType: 'number',
    min: 5,
    max: 96,
    section: 'world',
    defaultValue: 32,
  },
  {
    key: 'player-idle-timeout',
    label: 'Idle Timeout (minutes)',
    description: 'Kick players after remaining idle for this many minutes. 0 disables.',
    input: 'number',
    valueType: 'number',
    min: 0,
    max: 10080,
    section: 'world',
    defaultValue: 30,
  },
  {
    key: 'texturepack-required',
    label: 'Require Texture Pack',
    description: 'Force clients to download and apply active resource packs.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'world',
    defaultValue: false,
  },
  {
    key: 'max-threads',
    label: 'Max Threads',
    description: 'Limit the CPU threads the server may use (0 = auto).',
    input: 'number',
    valueType: 'number',
    min: 0,
    max: 1024,
    section: 'advanced',
    defaultValue: 8,
  },
  {
    key: 'compression-threshold',
    label: 'Compression Threshold',
    description: 'Smallest packet size that should be compressed (0-65535).',
    input: 'number',
    valueType: 'number',
    min: 0,
    max: 65535,
    section: 'advanced',
    defaultValue: 1,
  },
  {
    key: 'content-log-file-enabled',
    label: 'Write Content Log',
    description: 'Enable detailed content error logging.',
    input: 'toggle',
    valueType: 'boolean',
    section: 'advanced',
    defaultValue: false,
  },
];

const PROPERTY_SECTIONS: PropertySection[] = [
  {
    id: 'identity',
    title: 'Server Identity & Access',
    description: 'Basics that players see plus how they connect.',
    fields: [
      'server-name',
      'max-players',
      'server-port',
      'server-portv6',
      'online-mode',
      'allow-list',
      'enable-lan-visibility',
    ],
  },
  {
    id: 'gameplay',
    title: 'Gameplay Rules',
    description: 'Define how challenging the experience should be.',
    fields: [
      'gamemode',
      'difficulty',
      'force-gamemode',
      'allow-cheats',
      'default-player-permission-level',
      'pvp',
      'chat-restriction',
    ],
  },
  {
    id: 'world',
    title: 'World Settings',
    description: 'Fine tune world generation and ticking behaviour.',
    fields: [
      'level-type',
      'level-seed',
      'tick-distance',
      'view-distance',
      'player-idle-timeout',
      'texturepack-required',
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Tuning',
    description: 'Performance tweaks for experienced admins.',
    fields: ['max-threads', 'compression-threshold', 'content-log-file-enabled'],
  },
];

const definitionMap = new Map(PROPERTY_DEFINITIONS.map((def) => [def.key, def]));

function ensurePropertiesFile() {
  if (!fs.existsSync(SERVER_PROPERTIES)) {
    throw new Error('server.properties not found. Make sure Bedrock Dedicated Server is installed.');
  }
}

function parsePropertiesFile(content: string) {
  const entries: { [key: string]: string } = {};
  const layout: { raw: string; key?: string }[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !line.includes('=')) {
      layout.push({ raw: line });
      return;
    }
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1);
    entries[key] = value;
    layout.push({ raw: line, key });
  });

  return { entries, layout };
}

function formatBoolean(value: any) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return 'true';
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return 'false';
    }
  }
  return value ? 'true' : 'false';
}

function formatNumber(def: PropertyDefinition, value: any) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${def.label} is required.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${def.label} must be a number.`);
  }
  if (def.min !== undefined && number < def.min) {
    throw new Error(`${def.label} must be at least ${def.min}.`);
  }
  if (def.max !== undefined && number > def.max) {
    throw new Error(`${def.label} must be ${def.max} or less.`);
  }
  return String(Math.trunc(number));
}

function formatString(def: PropertyDefinition, value: any) {
  if ((value === undefined || value === null || value === '') && !def.allowEmpty) {
    throw new Error(`${def.label} cannot be empty.`);
  }
  let stringValue = value ?? '';
  if (typeof stringValue !== 'string') {
    stringValue = String(stringValue);
  }
  stringValue = stringValue.replace(/[\r\n]/g, ' ').trim();
  if (!stringValue && !def.allowEmpty) {
    throw new Error(`${def.label} cannot be empty.`);
  }
  if (def.maxLength) {
    stringValue = stringValue.slice(0, def.maxLength);
  }
  if (def.options) {
    const allowed = def.options.map((option) => option.value);
    if (!allowed.includes(stringValue)) {
      throw new Error(`${def.label} must be one of: ${allowed.join(', ')}.`);
    }
  }
  return stringValue;
}

function serializeEntries(entries: { [key: string]: string }, layout: { raw: string; key?: string }[]) {
  const used = new Set();
  const lines = layout.map((line) => {
    if (!line.key) {
      return line.raw;
    }
    if (Object.prototype.hasOwnProperty.call(entries, line.key)) {
      used.add(line.key);
      return `${line.key}=${entries[line.key]}`;
    }
    return line.raw;
  });

  Object.entries(entries).forEach(([key, value]) => {
    if (!used.has(key)) {
      lines.push(`${key}=${value}`);
    }
  });

  return lines.join('\n');
}

function parseValueForResponse(def: PropertyDefinition, rawValue: string) {
  if (def.valueType === 'boolean') {
    if (rawValue === undefined) {
      return !!def.defaultValue;
    }
    return rawValue === 'true';
  }

  if (def.valueType === 'number') {
    if (rawValue === undefined || rawValue === '') {
      return def.defaultValue ?? null;
    }
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : def.defaultValue ?? null;
  }

  if (!rawValue && rawValue !== '') {
    return def.defaultValue ?? '';
  }
  return rawValue;
}

function formatValueForFile(def: PropertyDefinition, value: any) {
  if (!definitionMap.has(def.key)) {
    throw new Error(`Unknown property: ${def.key}`);
  }
  if (def.options && value && typeof value === 'string' && !def.options.find((opt) => opt.value === value)) {
    throw new Error(`${def.label} has an invalid value.`);
  }
  if (def.valueType === 'boolean') {
    return formatBoolean(value);
  }
  if (def.valueType === 'number') {
    return formatNumber(def, value);
  }
  return formatString(def, value);
}

function readProperties() {
  ensurePropertiesFile();
  const raw = fs.readFileSync(SERVER_PROPERTIES, 'utf-8');
  return parsePropertiesFile(raw);
}

export function getSettingsSections() {
  const { entries } = readProperties();
  const sections = PROPERTY_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields
      .map((key) => {
        const def = definitionMap.get(key);
        if (!def) return null;
        return {
          key: def.key,
          label: def.label,
          description: def.description,
          input: def.input,
          valueType: def.valueType,
          options: def.options || null,
          min: def.min,
          max: def.max,
          placeholder: def.placeholder,
          value: parseValueForResponse(def, entries[def.key]),
        };
      })
      .filter(Boolean),
  }));
  return { sections };
}

export function updateSettings(payload: { [key: string]: any } = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('No settings supplied.');
  }

  const { entries, layout } = readProperties();
  const updatedKeys: string[] = [];

  Object.entries(payload).forEach(([key, value]) => {
    const def = definitionMap.get(key);
    if (!def) {
      return;
    }
    const formatted = formatValueForFile(def, value);
    if (entries[key] !== formatted) {
      entries[key] = formatted;
      updatedKeys.push(key);
    }
  });

  if (!updatedKeys.length) {
    return { updated: [] };
  }

  const content = serializeEntries(entries, layout);
  fs.writeFileSync(SERVER_PROPERTIES, content);
  return { updated: updatedKeys };
}

export default {
  getSettingsSections,
  updateSettings,
};
