const fs = require('fs');
const path = require('path');

const { BDS_DIR, WORLDS_DIR } = require('../config');

function getWorldPaths(world) {
  const worldDir = path.join(WORLDS_DIR, world);
  return {
    dir: worldDir,
    behavior: path.join(worldDir, 'world_behavior_packs.json'),
    resource: path.join(worldDir, 'world_resource_packs.json'),
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureWorldPackFiles(world) {
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

function buildPackPayload(packs, world, type) {
  return packs
    .filter((p) => Array.isArray(p.enabledWorlds) && p.enabledWorlds.includes(world) && p.type === type)
    .map((p) => ({ pack_id: p.uuid, version: p.version || [1, 0, 0] }))
    .sort((a, b) => a.pack_id.localeCompare(b.pack_id));
}

function syncWorldFiles(packs, world) {
  if (!world) return;
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  const behaviorPayload = buildPackPayload(packs, world, 'behavior');
  const resourcePayload = buildPackPayload(packs, world, 'resource');
  writeJson(behavior, behaviorPayload);
  writeJson(resource, resourcePayload);
}

function applyWorldToRoot(world) {
  if (!world) return;
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  const rootBehavior = path.join(BDS_DIR, 'world_behavior_packs.json');
  const rootResource = path.join(BDS_DIR, 'world_resource_packs.json');
  fs.copyFileSync(behavior, rootBehavior);
  fs.copyFileSync(resource, rootResource);
}

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

function getWorldPackEntries(world) {
  if (!world) return { behavior: [], resource: [] };
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  return {
    behavior: readJson(behavior),
    resource: readJson(resource),
  };
}

function syncRootToWorld(world) {
  if (!world) return;
  ensureWorldPackFiles(world);
  const { behavior, resource } = getWorldPaths(world);
  const rootBehavior = path.join(BDS_DIR, 'world_behavior_packs.json');
  const rootResource = path.join(BDS_DIR, 'world_resource_packs.json');
  if (fs.existsSync(rootBehavior)) {
    writeJson(behavior, readJson(rootBehavior));
  }
  if (fs.existsSync(rootResource)) {
    writeJson(resource, readJson(rootResource));
  }
}

module.exports = {
  syncWorldFiles,
  ensureWorldPackFiles,
  applyWorldToRoot,
  getWorldPackEntries,
  syncRootToWorld,
};
