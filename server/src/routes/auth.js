"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
var Router = require("express").Router;
var bcrypt = require("bcryptjs");
var database_1 = require("../database");
var auth_1 = require("../middleware/auth");
exports.authRoutes = Router();
exports.authRoutes.post("/login", function (req, res) {
    var _a = req.body, username = _a.username, password = _a.password;
    if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
    }
    var db = (0, database_1.getDb)();
    var user = db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username);
    if (!user) {
        return res.status(401).json({ error: "用户名或密码错误" });
    }
    var isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
        return res.status(401).json({ error: "用户名或密码错误" });
    }
    var token = (0, auth_1.generateToken)({
        userId: user.id,
        role: user.role,
        username: user.username,
    });
    var userInfo = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        district_id: user.district_id,
        department_id: user.department_id,
        phone: user.phone,
    };
    res.json({
        token: token,
        user: userInfo,
    });
});
exports.authRoutes.post("/logout", function (req, res) {
    res.json({ message: "已退出登录" });
});
