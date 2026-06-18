"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var database_1 = require("./database");
var auth_1 = require("./routes/auth");
var appeals_1 = require("./routes/appeals");
var stats_1 = require("./routes/stats");
var districts_1 = require("./routes/districts");
var supervisions_1 = require("./routes/supervisions");
var auth_2 = require("./middleware/auth");
var app = express();
var PORT = process.env.PORT || 3002;
app.use(cors());
app.use(express.json());
(0, database_1.initDatabase)();
app.use("/api/auth", auth_1.authRoutes);
app.use("/api/appeals", auth_2.authenticateToken, appeals_1.appealRoutes);
app.use("/api/stats", auth_2.authenticateToken, stats_1.statsRoutes);
app.use("/api/districts", auth_2.authenticateToken, districts_1.districtRoutes);
app.use(
  "/api/supervisions",
  auth_2.authenticateToken,
  supervisions_1.supervisionRoutes,
);
app.get("/api/health", function (req, res) {
  res.json({ status: "ok", message: "鸡西市市域社会治理综合平台服务运行正常" });
});
app.listen(PORT, function () {
  console.log(
    "\uD83D\uDE80 \u670D\u52A1\u5668\u8FD0\u884C\u5728 http://localhost:".concat(
      PORT,
    ),
  );
});
