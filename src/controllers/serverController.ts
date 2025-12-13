import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import bedrockProcess from '../services/bedrockProcess';
import packManager from '../services/packManager';
import worldManager from '../services/worldManager';
import { BDS_DIR } from '../config';
import ensureBdsDir from '../utils/bdsGuard';

const versionFile = path.join(BDS_DIR, 'version.txt');

function readVersion(): string {
  try {
    return fs.readFileSync(versionFile, 'utf-8').trim();
  } catch (error) {
    return '1.20.0';
  }
}

export const getStatus = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = (req.query.world as string) || worldManager.getActiveWorld();
  const available = worldManager.listWorlds().map((entry: any) => entry.name);
  if (!available.includes(world)) {
    return res.status(400).json({ message: 'World not found' });
  }
  const packs = packManager.getPacks(world);
  const enabledPacks = packs.filter((p: any) => p.enabled).length;

  res.json({
    running: bedrockProcess.isRunning(),
    status: bedrockProcess.getStatus(),
    playerCount: bedrockProcess.getPlayers().length,
    enabledPacks,
    version: readVersion(),
    world,
  });
};

export const startServer = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = req.body?.world;
  if (world) {
    try {
      worldManager.setActiveWorld(world);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
  const result = bedrockProcess.startServer();
  if (!result.started) {
    return res.status(400).json(result);
  }
  return res.json({ message: 'Server starting' });
};

export const stopServer = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const result = bedrockProcess.stopServer();
  if (!result.stopped) {
    return res.status(400).json(result);
  }
  return res.json({ message: 'Stop command sent' });
};

export const restartServer = async (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = req.body?.world;
  if (world) {
    try {
      worldManager.setActiveWorld(world);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
  const result = await bedrockProcess.restartServer();
  if (result.restarted === false) {
    return res.status(400).json(result);
  }
  res.json({ message: result.message || 'Server restarted' });
};

