import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Tag, Progress, Space, Button } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getStatusLabel,
  getStatusColor,
  getTypeLabel,
  getPriorityLabel,
  getPriorityColor,
  getChannelLabel,
} from '../utils/constants.js'
import dayjs from 'dayjs'

function StatCard({ title, value, sub, icon, color = 'blue', onClick }) {
  return (
    <div className={`stat-card ${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="title">{title}</div>
          <div className="value">{value}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <div style={{ fontSize: 40, opacity: 0.3 }}>{icon}</div>
      </div>
    </div>
  )
}

function DistrictCard({ district, onClick }) {
  return (
    <div className="district-card" onClick={onClick}>
      <div className="district-header">
        <div className="district-name">{district.name}</div>
        {district.overdue_count > 0 && (
          <span className="badge-overdue">⚠️ {district.overdue_count}件超时</span>
        )}
      </div>
      <div className="district-stats">
        <div className="stat-item">
          <div className="num">{district.appeal_count}</div>
          <div className="label">诉求总量</div>
        </div>
        <div className="stat-item">
          <div className="num" style={{ color: '#52c41a' }}>{district.completed_count}</div>
          <div className="label">已办结</div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>化解率</span>
        <span style={{ color: '#1677ff', fontWeight: 500 }}>{district.completion_rate}%</span>
      </div>
      <div className="progress-bar">
        <div className="fill" style={{ width: `${district.completion_rate}%` }}></div>
      </div>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const [overview, setOverview] = useState(null)
  const [districts, setDistricts] = useState([])
  const [byDistrict, setByDistrict] = useState([])
  const [trend, setTrend] = useState([])
  const [byType, setByType] = useState([])
  const [recentAppeals, setRecentAppeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [overviewRes, districtsRes, byDistrictRes, trendRes, byTypeRes] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/districts'),
        hasRole('city_admin') ? api.get('/stats/by-district') : { data: [] },
        api.get('/stats/trend', { params: { days: 15 } }),
        api.get('/stats/by-type'),
      ])
      setOverview(overviewRes.data)
      setDistricts(districtsRes.data)
      setByDistrict(byDistrictRes.data)
      setTrend(trendRes.data)
      setByType(byTypeRes.data)

      const appealsRes = await api.get('/appeals', { params: { page_size: 10 } })
      setRecentAppeals(appealsRes.data.data)
    } catch (error) {
      console.error('Load dashboard data failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendChartOption = () => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增诉求', '办结诉求'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%' },
    xAxis: {
      type: 'category',
      data: trend.map(t => t.date.substring(5)),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '新增诉求',
        type: 'line',
        smooth: true,
        data: trend.map(t => t.new),
        lineStyle: { color: '#1677ff' },
        areaStyle: { color: 'rgba(22, 119, 255, 0.1)' },
      },
      {
        name: '办结诉求',
        type: 'line',
        smooth: true,
        data: trend.map(t => t.completed),
        lineStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82, 196, 26, 0.1)' },
      },
    ],
  })

  const getChannelChartOption = () => {
    if (!overview) return {}
    const data = [
      { value: overview.resolution_channels.mediation, name: '就地调解' },
      { value: overview.resolution_channels.cross_department, name: '跨部门协同' },
      { value: overview.resolution_channels.escalated, name: '上级督办' },
    ]
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: true, formatter: '{b}: {c}件 ({d}%)' },
        data,
        color: ['#52c41a', '#1677ff', '#faad14'],
      }],
    }
  }

  const getTypeChartOption = () => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: byType.slice(0, 8).map(t => getTypeLabel(t.type)),
    },
    series: [{
      type: 'bar',
      data: byType.slice(0, 8).map(t => t.count),
      itemStyle: {
        color: (params) => {
          const colors = ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb']
          return colors[params.dataIndex % colors.length]
        },
        borderRadius: [0, 4, 4, 0],
      },
    }],
  })

  const appealColumns = [
    {
      title: '诉求标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/appeals/${record.id}`)} style={{ color: '#262626' }}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t) => getTypeLabel(t),
    },
    {
      title: '所属区县',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 100,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p) => <Tag color={getPriorityColor(p)}>{getPriorityLabel(p)}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>,
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
  ]

  if (hasRole('citizen')) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
          欢迎回来，{user?.name}
        </div>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <StatCard
              title="我的诉求"
              value={overview?.total || 0}
              icon={<FileTextOutlined />}
              color="blue"
              onClick={() => navigate('/appeals')}
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="办理中"
              value={overview?.in_progress || 0}
              icon={<ClockCircleOutlined />}
              color="orange"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="已办结"
              value={overview?.completed || 0}
              icon={<CheckCircleOutlined />}
              color="green"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="平均满意度"
              value={`${overview?.avg_satisfaction || 0}分`}
              icon={<RiseOutlined />}
              color=""
            />
          </Col>
        </Row>

        <Card title="我的诉求" style={{ marginTop: 24 }} extra={
          <Button type="primary" onClick={() => navigate('/my-appeals')}>
            <PlusOutlined /> 提交新诉求
          </Button>
        }>
          <Table
            columns={appealColumns.filter(c => c.key !== 'district_name')}
            dataSource={recentAppeals}
            rowKey="id"
            pagination={false}
            loading={loading}
          />
        </Card>
      </div>
    )
  }

  if (hasRole('department')) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
          {user?.name}，欢迎
        </div>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <StatCard
              title="待办诉求"
              value={overview?.pending || 0}
              icon={<FileTextOutlined />}
              color="blue"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="办理中"
              value={overview?.in_progress || 0}
              icon={<ClockCircleOutlined />}
              color="orange"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="已办结"
              value={overview?.completed || 0}
              icon={<CheckCircleOutlined />}
              color="green"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="已超时"
              value={overview?.overdue || 0}
              icon={<WarningOutlined />}
              color="red"
              onClick={() => navigate('/appeals?status=overdue')}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={16}>
            <Card title="近15天诉求趋势" className="card-shadow">
              <ReactECharts option={getTrendChartOption()} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="化解渠道占比" className="card-shadow">
              <ReactECharts option={getChannelChartOption()} style={{ height: 300 }} />
            </Card>
          </Col>
        </Row>

        <Card
          title="待办事项"
          style={{ marginTop: 24 }}
          extra={<Button onClick={() => navigate('/appeals?status=in_progress')}>查看全部 <RightOutlined /></Button>}
        >
          <Table
            columns={appealColumns}
            dataSource={recentAppeals.filter(a => a.status === 'in_progress' || a.status === 'mediating')}
            rowKey="id"
            pagination={false}
            loading={loading}
          />
        </Card>
      </div>
    )
  }

  if (hasRole('district_center')) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
          {user?.name} - 区县级综治中心
        </div>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <StatCard
              title="诉求总量"
              value={overview?.total || 0}
              sub={`近30天新增 ${overview?.last_30_days_new || 0} 件`}
              icon={<FileTextOutlined />}
              color="blue"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="待分配"
              value={overview?.pending || 0}
              icon={<ThunderboltOutlined />}
              color="orange"
              onClick={() => navigate('/appeals?status=pending')}
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="已办结"
              value={overview?.completed || 0}
              sub={`化解率 ${overview?.completion_rate || 0}%`}
              icon={<CheckCircleOutlined />}
              color="green"
            />
          </Col>
          <Col span={6}>
            <StatCard
              title="超时预警"
              value={overview?.overdue || 0}
              icon={<ExclamationCircleOutlined />}
              color="red"
              onClick={() => navigate('/appeals?status=overdue')}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Card className="card-shadow" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>平均办理时长</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: '#1677ff' }}>
                {overview?.avg_resolution_days || 0} 天
              </div>
              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                <ArrowUpOutlined /> 较上月提升 12%
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="card-shadow" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>平均满意度</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: '#52c41a' }}>
                {overview?.avg_satisfaction || 0} 分
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                基于 {overview?.completed || 0} 件评价
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="card-shadow" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>跨部门协同</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: '#722ed1' }}>
                {overview?.resolution_channels?.cross_department || 0} 件
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                占比 {overview?.total ? ((overview.resolution_channels?.cross_department / overview.total) * 100).toFixed(1) : 0}%
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="card-shadow" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>回流整改</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: '#faad14' }}>
                {overview?.rework_count || 0} 件
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                差评自动回流
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="近15天诉求趋势" className="card-shadow">
              <ReactECharts option={getTrendChartOption()} style={{ height: 320 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="诉求类型分布" className="card-shadow">
              <ReactECharts option={getTypeChartOption()} style={{ height: 320 }} />
            </Card>
          </Col>
        </Row>

        <Card
          title="最新诉求"
          style={{ marginTop: 24 }}
          extra={
            <Space>
              <Button onClick={() => navigate('/appeals/create')} type="primary">
                窗口代录
              </Button>
              <Button onClick={() => navigate('/appeals')}>查看全部 <RightOutlined /></Button>
            </Space>
          }
        >
          <Table
            columns={appealColumns}
            dataSource={recentAppeals}
            rowKey="id"
            pagination={false}
            loading={loading}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
        鸡西市市域社会治理综合平台 - 市级总览
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatCard
            title="诉求总量"
            value={overview?.total || 0}
            sub={`近30天新增 ${overview?.last_30_days_new || 0} 件`}
            icon={<FileTextOutlined />}
            color="blue"
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="办理中"
            value={overview?.in_progress || 0}
            icon={<ClockCircleOutlined />}
            color="orange"
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="已办结"
            value={overview?.completed || 0}
            sub={`化解率 ${overview?.completion_rate || 0}%`}
            icon={<CheckCircleOutlined />}
            color="green"
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="超时预警"
            value={overview?.overdue || 0}
            icon={<WarningOutlined />}
            color="red"
            onClick={() => navigate('/appeals?status=overdue')}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card className="card-shadow" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>平均办理时长</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#1677ff' }}>
              {overview?.avg_resolution_days || 0} 天
            </div>
            <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
              目标：7天内
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>群众满意度</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#52c41a' }}>
              {overview?.avg_satisfaction || 0} 分
            </div>
            <Progress percent={(overview?.avg_satisfaction / 5 * 100) || 0} showInfo={false} size="small" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>跨部门协同</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#722ed1' }}>
              {overview?.resolution_channels?.cross_department || 0} 件
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              <TeamOutlined /> 多部门联动
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>上级督办</div>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#faad14' }}>
              {overview?.resolution_channels?.escalated || 0} 件
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              疑难复杂案件
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="各区县综治中心"
        style={{ marginTop: 24 }}
        className="card-shadow"
      >
        <Row gutter={[16, 16]}>
          {districts.map(d => (
            <Col span={8} key={d.id}>
              <DistrictCard district={d} onClick={() => navigate(`/appeals?district_id=${d.id}`)} />
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="近15天诉求趋势" className="card-shadow">
            <ReactECharts option={getTrendChartOption()} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="化解渠道占比" className="card-shadow">
            <ReactECharts option={getChannelChartOption()} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="最新诉求"
        style={{ marginTop: 24 }}
        extra={<Button onClick={() => navigate('/appeals')}>查看全部 <RightOutlined /></Button>}
      >
        <Table
          columns={appealColumns}
          dataSource={recentAppeals}
          rowKey="id"
          pagination={false}
          loading={loading}
        />
      </Card>
    </div>
  )
}

export default Dashboard
