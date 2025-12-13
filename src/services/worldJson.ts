import fs from 'fs';
import path from 'path';
import { BDS_DIR, WORLDS_DIR } from '../config';

interface PackEntry {
  pack_id: string;
  version: number[];
}

function getWorldPaths(world: string) {
  const worldDir = path.join(WORLDS_DIR, world);
  return {
    dir: worldDir,
    behavior: path.join(worldDir, 'world_behavior_packs.json'),
    resource: path.join(worldDir, 'world_resource_packs.json'),
  };
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath: string, data: any) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function ensureWorldPackFiles(world: string) {
  if (!world) return;
  const { behavior, resource } = getWorldPaths(world);
  ensureDir(behavior);
  ensureDir(resource);
  if (!fs.existsSync(behavior)) {
    fs.writeFileSync(behavior, '[]');
  }
  if (!fs.existsSync(resource)) {
    fs.writeFileSync(resource, '[]');
  }
}

function buildPackPayload(packs: any[], world: string, type: string) {
  return packs
    .filter((p) => Array.isArray(p.enabledWorlds) && p.enabledWorlds.includes(world) && p.type === type)
    .map((p) => ({ pack_id: p.uuid, version: p.version || [1, 0, 0] }))
    .sort((a, b) => a.pack_id.localeCompare(b.pack_id));
}

export function syncWorldFiles(packs: any[], world: string) {
  if (!world) return;
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  const behaviorPayload = buildPackPayload(packs, world, 'behavior');
  const resourcePayload = buildPackPayload(packs, world, 'resource');
  writeJson(behavior, behaviorPayload);
  writeJson(resource, resourcePayload);
}

export function applyWorldToRoot(world: string) {
  if (!world) return;
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  const rootBehavior = path.join(BDS_DIR, 'world_behavior_packs.json');
  const rootResource = path.join(BDS_DIR, 'world_resource_packs.json');
  fs.copyFileSync(behavior, rootBehavior);
  fs.copyFileSync(resource, rootResource);
}

function readJson(filePath: string): PackEntry[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`[WorldJson] Failed to parse JSON at ${filePath}:`, (error as Error).message);
    }
    return [];
  }
}

export function getWorldPackEntries(world: string) {
  if (!world) return { behavior: [], resource: [] };
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  return {
    behavior: readJson(behavior),
    resource: readJson(resource),
  };
}

export default {
  syncWorldFiles,
  ensureWorldPackFiles,
  applyWorldToRoot,
  getWorldPackEntries,
};
