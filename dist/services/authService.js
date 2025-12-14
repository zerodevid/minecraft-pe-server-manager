"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_NAME = void 0;
const crypto_1 = __importDefault(require("crypto"));
const appSettings_1 = __importDefault(require("./appSettings"));
const hash_1 = require("../utils/hash");
exports.AUTH_COOKIE_NAME = 'bedrock_session';
class AuthService {
    constructor() {
        this.sessions = new Map();
    }
    getAuthConfig() {
        const stored = appSettings_1.default.get('auth');
        if (stored?.username && stored?.passwordHash) {
            return stored;
        }
        const fallback = {
            username: 'admin',
            passwordHash: (0, hash_1.hashPassword)('admin'),
        };
        appSettings_1.default.updateAuth(fallback);
        return fallback;
    }
    verifyCredentials(username, password) {
        if (!username || !password)
            return false;
        const config = this.getAuthConfig();
        return config.username === username && config.passwordHash === (0, hash_1.hashPassword)(password);
    }
    createSession(username) {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        this.sessions.set(token, { token, username, createdAt: Date.now() });
        return token;
    }
    validateToken(token) {
        if (!token)
            return false;
        return this.sessions.has(token);
    }
    getSession(token) {
        if (!token)
            return undefined;
        return this.sessions.get(token);
    }
    destroySession(token) {
        if (!token)
            return;
        this.sessions.delete(token);
    }
    getPublicConfig() {
        const { username } = this.getAuthConfig();
        return { username };
    }
    updateCredentials({ username, password }) {
        const safeUsername = username?.trim();
        if (!safeUsername) {
            throw new Error('Username is required');
        }
        const current = this.getAuthConfig();
        const next = {
            username: safeUsername,
            passwordHash: password ? (0, hash_1.hashPassword)(password) : current.passwordHash,
        };
        appSettings_1.default.updateAuth(next);
        this.sessions.clear();
        return { username: next.username };
    }
}
exports.default = new AuthService();
