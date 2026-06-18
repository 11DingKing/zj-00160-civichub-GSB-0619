import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Select,
  DatePicker,
  Space,
  Statistic,
  Progress,
  Typography,
} from "antd";
import {
  RiseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  FlagOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import dayjs from "dayjs";
import api from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getTypeLabel,
  getChannelLabel,
  getSupervisionTypeLabel,
  getSupervisionLevelColor,
} from "../utils/constants.js";

const { Title } = Typography;
const { RangePicker } = DatePicker;

function Statistics() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [byDistrict, setByDistrict] = useState([]);
  const [byType, setByType] = useState([]);
  const [trend, setTrend] = useState([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, byDistrictRes, byTypeRes, trendRes] =
        await Promise.all([
          api.get("/stats/overview"),
          hasRole("city_admin") ? api.get("/stats/by-district") : { data: [] },
          api.get("/stats/by-type"),
          api.get("/stats/trend", { params: { days } }),
        ]);
      setOverview(overviewRes.data);
      setByDistrict(byDistrictRes.data);
      setByType(byTypeRes.data);
      setTrend(trendRes.data);
    } catch (error) {
      console.error("Load statistics failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendChartOption = () => ({
    tooltip: { trigger: "axis" },
    legend: { data: ["新增诉求", "办结诉求"], bottom: 0 },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "10%" },
    xAxis: {
      type: "category",
      data: trend.map((t) => t.date.substring(5)),
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "新增诉求",
        type: "bar",
        data: trend.map((t) => t.new),
        itemStyle: { color: "#1677ff" },
        barWidth: "35%",
      },
      {
        name: "办结诉求",
        type: "bar",
        data: trend.map((t) => t.completed),
        itemStyle: { color: "#52c41a" },
        barWidth: "35%",
      },
    ],
  });

  const getChannelPieOption = () => {
    if (!overview) return {};
    const data = [
      { value: overview.resolution_channels.mediation, name: "就地调解" },
      {
        value: overview.resolution_channels.cross_department,
        name: "跨部门协同",
      },
      { value: overview.resolution_channels.escalated, name: "上级督办" },
    ];
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c}件 ({d}%)" },
      legend: { orient: "vertical", left: "left" },
      series: [
        {
          type: "pie",
          radius: ["45%", "75%"],
          center: ["60%", "50%"],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: "bold" },
          },
          data,
          color: ["#52c41a", "#1677ff", "#faad14"],
        },
      ],
    };
  };

  const getTypeBarOption = () => ({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const item = params[0];
        const type = byType.find((t) => getTypeLabel(t.type) === item.name);
        return `${item.name}<br/>总量: ${item.value}件<br/>已办结: ${type?.completed || 0}件`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: byType.slice(0, 10).map((t) => getTypeLabel(t.type)),
    },
    series: [
      {
        type: "bar",
        data: byType.slice(0, 10).map((t) => t.count),
        itemStyle: {
          color: (params) => {
            const colors = [
              "#1677ff",
              "#52c41a",
              "#faad14",
              "#722ed1",
              "#13c2c2",
              "#eb2f96",
              "#fa8c16",
              "#2f54eb",
              "#a0d911",
              "#f5222d",
            ];
            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: "right",
          formatter: "{c}件",
        },
      },
    ],
  });

  const districtColumns = [
    {
      title: "区县",
      dataIndex: "name",
      key: "name",
      width: 120,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "诉求总量",
      dataIndex: "total",
      key: "total",
      width: 100,
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: "已办结",
      dataIndex: "completed",
      key: "completed",
      width: 100,
      sorter: (a, b) => a.completed - b.completed,
    },
    {
      title: "办理中",
      dataIndex: "active",
      key: "active",
      width: 100,
      render: (v) => <Tag color="processing">{v}</Tag>,
    },
    {
      title: "已超时",
      dataIndex: "overdue",
      key: "overdue",
      width: 100,
      render: (v) =>
        v > 0 ? (
          <Tag color="error">{v}</Tag>
        ) : (
          <span style={{ color: "#bfbfbf" }}>0</span>
        ),
    },
    {
      title: "化解率",
      key: "completion_rate",
      width: 180,
      render: (_, record) => (
        <Space>
          <Progress percent={record.completion_rate} size="small" width={80} />
          <span
            style={{
              color:
                record.completion_rate >= 80
                  ? "#52c41a"
                  : record.completion_rate >= 60
                    ? "#faad14"
                    : "#ff4d4f",
            }}
          >
            {record.completion_rate}%
          </span>
        </Space>
      ),
      sorter: (a, b) => a.completion_rate - b.completion_rate,
    },
    {
      title: "平均办理时长",
      dataIndex: "avg_days",
      key: "avg_days",
      width: 120,
      render: (v) => (v ? `${v} 天` : "-"),
      sorter: (a, b) => (a.avg_days || 0) - (b.avg_days || 0),
    },
    {
      title: "平均满意度",
      dataIndex: "avg_satisfaction",
      key: "avg_satisfaction",
      width: 120,
      render: (v) =>
        v ? (
          <Space>
            <span style={{ color: "#faad14" }}>★</span>
            <span>{v.toFixed(1)}</span>
          </Space>
        ) : (
          "-"
        ),
      sorter: (a, b) => (a.avg_satisfaction || 0) - (b.avg_satisfaction || 0),
    },
  ];

  return (
    <div className="page-container">
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <BarChartOutlined /> 统计分析
        </Title>
        <Space>
          <Select
            value={days}
            onChange={setDays}
            style={{ width: 140 }}
            options={[
              { label: "最近7天", value: 7 },
              { label: "最近15天", value: 15 },
              { label: "最近30天", value: 30 },
              { label: "最近90天", value: 90 },
            ]}
          />
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title={
                <Space>
                  <RiseOutlined /> 诉求受理总量
                </Space>
              }
              value={overview?.total || 0}
              suffix="件"
              valueStyle={{ color: "#1677ff" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              近{days}天新增 {overview?.last_30_days_new || 0} 件
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title={
                <Space>
                  <CheckCircleOutlined /> 已办结总量
                </Space>
              }
              value={overview?.completed || 0}
              suffix="件"
              valueStyle={{ color: "#52c41a" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              化解率 {overview?.completion_rate || 0}%
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title={
                <Space>
                  <ClockCircleOutlined /> 平均办理时长
                </Space>
              }
              value={overview?.avg_resolution_days || 0}
              suffix="天"
              valueStyle={{ color: "#722ed1" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              近{days}天办结 {overview?.last_30_days_completed || 0} 件
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title={
                <Space>
                  <TeamOutlined /> 群众满意度
                </Space>
              }
              value={overview?.avg_satisfaction || 0}
              suffix="分"
              precision={1}
              valueStyle={{ color: "#faad14" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              需整改 {overview?.rework_count || 0} 件
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card title={`近${days}天诉求趋势`} className="card-shadow">
            <ReactECharts
              option={getTrendChartOption()}
              style={{ height: 350 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="化解渠道分布" className="card-shadow">
            <ReactECharts
              option={getChannelPieOption()}
              style={{ height: 350 }}
            />
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#fafafa",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ color: "#8c8c8c" }}>就地调解</span>
                <span>{overview?.resolution_channels?.mediation || 0} 件</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ color: "#8c8c8c" }}>跨部门协同</span>
                <span>
                  {overview?.resolution_channels?.cross_department || 0} 件
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8c8c8c" }}>上级督办</span>
                <span>{overview?.resolution_channels?.escalated || 0} 件</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="诉求类型分布 TOP10" className="card-shadow">
            <ReactECharts option={getTypeBarOption()} style={{ height: 400 }} />
          </Card>
        </Col>
      </Row>

      {hasRole("city_admin") && (
        <Card
          title="各区县工作统计"
          className="card-shadow"
          extra={
            <span style={{ color: "#8c8c8c" }}>
              共 {byDistrict.length} 个区县中心
            </span>
          }
        >
          <Table
            columns={districtColumns}
            dataSource={byDistrict}
            rowKey="id"
            loading={loading}
            pagination={false}
            bordered
          />
        </Card>
      )}
    </div>
  );
}

export default Statistics;
