const packManager = require('../services/packManager');
const worldManager = require('../services/worldManager');
const ensureBdsDir = require('../utils/bdsGuard');

function getWorldFromRequest(req) {
  return req.query.world || req.body?.world || worldManager.getActiveWorld();
}

function ensureWorld(world) {
  const available = worldManager.listWorlds().map((entry) => entry.name);
  if (!available.includes(world)) {
    throw new Error('World not found');
  }
}

exports.listPacks = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = getWorldFromRequest(req);
  try {
    ensureWorld(world);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  res.json(packManager.getPacks(world));
};

exports.uploadPack = async (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const packs = await packManager.installPack(req.file.path);
    res.json({ installed: packs });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.enablePack = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { uuid, world, bundle, bundleId } = req.body;
  if (!uuid || !world) {
    return res.status(400).json({ message: 'UUID and world are required' });
  }

  try {
    ensureWorld(world);
    const pack = packManager.enablePack({ uuid, world, bundleId: bundle ? bundleId : undefined });
    res.json(pack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.disablePack = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { uuid, world, bundle, bundleId } = req.body;
  if (!uuid || !world) {
    return res.status(400).json({ message: 'UUID and world are required' });
  }

  try {
    ensureWorld(world);
    const pack = packManager.disablePack({ uuid, world, bundleId: bundle ? bundleId : undefined });
    res.json(pack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.removePack = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { uuid } = req.params;
  const { bundle, bundleId } = req.query;
  try {
    const pack = packManager.removePack({ uuid, bundleId: bundle === 'true' ? bundleId : undefined });
    res.json(pack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
