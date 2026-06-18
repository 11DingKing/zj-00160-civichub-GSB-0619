"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
var jwt = require("jsonwebtoken");
var JWT_SECRET = process.env.JWT_SECRET || "civichub_jwt_secret_2024";
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
function authenticateToken(req, res, next) {
    var authHeader = req.headers["authorization"];
    var token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: "未提供认证令牌" });
    }
    try {
        var payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(403).json({ error: "认证令牌无效或已过期" });
    }
}
function requireRole() {
    var roles = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        roles[_i] = arguments[_i];
    }
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: "未认证" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "权限不足" });
        }
        next();
    };
}
