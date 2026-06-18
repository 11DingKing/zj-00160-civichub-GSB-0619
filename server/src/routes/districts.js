"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.districtRoutes = void 0;
var Router = require("express").Router;
var database_1 = require("../database");
exports.districtRoutes = Router();
exports.districtRoutes.get("/", function (req, res) {
    var db = (0, database_1.getDb)();
    var districts = db
        .prepare("\n    SELECT d.*,\n           COUNT(a.id) as appeal_count,\n           SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,\n           SUM(CASE WHEN a.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count\n    FROM districts d\n    LEFT JOIN appeals a ON d.id = a.district_id\n    GROUP BY d.id, d.name, d.code, d.description, d.created_at\n    ORDER BY d.code\n  ")
        .all();
    var result = districts.map(function (d) { return (__assign(__assign({}, d), { completion_rate: d.appeal_count > 0
            ? Number(((d.completed_count / d.appeal_count) * 100).toFixed(1))
            : 0 })); });
    res.json(result);
});
exports.districtRoutes.get("/departments", function (req, res) {
    var db = (0, database_1.getDb)();
    var departments = db
        .prepare("\n    SELECT d.*,\n           COUNT(a.id) as appeal_count,\n           SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count\n    FROM departments d\n    LEFT JOIN appeals a ON d.id = a.current_department_id\n    GROUP BY d.id, d.name, d.code, d.description, d.created_at\n    ORDER BY d.code\n  ")
        .all();
    res.json(departments);
});
exports.districtRoutes.get("/:id", function (req, res) {
    var id = req.params.id;
    var db = (0, database_1.getDb)();
    var district = db
        .prepare("\n    SELECT d.*,\n           COUNT(a.id) as appeal_count,\n           SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,\n           SUM(CASE WHEN a.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count\n    FROM districts d\n    LEFT JOIN appeals a ON d.id = a.district_id\n    WHERE d.id = ?\n    GROUP BY d.id, d.name, d.code, d.description, d.created_at\n  ")
        .get(id);
    if (!district) {
        return res.status(404).json({ error: "区县不存在" });
    }
    var users = db
        .prepare("\n    SELECT id, name, role, phone\n    FROM users\n    WHERE district_id = ? AND role = 'district_center'\n  ")
        .all(id);
    var recentAppeals = db
        .prepare("\n    SELECT a.*, dept.name as department_name, u.name as handler_name\n    FROM appeals a\n    LEFT JOIN departments dept ON a.current_department_id = dept.id\n    LEFT JOIN users u ON a.current_handler_id = u.id\n    WHERE a.district_id = ?\n    ORDER BY a.created_at DESC\n    LIMIT 10\n  ")
        .all(id);
    res.json({
        district: __assign(__assign({}, district), { completion_rate: district.appeal_count > 0
                ? Number(((district.completed_count / district.appeal_count) *
                    100).toFixed(1))
                : 0 }),
        users: users,
        recent_appeals: recentAppeals,
    });
});
