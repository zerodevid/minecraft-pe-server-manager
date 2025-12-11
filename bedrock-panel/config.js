require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const BDS_DIR = process.env.BDS_DIR ? path.resolve(process.env.BDS_DIR) : path.join(ROOT_DIR, 'bds');
const WORLDS_DIR = path.join(BDS_DIR, 'worlds');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

function validateBdsDir() {
  const exists = fs.existsSync(BDS_DIR);
  const serverBin = path.join(BDS_DIR, 'bedrock_server');
  const hasBinary = fs.existsSync(serverBin);
  if (exists && hasBinary) {
    return { valid: true };
  }
  const message = [
    `Bedrock server directory "${BDS_DIR}" is not valid.`,
    'Set the correct path by creating a .env file (see .env.example) and defining BDS_DIR to the folder that contains the bedrock_server binary.',
  ].join(' ');
  return { valid: false, message };
}

module.exports = {
  ROOT_DIR,
  BDS_DIR,
  WORLDS_DIR,
  UPLOADS_DIR,
  validateBdsDir,
};
