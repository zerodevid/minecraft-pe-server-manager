import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export const ROOT_DIR = path.join(__dirname, '..');
export const BDS_DIR = process.env.BDS_DIR ? path.resolve(process.env.BDS_DIR) : path.join(ROOT_DIR, 'bds');
export const WORLDS_DIR = path.join(BDS_DIR, 'worlds');
export const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

export function validateBdsDir() {
  if (!fs.existsSync(BDS_DIR)) {
    // Create if not exists? No, it's the server dir.
    // But maybe we should allow it to run even if missing for initial setup?
    // No, for now let's just check.
  }

  const exists = fs.existsSync(BDS_DIR);
  const serverBin = path.join(BDS_DIR, 'bedrock_server');
  // On mac it might not have extension, or might be executable.
  // In original code it checked for 'bedrock_server'.
  const hasBinary = fs.existsSync(serverBin);

  if (exists && hasBinary) {
    return { valid: true, message: 'Valid' };
  }

  const message = [
    `Bedrock server directory "${BDS_DIR}" is not valid.`,
    'Set the correct path by creating a .env file (see .env.example) and defining BDS_DIR to the folder that contains the bedrock_server binary.',
  ].join(' ');
  return { valid: false, message };
}

