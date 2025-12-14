"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCommand = void 0;
const bedrockProcess_1 = __importDefault(require("../services/bedrockProcess"));
const sendCommand = (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ message: 'Command is required' });
    }
    const result = bedrockProcess_1.default.sendCommand(command);
    if (!result.sent) {
        return res.status(400).json(result);
    }
    return res.json({ message: 'Command sent' });
};
exports.sendCommand = sendCommand;
