const fs = require('fs');
const worldManager = require('../services/worldManager');
const ensureBdsDir = require('../utils/bdsGuard');

exports.listWorlds = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const worlds = worldManager.listWorlds();
  const activeWorld = worldManager.getActiveWorld();
  res.json({ worlds, activeWorld });
};

exports.selectWorld = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'World name is required' });
  }

  try {
    const activeWorld = worldManager.setActiveWorld(name);
    res.json({ activeWorld });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.importWorld = async (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No world file uploaded' });
  }

  try {
    const world = await worldManager.importWorld(req.file.path);
    res.json(world);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteWorld = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name } = req.params;
  try {
    const result = worldManager.deleteWorld(name);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.backupWorld = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name } = req.params;
  try {
    const { filename, filePath } = worldManager.backupWorld(name);
    res.download(filePath, filename, (err) => {
      fs.rmSync(filePath, { force: true });
      if (err && !res.headersSent) {
        res.status(500).json({ message: err.message });
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
