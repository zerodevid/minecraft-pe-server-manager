const bedrockProcess = require('../services/bedrockProcess');

exports.sendCommand = (req, res) => {
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
