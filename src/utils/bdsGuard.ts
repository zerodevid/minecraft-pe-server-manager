import { Response } from 'express';
import { validateBdsDir } from '../config';

export function ensureBdsDir(res: Response): boolean {
  const status = validateBdsDir();
  if (!status.valid) {
    res.status(500).json({ message: status.message });
    return false;
  }
  return true;
}

export default ensureBdsDir;
