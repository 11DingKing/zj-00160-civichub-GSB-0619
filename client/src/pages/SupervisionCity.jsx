import React, { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  Transfer,
  message,
  Tabs,
  List,
  Typography,
  Divider,
  Progress,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  FlagOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  EyeOutlined,
  UpCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../utils/api.js'
import {
  getSupervisionStatusLabel,
  getSupervisionStatusColor,
  getSupervisionTypeLabel,
  getSupervisionTypeIcon,
  getSupervisionLevelLabel,
  getSupervisionLevelColor,
  getSuggestionTypeLabel,
  getSuggestionSeverityLabel,
  getSuggestionSeverityColor,
  SUPERVISION_TYPES,
  SUPERVISION_LEVELS,
  SUPERVISION_STATUSES,
} from '../utils/constants.js'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { RangePicker } = DatePicker

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

function SupervisionCity() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [supervisions, setSupervisions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState()
  const [typeFilter, setTypeFilter] = useState()
  const [levelFilter, setLevelFilter] = useState()
  const [districtFilter, setDistrictFilter] = useState()
  const [districts, setDistricts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [escalateModalVisible, setEscalateModalVisible] = useState(false)
  const [selectedSupervision, setSelectedSupervision] = useState(null)
  const [appeals, setAppeals] = useState([])
  const [selectedAppeals, setSelectedAppeals] = useState([])
  const [targetKeys, setTargetKeys] = useState([])
  const [createForm] = Form.useForm()
  const [escalateForm] = Form.useForm()

  useEffect(() => {
    loadData()
    loadDistricts()
  }, [])

  useEffect(() => {
    loadSupervisions()
  }, [page, pageSize, statusFilter, typeFilter, levelFilter, districtFilter])

  const loadData = async () => {
    try {
      const [statsRes, suggestionsRes] = await Promise.all([
        api.get('/supervisions/stats'),
        api.get('/supervisions/suggestions/list', { params: { status: 'pending' } }),
      ])
      setStats(statsRes.data)
      setSuggestions(suggestionsRes.data)
    } catch (error) {
      message.error('加载数据失败')
    }
  }

  const loadDistricts = async () => {
    try {
      const res = await api.get('/districts')
      setDistricts(res.data)
    } catch (error) {
      message.error('加载区县数据失败')
    }
  }

  const loadSupervisions = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
      }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (levelFilter) params.level = levelFilter
      if (districtFilter) params.district_id = districtFilter
      const res = await api.get('/supervisions', { params })
      setSupervisions(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      message.error('加载督办单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAppeals = async (districtId) => {
    try {
      const res = await api.get('/appeals', {
        params: {
          district_id: districtId,
          status: 'pending,in_progress,mediating,overdue,escalated',
          page_size: 50,
        },
      })
      setAppeals(res.data.data)
    } catch (error) {
      message.error('加载诉求列表失败')
    }
  }

  const handleDistrictChange = (districtId) => {
    loadAppeals(districtId)
    setTargetKeys([])
  }

  const handleCreate = async (values) => {
    try {
      const deadline = values.deadline.toISOString()
      const appealIds = targetKeys
      const res = await api.post('/supervisions', {
        ...values,
        deadline,
        appeal_ids: appealIds,
      })
      message.success('督办单创建成功')
      setCreateModalVisible(false)
      createForm.resetFields()
      setTargetKeys([])
      setAppeals([])
      loadData()
      loadSupervisions()
      navigate(`/supervision/${res.data.id}`)
    } catch (error) {
      message.error(error.response?.data?.error || '创建失败')
    }
  }

  const handleEscalate = async (values) => {
    try {
      await api.put(`/supervisions/${selectedSupervision.id}/escalate`, {
        comment: values.comment,
      })
      message.success('升级催办成功')
      setEscalateModalVisible(false)
      escalateForm.resetFields()
      setSelectedSupervision(null)
      loadData()
      loadSupervisions()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleProcessSuggestion = async (suggestion, action) => {
    try {
      if (action === 'create_supervision') {
        const district = districts.find(d => d.id === suggestion.district_id)
        createForm.setFieldsValue({
          title: `${getSuggestionTypeLabel(suggestion.reason_type)}督办`,
          description: suggestion.reason,
          type: suggestion.reason_type,
          level: suggestion.severity === 'high' ? 'high' : 'normal',
          district_id: suggestion.district_id,
        })
        handleDistrictChange(suggestion.district_id)
        if (suggestion.appeal_ids) {
          setTargetKeys(suggestion.appeal_ids.split(','))
        }
        setCreateModalVisible(true)
        await api.post(`/supervisions/suggestions/${suggestion.id}/process`, {
          action: 'ignore',
        })
      } else {
        await api.post(`/supervisions/suggestions/${suggestion.id}/process`, {
          action,
        })
        message.success('操作成功')
      }
      loadData()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleRefreshSuggestions = async () => {
    try {
      const res = await api.post('/supervisions/suggestions/refresh')
      message.success(`刷新成功，新增 ${res.data.new_suggestions} 条建议`)
      loadData()
    } catch (error) {
      message.error('刷新失败')
    }
  }

  const isOverdue = (deadline, status) => {
    if (['verified', 'pending_verify'].includes(status)) return false
    return dayjs(deadline).isBefore(dayjs())
  }

  const columns = [
    {
      title: '督办单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 140,
      render: (text, record) => (
        <a onClick={() => navigate(`/supervision/${record.id}`)} style={{ color: '#1677ff' }}>{text}</a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t) => (
        <span>
          {getSupervisionTypeIcon(t)} {getSupervisionTypeLabel(t)}
        </span>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (l) => <Tag color={getSupervisionLevelColor(l)}>{getSupervisionLevelLabel(l)}</Tag>,
    },
    {
      title: '所属区县',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 100,
    },
    {
      title: '关联事项',
      dataIndex: 'appeal_count',
      key: 'appeal_count',
      width: 80,
      render: (c) => `${c} 件`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s, record) => (
        <Space>
          <Tag color={getSupervisionStatusColor(s)}>{getSupervisionStatusLabel(s)}</Tag>
          {isOverdue(record.deadline, s) && <Tag color="red">已逾期</Tag>}
          {record.escalated_count > 0 && <Tag color="orange">已催办{record.escalated_count}次</Tag>}
        </Space>
      ),
    },
    {
      title: '整改时限',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 160,
      render: (d) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/supervision/${record.id}`)}>
            查看
          </Button>
          {['pending_accept', 'in_progress', 'pending_verify'].includes(record.status) && (
            <Button
              type="link"
              size="small"
              danger
              icon={<UpCircleOutlined />}
              onClick={() => {
                setSelectedSupervision(record)
                setEscalateModalVisible(true)
              }}
            >
              催办
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const districtColumns = [
    {
      title: '区县',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '督办总数',
      dataIndex: 'total',
      key: 'total',
      width: 100,
    },
    {
      title: '已核销',
      dataIndex: 'verified',
      key: 'verified',
      width: 100,
    },
    {
      title: '进行中',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (v) => <Tag color="processing">{v}</Tag>,
    },
    {
      title: '核销率',
      key: 'rate',
      width: 200,
      render: (_, record) => (
        <Space>
          <Progress percent={record.verification_rate} size="small" width={80} />
          <span style={{ color: record.verification_rate >= 80 ? '#52c41a' : record.verification_rate >= 50 ? '#faad14' : '#ff4d4f' }}>
            {record.verification_rate}%
          </span>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          <FlagOutlined /> 督办管理（市级下达端）
        </Title>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateModalVisible(true)}>
            下达督办单
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <StatCard
            title="督办单总数"
            value={stats?.total || 0}
            icon={<FlagOutlined />}
            color="blue"
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="待签收"
            value={stats?.pending_accept || 0}
            icon={<PlayCircleOutlined />}
            color="orange"
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="办理中"
            value={stats?.in_progress || 0}
            icon={<ClockCircleOutlined />}
            color="processing"
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="待核销"
            value={stats?.pending_verify || 0}
            icon={<StopOutlined />}
            color="warning"
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="已核销"
            value={stats?.verified || 0}
            sub={`核销率 ${stats?.verification_rate || 0}%`}
            icon={<CheckCircleOutlined />}
            color="green"
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="已逾期"
            value={stats?.overdue || 0}
            sub={`已催办 ${stats?.escalated || 0} 次`}
            icon={<ExclamationCircleOutlined />}
            color="red"
          />
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: 'list',
            label: '督办单列表',
            children: (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Space wrap>
                    <Text type="secondary">筛选：</Text>
                    <Select
                      placeholder="状态"
                      style={{ width: 120 }}
                      allowClear
                      value={statusFilter}
                      onChange={setStatusFilter}
                    >
                      {SUPERVISION_STATUSES.map(s => (
                        <Option key={s.value} value={s.value}>{s.label}</Option>
                      ))}
                    </Select>
                    <Select
                      placeholder="类型"
                      style={{ width: 120 }}
                      allowClear
                      value={typeFilter}
                      onChange={setTypeFilter}
                    >
                      {SUPERVISION_TYPES.map(t => (
                        <Option key={t.value} value={t.value}>{t.icon} {t.label}</Option>
                      ))}
                    </Select>
                    <Select
                      placeholder="级别"
                      style={{ width: 100 }}
                      allowClear
                      value={levelFilter}
                      onChange={setLevelFilter}
                    >
                      {SUPERVISION_LEVELS.map(l => (
                        <Option key={l.value} value={l.value}>{l.label}</Option>
                      ))}
                    </Select>
                    <Select
                      placeholder="区县"
                      style={{ width: 140 }}
                      allowClear
                      value={districtFilter}
                      onChange={setDistrictFilter}
                    >
                      {districts.map(d => (
                        <Option key={d.id} value={d.id}>{d.name}</Option>
                      ))}
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={loadSupervisions}>刷新</Button>
                  </Space>
                </Card>

                <Card>
                  <Table
                    columns={columns}
                    dataSource={supervisions}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      current: page,
                      pageSize: pageSize,
                      total: total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (t) => `共 ${t} 条`,
                      onChange: (p, ps) => {
                        setPage(p)
                        setPageSize(ps)
                      },
                    }}
                    scroll={{ x: 1200 }}
                  />
                </Card>

                {stats?.by_district && stats.by_district.length > 0 && (
                  <Card title="各区县督办统计" style={{ marginTop: 16 }}>
                    <Table
                      columns={districtColumns}
                      dataSource={stats.by_district}
                      rowKey="id"
                      pagination={false}
                    />
                  </Card>
                )}
              </>
            ),
          },
          {
            key: 'suggestions',
            label: `督办建议${suggestions.length > 0 ? ` (${suggestions.length})` : ''}`,
            children: (
              <Card
                extra={
                  <Button icon={<ReloadOutlined />} onClick={handleRefreshSuggestions}>
                    刷新建议
                  </Button>
                }
              >
                {suggestions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c' }}>
                    <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>暂无督办建议</div>
                    <Button type="primary" style={{ marginTop: 16 }} onClick={handleRefreshSuggestions}>
                      生成建议
                    </Button>
                  </div>
                ) : (
                  <List
                    dataSource={suggestions}
                    renderItem={(item) => (
                      <List.Item
                        key={item.id}
                        actions={[
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => handleProcessSuggestion(item, 'create_supervision')}
                          >
                            生成督办
                          </Button>,
                          <Button size="small" onClick={() => handleProcessSuggestion(item, 'ignore')}>
                            忽略
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag color={getSuggestionSeverityColor(item.severity)}>
                                {getSuggestionSeverityLabel(item.severity)}
                              </Tag>
                              <Tag>{getSuggestionTypeLabel(item.reason_type)}</Tag>
                              <span>{item.district_name}</span>
                              {item.appeal_count > 0 && <span style={{ color: '#8c8c8c' }}>涉及 {item.appeal_count} 件事项</span>}
                            </Space>
                          }
                          description={item.reason}
                        />
                        <Text type="secondary">{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="下达督办单"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          createForm.resetFields()
          setTargetKeys([])
          setAppeals([])
        }}
        footer={null}
        width={700}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="督办标题"
            rules={[{ required: true, message: '请输入督办标题' }]}
          >
            <Input placeholder="请输入督办标题" maxLength={100} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="督办类型"
                rules={[{ required: true, message: '请选择督办类型' }]}
              >
                <Select placeholder="请选择督办类型">
                  {SUPERVISION_TYPES.map(t => (
                    <Option key={t.value} value={t.value}>{t.icon} {t.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="level"
                label="督办级别"
                rules={[{ required: true, message: '请选择督办级别' }]}
              >
                <Select placeholder="请选择督办级别">
                  {SUPERVISION_LEVELS.map(l => (
                    <Option key={l.value} value={l.value}>{l.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="district_id"
                label="督办区县"
                rules={[{ required: true, message: '请选择督办区县' }]}
              >
                <Select
                  placeholder="请选择督办区县"
                  onChange={handleDistrictChange}
                >
                  {districts.map(d => (
                    <Option key={d.id} value={d.id}>{d.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deadline"
                label="整改时限"
                rules={[{ required: true, message: '请选择整改时限' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  showTime={{ defaultValue: dayjs('23:59:59', 'HH:mm:ss') }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="督办说明">
            <TextArea rows={3} placeholder="请输入督办说明（选填）" maxLength={500} />
          </Form.Item>

          <Form.Item label="关联具体事项（可选，多选）">
            <Transfer
              dataSource={appeals.map(a => ({
                key: a.id,
                title: `[${getSupervisionStatusLabel(a.status)}] ${a.title}`,
                description: a.id,
              }))}
              titles={['待选事项', '已选事项']}
              targetKeys={targetKeys}
              onChange={setTargetKeys}
              render={(item) => item.title}
              listStyle={{ width: 280, height: 200 }}
              locale={{ notFoundContent: '请先选择区县' }}
            />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false)
                createForm.resetFields()
                setTargetKeys([])
                setAppeals([])
              }}>取消</Button>
              <Button type="primary" htmlType="submit">下达督办</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="升级催办"
        open={escalateModalVisible}
        onCancel={() => {
          setEscalateModalVisible(false)
          escalateForm.resetFields()
          setSelectedSupervision(null)
        }}
        footer={null}
      >
        <Form form={escalateForm} layout="vertical" onFinish={handleEscalate}>
          <Form.Item label="督办单信息">
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              <div><strong>{selectedSupervision?.order_no}</strong> - {selectedSupervision?.title}</div>
              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                区县：{selectedSupervision?.district_name} | 已催办：{selectedSupervision?.escalated_count || 0} 次
              </div>
            </div>
          </Form.Item>
          <Form.Item
            name="comment"
            label="催办说明"
            rules={[{ required: true, message: '请输入催办说明' }]}
          >
            <TextArea rows={4} placeholder="请输入催办说明" maxLength={500} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEscalateModalVisible(false)
                escalateForm.resetFields()
                setSelectedSupervision(null)
              }}>取消</Button>
              <Button type="primary" danger htmlType="submit">确认催办</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SupervisionCity
