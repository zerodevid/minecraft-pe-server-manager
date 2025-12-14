"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionInfo = exports.logout = exports.login = void 0;
const authService_1 = __importStar(require("../services/authService"));
const cookies_1 = require("../utils/cookies");
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: ONE_WEEK_MS,
};
const login = (req, res) => {
    const { username, password } = req.body || {};
    if (!authService_1.default.verifyCredentials(username, password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = authService_1.default.createSession(username);
    res.cookie(authService_1.AUTH_COOKIE_NAME, token, cookieOptions);
    res.json({ message: 'Login successful' });
};
exports.login = login;
const logout = (req, res) => {
    const token = (0, cookies_1.getCookieValue)(req, authService_1.AUTH_COOKIE_NAME);
    authService_1.default.destroySession(token);
    res.clearCookie(authService_1.AUTH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProduction });
    res.json({ message: 'Logged out' });
};
exports.logout = logout;
const sessionInfo = (req, res) => {
    const token = (0, cookies_1.getCookieValue)(req, authService_1.AUTH_COOKIE_NAME);
    const session = authService_1.default.getSession(token);
    res.json({ authenticated: !!session, username: session?.username });
};
exports.sessionInfo = sessionInfo;
