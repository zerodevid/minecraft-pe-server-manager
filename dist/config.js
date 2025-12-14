"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOADS_DIR = exports.WORLDS_DIR = exports.BDS_DIR = exports.ROOT_DIR = void 0;
exports.validateBdsDir = validateBdsDir;
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.ROOT_DIR = path_1.default.join(__dirname, '..');
exports.BDS_DIR = process.env.BDS_DIR ? path_1.default.resolve(process.env.BDS_DIR) : path_1.default.join(exports.ROOT_DIR, 'bds');
exports.WORLDS_DIR = path_1.default.join(exports.BDS_DIR, 'worlds');
exports.UPLOADS_DIR = path_1.default.join(exports.ROOT_DIR, 'uploads');
function validateBdsDir() {
    if (!fs_1.default.existsSync(exports.BDS_DIR)) {
        // Create if not exists? No, it's the server dir.
        // But maybe we should allow it to run even if missing for initial setup?
        // No, for now let's just check.
    }
    const exists = fs_1.default.existsSync(exports.BDS_DIR);
    const serverBin = path_1.default.join(exports.BDS_DIR, 'bedrock_server');
    // On mac it might not have extension, or might be executable.
    // In original code it checked for 'bedrock_server'.
    const hasBinary = fs_1.default.existsSync(serverBin);
    if (exists && hasBinary) {
        return { valid: true, message: 'Valid' };
    }
    const message = [
        `Bedrock server directory "${exports.BDS_DIR}" is not valid.`,
        'Set the correct path by creating a .env file (see .env.example) and defining BDS_DIR to the folder that contains the bedrock_server binary.',
    ].join(' ');
    return { valid: false, message };
}
