import { Request, Response } from 'express';
import authService, { AUTH_COOKIE_NAME } from '../services/authService';
import { getCookieValue } from '../utils/cookies';

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    maxAge: ONE_WEEK_MS,
};

export const login = (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!authService.verifyCredentials(username, password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = authService.createSession(username);
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
    res.json({ message: 'Login successful' });
};

export const logout = (req: Request, res: Response) => {
    const token = getCookieValue(req, AUTH_COOKIE_NAME);
    authService.destroySession(token);
    res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProduction });
    res.json({ message: 'Logged out' });
};

export const sessionInfo = (req: Request, res: Response) => {
    const token = getCookieValue(req, AUTH_COOKIE_NAME);
    const session = authService.getSession(token);
    res.json({ authenticated: !!session, username: session?.username });
};
