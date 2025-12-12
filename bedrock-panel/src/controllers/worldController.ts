import fs from 'fs';
import { Request, Response } from 'express';
import worldManager from '../services/worldManager';
import ensureBdsDir from '../utils/bdsGuard';

export const listWorlds = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const worlds = worldManager.listWorlds();
  const activeWorld = worldManager.getActiveWorld();
  res.json({ worlds, activeWorld });
};

export const selectWorld = (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const importWorld = async (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No world file uploaded' });
  }

  try {
    const world = await worldManager.importWorld(req.file.path);
    res.json(world);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteWorld = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name } = req.params;
  try {
    const result = worldManager.deleteWorld(name);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const backupWorld = (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

