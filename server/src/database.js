"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
var Database = require("better-sqlite3");
var path = require("path");
var bcrypt = require("bcryptjs");
var uuidv4 = require("uuid").v4;
var db;
function initDatabase() {
  var dbPath = path.join(__dirname, "../data/civichub.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  createTables();
  seedData();
  fixHistoricalData();
  return db;
}
function fixHistoricalData() {
  var appealsToFix = db
    .prepare(
      "SELECT a.id, a.submitter_phone FROM appeals a WHERE a.submitter_id IS NULL AND a.submitter_phone IS NOT NULL",
    )
    .all();
  var updateStmt = db.prepare(
    "UPDATE appeals SET submitter_id = ? WHERE id = ?",
  );
  var tx = db.transaction(function () {
    for (
      var _i = 0, appealsToFix_1 = appealsToFix;
      _i < appealsToFix_1.length;
      _i++
    ) {
      var appeal = appealsToFix_1[_i];
      var user = db
        .prepare("SELECT id FROM users WHERE phone = ? AND role = 'citizen'")
        .get(appeal.submitter_phone);
      if (user) {
        updateStmt.run(user.id, appeal.id);
      }
    }
  });
  tx();
}
function getDb() {
  return db;
}
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      district_id TEXT,
      department_id TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS districts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      submitter_name TEXT,
      submitter_phone TEXT,
      submitter_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      district_id TEXT NOT NULL,
      current_handler_id TEXT,
      current_department_id TEXT,
      resolution_channel TEXT,
      expected_deadline DATETIME,
      actual_completed_at DATETIME,
      satisfaction_score INTEGER,
      satisfaction_comment TEXT,
      need_rework INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appeal_flows (
      id TEXT PRIMARY KEY,
      appeal_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      handler_id TEXT,
      handler_name TEXT,
      handler_role TEXT,
      department_id TEXT,
      department_name TEXT,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appeal_coordination (
      id TEXT PRIMARY KEY,
      appeal_id TEXT NOT NULL,
      from_department_id TEXT,
      to_department_id TEXT,
      coordinator_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      request_content TEXT,
      response_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS supervision_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'normal',
      district_id TEXT NOT NULL,
      deadline DATETIME NOT NULL,
      issued_by TEXT NOT NULL,
      issued_by_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_accept',
      accept_time DATETIME,
      accepted_by TEXT,
      accepted_by_name TEXT,
      verified_at DATETIME,
      verified_by TEXT,
      verified_by_name TEXT,
      verify_result TEXT,
      escalated_count INTEGER DEFAULT 0,
      last_escalated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supervision_appeals (
      id TEXT PRIMARY KEY,
      supervision_id TEXT NOT NULL,
      appeal_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supervision_id) REFERENCES supervision_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (appeal_id) REFERENCES appeals(id) ON DELETE CASCADE,
      UNIQUE(supervision_id, appeal_id)
    );

    CREATE TABLE IF NOT EXISTS supervision_flows (
      id TEXT PRIMARY KEY,
      supervision_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      handler_id TEXT,
      handler_name TEXT,
      handler_role TEXT,
      comment TEXT,
      progress TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supervision_id) REFERENCES supervision_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS supervision_suggestions (
      id TEXT PRIMARY KEY,
      district_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      reason_type TEXT NOT NULL,
      appeal_count INTEGER DEFAULT 0,
      appeal_ids TEXT,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processed_by TEXT,
      supervision_id TEXT,
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_supervision_district ON supervision_orders(district_id);
    CREATE INDEX IF NOT EXISTS idx_supervision_status ON supervision_orders(status);
    CREATE INDEX IF NOT EXISTS idx_supervision_deadline ON supervision_orders(deadline);
    CREATE INDEX IF NOT EXISTS idx_supervision_appeal ON supervision_appeals(appeal_id);
    CREATE INDEX IF NOT EXISTS idx_suggestion_district ON supervision_suggestions(district_id);
    CREATE INDEX IF NOT EXISTS idx_suggestion_status ON supervision_suggestions(status);
  `);
}
function seedData() {
  var userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCount.count > 0) return;
  var districts = [
    { id: "dst_001", name: "鸡冠区", code: "jgxq" },
    { id: "dst_002", name: "恒山区", code: "hsxq" },
    { id: "dst_003", name: "滴道区", code: "ddxq" },
    { id: "dst_004", name: "梨树区", code: "lsxq" },
    { id: "dst_005", name: "城子河区", code: "czhxq" },
    { id: "dst_006", name: "麻山区", code: "msxq" },
    { id: "dst_007", name: "鸡东县", code: "jdx" },
    { id: "dst_008", name: "虎林市", code: "hls" },
    { id: "dst_009", name: "密山市", code: "mss" },
  ];
  var departments = [
    { id: "dept_001", name: "信访局", code: "xfj" },
    { id: "dept_002", name: "公安局", code: "gaj" },
    { id: "dept_003", name: "民政局", code: "mzj" },
    { id: "dept_004", name: "人力资源和社会保障局", code: "rsj" },
    { id: "dept_005", name: "自然资源局", code: "zrzyj" },
    { id: "dept_006", name: "住房和城乡建设局", code: "zjj" },
    { id: "dept_007", name: "市场监督管理局", code: "scjgj" },
    { id: "dept_008", name: "卫生健康委员会", code: "wjw" },
    { id: "dept_009", name: "司法局", code: "sifaju" },
    { id: "dept_010", name: "人民调解委员会", code: "rmtj" },
  ];
  var hashedPassword = bcrypt.hashSync("123456", 10);
  var users = [
    {
      id: "usr_001",
      username: "admin",
      password: hashedPassword,
      name: "张市长",
      role: "city_admin",
      phone: "13800000001",
    },
    {
      id: "usr_002",
      username: "jiguan",
      password: hashedPassword,
      name: "李主任",
      role: "district_center",
      district_id: "dst_001",
      phone: "13800000002",
    },
    {
      id: "usr_003",
      username: "hengshan",
      password: hashedPassword,
      name: "王主任",
      role: "district_center",
      district_id: "dst_002",
      phone: "13800000003",
    },
    {
      id: "usr_004",
      username: "didao",
      password: hashedPassword,
      name: "赵主任",
      role: "district_center",
      district_id: "dst_003",
      phone: "13800000004",
    },
    {
      id: "usr_005",
      username: "lishu",
      password: hashedPassword,
      name: "刘主任",
      role: "district_center",
      district_id: "dst_004",
      phone: "13800000005",
    },
    {
      id: "usr_006",
      username: "chengzihe",
      password: hashedPassword,
      name: "陈主任",
      role: "district_center",
      district_id: "dst_005",
      phone: "13800000006",
    },
    {
      id: "usr_007",
      username: "mashan",
      password: hashedPassword,
      name: "孙主任",
      role: "district_center",
      district_id: "dst_006",
      phone: "13800000007",
    },
    {
      id: "usr_008",
      username: "jidong",
      password: hashedPassword,
      name: "周主任",
      role: "district_center",
      district_id: "dst_007",
      phone: "13800000008",
    },
    {
      id: "usr_009",
      username: "hulin",
      password: hashedPassword,
      name: "吴主任",
      role: "district_center",
      district_id: "dst_008",
      phone: "13800000009",
    },
    {
      id: "usr_010",
      username: "mishan",
      password: hashedPassword,
      name: "郑主任",
      role: "district_center",
      district_id: "dst_009",
      phone: "13800000010",
    },
    {
      id: "usr_011",
      username: "dept_xfj",
      password: hashedPassword,
      name: "信访局办事员",
      role: "department",
      department_id: "dept_001",
      phone: "13800000011",
    },
    {
      id: "usr_012",
      username: "dept_gaj",
      password: hashedPassword,
      name: "公安局办事员",
      role: "department",
      department_id: "dept_002",
      phone: "13800000012",
    },
    {
      id: "usr_013",
      username: "dept_mzj",
      password: hashedPassword,
      name: "民政局办事员",
      role: "department",
      department_id: "dept_003",
      phone: "13800000013",
    },
    {
      id: "usr_014",
      username: "dept_rsj",
      password: hashedPassword,
      name: "人社局办事员",
      role: "department",
      department_id: "dept_004",
      phone: "13800000014",
    },
    {
      id: "usr_015",
      username: "dept_zjj",
      password: hashedPassword,
      name: "住建局办事员",
      role: "department",
      department_id: "dept_006",
      phone: "13800000015",
    },
    {
      id: "usr_016",
      username: "dept_tj",
      password: hashedPassword,
      name: "调解员小王",
      role: "department",
      department_id: "dept_010",
      phone: "13800000016",
    },
    {
      id: "usr_101",
      username: "user1",
      password: hashedPassword,
      name: "群众张三",
      role: "citizen",
      phone: "13900000001",
    },
    {
      id: "usr_102",
      username: "user2",
      password: hashedPassword,
      name: "群众李四",
      role: "citizen",
      phone: "13900000002",
    },
    {
      id: "usr_103",
      username: "user3",
      password: hashedPassword,
      name: "群众王五",
      role: "citizen",
      phone: "13900000003",
    },
  ];
  var insertDistrict = db.prepare(
    "INSERT INTO districts (id, name, code, description) VALUES (?, ?, ?, ?)",
  );
  var insertDept = db.prepare(
    "INSERT INTO departments (id, name, code, description) VALUES (?, ?, ?, ?)",
  );
  var insertUser = db.prepare(
    "INSERT INTO users (id, username, password, name, role, district_id, department_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  var tx = db.transaction(function () {
    for (var _i = 0, districts_1 = districts; _i < districts_1.length; _i++) {
      var d = districts_1[_i];
      insertDistrict.run(
        d.id,
        d.name,
        d.code,
        d.name + "综治中心",
      );
    }
    for (
      var _a = 0, departments_1 = departments;
      _a < departments_1.length;
      _a++
    ) {
      var d = departments_1[_a];
      insertDept.run(d.id, d.name, d.code, d.name);
    }
    for (var _b = 0, users_1 = users; _b < users_1.length; _b++) {
      var u = users_1[_b];
      insertUser.run(
        u.id,
        u.username,
        u.password,
        u.name,
        u.role,
        u.district_id || null,
        u.department_id || null,
        u.phone,
      );
    }
  });
  tx();
  seedAppeals();
  seedSupervisionData();
  generateSupervisionSuggestions();
}
function seedAppeals() {
  var now = new Date();
  var appeals = [
    {
      id: uuidv4(),
      title: "小区物业管理问题",
      content:
        "鸡冠区XX小区物业公司服务不到位，垃圾清运不及时，电梯经常故障，业主多次反映无果。",
      type: "property_management",
      source: "online",
      submitter_name: "张三",
      submitter_phone: "13900000001",
      submitter_id: "usr_101",
      status: "in_progress",
      priority: "normal",
      district_id: "dst_001",
      current_handler_id: "usr_002",
      current_department_id: "dept_006",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, 7),
      created_at: addDays(now, -3),
    },
    {
      id: uuidv4(),
      title: "邻里噪音纠纷",
      content: "恒山区XX街道邻居夜间噪音扰民，多次沟通无效，希望能协调解决。",
      type: "neighbor_dispute",
      source: "window",
      submitter_name: "李四",
      submitter_phone: "13900000002",
      submitter_id: "usr_102",
      status: "mediating",
      priority: "low",
      district_id: "dst_002",
      current_handler_id: "usr_016",
      current_department_id: "dept_010",
      resolution_channel: "mediation",
      expected_deadline: addDays(now, 3),
      created_at: addDays(now, -1),
    },
    {
      id: uuidv4(),
      title: "拖欠农民工工资问题",
      content:
        "滴道区XX工程项目拖欠20余名农民工工资共计80余万元，多次讨要无果。",
      type: "labor_dispute",
      source: "online",
      submitter_name: "王五",
      submitter_phone: "13900000003",
      submitter_id: "usr_103",
      status: "pending",
      priority: "high",
      district_id: "dst_003",
      resolution_channel: null,
      expected_deadline: null,
      created_at: addDays(now, 0),
    },
    {
      id: uuidv4(),
      title: "土地权属争议",
      content: "鸡东县XX村两户村民因宅基地边界问题产生纠纷，村委会调解未果。",
      type: "land_dispute",
      source: "window",
      submitter_name: "赵六",
      submitter_phone: "13900000004",
      submitter_id: null,
      status: "escalated",
      priority: "high",
      district_id: "dst_007",
      current_handler_id: "usr_008",
      current_department_id: "dept_005",
      resolution_channel: "escalated",
      expected_deadline: addDays(now, 15),
      created_at: addDays(now, -10),
      actual_completed_at: null,
      satisfaction_score: null,
    },
    {
      id: uuidv4(),
      title: "道路损坏问题",
      content: "虎林市XX路段路面严重破损，影响居民出行，存在安全隐患。",
      type: "infrastructure",
      source: "online",
      submitter_name: "孙七",
      submitter_phone: "13900000005",
      submitter_id: null,
      status: "completed",
      priority: "normal",
      district_id: "dst_008",
      current_handler_id: null,
      current_department_id: null,
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, -2),
      actual_completed_at: addDays(now, -1),
      satisfaction_score: 5,
      satisfaction_comment: "处理及时，道路已经修好，非常满意！",
      created_at: addDays(now, -12),
    },
    {
      id: uuidv4(),
      title: "消费维权问题",
      content: "密山市XX超市购买的食品存在质量问题，与商家协商退货退款被拒。",
      type: "consumer_rights",
      source: "online",
      submitter_name: "周八",
      submitter_phone: "13900000006",
      submitter_id: null,
      status: "completed",
      priority: "normal",
      district_id: "dst_009",
      current_handler_id: null,
      current_department_id: null,
      resolution_channel: "mediation",
      expected_deadline: addDays(now, -5),
      actual_completed_at: addDays(now, -4),
      satisfaction_score: 4,
      satisfaction_comment: "问题已解决，效率还可以",
      created_at: addDays(now, -15),
    },
    {
      id: uuidv4(),
      title: "婚姻家庭纠纷",
      content: "梨树区居民因家庭琐事产生矛盾，夫妻感情不和，请求调解。",
      type: "family_dispute",
      source: "window",
      submitter_name: "吴九",
      submitter_phone: "13900000007",
      submitter_id: null,
      status: "mediating",
      priority: "low",
      district_id: "dst_004",
      current_handler_id: "usr_016",
      current_department_id: "dept_010",
      resolution_channel: "mediation",
      expected_deadline: addDays(now, 5),
      created_at: addDays(now, -2),
    },
    {
      id: uuidv4(),
      title: "医保报销问题",
      content: "城子河区居民住院费用报销遇到困难，相关材料提交后迟迟没有回音。",
      type: "social_security",
      source: "online",
      submitter_name: "郑十",
      submitter_phone: "13900000008",
      submitter_id: null,
      status: "in_progress",
      priority: "normal",
      district_id: "dst_005",
      current_handler_id: "usr_014",
      current_department_id: "dept_004",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, 2),
      created_at: addDays(now, -5),
      satisfaction_score: 2,
      need_rework: 1,
    },
    {
      id: uuidv4(),
      title: "环境污染问题",
      content: "麻山区XX工厂夜间排放废气，影响周边居民正常生活。",
      type: "environmental",
      source: "hotline",
      submitter_name: "钱十一",
      submitter_phone: "13900000009",
      submitter_id: null,
      status: "pending",
      priority: "high",
      district_id: "dst_006",
      resolution_channel: null,
      expected_deadline: null,
      created_at: addDays(now, -0),
    },
    {
      id: uuidv4(),
      title: "教育资源问题",
      content: "鸡冠区XX学区划分不合理，孩子上学距离太远。",
      type: "education",
      source: "online",
      submitter_name: "陈十二",
      submitter_phone: "13900000010",
      submitter_id: null,
      status: "in_progress",
      priority: "normal",
      district_id: "dst_001",
      current_handler_id: "usr_002",
      current_department_id: "dept_001",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, 10),
      created_at: addDays(now, -4),
    },
    {
      id: uuidv4(),
      title: "交通出行问题",
      content: "恒山区XX公交线路班次太少，居民出行不便。",
      type: "transportation",
      source: "online",
      submitter_name: "楚十三",
      submitter_phone: "13900000011",
      submitter_id: null,
      status: "completed",
      priority: "low",
      district_id: "dst_002",
      resolution_channel: "mediation",
      expected_deadline: addDays(now, -8),
      actual_completed_at: addDays(now, -6),
      satisfaction_score: 3,
      satisfaction_comment: "增加了两班车，勉强够用吧",
      created_at: addDays(now, -20),
    },
    {
      id: uuidv4(),
      title: "食品安全问题",
      content: "滴道区XX餐馆卫生条件差，吃了饭后拉肚子。",
      type: "food_safety",
      source: "hotline",
      submitter_name: "魏十四",
      submitter_phone: "13900000012",
      submitter_id: null,
      status: "overdue",
      priority: "high",
      district_id: "dst_003",
      current_handler_id: "usr_013",
      current_department_id: "dept_007",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, -1),
      created_at: addDays(now, -8),
    },
    {
      id: uuidv4(),
      title: "社区养老服务需求",
      content: "梨树区老年人口多，希望社区能增加养老服务设施。",
      type: "elderly_care",
      source: "window",
      submitter_name: "蒋十五",
      submitter_phone: "13900000013",
      submitter_id: null,
      status: "pending",
      priority: "normal",
      district_id: "dst_004",
      resolution_channel: null,
      expected_deadline: null,
      created_at: addDays(now, -1),
    },
    {
      id: uuidv4(),
      title: "农民工欠薪问题（紧急）",
      content:
        "城子河区XX建筑工地，50多名农民工被拖欠工资近200万，临近年关，工人情绪激动。",
      type: "labor_dispute",
      source: "window",
      submitter_name: "沈十六",
      submitter_phone: "13900000014",
      submitter_id: null,
      status: "escalated",
      priority: "urgent",
      district_id: "dst_005",
      current_handler_id: "usr_001",
      current_department_id: "dept_004",
      resolution_channel: "escalated",
      expected_deadline: addDays(now, 3),
      created_at: addDays(now, -2),
    },
    {
      id: uuidv4(),
      title: "农村饮水安全问题",
      content: "鸡东县XX村自来水水质发黄，存在安全隐患。",
      type: "water_supply",
      source: "online",
      submitter_name: "韩十七",
      submitter_phone: "13900000015",
      submitter_id: null,
      status: "in_progress",
      priority: "high",
      district_id: "dst_007",
      current_handler_id: "usr_008",
      current_department_id: "dept_003",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, 5),
      created_at: addDays(now, -6),
    },
    {
      id: uuidv4(),
      title: "小区配套设施不完善",
      content: "滴道区XX小区入住两年，健身器材、路灯等配套设施仍未完善。",
      type: "property_management",
      source: "online",
      submitter_name: "王十八",
      submitter_phone: "13900000016",
      submitter_id: null,
      status: "overdue",
      priority: "normal",
      district_id: "dst_003",
      current_handler_id: "usr_004",
      current_department_id: "dept_006",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, -3),
      created_at: addDays(now, -12),
    },
    {
      id: uuidv4(),
      title: "噪声污染问题",
      content: "滴道区XX工地夜间施工，严重影响周边居民休息。",
      type: "environmental",
      source: "hotline",
      submitter_name: "刘十九",
      submitter_phone: "13900000017",
      submitter_id: null,
      status: "overdue",
      priority: "high",
      district_id: "dst_003",
      current_handler_id: "usr_004",
      current_department_id: "dept_008",
      resolution_channel: "cross_department",
      expected_deadline: addDays(now, -2),
      created_at: addDays(now, -10),
    },
    {
      id: uuidv4(),
      title: "占道经营问题",
      content: "滴道区XX商业街占道经营现象严重，影响交通和市容。",
      type: "infrastructure",
      source: "window",
      submitter_name: "陈二十",
      submitter_phone: "13900000018",
      submitter_id: null,
      status: "pending",
      priority: "normal",
      district_id: "dst_003",
      resolution_channel: null,
      expected_deadline: null,
      created_at: addDays(now, -5),
    },
    {
      id: uuidv4(),
      title: "物业管理费纠纷",
      content: "滴道区XX小区业主认为物业费收费过高，服务质量差。",
      type: "property_management",
      source: "online",
      submitter_name: "杨二十一",
      submitter_phone: "13900000019",
      submitter_id: null,
      status: "in_progress",
      priority: "normal",
      district_id: "dst_003",
      current_handler_id: "usr_004",
      current_department_id: "dept_006",
      resolution_channel: "mediation",
      expected_deadline: addDays(now, 5),
      created_at: addDays(now, -3),
    },
    {
      id: uuidv4(),
      title: "出租车乱收费问题",
      content: "滴道区出租车存在不打表、乱收费现象，乘客反映强烈。",
      type: "consumer_rights",
      source: "hotline",
      submitter_name: "黄二十二",
      submitter_phone: "13900000020",
      submitter_id: null,
      status: "pending",
      priority: "normal",
      district_id: "dst_003",
      resolution_channel: null,
      expected_deadline: null,
      created_at: addDays(now, -2),
    },
  ];
  var insertAppeal = db.prepare(
    `
    INSERT INTO appeals (
      id, title, content, type, source, submitter_name, submitter_phone, submitter_id,
      status, priority, district_id, current_handler_id, current_department_id,
      resolution_channel, expected_deadline, actual_completed_at, satisfaction_score,
      satisfaction_comment, need_rework, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  );
  var insertFlow = db.prepare(
    `
    INSERT INTO appeal_flows (id, appeal_id, action, from_status, to_status, handler_id, handler_name, handler_role, department_id, department_name, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  );
  var tx = db.transaction(function () {
    var _a, _b;
    for (var _i = 0, appeals_1 = appeals; _i < appeals_1.length; _i++) {
      var a = appeals_1[_i];
      insertAppeal.run(
        a.id,
        a.title,
        a.content,
        a.type,
        a.source,
        a.submitter_name,
        a.submitter_phone,
        a.submitter_id,
        a.status,
        a.priority,
        a.district_id,
        a.current_handler_id,
        a.current_department_id,
        a.resolution_channel,
        (_a = a.expected_deadline) === null || _a === void 0
          ? void 0
          : _a.toISOString(),
        (_b = a.actual_completed_at) === null || _b === void 0
          ? void 0
          : _b.toISOString(),
        a.satisfaction_score,
        a.satisfaction_comment,
        a.need_rework || 0,
        a.created_at.toISOString(),
      );
      insertFlow.run(
        uuidv4(),
        a.id,
        "create",
        null,
        "pending",
        a.submitter_id || "usr_002",
        a.submitter_name || "窗口工作人员",
        "citizen",
        null,
        null,
        "诉求已提交",
      );
      if (a.status === "in_progress" || a.status === "mediating") {
        insertFlow.run(
          uuidv4(),
          a.id,
          "assign",
          "pending",
          a.status,
          a.current_handler_id,
          getHandlerName(a.current_handler_id),
          getHandlerRole(a.current_handler_id),
          a.current_department_id,
          getDeptName(a.current_department_id),
          "已分配到相关部门处理",
        );
      }
      if (a.status === "completed") {
        insertFlow.run(
          uuidv4(),
          a.id,
          "assign",
          "pending",
          "in_progress",
          a.current_handler_id || "usr_002",
          getHandlerName(a.current_handler_id) || "李主任",
          getHandlerRole(a.current_handler_id) || "district_center",
          a.current_department_id || "dept_006",
          getDeptName(a.current_department_id) || "住建局",
          "已分配到相关部门处理",
        );
        insertFlow.run(
          uuidv4(),
          a.id,
          "complete",
          "in_progress",
          "completed",
          a.current_handler_id || "usr_002",
          getHandlerName(a.current_handler_id) || "李主任",
          getHandlerRole(a.current_handler_id) || "district_center",
          a.current_department_id || "dept_006",
          getDeptName(a.current_department_id) || "住建局",
          "事项已办结",
        );
        if (a.satisfaction_score) {
          insertFlow.run(
            uuidv4(),
            a.id,
            "rate",
            "completed",
            "completed",
            a.submitter_id || "usr_101",
            a.submitter_name || "群众",
            "citizen",
            null,
            null,
            "满意度评价：" + a.satisfaction_score + "分 - " + (a.satisfaction_comment || ""),
          );
        }
      }
      if (a.status === "escalated") {
        insertFlow.run(
          uuidv4(),
          a.id,
          "assign",
          "pending",
          "in_progress",
          "usr_008",
          "周主任",
          "district_center",
          "dept_005",
          "自然资源局",
          "已分配区县处理",
        );
        insertFlow.run(
          uuidv4(),
          a.id,
          "escalate",
          "in_progress",
          "escalated",
          "usr_001",
          "张市长",
          "city_admin",
          null,
          null,
          "案情复杂，已上报市级督办",
        );
      }
      if (a.status === "overdue") {
        insertFlow.run(
          uuidv4(),
          a.id,
          "assign",
          "pending",
          "in_progress",
          a.current_handler_id,
          getHandlerName(a.current_handler_id),
          getHandlerRole(a.current_handler_id),
          a.current_department_id,
          getDeptName(a.current_department_id),
          "已分配到相关部门处理",
        );
        insertFlow.run(
          uuidv4(),
          a.id,
          "warn_overdue",
          "in_progress",
          "overdue",
          "sys",
          "系统",
          "system",
          null,
          null,
          "⚠️ 办理已超时，请注意！",
        );
      }
    }
  });
  tx();
}

function seedSupervisionData() {
  var now = new Date();
  var insertSupervision = db.prepare(`
    INSERT INTO supervision_orders (
      id, order_no, title, description, type, level, district_id, deadline,
      issued_by, issued_by_name, status, accept_time, accepted_by, accepted_by_name,
      verified_at, verified_by, verified_by_name, verify_result,
      escalated_count, last_escalated_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  var insertSupervisionAppeal = db.prepare(`
    INSERT INTO supervision_appeals (id, supervision_id, appeal_id) VALUES (?, ?, ?)
  `);
  var insertSupervisionFlow = db.prepare(`
    INSERT INTO supervision_flows (
      id, supervision_id, action, from_status, to_status,
      handler_id, handler_name, handler_role, comment, progress
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  var appealIds = db.prepare("SELECT id, district_id FROM appeals WHERE status IN ('overdue', 'pending', 'in_progress')").all();
  var didaoAppeals = appealIds.filter(a => a.district_id === 'dst_003').slice(0, 3);
  var chengziheAppeals = appealIds.filter(a => a.district_id === 'dst_005').slice(0, 2);
  var tx = db.transaction(function () {
    var sup1Id = uuidv4();
    insertSupervision.run(
      sup1Id,
      'DB202506001',
      '滴道区超时事项督办',
      '滴道区近期超时办理事项较多，涉及食品安全、噪声污染等民生问题，请尽快整改落实。',
      'overdue',
      'high',
      'dst_003',
      addDays(now, 7).toISOString(),
      'usr_001',
      '张市长',
      'in_progress',
      addDays(now, -2).toISOString(),
      'usr_004',
      '赵主任',
      null, null, null, null,
      1,
      addDays(now, -1).toISOString(),
      addDays(now, -3).toISOString(),
    );
    insertSupervisionFlow.run(
      uuidv4(), sup1Id, 'issue', null, 'pending_accept',
      'usr_001', '张市长', 'city_admin',
      '已下达督办单，请滴道区综治中心签收处理',
      null,
    );
    insertSupervisionFlow.run(
      uuidv4(), sup1Id, 'accept', 'pending_accept', 'in_progress',
      'usr_004', '赵主任', 'district_center',
      '已签收督办，立即组织整改',
      null,
    );
    insertSupervisionFlow.run(
      uuidv4(), sup1Id, 'progress', 'in_progress', 'in_progress',
      'usr_004', '赵主任', 'district_center',
      '已成立专项工作组，正在对超时事项逐一排查',
      '已完成2件事项的整改，剩余1件正在推进中',
    );
    insertSupervisionFlow.run(
      uuidv4(), sup1Id, 'escalate', 'in_progress', 'in_progress',
      'usr_001', '张市长', 'city_admin',
      '整改进度偏慢，请加快督办落实',
      null,
    );
    didaoAppeals.forEach(function (appeal) {
      insertSupervisionAppeal.run(uuidv4(), sup1Id, appeal.id);
    });
    var sup2Id = uuidv4();
    insertSupervision.run(
      sup2Id,
      'DB202506002',
      '城子河区欠薪问题重点督办',
      '城子河区XX建筑工地农民工欠薪问题涉及人数多、金额大，需重点督办，确保年前解决。',
      'backlog',
      'urgent',
      'dst_005',
      addDays(now, 3).toISOString(),
      'usr_001',
      '张市长',
      'pending_accept',
      null, null, null,
      null, null, null, null,
      0, null,
      addDays(now, -1).toISOString(),
    );
    insertSupervisionFlow.run(
      uuidv4(), sup2Id, 'issue', null, 'pending_accept',
      'usr_001', '张市长', 'city_admin',
      '紧急督办：城子河区农民工欠薪问题，请立即签收处理',
      null,
    );
    chengziheAppeals.forEach(function (appeal) {
      insertSupervisionAppeal.run(uuidv4(), sup2Id, appeal.id);
    });
    var sup3Id = uuidv4();
    insertSupervision.run(
      sup3Id,
      'DB202505001',
      '恒山区积案化解督办',
      '恒山区上月积案化解率偏低，请分析原因并制定整改措施。',
      'slow_resolution',
      'normal',
      'dst_002',
      addDays(now, -5).toISOString(),
      'usr_001',
      '张市长',
      'verified',
      addDays(now, -14).toISOString(),
      'usr_003',
      '王主任',
      addDays(now, -6).toISOString(),
      'usr_001',
      '张市长',
      '整改到位，化解率提升明显',
      0, null,
      addDays(now, -15).toISOString(),
    );
    insertSupervisionFlow.run(
      uuidv4(), sup3Id, 'issue', null, 'pending_accept',
      'usr_001', '张市长', 'city_admin',
      '已下达督办单',
      null,
    );
    insertSupervisionFlow.run(
      uuidv4(), sup3Id, 'accept', 'pending_accept', 'in_progress',
      'usr_003', '王主任', 'district_center',
      '已签收，正在制定整改方案',
      null,
    );
    insertSupervisionFlow.run(
      uuidv4(), sup3Id, 'progress', 'in_progress', 'in_progress',
      'usr_003', '王主任', 'district_center',
      '已完成积案梳理，建立台账',
      '已化解5件积案，剩余2件正在推进',
    );
    insertSupervisionFlow.run(
      uuidv4(), sup3Id, 'complete', 'in_progress', 'pending_verify',
      'usr_003', '王主任', 'district_center',
      '整改工作已完成，申请核销',
      '全部积案已化解，化解率达到95%',
    );
    insertSupervisionFlow.run(
      uuidv4(), sup3Id, 'verify', 'pending_verify', 'verified',
      'usr_001', '张市长', 'city_admin',
      '经核查，整改到位，同意核销',
      null,
    );
  });
  tx();
}

function generateSupervisionSuggestions() {
  var now = new Date();
  var insertSuggestion = db.prepare(`
    INSERT INTO supervision_suggestions (
      id, district_id, reason, reason_type, appeal_count, appeal_ids,
      severity, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
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
  var tx = db.transaction(function () {
    districtStats.forEach(function (stat) {
      var overdueAppeals = db.prepare(`
        SELECT id FROM appeals WHERE district_id = ? AND status = 'overdue'
      `).all(stat.district_id);
      var appealIds = overdueAppeals.map(a => a.id).join(',');
      if (stat.overdue_count >= 3) {
        insertSuggestion.run(
          uuidv4(),
          stat.district_id,
          stat.district_name + '超时事项达' + stat.overdue_count + '件，超过预警阈值，建议下达督办单。',
          'overdue',
          stat.overdue_count,
          appealIds,
          stat.overdue_count >= 5 ? 'high' : 'medium',
          'pending',
          'system',
          now.toISOString(),
        );
      }
      if (stat.active_count >= 10) {
        insertSuggestion.run(
          uuidv4(),
          stat.district_id,
          stat.district_name + '积压事项达' + stat.active_count + '件，化解压力较大，建议重点关注。',
          'backlog',
          stat.active_count,
          null,
          stat.active_count >= 15 ? 'high' : 'medium',
          'pending',
          'system',
          now.toISOString(),
        );
      }
      if (stat.avg_days && stat.avg_days > 10) {
        insertSuggestion.run(
          uuidv4(),
          stat.district_id,
          stat.district_name + '平均办理时长' + stat.avg_days.toFixed(1) + '天，超出全市平均水平，建议督办。',
          'slow_resolution',
          stat.total,
          null,
          'medium',
          'pending',
          'system',
          now.toISOString(),
        );
      }
    });
  });
  tx();
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function getHandlerName(id) {
  var names = {
    usr_001: "张市长",
    usr_002: "李主任",
    usr_003: "王主任",
    usr_004: "赵主任",
    usr_005: "刘主任",
    usr_006: "陈主任",
    usr_007: "孙主任",
    usr_008: "周主任",
    usr_009: "吴主任",
    usr_010: "郑主任",
    usr_013: "民政局办事员",
    usr_014: "人社局办事员",
    usr_016: "调解员小王",
  };
  return id ? names[id] || null : null;
}
function getHandlerRole(id) {
  if (!id) return null;
  if (id === "usr_001") return "city_admin";
  if (["usr_002", "usr_003", "usr_004", "usr_005", "usr_006", "usr_007", "usr_008", "usr_009", "usr_010"].includes(id))
    return "district_center";
  return "department";
}
function getDeptName(id) {
  var names = {
    dept_001: "信访局",
    dept_002: "公安局",
    dept_003: "民政局",
    dept_004: "人社局",
    dept_005: "自然资源局",
    dept_006: "住建局",
    dept_007: "市场监管局",
    dept_008: "卫健委",
    dept_010: "人民调解委员会",
  };
  return id ? names[id] || null : null;
}
