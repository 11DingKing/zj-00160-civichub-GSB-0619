export const APPEAL_TYPES = [
  { value: "property_management", label: "物业管理" },
  { value: "neighbor_dispute", label: "邻里纠纷" },
  { value: "labor_dispute", label: "劳资纠纷" },
  { value: "land_dispute", label: "土地权属" },
  { value: "infrastructure", label: "基础设施" },
  { value: "consumer_rights", label: "消费维权" },
  { value: "family_dispute", label: "婚姻家庭" },
  { value: "social_security", label: "社会保障" },
  { value: "environmental", label: "环境保护" },
  { value: "education", label: "教育资源" },
  { value: "transportation", label: "交通出行" },
  { value: "food_safety", label: "食品安全" },
  { value: "elderly_care", label: "养老服务" },
  { value: "water_supply", label: "供水安全" },
  { value: "other", label: "其他" },
];

export const APPEAL_STATUSES = [
  { value: "pending", label: "待分配", color: "default" },
  { value: "mediating", label: "调解中", color: "processing" },
  { value: "in_progress", label: "办理中", color: "processing" },
  { value: "escalated", label: "上级督办", color: "warning" },
  { value: "overdue", label: "已超时", color: "error" },
  { value: "completed", label: "已办结", color: "success" },
];

export const SOURCES = [
  { value: "online", label: "线上提交" },
  { value: "window", label: "窗口代录" },
  { value: "hotline", label: "热线电话" },
];

export const PRIORITIES = [
  { value: "low", label: "低", color: "default" },
  { value: "normal", label: "正常", color: "blue" },
  { value: "high", label: "高", color: "orange" },
  { value: "urgent", label: "紧急", color: "red" },
];

export const RESOLUTION_CHANNELS = [
  { value: "mediation", label: "就地调解", days: 3 },
  { value: "cross_department", label: "跨部门协同", days: 7 },
  { value: "escalated", label: "上报督办", days: 15 },
];

export const ROLES = [
  { value: "city_admin", label: "市级管理者", icon: "👑" },
  { value: "district_center", label: "区县中心", icon: "🏛️" },
  { value: "department", label: "进驻部门", icon: "🏢" },
  { value: "citizen", label: "人民群众", icon: "👤" },
];

export const FLOW_ACTIONS = {
  create: { label: "诉求提交", color: "blue" },
  assign: { label: "分配处理", color: "blue" },
  progress: { label: "更新进展", color: "processing" },
  coordinate: { label: "跨部门协同", color: "purple" },
  escalate: { label: "上报督办", color: "warning" },
  complete: { label: "事项办结", color: "success" },
  rate: { label: "满意度评价", color: "cyan" },
  rework: { label: "回流整改", color: "warning" },
  warn_overdue: { label: "超时预警", color: "error" },
};

export const getTypeLabel = (value) =>
  APPEAL_TYPES.find((t) => t.value === value)?.label || value;
export const getStatusLabel = (value) =>
  APPEAL_STATUSES.find((s) => s.value === value)?.label || value;
export const getStatusColor = (value) =>
  APPEAL_STATUSES.find((s) => s.value === value)?.color || "default";
export const getSourceLabel = (value) =>
  SOURCES.find((s) => s.value === value)?.label || value;
export const getPriorityLabel = (value) =>
  PRIORITIES.find((p) => p.value === value)?.label || value;
export const getPriorityColor = (value) =>
  PRIORITIES.find((p) => p.value === value)?.color || "default";
export const getChannelLabel = (value) =>
  RESOLUTION_CHANNELS.find((c) => c.value === value)?.label || value;
export const getRoleLabel = (value) =>
  ROLES.find((r) => r.value === value)?.label || value;
export const getActionLabel = (value) => FLOW_ACTIONS[value]?.label || value;
export const getActionColor = (value) =>
  FLOW_ACTIONS[value]?.color || "default";

export const SUPERVISION_STATUSES = [
  { value: "pending_accept", label: "待签收", color: "warning" },
  { value: "in_progress", label: "办理中", color: "processing" },
  { value: "pending_verify", label: "待核销", color: "orange" },
  { value: "verified", label: "已核销", color: "success" },
];

export const SUPERVISION_TYPES = [
  { value: "overdue", label: "超时督办", icon: "⏰" },
  { value: "backlog", label: "积压督办", icon: "📚" },
  { value: "slow_resolution", label: "化解慢督办", icon: "🐢" },
  { value: "special", label: "专项督办", icon: "🎯" },
];

export const SUPERVISION_LEVELS = [
  { value: "normal", label: "普通", color: "blue" },
  { value: "high", label: "重点", color: "orange" },
  { value: "urgent", label: "紧急", color: "red" },
];

export const SUPERVISION_ACTIONS = {
  issue: { label: "下达督办", color: "blue" },
  accept: { label: "签收督办", color: "blue" },
  progress: { label: "更新进展", color: "processing" },
  complete: { label: "申请核销", color: "cyan" },
  verify: { label: "核销通过", color: "success" },
  reject: { label: "核销驳回", color: "warning" },
  escalate: { label: "升级催办", color: "error" },
};

export const SUGGESTION_TYPES = [
  { value: "overdue", label: "超时预警" },
  { value: "backlog", label: "积压预警" },
  { value: "slow_resolution", label: "化解慢预警" },
];

export const SUGGESTION_SEVERITIES = [
  { value: "low", label: "一般", color: "blue" },
  { value: "medium", label: "较重", color: "orange" },
  { value: "high", label: "严重", color: "red" },
];

export const SUGGESTION_STATUSES = [
  { value: "pending", label: "待处理", color: "warning" },
  { value: "processed", label: "已督办", color: "success" },
  { value: "ignored", label: "已忽略", color: "default" },
];

export const getSupervisionStatusLabel = (value) =>
  SUPERVISION_STATUSES.find((s) => s.value === value)?.label || value;
export const getSupervisionStatusColor = (value) =>
  SUPERVISION_STATUSES.find((s) => s.value === value)?.color || "default";
export const getSupervisionTypeLabel = (value) =>
  SUPERVISION_TYPES.find((t) => t.value === value)?.label || value;
export const getSupervisionTypeIcon = (value) =>
  SUPERVISION_TYPES.find((t) => t.value === value)?.icon || "📋";
export const getSupervisionLevelLabel = (value) =>
  SUPERVISION_LEVELS.find((l) => l.value === value)?.label || value;
export const getSupervisionLevelColor = (value) =>
  SUPERVISION_LEVELS.find((l) => l.value === value)?.color || "default";
export const getSupervisionActionLabel = (value) =>
  SUPERVISION_ACTIONS[value]?.label || value;
export const getSupervisionActionColor = (value) =>
  SUPERVISION_ACTIONS[value]?.color || "default";
export const getSuggestionTypeLabel = (value) =>
  SUGGESTION_TYPES.find((t) => t.value === value)?.label || value;
export const getSuggestionSeverityLabel = (value) =>
  SUGGESTION_SEVERITIES.find((s) => s.value === value)?.label || value;
export const getSuggestionSeverityColor = (value) =>
  SUGGESTION_SEVERITIES.find((s) => s.value === value)?.color || "default";
export const getSuggestionStatusLabel = (value) =>
  SUGGESTION_STATUSES.find((s) => s.value === value)?.label || value;
export const getSuggestionStatusColor = (value) =>
  SUGGESTION_STATUSES.find((s) => s.value === value)?.color || "default";
