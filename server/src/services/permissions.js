"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
var database_1 = require("../database");
var ROLES = {
  CITY_ADMIN: "city_admin",
  DISTRICT_CENTER: "district_center",
  DEPARTMENT: "department",
  CITIZEN: "citizen"
};
var DATA_SCOPES = {
  ALL: "all",
  DISTRICT: "district",
  DEPARTMENT: "department",
  SELF: "self"
};
function getUserScope(user) {
  var db = (0, database_1.getDb)();
  var scope = {
    role: user.role,
    userId: user.userId,
    dataScope: DATA_SCOPES.ALL
  };
  if (user.role === ROLES.DISTRICT_CENTER) {
    var userRecord = db.prepare("SELECT district_id FROM users WHERE id = ?").get(user.userId);
    scope.dataScope = DATA_SCOPES.DISTRICT;
    scope.districtId = userRecord.district_id;
  } else if (user.role === ROLES.DEPARTMENT) {
    var userRecord = db.prepare("SELECT department_id FROM users WHERE id = ?").get(user.userId);
    scope.dataScope = DATA_SCOPES.DEPARTMENT;
    scope.departmentId = userRecord.department_id;
  } else if (user.role === ROLES.CITIZEN) {
    var userRecord = db.prepare("SELECT phone FROM users WHERE id = ?").get(user.userId);
    scope.dataScope = DATA_SCOPES.SELF;
    scope.phone = userRecord.phone;
  }
  return scope;
}
function buildDataFilter(user, tableAlias) {
  if (tableAlias === void 0) {
    tableAlias = "a";
  }
  var scope = getUserScope(user);
  var sql = "";
  var params = [];
  switch (scope.dataScope) {
    case DATA_SCOPES.DISTRICT:
      sql = " AND ".concat(tableAlias, ".district_id = ?");
      params.push(scope.districtId);
      break;
    case DATA_SCOPES.DEPARTMENT:
      sql = " AND ".concat(tableAlias, ".current_department_id = ?");
      params.push(scope.departmentId);
      break;
    case DATA_SCOPES.SELF:
      sql = " AND (".concat(tableAlias, ".submitter_id = ? OR ").concat(tableAlias, ".submitter_phone = ?)");
      params.push(scope.userId, scope.phone);
      break;
    case DATA_SCOPES.ALL:
    default:
      break;
  }
  return { sql: sql, params: params, scope: scope };
}
function buildStatsFilter(user, tableAlias) {
  if (tableAlias === void 0) {
    tableAlias = "a";
  }
  var scope = getUserScope(user);
  var whereClause = "";
  var params = [];
  switch (scope.dataScope) {
    case DATA_SCOPES.DISTRICT:
      whereClause = " WHERE ".concat(tableAlias, ".district_id = ?");
      params.push(scope.districtId);
      break;
    case DATA_SCOPES.DEPARTMENT:
      whereClause = " WHERE ".concat(tableAlias, ".current_department_id = ?");
      params.push(scope.departmentId);
      break;
    case DATA_SCOPES.SELF:
      whereClause = " WHERE ".concat(tableAlias, ".submitter_id = ?");
      params.push(scope.userId);
      break;
    case DATA_SCOPES.ALL:
    default:
      break;
  }
  return { whereClause: whereClause, params: params, scope: scope };
}
function buildTrendFilter(user, tableAlias) {
  if (tableAlias === void 0) {
    tableAlias = "a";
  }
  var scope = getUserScope(user);
  var sql = "";
  var params = [];
  switch (scope.dataScope) {
    case DATA_SCOPES.DISTRICT:
      sql = " AND ".concat(tableAlias, ".district_id = ?");
      params.push(scope.districtId);
      break;
    case DATA_SCOPES.DEPARTMENT:
      sql = " AND ".concat(tableAlias, ".current_department_id = ?");
      params.push(scope.departmentId);
      break;
    case DATA_SCOPES.SELF:
    case DATA_SCOPES.ALL:
    default:
      break;
  }
  return { sql: sql, params: params, scope: scope };
}
function checkAppealAccess(user, appeal) {
  var scope = getUserScope(user);
  switch (scope.dataScope) {
    case DATA_SCOPES.ALL:
      return { allowed: true };
    case DATA_SCOPES.DISTRICT:
      return {
        allowed: appeal.district_id === scope.districtId
      };
    case DATA_SCOPES.DEPARTMENT:
      return {
        allowed: appeal.current_department_id === scope.departmentId
      };
    case DATA_SCOPES.SELF:
      return {
        allowed: appeal.submitter_id === scope.userId || appeal.submitter_phone === scope.phone
      };
    default:
      return { allowed: false };
  }
}
function checkSupervisionAccess(user, supervision) {
  var scope = getUserScope(user);
  if (scope.dataScope === DATA_SCOPES.ALL) {
    return { allowed: true };
  }
  if (scope.dataScope === DATA_SCOPES.DISTRICT) {
    return {
      allowed: supervision.district_id === scope.districtId
    };
  }
  return { allowed: false };
}
function requireDataScope() {
  var allowedScopes = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    allowedScopes[_i] = arguments[_i];
  }
  return function (req, res, next) {
    var scope = getUserScope(req.user);
    if (!allowedScopes.includes(scope.dataScope)) {
      return res.status(403).json({ error: "无权访问" });
    }
    next();
  };
}
exports.PermissionService = {
  ROLES: ROLES,
  DATA_SCOPES: DATA_SCOPES,
  getUserScope: getUserScope,
  buildDataFilter: buildDataFilter,
  buildStatsFilter: buildStatsFilter,
  buildTrendFilter: buildTrendFilter,
  checkAppealAccess: checkAppealAccess,
  checkSupervisionAccess: checkSupervisionAccess,
  requireDataScope: requireDataScope
};
