import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import worldJson from './worldJson';
import worldManager from './worldManager';
import { copyDirectory } from '../utils/fsUtils';
import { ROOT_DIR, BDS_DIR } from '../config';

const PACKS_FILE = path.join(ROOT_DIR, 'packs.json');
const BEHAVIOR_DIR = path.join(BDS_DIR, 'behavior_packs');
const RESOURCE_DIR = path.join(BDS_DIR, 'resource_packs');
const DEFAULT_WORLD = worldManager.DEFAULT_WORLD || 'world';
const SCAN_DIRS = [
  { dir: BEHAVIOR_DIR, type: 'behavior' },
  { dir: RESOURCE_DIR, type: 'resource' },
];

interface Pack {
  uuid: string;
  name: string;
  version: number[];
  type: string;
  folder?: string;
  icon?: string | null;
  bundleId?: string;
  dependencies?: string[];
  enabled?: boolean;
  enabledWorlds?: string[];
  iconUrl?: string | null;
  installedAt?: string;
}

function readPacks(): Pack[] {
  try {
    const raw = fs.readFileSync(PACKS_FILE, 'utf-8');
    const packs = JSON.parse(raw);
    const normalized = packs.map(normalizePack);
    applyBundleLinks(normalized);
    return normalized;
  } catch (error) {
    return [];
  }
}

function writePacks(packs: Pack[]) {
  const sorted = [...packs].sort((a, b) => a.name.localeCompare(b.name));
  const serializable = sorted.map((pack) => {
    const { enabled, ...rest } = pack;
    return rest;
  });
  fs.writeFileSync(PACKS_FILE, JSON.stringify(serializable, null, 2));
}

function normalizePack(pack: any): Pack {
  if (!Array.isArray(pack.enabledWorlds)) {
    const defaultEnabled = pack.enabled ? [DEFAULT_WORLD] : [];
    pack.enabledWorlds = defaultEnabled;
  }

  if (!Array.isArray(pack.dependencies)) {
    pack.dependencies = [];
  }

  const manifest = loadPackManifest(pack);
  if (manifest) {
    if (!pack.dependencies.length) {
      pack.dependencies = extractDependencies(manifest);
    }
    if (!pack.bundleId) {
      pack.bundleId = getBundleId(manifest);
    }
  }

  if (!pack.bundleId) {
    pack.bundleId = slugify(pack.name) || pack.uuid;
  }

  if (!pack.icon && pack.folder) {
    const absoluteFolder = path.join(ROOT_DIR, pack.folder);
    const icon = locateIcon(absoluteFolder);
    if (icon) {
      pack.icon = icon;
    }
  }

  if (!pack.installedAt) {
    pack.installedAt = getFolderTimestamp(pack.folder);
  }

  return pack;
}

function applyBundleLinks(packs: Pack[]) {
  const packByUuid = new Map<string, Pack>();
  packs.forEach((pack) => packByUuid.set(pack.uuid, pack));

  let changed = true;
  while (changed) {
    changed = false;
    packs.forEach((pack) => {
      if (!pack.dependencies?.length) return;
      const match = pack.dependencies
        .map((depUuid) => packByUuid.get(depUuid)?.bundleId)
        .find(Boolean);
      if (match && match !== pack.bundleId) {
        pack.bundleId = match;
        changed = true;
      }
    });
  }

  packs.forEach((pack) => {
    if (!pack.bundleId) {
      pack.bundleId = slugify(pack.name) || pack.uuid;
    }
  });
}

function loadPackManifest(pack: Pack) {
  if (!pack?.folder) return null;
  const manifestPath = path.join(ROOT_DIR, pack.folder, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    return null;
  }
}

function locateIcon(folderPath: string) {
  const iconFile = path.join(folderPath, 'pack_icon.png');
  if (fs.existsSync(iconFile)) {
    return path.relative(ROOT_DIR, iconFile);
  }
  return null;
}

function getFolderTimestamp(folderRelative?: string) {
  if (!folderRelative) return undefined;
  const absolute = path.isAbsolute(folderRelative) ? folderRelative : path.join(ROOT_DIR, folderRelative);
  try {
    const stats = fs.statSync(absolute);
    return stats.birthtime?.toISOString() || stats.mtime?.toISOString();
  } catch (error) {
    return undefined;
  }
}

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

function getBundleId(manifest: any) {
  return slugify(manifest?.header?.name) || manifest?.header?.uuid || crypto.randomUUID();
}

function extractDependencies(manifest: any) {
  if (!Array.isArray(manifest?.dependencies)) return [];
  return manifest.dependencies
    .map((dependency: any) => dependency?.uuid)
    .filter(Boolean);
}

function cleanName(name: string) {
  return (name || '').replace(/§./g, '');
}

function scanDirectoryForPacks(dir: string, fallbackType: string) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const packs: Pack[] = [];
  entries.forEach((entry) => {
    if (!entry.isDirectory()) return;
    const folderPath = path.join(dir, entry.name);
    const manifestPath = path.join(folderPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      validateManifest(manifest);
      const type = getPackType(manifest) || fallbackType;
      const version = normalizeVersion(manifest.header?.version || [1, 0, 0]);
      const uuid = manifest.header?.uuid || manifest.modules?.[0]?.uuid || entry.name;
      packs.push({
        uuid,
        name: cleanName(manifest.header?.name) || 'Unknown Pack',
        version,
        type,
        folder: path.relative(ROOT_DIR, folderPath),
        icon: locateIcon(folderPath),
        bundleId: getBundleId(manifest),
        dependencies: extractDependencies(manifest),
      });
    } catch (error) {
      // ignore invalid folders
    }
  });
  return packs;
}

function gatherInstalledPacks() {
  return SCAN_DIRS.flatMap(({ dir, type }) => scanDirectoryForPacks(dir, type));
}

function getWorldAssignments() {
  const worlds = worldManager.listWorlds().map((entry: any) => entry.name);
  const assignments = new Map<string, Set<string>>();

  worlds.forEach((world: string) => {
    const { behavior, resource } = worldJson.getWorldPackEntries(world);
    [...behavior, ...resource].forEach((entry: any) => {
      if (!entry?.pack_id) return;
      if (!assignments.has(entry.pack_id)) {
        assignments.set(entry.pack_id, new Set());
      }
      assignments.get(entry.pack_id)!.add(world);
    });
  });

  return assignments;
}

function packsDiffer(existing: Pack, incoming: Pack) {
  const basicFields = ['name', 'type', 'folder', 'icon', 'bundleId'] as const;
  if (basicFields.some((field) => (existing[field] || null) !== (incoming[field] || null))) {
    return true;
  }
  const versionChanged = JSON.stringify(existing.version || []) !== JSON.stringify(incoming.version || []);
  const depsChanged =
    JSON.stringify(existing.dependencies || []) !== JSON.stringify(incoming.dependencies || []);
  const worldsChanged =
    JSON.stringify(existing.enabledWorlds || []) !== JSON.stringify(incoming.enabledWorlds || []);
  return versionChanged || depsChanged || worldsChanged;
}

let syncPending = false;

function ensureSyncedPacks() {
  if (syncPending) {
    return;
  }
  syncPending = true;
  try {
    syncInstalledPacks();
  } finally {
    syncPending = false;
  }
}

function syncInstalledPacks() {
  const diskPacks = gatherInstalledPacks();
  const diskUuids = new Set(diskPacks.map((pack) => pack.uuid));
  const current = readPacks();
  const map = new Map(current.map((pack) => [pack.uuid, pack]));
  const worldAssignments = getWorldAssignments();
  let changed = false;

  diskPacks.forEach((diskPack) => {
    const existing = map.get(diskPack.uuid);
    const assignedWorlds = worldAssignments.get(diskPack.uuid);
    const enabledWorlds = assignedWorlds ? Array.from(assignedWorlds).sort() : [];
    if (existing) {
      const merged = {
        ...existing,
        ...diskPack,
        enabledWorlds,
      } as Pack;

      if (!Array.isArray(merged.dependencies)) {
        merged.dependencies = [];
      }
      if (packsDiffer(existing, merged)) {
        map.set(diskPack.uuid, merged);
        changed = true;
      }
    } else {
      map.set(diskPack.uuid, { ...diskPack, enabledWorlds: [] });
      changed = true;
    }
  });

  map.forEach((value, key) => {
    if (!diskUuids.has(key)) {
      map.delete(key);
      changed = true;
    }
  });

  if (changed) {
    writePacks(Array.from(map.values()));
  }
}

function findManifestFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...findManifestFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase() === 'manifest.json') {
      result.push(entryPath);
    }
  });
  return result;
}

function getPackType(manifest: any) {
  const modules = manifest.modules || [];
  const moduleType = modules[0]?.type || '';
  if (moduleType.toLowerCase() === 'resources') {
    return 'resource';
  }
  if (moduleType.toLowerCase() === 'data') {
    return 'behavior';
  }
  return manifest.header?.min_engine_version ? 'resource' : 'behavior';
}

function normalizeVersion(version: any) {
  if (Array.isArray(version)) {
    return version;
  }
  if (typeof version === 'string') {
    return version.split('.').map((v) => Number.parseInt(v, 10) || 0);
  }
  return [1, 0, 0];
}

function validateManifest(manifest: any) {
  if (!manifest?.header?.name || !manifest?.header?.uuid) {
    throw new Error('Invalid manifest.json: missing header information');
  }
  if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
    throw new Error('Invalid manifest.json: missing modules section');
  }
}

function findTargets(packs: Pack[], { uuid, bundleId }: { uuid?: string; bundleId?: string }) {
  if (bundleId) {
    const matches = packs.filter((pack) => pack.bundleId === bundleId);
    if (!matches.length) {
      throw new Error('Pack bundle not found');
    }
    return matches;
  }
  const pack = packs.find((p) => p.uuid === uuid);
  if (!pack) {
    throw new Error('Pack not found');
  }
  return packs.filter((p) => p.bundleId === pack.bundleId);
}

export async function installPack(uploadPath: string) {
  const extractDir = path.join(path.dirname(uploadPath), `extract_${Date.now()}`);
  try {
    ensureSyncedPacks();

    const zip = new AdmZip(uploadPath);
    fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });
    zip.extractAllTo(extractDir, true);

    const manifestFiles = findManifestFiles(extractDir);
    if (!manifestFiles.length) {
      throw new Error('manifest.json not found in pack');
    }

    const packs = readPacks();
    const installed = manifestFiles.map((manifestPath) => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      validateManifest(manifest);
      const type = getPackType(manifest);
      const version = normalizeVersion(manifest.header?.version || [1, 0, 0]);
      const uuid = manifest.header?.uuid || manifest.modules?.[0]?.uuid || crypto.randomUUID();
      const safeName = (manifest.header?.name || 'pack').replace(/[^a-z0-9-_]/gi, '_');
      const packRoot = path.dirname(manifestPath);
      const targetDir = type === 'behavior' ? BEHAVIOR_DIR : RESOURCE_DIR;
      const destination = path.join(targetDir, `${safeName}_${uuid}`);
      const dependencies = extractDependencies(manifest);

      const dependencyMatch = dependencies
        .map((depUuid: string) => packs.find((p) => p.uuid === depUuid))
        .find(Boolean);
      const bundleId = dependencyMatch?.bundleId || getBundleId(manifest);

      copyDirectory(packRoot, destination);
      const stats = fs.statSync(destination);

      const packData: Pack = {
        uuid,
        name: cleanName(manifest.header?.name) || 'Unknown Pack',
        version,
        type,
        enabled: false,
        enabledWorlds: [],
        folder: path.relative(ROOT_DIR, destination),
        icon: locateIcon(destination),
        bundleId,
        dependencies,
        installedAt: stats.birthtime?.toISOString() || new Date().toISOString(),
      };

      const existingIndex = packs.findIndex((p) => p.uuid === uuid);
      if (existingIndex >= 0) {
        packs[existingIndex] = packData;
      } else {
        packs.push(packData);
      }

      return packData;
    });

    applyBundleLinks(packs);
    writePacks(packs);
    return installed;
  } finally {
    await fs.promises.unlink(uploadPath).catch(() => { });
    if (extractDir) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
  }
}

function getIconData(iconPath?: string | null) {
  if (!iconPath) return null;
  const absolute = path.isAbsolute(iconPath) ? iconPath : path.join(ROOT_DIR, iconPath);
  if (!fs.existsSync(absolute)) return null;
  const buffer = fs.readFileSync(absolute);
  const base64 = buffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

export function getPacks(world = DEFAULT_WORLD) {
  ensureSyncedPacks();
  return readPacks().map((pack) => {
    const installedAt = pack.installedAt || getFolderTimestamp(pack.folder);
    return {
      ...pack,
      installedAt,
      iconUrl: getIconData(pack.icon),
      enabled: pack.enabledWorlds?.includes(world) ?? false,
    };
  });
}

function updatePackState({ uuid, bundleId, enabled, world = DEFAULT_WORLD }: any) {
  ensureSyncedPacks();
  const packs = readPacks();
  const targets = findTargets(packs, { uuid, bundleId });
  targets.forEach((pack) => {
    const worldSet = new Set(pack.enabledWorlds);
    if (enabled) {
      worldSet.add(world);
    } else {
      worldSet.delete(world);
    }
    pack.enabledWorlds = Array.from(worldSet);
    pack.enabled = pack.enabledWorlds.includes(world);
  });
  writePacks(packs);
  worldJson.syncWorldFiles(packs, world);
  if (world === worldManager.getActiveWorld()) {
    worldJson.applyWorldToRoot(world);
  }
  return targets;
}

export function enablePack({ uuid, world, bundleId }: any) {
  return updatePackState({ uuid, world, bundleId, enabled: true });
}

export function disablePack({ uuid, world, bundleId }: any) {
  return updatePackState({ uuid, world, bundleId, enabled: false });
}

export function removePack({ uuid, bundleId }: any) {
  ensureSyncedPacks();
  const packs = readPacks();
  const targets = findTargets(packs, { uuid, bundleId });
  const remaining: Pack[] = [];
  packs.forEach((pack) => {
    if (targets.includes(pack)) {
      if (pack.folder) {
        fs.rmSync(path.join(ROOT_DIR, pack.folder), { recursive: true, force: true });
      }
    } else {
      remaining.push(pack);
    }
  });

  writePacks(remaining);
  const worlds = worldManager.listWorlds().map((world: any) => world.name);
  worlds.forEach((world: string) => worldJson.syncWorldFiles(remaining, world));
  const activeWorld = worldManager.getActiveWorld();
  if (activeWorld) {
    worldJson.applyWorldToRoot(activeWorld);
  }
  return targets;
}

export default {
  installPack,
  getPacks,
  enablePack,
  disablePack,
  removePack,
};
