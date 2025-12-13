import { Request, Response } from 'express';
import packManager from '../services/packManager';
import worldManager from '../services/worldManager';
import ensureBdsDir from '../utils/bdsGuard';

function getWorldFromRequest(req: Request) {
  return (req.query.world as string) || req.body?.world || worldManager.getActiveWorld();
}

function ensureWorld(world: string) {
  const available = worldManager.listWorlds().map((entry: any) => entry.name);
  if (!available.includes(world)) {
    throw new Error('World not found');
  }
}

export const listPacks = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const world = getWorldFromRequest(req);
  try {
    ensureWorld(world);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
  res.json(packManager.getPacks(world));
};

export const uploadPack = async (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const packs = await packManager.installPack(req.file.path);
    res.json({ installed: packs });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const enablePack = (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const disablePack = (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removePack = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { uuid } = req.params;
  const { bundle, bundleId } = req.query;
  try {
    const pack = packManager.removePack({ uuid, bundleId: bundle === 'true' ? (bundleId as string) : undefined });
    res.json(pack);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

