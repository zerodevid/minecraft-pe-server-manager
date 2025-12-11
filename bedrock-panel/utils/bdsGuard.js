const { validateBdsDir } = require('../config');

function ensureBdsDir(res) {
  const status = validateBdsDir();
  if (!status.valid) {
    res.status(500).json({ message: status.message });
    return false;
  }
  return true;
}

module.exports = ensureBdsDir;
