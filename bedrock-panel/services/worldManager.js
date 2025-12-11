const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const worldJson = require('./worldJson');
const { copyDirectory } = require('./utils/fsUtils');
const { ROOT_DIR, BDS_DIR, WORLDS_DIR, UPLOADS_DIR } = require('../config');
const SERVER_PROPERTIES = path.join(BDS_DIR, 'server.properties');
const DEFAULT_WORLD = 'world';

function sanitizeWorldName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_') || DEFAULT_WORLD;
}

function ensureDefaultWorld() {
  const defaultPath = path.join(WORLDS_DIR, DEFAULT_WORLD);
  fs.mkdirSync(defaultPath, { recursive: true });
  worldJson.ensureWorldPackFiles(DEFAULT_WORLD);
}

function listWorlds() {
  ensureDefaultWorld();
  const entries = fs.readdirSync(WORLDS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      worldJson.ensureWorldPackFiles(entry.name);
      const absPath = path.join(WORLDS_DIR, entry.name);
      return {
        name: entry.name,
        path: path.relative(ROOT_DIR, absPath),
      };
    });
}

function getActiveWorld() {
  try {
    const data = fs.readFileSync(SERVER_PROPERTIES, 'utf-8');
    const levelLine = data.split(/\r?\n/).find((line) => line.startsWith('level-name='));
    if (levelLine) {
      const [, value] = levelLine.split('=');
      return value?.trim() || DEFAULT_WORLD;
    }
  } catch (error) {
    // ignore
  }
  return DEFAULT_WORLD;
}

function setActiveWorld(world) {
  const available = listWorlds().map((entry) => entry.name);
  if (!available.includes(world)) {
    throw new Error('World not found');
  }
  let content = '';
  try {
    content = fs.readFileSync(SERVER_PROPERTIES, 'utf-8');
  } catch (error) {
    // ignore
  }

  const lines = content ? content.split(/\r?\n/) : [];
  let found = false;
  const updated = lines.map((line) => {
    if (line.startsWith('level-name=')) {
      found = true;
      return `level-name=${world}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`level-name=${world}`);
  }

  fs.writeFileSync(SERVER_PROPERTIES, updated.join('\n'));
  worldJson.applyWorldToRoot(world);
  return world;
}

async function importWorld(uploadPath) {
  ensureDefaultWorld();
  const tempDir = path.join(path.dirname(uploadPath), `world_${Date.now()}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const zip = new AdmZip(uploadPath);
    zip.extractAllTo(tempDir, true);
    const extractedEntries = fs.readdirSync(tempDir);

    let worldRoot = tempDir;
    if (extractedEntries.length === 1) {
      const candidate = path.join(tempDir, extractedEntries[0]);
      if (fs.statSync(candidate).isDirectory()) {
        worldRoot = candidate;
      }
    }

    let baseName = sanitizeWorldName(path.basename(worldRoot));
    let worldName = baseName;
    let counter = 1;
    while (fs.existsSync(path.join(WORLDS_DIR, worldName))) {
      worldName = `${baseName}_${counter++}`;
    }

    const levelDat = path.join(worldRoot, 'level.dat');
    if (!fs.existsSync(levelDat)) {
      throw new Error('Invalid world archive: missing level.dat. Ensure this is a Minecraft Bedrock world.');
    }

    const destination = path.join(WORLDS_DIR, worldName);
    copyDirectory(worldRoot, destination);
    worldJson.ensureWorldPackFiles(worldName);
    return { name: worldName, path: path.relative(ROOT_DIR, destination) };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    await fs.promises.unlink(uploadPath).catch(() => {});
  }
}

function deleteWorld(name) {
  ensureDefaultWorld();
  if (!name) {
    throw new Error('World name is required');
  }
  const worldPath = path.join(WORLDS_DIR, name);
  if (!fs.existsSync(worldPath)) {
    throw new Error('World not found');
  }
  const active = getActiveWorld();
  fs.rmSync(worldPath, { recursive: true, force: true });
  let newActive = active;
  if (active === name) {
    const remaining = listWorlds()
      .map((entry) => entry.name)
      .filter((entry) => entry !== name);
    newActive = remaining[0] || DEFAULT_WORLD;
    setActiveWorld(newActive);
  }
  return { deleted: name, activeWorld: newActive };
}

function backupWorld(name) {
  ensureDefaultWorld();
  if (!name) {
    throw new Error('World name is required');
  }
  const worldPath = path.join(WORLDS_DIR, name);
  if (!fs.existsSync(worldPath)) {
    throw new Error('World not found');
  }
  const zip = new AdmZip();
  zip.addLocalFolder(worldPath, name);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${name}_${Date.now()}.zip`;
  const filePath = path.join(UPLOADS_DIR, filename);
  zip.writeZip(filePath);
  return { filename, filePath };
}

module.exports = {
  listWorlds,
  getActiveWorld,
  setActiveWorld,
  importWorld,
  deleteWorld,
  backupWorld,
  DEFAULT_WORLD,
};
