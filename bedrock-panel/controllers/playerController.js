const bedrockProcess = require('../services/bedrockProcess');

exports.getPlayers = (req, res) => {
  res.json({ players: bedrockProcess.getPlayers() });
};
