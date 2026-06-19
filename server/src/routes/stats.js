"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRoutes = void 0;
var Router = require("express").Router;
var database_1 = require("../database");
var auth_1 = require("../middleware/auth");
var permissions_1 = require("../services/permissions");
exports.statsRoutes = Router();

exports.statsRoutes.get("/overview", function (req, res) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
  var db = (0, database_1.getDb)();
  var statsFilter = permissions_1.PermissionService.buildStatsFilter(
    req.user,
    "a",
  );
  var districtFilter = statsFilter.whereClause;
  var params = statsFilter.params;

  var baseWhere = districtFilter ? districtFilter + " AND" : " WHERE";
  var totalCount = (_a = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(districtFilter),
  )).get.apply(_a, params);
  var pendingCount = (_b = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " status = 'pending'",
    ),
  )).get.apply(_b, params);
  var inProgressCount = (_c = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " status IN ('in_progress', 'mediating', 'escalated')",
    ),
  )).get.apply(_c, params);
  var completedCount = (_d = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " status = 'completed'",
    ),
  )).get.apply(_d, params);
  var overdueCount = (_e = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " status = 'overdue'",
    ),
  )).get.apply(_e, params);

  var now = new Date();
  var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  var recentParams = __spreadArray(
    __spreadArray([], params, true),
    [thirtyDaysAgo.toISOString()],
    false,
  );

  var last30DaysCompleted = (_f = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      districtFilter ? districtFilter + " AND" : " WHERE",
      " a.status = 'completed' AND a.actual_completed_at >= ?",
    ),
  )).get.apply(_f, recentParams);
  var last30DaysNew = (_g = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      districtFilter ? districtFilter + " AND" : " WHERE",
      " a.created_at >= ?",
    ),
  )).get.apply(_g, recentParams);
  var avgResolutionTime = (_h = db.prepare(
    "SELECT AVG(JULIANDAY(actual_completed_at) - JULIANDAY(created_at)) as avg_days FROM appeals a".concat(
      districtFilter ? districtFilter + " AND" : " WHERE",
      " status = 'completed' AND actual_completed_at IS NOT NULL",
    ),
  )).get.apply(_h, params);
  var avgSatisfaction = (_j = db.prepare(
    "SELECT AVG(satisfaction_score) as avg_score FROM appeals a".concat(
      districtFilter ? districtFilter + " AND" : " WHERE",
      " satisfaction_score IS NOT NULL",
    ),
  )).get.apply(_j, params);
  var mediationCount = (_k = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " resolution_channel = 'mediation'",
    ),
  )).get.apply(_k, params);
  var crossDeptCount = (_l = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " resolution_channel = 'cross_department'",
    ),
  )).get.apply(_l, params);
  var escalatedCount = (_m = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " resolution_channel = 'escalated'",
    ),
  )).get.apply(_m, params);
  var reworkCount = (_o = db.prepare(
    "SELECT COUNT(*) as count FROM appeals a".concat(
      baseWhere,
      " need_rework = 1",
    ),
  )).get.apply(_o, params);

  res.json({
    total: totalCount.count,
    pending: pendingCount.count,
    in_progress: inProgressCount.count,
    completed: completedCount.count,
    overdue: overdueCount.count,
    last_30_days_new: last30DaysNew.count,
    last_30_days_completed: last30DaysCompleted.count,
    avg_resolution_days: avgResolutionTime.avg_days
      ? Number(avgResolutionTime.avg_days.toFixed(1))
      : 0,
    avg_satisfaction: avgSatisfaction.avg_score
      ? Number(avgSatisfaction.avg_score.toFixed(1))
      : 0,
    resolution_channels: {
      mediation: mediationCount.count,
      cross_department: crossDeptCount.count,
      escalated: escalatedCount.count,
    },
    rework_count: reworkCount.count,
    completion_rate:
      totalCount.count > 0
        ? Number(((completedCount.count / totalCount.count) * 100).toFixed(1))
        : 0,
  });
});

exports.statsRoutes.get(
  "/by-district",
  (0, auth_1.requireRole)("city_admin"),
  function (req, res) {
    var db = (0, database_1.getDb)();
    var data = db
      .prepare(
        "\n    SELECT\n      d.id,\n      d.name,\n      COUNT(a.id) as total,\n      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,\n      SUM(CASE WHEN a.status IN ('pending', 'in_progress', 'mediating', 'escalated') THEN 1 ELSE 0 END) as active,\n      SUM(CASE WHEN a.status = 'overdue' THEN 1 ELSE 0 END) as overdue,\n      AVG(CASE WHEN a.status = 'completed' THEN JULIANDAY(a.actual_completed_at) - JULIANDAY(a.created_at) END) as avg_days,\n      AVG(a.satisfaction_score) as avg_satisfaction\n    FROM districts d\n    LEFT JOIN appeals a ON d.id = a.district_id\n    GROUP BY d.id, d.name\n    ORDER BY total DESC\n  ",
      )
      .all();
    var result = data.map(function (item) {
      return __assign(__assign({}, item), {
        completion_rate:
          item.total > 0
            ? Number(((item.completed / item.total) * 100).toFixed(1))
            : 0,
        avg_days: item.avg_days ? Number(item.avg_days.toFixed(1)) : 0,
        avg_satisfaction: item.avg_satisfaction
          ? Number(item.avg_satisfaction.toFixed(1))
          : 0,
      });
    });
    res.json(result);
  },
);

exports.statsRoutes.get("/by-type", function (req, res) {
  var _a;
  var db = (0, database_1.getDb)();
  var statsFilter = permissions_1.PermissionService.buildStatsFilter(
    req.user,
    "a",
  );
  var districtFilter = statsFilter.whereClause;
  var params = statsFilter.params;
  var data = (_a = db.prepare(
    "SELECT a.type, COUNT(*) as count, SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed FROM appeals a".concat(
      districtFilter,
      " GROUP BY a.type ORDER BY count DESC",
    ),
  )).all.apply(_a, params);
  res.json(data);
});

exports.statsRoutes.get("/trend", function (req, res) {
  var _a, _b;
  var db = (0, database_1.getDb)();
  var _c = req.query.days,
    days = _c === void 0 ? "30" : _c;
  var daysNum = parseInt(days);
  var startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  var trendFilter = permissions_1.PermissionService.buildTrendFilter(
    req.user,
    "a",
  );
  var districtFilter = trendFilter.sql;
  var params = [startDate.toISOString()];
  if (trendFilter.params.length > 0) {
    params.push.apply(params, trendFilter.params);
  }
  var dailyNew = (_a = db.prepare(
    "SELECT DATE(created_at) as date, COUNT(*) as count FROM appeals a WHERE created_at >= ?".concat(
      districtFilter,
      " GROUP BY DATE(created_at) ORDER BY date",
    ),
  )).all.apply(_a, params);
  var dailyCompleted = (_b = db.prepare(
    "SELECT DATE(actual_completed_at) as date, COUNT(*) as count FROM appeals a WHERE actual_completed_at >= ?".concat(
      districtFilter,
      " GROUP BY DATE(actual_completed_at) ORDER BY date",
    ),
  )).all.apply(_b, params);
  var dates = [];
  for (var i = 0; i < daysNum; i++) {
    var d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  var newMap = new Map(
    dailyNew.map(function (d) {
      return [d.date, d.count];
    }),
  );
  var completedMap = new Map(
    dailyCompleted.map(function (d) {
      return [d.date, d.count];
    }),
  );
  var trend = dates.map(function (date) {
    return {
      date: date,
      new: newMap.get(date) || 0,
      completed: completedMap.get(date) || 0,
    };
  });
  res.json(trend);
});
