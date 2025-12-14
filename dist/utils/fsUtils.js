"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyDirectory = copyDirectory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function copyDirectory(source, destination) {
    fs_1.default.rmSync(destination, { recursive: true, force: true });
    fs_1.default.mkdirSync(destination, { recursive: true });
    const entries = fs_1.default.readdirSync(source, { withFileTypes: true });
    entries.forEach((entry) => {
        const srcPath = path_1.default.join(source, entry.name);
        const destPath = path_1.default.join(destination, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        }
        else if (entry.isFile()) {
            fs_1.default.mkdirSync(path_1.default.dirname(destPath), { recursive: true });
            fs_1.default.copyFileSync(srcPath, destPath);
        }
    });
}
