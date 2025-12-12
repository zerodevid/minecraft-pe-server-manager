const appSettings = require('../services/appSettings');
const telegramBot = require('../services/telegramBot');

exports.getSettings = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  try {
    const payload = serverProperties.getSettingsSections();
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = (req, res) => {
  if (!ensureBdsDir(res)) {
    return;
  }
  try {
    const result = serverProperties.updateSettings(req.body || {});
    res.json({
      message: result.updated.length ? `Updated ${result.updated.length} setting(s).` : 'No changes detected.',
      updated: result.updated,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Panel / App Settings
exports.getPanelSettings = (req, res) => {
  try {
    const settings = appSettings.get();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTelegramSettings = (req, res) => {
  try {
    const config = req.body;
    appSettings.updateTelegram(config);
    telegramBot.reconfigure();
    res.json({ message: 'Telegram settings updated.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.testTelegramObj = (req, res) => {
  try {
    telegramBot.sendMessage('Test notification from Bedrock Panel! 🚀');
    res.json({ message: 'Test message sent. Check your telegram.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
