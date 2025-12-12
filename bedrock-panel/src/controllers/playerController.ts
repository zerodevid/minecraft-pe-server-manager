import { Request, Response } from 'express';
import bedrockProcess from '../services/bedrockProcess';
import ensureBdsDir from '../utils/bdsGuard';
import playerManager from '../services/playerManager';

function sanitizeReason(reason: any) {
  if (!reason) return '';
  return String(reason).replace(/[\r\n]/g, ' ').trim();
}

function wrapName(name: any) {
  return `"${String(name).replace(/"/g, '').trim()}"`;
}

export const getPlayers = (req: Request, res: Response) => {
  res.json({ players: bedrockProcess.getPlayers() });
};

export const getBanList = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  res.json({ bans: playerManager.listBans() });
};

export const kickPlayer = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name, reason } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: 'Player name is required' });
  }
  const command = sanitizeReason(reason)
    ? `kick ${wrapName(name)} ${sanitizeReason(reason)}`
    : `kick ${wrapName(name)}`;
  const result = bedrockProcess.sendCommand(command);
  if (!result.sent) {
    return res.status(400).json({ message: result.message || 'Unable to kick player' });
  }
  res.json({ message: `Kick command sent for ${name}` });
};

export const banPlayer = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name, xuid, reason } = req.body || {};
  if (!name && !xuid) {
    return res.status(400).json({ message: 'Player name or XUID is required' });
  }
  let entry;
  try {
    entry = playerManager.upsertBanEntry({ name, xuid });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }

  let message = `Queued ban for ${entry.name}. Start the server to enforce if it is offline.`;
  if (bedrockProcess.isRunning()) {
    const command = sanitizeReason(reason)
      ? `ban ${wrapName(entry.name)} ${sanitizeReason(reason)}`
      : `ban ${wrapName(entry.name)}`;
    const result = bedrockProcess.sendCommand(command);
    if (!result.sent) {
      return res.status(400).json({ message: result.message || 'Failed to send ban command' });
    }
    message = `Ban command sent for ${entry.name}`;
  }

  res.json({ message, entry });
};

export const unbanPlayer = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  const { name, xuid } = req.body || {};
  if (!name && !xuid) {
    return res.status(400).json({ message: 'Player name or XUID is required' });
  }
  const result = playerManager.removeBanEntry({ name, xuid });
  if (!result.removed) {
    return res.status(404).json({ message: 'Player not found in ban list' });
  }

  let message = `Removed ${result.entry?.name || 'player'} from ban list.`;
  if (bedrockProcess.isRunning()) {
    const command = `pardon ${wrapName(result.entry?.name || name || xuid)}`;
    const sendResult = bedrockProcess.sendCommand(command);
    if (!sendResult.sent) {
      return res.status(400).json({ message: sendResult.message || 'Failed to send unban command' });
    }
    message = `Unban command sent for ${result.entry?.name || name || xuid}`;
  }

  res.json({ message });
};

