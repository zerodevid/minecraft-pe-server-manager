"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieValue = getCookieValue;
function getCookieValue(req, name) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader)
        return undefined;
    const match = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((entry) => entry.startsWith(`${name}=`));
    return match ? match.split('=')[1] : undefined;
}
