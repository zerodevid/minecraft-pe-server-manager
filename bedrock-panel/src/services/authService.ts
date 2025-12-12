import crypto from 'crypto';
import appSettings from './appSettings';
import { hashPassword } from '../utils/hash';

export const AUTH_COOKIE_NAME = 'bedrock_session';

interface SessionEntry {
    token: string;
    username: string;
    createdAt: number;
}

class AuthService {
    private sessions = new Map<string, SessionEntry>();

    private getAuthConfig() {
        const stored = appSettings.get('auth');
        if (stored?.username && stored?.passwordHash) {
            return stored;
        }
        const fallback = {
            username: 'admin',
            passwordHash: hashPassword('admin'),
        };
        appSettings.updateAuth(fallback);
        return fallback;
    }

    verifyCredentials(username: string, password: string) {
        if (!username || !password) return false;
        const config = this.getAuthConfig();
        return config.username === username && config.passwordHash === hashPassword(password);
    }

    createSession(username: string) {
        const token = crypto.randomBytes(32).toString('hex');
        this.sessions.set(token, { token, username, createdAt: Date.now() });
        return token;
    }

    validateToken(token?: string | null) {
        if (!token) return false;
        return this.sessions.has(token);
    }

    getSession(token?: string | null) {
        if (!token) return undefined;
        return this.sessions.get(token);
    }

    destroySession(token?: string | null) {
        if (!token) return;
        this.sessions.delete(token);
    }

    getPublicConfig() {
        const { username } = this.getAuthConfig();
        return { username };
    }

    updateCredentials({ username, password }: { username: string; password?: string }) {
        const safeUsername = username?.trim();
        if (!safeUsername) {
            throw new Error('Username is required');
        }
        const current = this.getAuthConfig();
        const next = {
            username: safeUsername,
            passwordHash: password ? hashPassword(password) : current.passwordHash,
        };
        appSettings.updateAuth(next);
        this.sessions.clear();
        return { username: next.username };
    }
}

export default new AuthService();
