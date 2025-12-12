import { Request, Response } from 'express';
import bedrockProcess from '../services/bedrockProcess';

export const sendCommand = (req: Request, res: Response) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ message: 'Command is required' });
  }

  const result = bedrockProcess.sendCommand(command);
  if (!result.sent) {
    return res.status(400).json(result);
  }

  return res.json({ message: 'Command sent' });
};
