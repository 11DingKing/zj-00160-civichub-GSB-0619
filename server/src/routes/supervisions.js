"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supervisionRoutes = void 0;
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
var Router = require("express").Router;
var uuidv4 = require("uuid").v4;
var database_1 = require("../database");
var auth_1 = require("../middleware/auth");
var permissions_1 = require("../services/permissions");
exports.supervisionRoutes = Router();

function generateOrderNo() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var db = (0, database_1.getDb)();
    var result = db.prepare(`
        SELECT COUNT(*) as count FROM supervision_orders 
        WHERE strftime('%Y%m', created_at) = ?
    `).get(year + month);
    var seq = String(result.count + 1).padStart(3, '0');
    return "DB" + year + month + seq;
}

function addSupervisionFlow(supervisionId, action, fromStatus, toStatus, handlerId, comment, progress) {
    var db = (0, database_1.getDb)();
    var user = db.prepare("SELECT name, role FROM users WHERE id = ?").get(handlerId);
    db.prepare(`
        INSERT INTO supervision_flows (
            id, supervision_id, action, from_status, to_status,
            handler_id, handler_name, handler_role, comment, progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
        supervisionId,
        action,
        fromStatus,
        toStatus,
        handlerId,
        user ? user.name : null,
        user ? user.role : null,
        comment || null,
        progress || null
    );
}

function getSupervisionWithDetails(supervisionId) {
    var db = (0, database_1.getDb)();
    var supervision = db.prepare(`
        SELECT s.*, d.name as district_name
        FROM supervision_orders s
        LEFT JOIN districts d ON s.district_id = d.id
        WHERE s.id = ?
    `).get(supervisionId);
    if (!supervision)
        return null;
    var appeals = db.prepare(`
        SELECT a.id, a.title, a.status, a.priority, a.created_at,
               d.name as district_name, dept.name as department_name
        FROM supervision_appeals sa
        LEFT JOIN appeals a ON sa.appeal_id = a.id
        LEFT JOIN districts d ON a.district_id = d.id
        LEFT JOIN departments dept ON a.current_department_id = dept.id
        WHERE sa.supervision_id = ?
        ORDER BY a.created_at DESC
    `).all(supervisionId);
    var flows = db.prepare(`
        SELECT * FROM supervision_flows 
        WHERE supervision_id = ? 
        ORDER BY created_at ASC
    `).all(supervisionId);
    return __assign(__assign({}, supervision), { appeals: appeals, flows: flows });
}

exports.supervisionRoutes.get("/", function (req, res) {
    var _a, _b;
    var db = (0, database_1.getDb)();
    var _c = req.query, status = _c.status, district_id = _c.district_id, type = _c.type, level = _c.level, _d = _c.page, page = _d === void 0 ? "1" : _d, _e = _c.page_size, page_size = _e === void 0 ? "20" : _e;
    var sql = `
        SELECT s.*, d.name as district_name,
               (SELECT COUNT(*) FROM supervision_appeals sa WHERE sa.supervision_id = s.id) as appeal_count
        FROM supervision_orders s
        LEFT JOIN districts d ON s.district_id = d.id
        WHERE 1=1
    `;
    var params = [];
    if (status) {
        sql += " AND s.status = ?";
        params.push(status);
    }
    if (district_id) {
        sql += " AND s.district_id = ?";
        params.push(district_id);
    }
    if (type) {
        sql += " AND s.type = ?";
        params.push(type);
    }
    if (level) {
        sql += " AND s.level = ?";
        params.push(level);
    }
    var scope = permissions_1.PermissionService.getUserScope(req.user);
    if (scope.dataScope === permissions_1.PermissionService.DATA_SCOPES.DISTRICT) {
        sql += " AND s.district_id = ?";
        params.push(scope.districtId);
    }
    else if (scope.dataScope !== permissions_1.PermissionService.DATA_SCOPES.ALL) {
        return res.status(403).json({ error: "无权访问" });
    }
    var countSql = "SELECT COUNT(*) as total FROM supervision_orders s WHERE 1=1";
    var whereStart = sql.indexOf("WHERE 1=1") + 9;
    var whereEnd = sql.indexOf("ORDER BY");
    if (whereStart > 0) {
        var whereConditions = sql.slice(whereStart, whereEnd > 0 ? whereEnd : sql.length);
        countSql = "SELECT COUNT(*) as total FROM supervision_orders s WHERE 1=1" + whereConditions;
    }
    sql += " ORDER BY s.created_at DESC LIMIT ? OFFSET ?";
    var pageNum = parseInt(page);
    var pageSizeNum = parseInt(page_size);
    var countParams = params.slice();
    params.push(pageSizeNum, (pageNum - 1) * pageSizeNum);
    var supervisions = (_a = db.prepare(sql)).all.apply(_a, params);
    var total = (_b = db.prepare(countSql)).get.apply(_b, countParams).total;
    res.json({
        data: supervisions,
        total: total,
        page: pageNum,
        page_size: pageSizeNum
    });
});

exports.supervisionRoutes.get("/stats", function (req, res) {
    var db = (0, database_1.getDb)();
    var scope = permissions_1.PermissionService.getUserScope(req.user);
    var districtFilter = "";
    var params = [];
    if (scope.dataScope === permissions_1.PermissionService.DATA_SCOPES.DISTRICT) {
        districtFilter = " WHERE s.district_id = ?";
        params.push(scope.districtId);
    }
    else if (scope.dataScope !== permissions_1.PermissionService.DATA_SCOPES.ALL) {
        return res.status(403).json({ error: "无权访问" });
    }
    function buildSql(whereConditions) {
        var sql = " FROM supervision_orders s";
        if (districtFilter) {
            sql += districtFilter;
            if (whereConditions) {
                sql += " AND " + whereConditions;
            }
        }
        else {
            if (whereConditions) {
                sql += " WHERE " + whereConditions;
            }
        }
        return sql;
    }
    function execCount(sql, params) {
        var stmt = db.prepare(sql);
        return stmt.get.apply(stmt, params);
    }
    var totalCount = execCount("SELECT COUNT(*) as count" + buildSql(), params);
    var pendingAcceptCount = execCount("SELECT COUNT(*) as count" + buildSql("status = 'pending_accept'"), params);
    var inProgressCount = execCount("SELECT COUNT(*) as count" + buildSql("status = 'in_progress'"), params);
    var pendingVerifyCount = execCount("SELECT COUNT(*) as count" + buildSql("status = 'pending_verify'"), params);
    var verifiedCount = execCount("SELECT COUNT(*) as count" + buildSql("status = 'verified'"), params);
    var overdueCount = execCount("SELECT COUNT(*) as count" + buildSql("status IN ('pending_accept', 'in_progress') AND deadline < datetime('now')"), params);
    var escalatedCount = execCount("SELECT SUM(escalated_count) as count" + buildSql(), params);
    var byDistrict = [];
    if (scope.dataScope === permissions_1.PermissionService.DATA_SCOPES.ALL) {
        byDistrict = db.prepare(`
            SELECT d.id, d.name,
                   COUNT(s.id) as total,
                   SUM(CASE WHEN s.status = 'verified' THEN 1 ELSE 0 END) as verified,
                   SUM(CASE WHEN s.status IN ('pending_accept', 'in_progress', 'pending_verify') THEN 1 ELSE 0 END) as active
            FROM districts d
            LEFT JOIN supervision_orders s ON d.id = s.district_id
            GROUP BY d.id, d.name
            ORDER BY total DESC
        `).all().map(function (item) { return (__assign(__assign({}, item), { verification_rate: item.total > 0 ? Number(((item.verified / item.total) * 100).toFixed(1)) : 0 })); });
    }
    res.json({
        total: totalCount.count,
        pending_accept: pendingAcceptCount.count,
        in_progress: inProgressCount.count,
        pending_verify: pendingVerifyCount.count,
        verified: verifiedCount.count,
        overdue: overdueCount.count,
        escalated: escalatedCount.count || 0,
        verification_rate: totalCount.count > 0 ? Number(((verifiedCount.count / totalCount.count) * 100).toFixed(1)) : 0,
        by_district: byDistrict
    });
});

exports.supervisionRoutes.get("/:id", function (req, res) {
    var db = (0, database_1.getDb)();
    var id = req.params.id;
    var supervision = getSupervisionWithDetails(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    var accessCheck = permissions_1.PermissionService.checkSupervisionAccess(req.user, supervision);
    if (!accessCheck.allowed) {
        return res.status(403).json({ error: "无权查看此督办单" });
    }
    res.json(supervision);
});

exports.supervisionRoutes.post("/", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var _a = req.body, title = _a.title, description = _a.description, type = _a.type, level = _a.level, district_id = _a.district_id, deadline = _a.deadline, appeal_ids = _a.appeal_ids;
    if (!title || !type || !district_id || !deadline) {
        return res.status(400).json({ error: "缺少必填字段" });
    }
    var db = (0, database_1.getDb)();
    var user = req.user;
    var district = db.prepare("SELECT * FROM districts WHERE id = ?").get(district_id);
    if (!district) {
        return res.status(400).json({ error: "区县不存在" });
    }
    var orderNo = generateOrderNo();
    var id = uuidv4();
    var now = new Date();
    var tx = db.transaction(function () {
        db.prepare(`
            INSERT INTO supervision_orders (
                id, order_no, title, description, type, level, district_id, deadline,
                issued_by, issued_by_name, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, orderNo, title, description || null, type, level || 'normal', district_id, deadline, user.userId, user.name, 'pending_accept', now.toISOString(), now.toISOString());
        if (appeal_ids && appeal_ids.length > 0) {
            var insertAppeal = db.prepare(`
                INSERT INTO supervision_appeals (id, supervision_id, appeal_id)
                VALUES (?, ?, ?)
            `);
            appeal_ids.forEach(function (appealId) {
                insertAppeal.run(uuidv4(), id, appealId);
            });
        }
        addSupervisionFlow(id, 'issue', null, 'pending_accept', user.userId, '已下达督办单，请' + district.name + '综治中心签收处理');
    });
    tx();
    var newSupervision = getSupervisionWithDetails(id);
    res.status(201).json(newSupervision);
});

exports.supervisionRoutes.put("/:id/accept", (0, auth_1.requireRole)("district_center"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var id = req.params.id;
    var supervision = db.prepare("SELECT * FROM supervision_orders WHERE id = ?").get(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    var accessCheck = permissions_1.PermissionService.checkSupervisionAccess(user, supervision);
    if (!accessCheck.allowed) {
        return res.status(403).json({ error: "无权签收此督办单" });
    }
    if (supervision.status !== 'pending_accept') {
        return res.status(400).json({ error: "此督办单状态不允许签收" });
    }
    var now = new Date();
    db.prepare(`
        UPDATE supervision_orders
        SET status = 'in_progress', accept_time = ?, accepted_by = ?, accepted_by_name = ?, updated_at = ?
        WHERE id = ?
    `).run(now.toISOString(), user.userId, user.name, now.toISOString(), id);
    addSupervisionFlow(id, 'accept', 'pending_accept', 'in_progress', user.userId, '已签收督办，立即组织整改');
    var updated = getSupervisionWithDetails(id);
    res.json(updated);
});

exports.supervisionRoutes.put("/:id/progress", (0, auth_1.requireRole)("district_center", "city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var id = req.params.id;
    var _a = req.body, progress = _a.progress, comment = _a.comment;
    if (!comment) {
        return res.status(400).json({ error: "请填写办理进展说明" });
    }
    var supervision = db.prepare("SELECT * FROM supervision_orders WHERE id = ?").get(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    var accessCheck = permissions_1.PermissionService.checkSupervisionAccess(user, supervision);
    if (!accessCheck.allowed) {
        return res.status(403).json({ error: "无权操作此督办单" });
    }
    if (!['in_progress', 'pending_verify'].includes(supervision.status)) {
        return res.status(400).json({ error: "此督办单状态不允许更新进展" });
    }
    var now = new Date();
    db.prepare("UPDATE supervision_orders SET updated_at = ? WHERE id = ?").run(now.toISOString(), id);
    addSupervisionFlow(id, 'progress', supervision.status, supervision.status, user.userId, comment, progress || null);
    var updated = getSupervisionWithDetails(id);
    res.json(updated);
});

exports.supervisionRoutes.put("/:id/complete", (0, auth_1.requireRole)("district_center"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var id = req.params.id;
    var _a = req.body, result = _a.result, comment = _a.comment;
    if (!comment) {
        return res.status(400).json({ error: "请填写整改完成说明" });
    }
    var supervision = db.prepare("SELECT * FROM supervision_orders WHERE id = ?").get(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    var accessCheck = permissions_1.PermissionService.checkSupervisionAccess(user, supervision);
    if (!accessCheck.allowed) {
        return res.status(403).json({ error: "无权操作此督办单" });
    }
    if (supervision.status !== 'in_progress') {
        return res.status(400).json({ error: "此督办单状态不允许申请核销" });
    }
    var now = new Date();
    db.prepare(`
        UPDATE supervision_orders
        SET status = 'pending_verify', updated_at = ?
        WHERE id = ?
    `).run(now.toISOString(), id);
    addSupervisionFlow(id, 'complete', 'in_progress', 'pending_verify', user.userId, comment, result || null);
    var updated = getSupervisionWithDetails(id);
    res.json(updated);
});

exports.supervisionRoutes.put("/:id/verify", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var id = req.params.id;
    var _a = req.body, result = _a.result, passed = _a.passed, comment = _a.comment;
    if (passed === undefined) {
        return res.status(400).json({ error: "请指定核销结果" });
    }
    var supervision = db.prepare("SELECT * FROM supervision_orders WHERE id = ?").get(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    if (supervision.status !== 'pending_verify') {
        return res.status(400).json({ error: "此督办单状态不允许核销" });
    }
    var now = new Date();
    if (passed) {
        db.prepare(`
            UPDATE supervision_orders
            SET status = 'verified', verified_at = ?, verified_by = ?, 
                verified_by_name = ?, verify_result = ?, updated_at = ?
            WHERE id = ?
        `).run(now.toISOString(), user.userId, user.name, result || null, now.toISOString(), id);
        addSupervisionFlow(id, 'verify', 'pending_verify', 'verified', user.userId, comment || '经核查，整改到位，同意核销');
    }
    else {
        db.prepare(`
            UPDATE supervision_orders
            SET status = 'in_progress', updated_at = ?
            WHERE id = ?
        `).run(now.toISOString(), id);
        addSupervisionFlow(id, 'reject', 'pending_verify', 'in_progress', user.userId, comment || '整改未达标，请继续整改');
    }
    var updated = getSupervisionWithDetails(id);
    res.json(updated);
});

exports.supervisionRoutes.put("/:id/escalate", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var id = req.params.id;
    var comment = req.body.comment;
    var supervision = db.prepare("SELECT * FROM supervision_orders WHERE id = ?").get(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    if (!['pending_accept', 'in_progress', 'pending_verify'].includes(supervision.status)) {
        return res.status(400).json({ error: "此督办单状态不允许升级催办" });
    }
    var now = new Date();
    db.prepare(`
        UPDATE supervision_orders
        SET escalated_count = escalated_count + 1, last_escalated_at = ?, updated_at = ?
        WHERE id = ?
    `).run(now.toISOString(), now.toISOString(), id);
    addSupervisionFlow(id, 'escalate', supervision.status, supervision.status, user.userId, comment || '整改进度偏慢，请加快督办落实');
    var updated = getSupervisionWithDetails(id);
    res.json(updated);
});

exports.supervisionRoutes.delete("/:id", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var id = req.params.id;
    var supervision = db.prepare("SELECT * FROM supervision_orders WHERE id = ?").get(id);
    if (!supervision) {
        return res.status(404).json({ error: "督办单不存在" });
    }
    db.prepare("DELETE FROM supervision_orders WHERE id = ?").run(id);
    res.json({ success: true });
});

exports.supervisionRoutes.get("/suggestions/list", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var _a = req.query, status = _a.status, severity = _a.severity;
    var sql = `
        SELECT s.*, d.name as district_name
        FROM supervision_suggestions s
        LEFT JOIN districts d ON s.district_id = d.id
        WHERE 1=1
    `;
    var params = [];
    if (status) {
        sql += " AND s.status = ?";
        params.push(status);
    }
    if (severity) {
        sql += " AND s.severity = ?";
        params.push(severity);
    }
    sql += " ORDER BY s.created_at DESC";
    var suggestions = db.prepare(sql).all.apply(db, params);
    res.json(suggestions);
});

exports.supervisionRoutes.post("/suggestions/:id/process", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var id = req.params.id;
    var _a = req.body, action = _a.action, supervision_id = _a.supervision_id;
    var suggestion = db.prepare("SELECT * FROM supervision_suggestions WHERE id = ?").get(id);
    if (!suggestion) {
        return res.status(404).json({ error: "督办建议不存在" });
    }
    if (suggestion.status !== 'pending') {
        return res.status(400).json({ error: "此建议已处理" });
    }
    var now = new Date();
    if (action === 'create_supervision') {
        db.prepare(`
            UPDATE supervision_suggestions
            SET status = 'processed', processed_at = ?, processed_by = ?, supervision_id = ?
            WHERE id = ?
        `).run(now.toISOString(), user.userId, supervision_id || null, id);
    }
    else if (action === 'ignore') {
        db.prepare(`
            UPDATE supervision_suggestions
            SET status = 'ignored', processed_at = ?, processed_by = ?
            WHERE id = ?
        `).run(now.toISOString(), user.userId, id);
    }
    else {
        return res.status(400).json({ error: "无效的处理方式" });
    }
    res.json({ success: true });
});

exports.supervisionRoutes.post("/suggestions/refresh", (0, auth_1.requireRole)("city_admin"), function (req, res) {
    var db = (0, database_1.getDb)();
    var user = req.user;
    var now = new Date();
    var districtStats = db.prepare(`
        SELECT
            d.id as district_id,
            d.name as district_name,
            COUNT(a.id) as total,
            SUM(CASE WHEN a.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
            SUM(CASE WHEN a.status IN ('pending', 'in_progress', 'mediating') THEN 1 ELSE 0 END) as active_count,
            AVG(CASE WHEN a.status = 'completed' THEN JULIANDAY(a.actual_completed_at) - JULIANDAY(a.created_at) END) as avg_days
        FROM districts d
        LEFT JOIN appeals a ON d.id = a.district_id
        GROUP BY d.id, d.name
    `).all();
    var insertSuggestion = db.prepare(`
        INSERT INTO supervision_suggestions (
            id, district_id, reason, reason_type, appeal_count, appeal_ids,
            severity, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    var newCount = 0;
    var tx = db.transaction(function () {
        districtStats.forEach(function (stat) {
            var existing = db.prepare(`
                SELECT COUNT(*) as count FROM supervision_suggestions 
                WHERE district_id = ? AND status = 'pending'
            `).get(stat.district_id);
            if (existing.count > 0)
                return;
            var overdueAppeals = db.prepare(`
                SELECT id FROM appeals WHERE district_id = ? AND status = 'overdue'
            `).all(stat.district_id);
            var appealIds = overdueAppeals.map(function (a) { return a.id; }).join(',');
            if (stat.overdue_count >= 3) {
                insertSuggestion.run(uuidv4(), stat.district_id, stat.district_name + "超时事项达" + stat.overdue_count + "件，超过预警阈值，建议下达督办单。", 'overdue', stat.overdue_count, appealIds, stat.overdue_count >= 5 ? 'high' : 'medium', 'pending', user.userId, now.toISOString());
                newCount++;
            }
            if (stat.active_count >= 10) {
                insertSuggestion.run(uuidv4(), stat.district_id, stat.district_name + "积压事项达" + stat.active_count + "件，化解压力较大，建议重点关注。", 'backlog', stat.active_count, null, stat.active_count >= 15 ? 'high' : 'medium', 'pending', user.userId, now.toISOString());
                newCount++;
            }
            if (stat.avg_days && stat.avg_days > 10) {
                insertSuggestion.run(uuidv4(), stat.district_id, stat.district_name + "平均办理时长" + stat.avg_days.toFixed(1) + "天，超出全市平均水平，建议督办。", 'slow_resolution', stat.total, null, 'medium', 'pending', user.userId, now.toISOString());
                newCount++;
            }
        });
    });
    tx();
    res.json({ success: true, new_suggestions: newCount });
});
