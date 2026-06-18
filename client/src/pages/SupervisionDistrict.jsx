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
  message,
  Typography,
  Divider,
  Progress,
  Steps,
  Alert,
} from 'antd'
import {
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FlagOutlined,
  PlayCircleOutlined,
  StopOutlined,
  UpCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  FormOutlined,
  SendOutlined,
  FileDoneOutlined,
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
  SUPERVISION_STATUSES,
} from '../utils/constants.js'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

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

function SupervisionDistrict() {
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
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [completeModalVisible, setCompleteModalVisible] = useState(false)
  const [selectedSupervision, setSelectedSupervision] = useState(null)
  const [acceptForm] = Form.useForm()
  const [progressForm] = Form.useForm()
  const [completeForm] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadSupervisions()
  }, [page, pageSize, statusFilter, typeFilter, levelFilter])

  const loadData = async () => {
    try {
      const res = await api.get('/supervisions/stats')
      setStats(res.data)
    } catch (error) {
      message.error('加载统计数据失败')
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
      const res = await api.get('/supervisions', { params })
      setSupervisions(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      message.error('加载督办单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (values) => {
    try {
      await api.put(`/supervisions/${selectedSupervision.id}/accept`, {
        comment: values.comment,
      })
      message.success('签收成功')
      setAcceptModalVisible(false)
      acceptForm.resetFields()
      setSelectedSupervision(null)
      loadData()
      loadSupervisions()
    } catch (error) {
      message.error(error.response?.data?.error || '签收失败')
    }
  }

  const handleProgress = async (values) => {
    try {
      await api.put(`/supervisions/${selectedSupervision.id}/progress`, {
        progress_percent: values.progress_percent,
        progress_description: values.progress_description,
      })
      message.success('进展更新成功')
      setProgressModalVisible(false)
      progressForm.resetFields()
      setSelectedSupervision(null)
      loadSupervisions()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleComplete = async (values) => {
    try {
      await api.put(`/supervisions/${selectedSupervision.id}/complete`, {
        progress_percent: 100,
        progress_description: values.result_description,
        result_description: values.result_description,
      })
      message.success('整改完成，已提交核销申请')
      setCompleteModalVisible(false)
      completeForm.resetFields()
      setSelectedSupervision(null)
      loadData()
      loadSupervisions()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const isOverdue = (deadline, status) => {
    if (['verified', 'pending_verify'].includes(status)) return false
    return dayjs(deadline).isBefore(dayjs())
  }

  const getRemainingDays = (deadline) => {
    const now = dayjs()
    const ddl = dayjs(deadline)
    const diff = ddl.diff(now, 'day')
    return diff
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
      title: '关联事项',
      dataIndex: 'appeal_count',
      key: 'appeal_count',
      width: 80,
      render: (c) => `${c} 件`,
    },
    {
      title: '整改进度',
      dataIndex: 'progress_percent',
      key: 'progress_percent',
      width: 150,
      render: (p) => (
        <Progress percent={p || 0} size="small" width={80} />
      ),
    },
    {
      title: '整改时限',
      key: 'deadline',
      width: 160,
      render: (_, record) => {
        const remaining = getRemainingDays(record.deadline)
        return (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(record.deadline).format('YYYY-MM-DD')}</Text>
            {isOverdue(record.deadline, record.status) ? (
              <Text type="danger" style={{ fontSize: 12 }}>已逾期 {Math.abs(remaining)} 天</Text>
            ) : remaining <= 3 && remaining >= 0 ? (
              <Text type="warning" style={{ fontSize: 12 }}>还剩 {remaining} 天</Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>还剩 {remaining} 天</Text>
            )}
          </Space>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s, record) => (
        <Space>
          <Tag color={getSupervisionStatusColor(s)}>{getSupervisionStatusLabel(s)}</Tag>
          {record.escalated_count > 0 && <Tag color="orange">已催办{record.escalated_count}次</Tag>}
        </Space>
      ),
    },
    {
      title: '下达时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/supervision/${record.id}`)}>
            详情
          </Button>
          {record.status === 'pending_accept' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                setSelectedSupervision(record)
                setAcceptModalVisible(true)
              }}
            >
              签收
            </Button>
          )}
          {record.status === 'in_progress' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<FormOutlined />}
                onClick={() => {
                  setSelectedSupervision(record)
                  progressForm.setFieldsValue({ progress_percent: record.progress_percent || 0 })
                  setProgressModalVisible(true)
                }}
              >
                填进展
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<FileDoneOutlined />}
                onClick={() => {
                  setSelectedSupervision(record)
                  setCompleteModalVisible(true)
                }}
              >
                申请核销
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  const pendingAcceptCount = supervisions.filter(s => s.status === 'pending_accept').length

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          <ExclamationCircleOutlined /> 督办办理（区县中心端）
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadData(); loadSupervisions() }}>
            刷新
          </Button>
        </Space>
      </div>

      {pendingAcceptCount > 0 && (
        <Alert
          message={`您有 ${pendingAcceptCount} 条督办单待签收，请及时处理`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={() => setStatusFilter('pending_accept')}>
              去签收
            </Button>
          }
        />
      )}

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
            onClick={() => setStatusFilter('pending_accept')}
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="办理中"
            value={stats?.in_progress || 0}
            icon={<ClockCircleOutlined />}
            color="processing"
            onClick={() => setStatusFilter('in_progress')}
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="待核销"
            value={stats?.pending_verify || 0}
            icon={<StopOutlined />}
            color="warning"
            onClick={() => setStatusFilter('pending_verify')}
          />
        </Col>
        <Col span={4}>
          <StatCard
            title="已核销"
            value={stats?.verified || 0}
            sub={`核销率 ${stats?.verification_rate || 0}%`}
            icon={<CheckCircleOutlined />}
            color="green"
            onClick={() => setStatusFilter('verified')}
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
          <Button icon={<ReloadOutlined />} onClick={loadSupervisions}>刷新列表</Button>
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
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title="签收督办单"
        open={acceptModalVisible}
        onCancel={() => {
          setAcceptModalVisible(false)
          acceptForm.resetFields()
          setSelectedSupervision(null)
        }}
        footer={null}
        width={600}
      >
        <Form form={acceptForm} layout="vertical" onFinish={handleAccept}>
          {selectedSupervision && (
            <Card style={{ marginBottom: 16, background: '#f5f5f5' }} size="small">
              <div><strong>督办单号：</strong>{selectedSupervision.order_no}</div>
              <div><strong>标题：</strong>{selectedSupervision.title}</div>
              <div><strong>类型：</strong>{getSupervisionTypeIcon(selectedSupervision.type)} {getSupervisionTypeLabel(selectedSupervision.type)}</div>
              <div><strong>级别：</strong><Tag color={getSupervisionLevelColor(selectedSupervision.level)}>{getSupervisionLevelLabel(selectedSupervision.level)}</Tag></div>
              <div><strong>关联事项：</strong>{selectedSupervision.appeal_count} 件</div>
              <div><strong>整改时限：</strong>{dayjs(selectedSupervision.deadline).format('YYYY-MM-DD')}</div>
              {selectedSupervision.description && (
                <div><strong>督办说明：</strong>{selectedSupervision.description}</div>
              )}
            </Card>
          )}
          <Form.Item
            name="comment"
            label="签收说明（可选）"
          >
            <TextArea rows={3} placeholder="请输入签收说明" maxLength={200} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setAcceptModalVisible(false)
                acceptForm.resetFields()
                setSelectedSupervision(null)
              }}>取消</Button>
              <Button type="primary" htmlType="submit">确认签收</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="更新办理进展"
        open={progressModalVisible}
        onCancel={() => {
          setProgressModalVisible(false)
          progressForm.resetFields()
          setSelectedSupervision(null)
        }}
        footer={null}
        width={600}
      >
        <Form form={progressForm} layout="vertical" onFinish={handleProgress}>
          {selectedSupervision && (
            <Card style={{ marginBottom: 16, background: '#f5f5f5' }} size="small">
              <div><strong>督办单号：</strong>{selectedSupervision.order_no}</div>
              <div><strong>标题：</strong>{selectedSupervision.title}</div>
            </Card>
          )}
          <Form.Item
            name="progress_percent"
            label="完成进度"
            rules={[{ required: true, message: '请选择进度' }]}
          >
            <Select>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (
                <Option key={p} value={p}>{p}%</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="progress_description"
            label="进展说明"
            rules={[{ required: true, message: '请输入进展说明' }]}
          >
            <TextArea rows={4} placeholder="请详细描述当前办理进展、遇到的问题及下一步计划" maxLength={500} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setProgressModalVisible(false)
                progressForm.resetFields()
                setSelectedSupervision(null)
              }}>取消</Button>
              <Button type="primary" htmlType="submit">提交进展</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="申请核销"
        open={completeModalVisible}
        onCancel={() => {
          setCompleteModalVisible(false)
          completeForm.resetFields()
          setSelectedSupervision(null)
        }}
        footer={null}
        width={600}
      >
        <Form form={completeForm} layout="vertical" onFinish={handleComplete}>
          {selectedSupervision && (
            <Card style={{ marginBottom: 16, background: '#f5f5f5' }} size="small">
              <div><strong>督办单号：</strong>{selectedSupervision.order_no}</div>
              <div><strong>标题：</strong>{selectedSupervision.title}</div>
              <div><strong>关联事项：</strong>{selectedSupervision.appeal_count} 件</div>
              <Alert
                message="申请核销后，市级将审核整改结果。审核不通过将退回重新办理。"
                type="warning"
                showIcon
                style={{ marginTop: 12 }}
              />
            </Card>
          )}
          <Form.Item
            name="result_description"
            label="整改完成情况说明"
            rules={[{ required: true, message: '请输入整改完成情况说明' }]}
          >
            <TextArea rows={6} placeholder="请详细描述整改完成情况，包括各关联事项的处置结果、长效机制建立情况等" maxLength={1000} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCompleteModalVisible(false)
                completeForm.resetFields()
                setSelectedSupervision(null)
              }}>取消</Button>
              <Button type="primary" icon={<SendOutlined />} htmlType="submit">提交核销申请</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SupervisionDistrict
