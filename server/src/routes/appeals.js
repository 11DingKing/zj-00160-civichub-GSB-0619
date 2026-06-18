"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appealRoutes = void 0;
var Router = require("express").Router;
var uuidv4 = require("uuid").v4;
var database_1 = require("../database");
var auth_1 = require("../middleware/auth");
var permissions_1 = require("../services/permissions");
var routing_1 = require("../services/routing");
exports.appealRoutes = Router();
function getHandlerInfo(handlerId) {
  if (!handlerId) return null;
  var db = (0, database_1.getDb)();
  var user = db
    .prepare("SELECT name, role FROM users WHERE id = ?")
    .get(handlerId);
  return user ? { name: user.name, role: user.role } : null;
}
function getDeptName(deptId) {
  if (!deptId) return null;
  var db = (0, database_1.getDb)();
  var dept = db
    .prepare("SELECT name FROM departments WHERE id = ?")
    .get(deptId);
  return (dept === null || dept === void 0 ? void 0 : dept.name) || null;
}
function addFlowRecord(
  appealId,
  action,
  fromStatus,
  toStatus,
  handlerId,
  comment,
  deptId,
) {
  var db = (0, database_1.getDb)();
  var handlerInfo = handlerId ? getHandlerInfo(handlerId) : null;
  var deptName = getDeptName(deptId || undefined);
  db.prepare(
    "\n    INSERT INTO appeal_flows (\n      id, appeal_id, action, from_status, to_status,\n      handler_id, handler_name, handler_role,\n      department_id, department_name, comment\n    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n  ",
  ).run(
    uuidv4(),
    appealId,
    action,
    fromStatus,
    toStatus,
    handlerId,
    (handlerInfo === null || handlerInfo === void 0
      ? void 0
      : handlerInfo.name) || null,
    (handlerInfo === null || handlerInfo === void 0
      ? void 0
      : handlerInfo.role) || null,
    deptId || null,
    deptName,
    comment,
  );
}
function getAppealWithDetails(id) {
  var db = (0, database_1.getDb)();
  return db
    .prepare(
      "\n    SELECT a.*, d.name as district_name,\n           u.name as handler_name,\n           dept.name as department_name\n    FROM appeals a\n    LEFT JOIN districts d ON a.district_id = d.id\n    LEFT JOIN users u ON a.current_handler_id = u.id\n    LEFT JOIN departments dept ON a.current_department_id = dept.id\n    WHERE a.id = ?\n  ",
    )
    .get(id);
}
exports.appealRoutes.get("/", function (req, res) {
  var _a, _b;
  var db = (0, database_1.getDb)();
  var _c = req.query,
    status = _c.status,
    district_id = _c.district_id,
    type = _c.type,
    priority = _c.priority,
    _d = _c.page,
    page = _d === void 0 ? "1" : _d,
    _e = _c.page_size,
    page_size = _e === void 0 ? "20" : _e,
    submitter_id = _c.submitter_id;
  var sql =
    "\n    SELECT a.*, d.name as district_name,\n           u.name as handler_name,\n           dept.name as department_name\n    FROM appeals a\n    LEFT JOIN districts d ON a.district_id = d.id\n    LEFT JOIN users u ON a.current_handler_id = u.id\n    LEFT JOIN departments dept ON a.current_department_id = dept.id\n    WHERE 1=1\n  ";
  var params = [];
  if (status) {
    sql += " AND a.status = ?";
    params.push(status);
  }
  if (district_id) {
    sql += " AND a.district_id = ?";
    params.push(district_id);
  }
  if (type) {
    sql += " AND a.type = ?";
    params.push(type);
  }
  if (priority) {
    sql += " AND a.priority = ?";
    params.push(priority);
  }
  if (submitter_id) {
    sql += " AND a.submitter_id = ?";
    params.push(submitter_id);
  }
  var dataFilter = permissions_1.PermissionService.buildDataFilter(req.user, "a");
  sql += dataFilter.sql;
  params.push.apply(params, dataFilter.params);
  sql += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
  var pageNum = parseInt(page);
  var pageSizeNum = parseInt(page_size);
  params.push(pageSizeNum, (pageNum - 1) * pageSizeNum);
  var appeals = (_a = db.prepare(sql)).all.apply(_a, params);
  var countSql = "SELECT COUNT(*) as total FROM appeals a WHERE 1=1";
  var countParams = params.slice(0, -2);
  var whereStart = sql.indexOf("WHERE 1=1") + 9;
  var whereEnd = sql.indexOf("ORDER BY");
  if (whereStart > 0 && whereEnd > whereStart) {
    var whereConditions = sql.slice(whereStart, whereEnd);
    countSql =
      "SELECT COUNT(*) as total FROM appeals a WHERE 1=1" + whereConditions;
  }
  var total = (_b = db.prepare(countSql)).get.apply(_b, countParams).total;
  res.json({
    data: appeals,
    total: total,
    page: pageNum,
    page_size: pageSizeNum,
  });
});
exports.appealRoutes.get("/:id", function (req, res) {
  var id = req.params.id;
  var db = (0, database_1.getDb)();
  var appeal = db
    .prepare(
      "\n    SELECT a.*, d.name as district_name,\n           u.name as handler_name,\n           dept.name as department_name\n    FROM appeals a\n    LEFT JOIN districts d ON a.district_id = d.id\n    LEFT JOIN users u ON a.current_handler_id = u.id\n    LEFT JOIN departments dept ON a.current_department_id = dept.id\n    WHERE a.id = ?\n  ",
    )
    .get(id);
  if (!appeal) {
    return res.status(404).json({ error: "诉求不存在" });
  }
  var accessCheck = permissions_1.PermissionService.checkAppealAccess(req.user, appeal);
  if (!accessCheck.allowed) {
    return res.status(403).json({ error: "无权查看此诉求" });
  }
  var flows = db
    .prepare(
      "\n    SELECT f.* FROM appeal_flows f\n    WHERE f.appeal_id = ?\n    ORDER BY f.created_at ASC\n  ",
    )
    .all(id);
  res.json({
    appeal: appeal,
    flows: flows,
  });
});
exports.appealRoutes.post("/", function (req, res) {
  var _a = req.body,
    title = _a.title,
    content = _a.content,
    type = _a.type,
    source = _a.source,
    submitter_name = _a.submitter_name,
    submitter_phone = _a.submitter_phone,
    district_id = _a.district_id,
    _b = _a.priority,
    priority = _b === void 0 ? "normal" : _b;
  if (
    !title ||
    !content ||
    !type ||
    !source ||
    !submitter_name ||
    !submitter_phone ||
    !district_id
  ) {
    return res.status(400).json({ error: "缺少必填字段" });
  }
  var db = (0, database_1.getDb)();
  var id = uuidv4();
  var user = req.user;
  var userScope = permissions_1.PermissionService.getUserScope(user);
  var submitterId;
  if (userScope.dataScope === permissions_1.PermissionService.DATA_SCOPES.SELF) {
    submitterId = userScope.userId;
  } else {
    var existingUser = db
      .prepare("SELECT id FROM users WHERE phone = ? AND role = 'citizen'")
      .get(submitter_phone);
    if (existingUser) {
      submitterId = existingUser.id;
    }
  }
  db.prepare(
    "\n    INSERT INTO appeals (\n      id, title, content, type, source,\n      submitter_name, submitter_phone, submitter_id,\n      status, priority, district_id, created_at, updated_at\n    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n  ",
  ).run(
    id,
    title,
    content,
    type,
    source,
    submitter_name,
    submitter_phone,
    submitterId,
    "pending",
    priority,
    district_id,
  );
  addFlowRecord(
    id,
    "create",
    null,
    "pending",
    submitterId || user.userId,
    "诉求已提交",
    null,
  );
  var newAppeal = getAppealWithDetails(id);
  res.status(201).json(newAppeal);
});
exports.appealRoutes.put(
  "/:id/assign",
  (0, auth_1.requireRole)("district_center", "city_admin"),
  function (req, res) {
    var id = req.params.id;
    var _a = req.body,
      department_id = _a.department_id,
      resolution_channel = _a.resolution_channel;
    if (!department_id || !resolution_channel) {
      return res.status(400).json({ error: "缺少部门和化解渠道不能为空" });
    }
    var db = (0, database_1.getDb)();
    var appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(id);
    if (!appeal) {
      return res.status(404).json({ error: "诉求不存在" });
    }
    if (appeal.status !== "pending") {
      return res.status(400).json({ error: "只能分配待处理的诉求" });
    }
    var dept = db
      .prepare("SELECT id, name FROM departments WHERE id = ?")
      .get(department_id);
    if (!dept) {
      return res.status(400).json({ error: "部门不存在" });
    }
    var deptUser = db
      .prepare("SELECT id, name FROM users WHERE department_id = ? LIMIT 1")
      .get(department_id);
    var assignParams = routing_1.RoutingService.buildAssignmentParams(
      resolution_channel,
      department_id,
      (deptUser === null || deptUser === void 0 ? void 0 : deptUser.id) || null
    );
    db.prepare(
      "\n    UPDATE appeals\n    SET status = ?, current_department_id = ?, current_handler_id = ?,\n        resolution_channel = ?, expected_deadline = ?, updated_at = CURRENT_TIMESTAMP\n    WHERE id = ?\n  ",
    ).run(
      assignParams.status,
      assignParams.current_department_id,
      assignParams.current_handler_id,
      assignParams.resolution_channel,
      assignParams.expected_deadline,
      id,
    );
    var user = req.user;
    var flowComment = routing_1.RoutingService.buildFlowComment(
      resolution_channel,
      dept.name
    );
    addFlowRecord(
      id,
      "assign",
      "pending",
      assignParams.status,
      user.userId,
      flowComment,
      department_id,
    );
    var updatedAppeal = getAppealWithDetails(id);
    res.json(updatedAppeal);
  },
);
exports.appealRoutes.put(
  "/:id/transfer",
  (0, auth_1.requireRole)("district_center", "city_admin"),
  function (req, res) {
    var id = req.params.id;
    var comment = req.body.comment;
    var db = (0, database_1.getDb)();
    var appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(id);
    if (!appeal) {
      return res.status(404).json({ error: "诉求不存在" });
    }
    var oldStatus = appeal.status;
    var escalateParams = routing_1.RoutingService.buildEscalationParams(comment);
    db.prepare(
      "\n    UPDATE appeals\n    SET status = ?, resolution_channel = ?,\n        current_handler_id = ?, updated_at = CURRENT_TIMESTAMP\n    WHERE id = ?\n  ",
    ).run(
      escalateParams.status,
      escalateParams.resolution_channel,
      escalateParams.current_handler_id,
      id,
    );
    var user = req.user;
    addFlowRecord(
      id,
      escalateParams.action,
      oldStatus,
      escalateParams.status,
      user.userId,
      escalateParams.comment,
      null,
    );
    var updatedAppeal = getAppealWithDetails(id);
    res.json(updatedAppeal);
  },
);
exports.appealRoutes.put(
  "/:id/progress",
  (0, auth_1.requireRole)("district_center", "department", "city_admin"),
  function (req, res) {
    var id = req.params.id;
    var _a = req.body,
      progress = _a.progress,
      comment = _a.comment;
    if (!comment) {
      return res.status(400).json({ error: "请填写办理进展" });
    }
    var db = (0, database_1.getDb)();
    var appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(id);
    if (!appeal) {
      return res.status(404).json({ error: "诉求不存在" });
    }
    if (appeal.status === "completed") {
      return res.status(400).json({ error: "已完成的诉求不能再更新进展" });
    }
    var user = req.user;
    addFlowRecord(
      id,
      "progress",
      appeal.status,
      appeal.status,
      user.userId,
      comment,
      appeal.current_department_id,
    );
    db.prepare(
      "\n    UPDATE appeals SET updated_at = CURRENT_TIMESTAMP WHERE id = ?\n  ",
    ).run(id);
    var updatedAppeal = getAppealWithDetails(id);
    res.json(updatedAppeal);
  },
);
exports.appealRoutes.put(
  "/:id/complete",
  (0, auth_1.requireRole)("district_center", "department", "city_admin"),
  function (req, res) {
    var id = req.params.id;
    var result = req.body.result;
    var db = (0, database_1.getDb)();
    var appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(id);
    if (!appeal) {
      return res.status(404).json({ error: "诉求不存在" });
    }
    if (appeal.status === "completed") {
      return res.status(400).json({ error: "该诉求已完成" });
    }
    var oldStatus = appeal.status;
    var now = new Date();
    db.prepare(
      "\n    UPDATE appeals\n    SET status = 'completed', actual_completed_at = ?, updated_at = CURRENT_TIMESTAMP\n    WHERE id = ?\n  ",
    ).run(now.toISOString(), id);
    var user = req.user;
    addFlowRecord(
      id,
      "complete",
      oldStatus,
      "completed",
      user.userId,
      result || "事项已办结",
      appeal.current_department_id,
    );
    var updatedAppeal = getAppealWithDetails(id);
    res.json(updatedAppeal);
  },
);
exports.appealRoutes.put("/:id/rate", function (req, res) {
  var id = req.params.id;
  var _a = req.body,
    score = _a.score,
    comment = _a.comment;
  if (score === undefined || score < 1 || score > 5) {
    return res.status(400).json({ error: "请给出1-5分的评价" });
  }
  var db = (0, database_1.getDb)();
  var appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(id);
  if (!appeal) {
    return res.status(404).json({ error: "诉求不存在" });
  }
  if (appeal.status !== "completed") {
    return res.status(400).json({ error: "只能对已完成的诉求进行评价" });
  }
  var accessCheck = permissions_1.PermissionService.checkAppealAccess(req.user, appeal);
  if (!accessCheck.allowed) {
    return res.status(403).json({ error: "只能评价自己提交的诉求" });
  }
  var needRework = score <= 2 ? 1 : 0;
  db.prepare(
    "\n    UPDATE appeals\n    SET satisfaction_score = ?, satisfaction_comment = ?, need_rework = ?, updated_at = CURRENT_TIMESTAMP\n    WHERE id = ?\n  ",
  ).run(score, comment || "", needRework, id);
  addFlowRecord(
    id,
    "rate",
    "completed",
    "completed",
    req.user.userId,
    "\u6EE1\u610F\u5EA6\u8BC4\u4EF7\uFF1A"
      .concat(score, "\u5206 - ")
      .concat(comment || ""),
    null,
  );
  if (needRework) {
    db.prepare(
      "\n      UPDATE appeals SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?\n    ",
    ).run(id);
    addFlowRecord(
      id,
      "rework",
      "completed",
      "in_progress",
      "sys",
      "评价不满意，已触发回流整改",
      null,
    );
  }
  var updatedAppeal = getAppealWithDetails(id);
  res.json(updatedAppeal);
});
exports.appealRoutes.post(
  "/:id/coordinate",
  (0, auth_1.requireRole)("district_center", "department"),
  function (req, res) {
    var id = req.params.id;
    var _a = req.body,
      to_department_id = _a.to_department_id,
      request_content = _a.request_content;
    if (!to_department_id || !request_content) {
      return res.status(400).json({ error: "请填写协同部门和协同内容" });
    }
    var db = (0, database_1.getDb)();
    var appeal = db.prepare("SELECT * FROM appeals WHERE id = ?").get(id);
    if (!appeal) {
      return res.status(404).json({ error: "诉求不存在" });
    }
    var user = req.user;
    var userScope = permissions_1.PermissionService.getUserScope(user);
    var coordId = uuidv4();
    db.prepare(
      "\n    INSERT INTO appeal_coordination (\n      id, appeal_id, from_department_id, to_department_id,\n      coordinator_id, status, request_content, created_at\n    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n  ",
    ).run(
      coordId,
      id,
      userScope.departmentId,
      to_department_id,
      user.userId,
      "pending",
      request_content,
    );
    var toDept = db
      .prepare("SELECT name FROM departments WHERE id = ?")
      .get(to_department_id);
    addFlowRecord(
      id,
      "coordinate",
      appeal.status,
      appeal.status,
      user.userId,
      "\u5DF2\u53D1\u8D77\u8DE8\u90E8\u95E8\u534F\u540C\u81F3"
        .concat(toDept.name, "\uFF1A")
        .concat(request_content),
      appeal.current_department_id,
    );
    res.status(201).json({ id: coordId });
  },
);
