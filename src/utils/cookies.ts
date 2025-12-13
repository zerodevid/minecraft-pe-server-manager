import { Request } from 'express';

export function getCookieValue(req: Request, name: string) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;
    const match = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((entry) => entry.startsWith(`${name}=`));
    return match ? match.split('=')[1] : undefined;
}
