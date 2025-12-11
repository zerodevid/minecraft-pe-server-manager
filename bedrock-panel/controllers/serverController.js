const fs = require('fs');
const path = require('path');
const bedrockProcess = require('../services/bedrockProcess');
const packManager = require('../services/packManager');
const worldManager = require('../services/worldManager');
const { BDS_DIR } = require('../config');
const ensureBdsDir = require('../utils/bdsGuard');

const versionFile = path.join(BDS_DIR, 'version.txt');

function readVersion() {
  try {
    return fs.readFileSync(versionFile, 'utf-8').trim();
  } catch (error) {
    return '1.20.0';
  }
}

exports.getStatus = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = req.query.world || worldManager.getActiveWorld();
  const available = worldManager.listWorlds().map((entry) => entry.name);
  if (!available.includes(world)) {
    return res.status(400).json({ message: 'World not found' });
  }
  const packs = packManager.getPacks(world);
  const enabledPacks = packs.filter((p) => p.enabled).length;

  res.json({
    running: bedrockProcess.isRunning(),
    status: bedrockProcess.getStatus(),
    playerCount: bedrockProcess.getPlayers().length,
    enabledPacks,
    version: readVersion(),
    world,
  });
};

exports.startServer = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = req.body?.world;
  if (world) {
    try {
      worldManager.setActiveWorld(world);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
  const result = bedrockProcess.startServer();
  if (!result.started) {
    return res.status(400).json(result);
  }
  return res.json({ message: 'Server starting' });
};

exports.stopServer = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const result = bedrockProcess.stopServer();
  if (!result.stopped) {
    return res.status(400).json(result);
  }
  return res.json({ message: 'Stop command sent' });
};

exports.restartServer = async (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = req.body?.world;
  if (world) {
    try {
      worldManager.setActiveWorld(world);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
  const result = await bedrockProcess.restartServer();
  if (result.restarted === false) {
    return res.status(400).json(result);
  }
  res.json({ message: result.message || 'Server restarted' });
};
