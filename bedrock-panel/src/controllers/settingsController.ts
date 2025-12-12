import { Request, Response } from 'express';
import ensureBdsDir from '../utils/bdsGuard';
import serverProperties from '../services/serverProperties';
import appSettings from '../services/appSettings';
import telegramBot from '../services/telegramBot';

export const getSettings = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  try {
    const payload = serverProperties.getSettingsSections();
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = (req: Request, res: Response) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  try {
    const result = serverProperties.updateSettings(req.body || {});
    res.json({
      message: result.updated.length ? `Updated ${result.updated.length} setting(s).` : 'No changes detected.',
      updated: result.updated,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Panel / App Settings
export const getPanelSettings = (req: Request, res: Response) => {
  try {
    const settings = appSettings.get();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTelegramSettings = (req: Request, res: Response) => {
  try {
    const config = req.body;
    appSettings.updateTelegram(config);
    telegramBot.reconfigure();
    res.json({ message: 'Telegram settings updated.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const testTelegramObj = async (req: Request, res: Response) => {
  try {
    await telegramBot.sendMessage('Test notification from Bedrock Panel! 🚀');
    res.json({ message: 'Test message sent. Check your telegram.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

