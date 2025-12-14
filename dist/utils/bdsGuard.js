"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBdsDir = ensureBdsDir;
const config_1 = require("../config");
function ensureBdsDir(res) {
    const status = (0, config_1.validateBdsDir)();
    if (!status.valid) {
        res.status(500).json({ message: status.message });
        return false;
    }
    return true;
}
exports.default = ensureBdsDir;
