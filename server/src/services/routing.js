"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingService = void 0;
var RESOLUTION_CHANNELS = {
  MEDIATION: "mediation",
  CROSS_DEPARTMENT: "cross_department",
  ESCALATED: "escalated"
};
var CHANNEL_CONFIG = {
  mediation: {
    label: "就地调解",
    status: "mediating",
    deadlineDays: 3,
    description: "案情简单、邻里纠纷，人民调解委员会办理"
  },
  cross_department: {
    label: "跨部门协同",
    status: "in_progress",
    deadlineDays: 7,
    description: "涉及多部门、需协同，主责部门牵头办理"
  },
  escalated: {
    label: "上报督办",
    status: "escalated",
    deadlineDays: 15,
    description: "案情复杂、重大敏感，市级督办"
  }
};
var TYPE_TO_CHANNEL_RULES = [
  {
    types: ["邻里纠纷", "婚姻家庭", "小额消费", "物业_简单"],
    channel: RESOLUTION_CHANNELS.MEDIATION,
    priority: 3
  },
  {
    types: ["物业管理", "劳动社保", "基础设施", "环境卫生"],
    channel: RESOLUTION_CHANNELS.CROSS_DEPARTMENT,
    priority: 2
  },
  {
    types: ["群体性事件", "重大敏感", "涉法涉诉", "历史遗留"],
    channel: RESOLUTION_CHANNELS.ESCALATED,
    priority: 1
  }
];
function getChannelConfig(channel) {
  return CHANNEL_CONFIG[channel] || null;
}
function getChannelLabel(channel) {
  var config = getChannelConfig(channel);
  return config ? config.label : channel;
}
function getDeadlineDays(channel) {
  var config = getChannelConfig(channel);
  return config ? config.deadlineDays : 7;
}
function getTargetStatus(channel) {
  var config = getChannelConfig(channel);
  return config ? config.status : "in_progress";
}
function calculateDeadline(channel, fromDate) {
  if (fromDate === void 0) {
    fromDate = new Date();
  }
  var days = getDeadlineDays(channel);
  var deadline = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    deadline: deadline,
    deadlineISO: deadline.toISOString(),
    days: days
  };
}
function suggestChannelByType(appealType) {
  if (!appealType) {
    return {
      channel: RESOLUTION_CHANNELS.CROSS_DEPARTMENT,
      confidence: 0.5,
      reason: "未指定类型，默认跨部门协同"
    };
  }
  var matchedRule = TYPE_TO_CHANNEL_RULES.find(function (rule) {
    return rule.types.includes(appealType);
  });
  if (matchedRule) {
    return {
      channel: matchedRule.channel,
      confidence: 0.9,
      reason: "类型\"".concat(appealType, "\"匹配分流规则")
    };
  }
  return {
    channel: RESOLUTION_CHANNELS.CROSS_DEPARTMENT,
    confidence: 0.6,
    reason: "类型\"".concat(appealType, "\"无匹配规则，默认跨部门协同")
  };
}
function suggestChannelByPriority(priority) {
  if (priority === "urgent" || priority === "high") {
    return {
      channel: RESOLUTION_CHANNELS.CROSS_DEPARTMENT,
      confidence: 0.7,
      reason: "高优先级事项建议跨部门协同办理"
    };
  }
  return {
    channel: RESOLUTION_CHANNELS.MEDIATION,
    confidence: 0.5,
    reason: "普通优先级可先行调解"
  };
}
function buildAssignmentParams(channel, departmentId, handlerId) {
  var config = getChannelConfig(channel);
  if (!config) {
    throw new Error("无效的化解渠道: ".concat(channel));
  }
  var deadlineInfo = calculateDeadline(channel);
  return {
    status: config.status,
    resolution_channel: channel,
    current_department_id: departmentId,
    current_handler_id: handlerId || null,
    expected_deadline: deadlineInfo.deadlineISO,
    deadline_days: deadlineInfo.days,
    channel_label: config.label
  };
}
function buildEscalationParams(comment) {
  return {
    status: "escalated",
    resolution_channel: "escalated",
    current_handler_id: "usr_001",
    comment: comment || "案情复杂，已上报市级督办",
    action: "escalate"
  };
}
function buildFlowComment(channel, deptName) {
  var label = getChannelLabel(channel);
  return "已分配至".concat(deptName, "\uFF0C\u5316\u89E3\u6E20\u9053\uFF1A").concat(label);
}
exports.RoutingService = {
  CHANNELS: RESOLUTION_CHANNELS,
  CHANNEL_CONFIG: CHANNEL_CONFIG,
  TYPE_TO_CHANNEL_RULES: TYPE_TO_CHANNEL_RULES,
  getChannelConfig: getChannelConfig,
  getChannelLabel: getChannelLabel,
  getDeadlineDays: getDeadlineDays,
  getTargetStatus: getTargetStatus,
  calculateDeadline: calculateDeadline,
  suggestChannelByType: suggestChannelByType,
  suggestChannelByPriority: suggestChannelByPriority,
  buildAssignmentParams: buildAssignmentParams,
  buildEscalationParams: buildEscalationParams,
  buildFlowComment: buildFlowComment
};
