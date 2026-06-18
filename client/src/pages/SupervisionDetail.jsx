import React, { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Typography,
  Divider,
  Progress,
  Steps,
  Descriptions,
  List,
  Timeline,
  Alert,
  Select,
} from 'antd'
import {
  FlagOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  FormOutlined,
  SendOutlined,
  FileDoneOutlined,
  CheckOutlined,
  CloseOutlined,
  UpCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../utils/api.js'
import { useAuth } from '../contexts/AuthContext.js'
import {
  getSupervisionStatusLabel,
  getSupervisionStatusColor,
  getSupervisionTypeLabel,
  getSupervisionTypeIcon,
  getSupervisionLevelLabel,
  getSupervisionLevelColor,
  getSupervisionActionLabel,
} from '../utils/constants.js'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

function SupervisionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [supervision, setSupervision] = useState(null)
  const [appeals, setAppeals] = useState([])
  const [flows, setFlows] = useState([])
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [completeModalVisible, setCompleteModalVisible] = useState(false)
  const [verifyModalVisible, setVerifyModalVisible] = useState(false)
  const [escalateModalVisible, setEscalateModalVisible] = useState(false)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [progressForm] = Form.useForm()
  const [completeForm] = Form.useForm()
  const [verifyForm] = Form.useForm()
  const [escalateForm] = Form.useForm()
  const [acceptForm] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [supervisionRes, appealsRes, flowsRes] = await Promise.all([
        api.get(`/supervisions/${id}`),
        api.get(`/supervisions/${id}/appeals`),
        api.get(`/supervisions/${id}/flows`),
      ])
      setSupervision(supervisionRes.data)
      setAppeals(appealsRes.data)
      setFlows(flowsRes.data)
    } catch (error) {
      message.error('加载数据失败')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (values) => {
    try {
      await api.put(`/supervisions/${id}/accept`, {
        comment: values.comment,
      })
      message.success('签收成功')
      setAcceptModalVisible(false)
      acceptForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '签收失败')
    }
  }

  const handleProgress = async (values) => {
    try {
      await api.put(`/supervisions/${id}/progress`, {
        progress_percent: values.progress_percent,
        progress_description: values.progress_description,
      })
      message.success('进展更新成功')
      setProgressModalVisible(false)
      progressForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleComplete = async (values) => {
    try {
      await api.put(`/supervisions/${id}/complete`, {
        progress_percent: 100,
        progress_description: values.result_description,
        result_description: values.result_description,
      })
      message.success('整改完成，已提交核销申请')
      setCompleteModalVisible(false)
      completeForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleVerify = async (values) => {
    try {
      await api.put(`/supervisions/${id}/verify`, {
        verify_result: values.verify_result,
        comment: values.comment,
      })
      message.success(values.verify_result === 'pass' ? '核销通过' : '已退回重新办理')
      setVerifyModalVisible(false)
      verifyForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleEscalate = async (values) => {
    try {
      await api.put(`/supervisions/${id}/escalate`, {
        comment: values.comment,
      })
      message.success('升级催办成功')
      setEscalateModalVisible(false)
      escalateForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败')
    }
  }

  const isCityAdmin = user?.roles?.includes('city_admin')
  const isDistrictCenter = user?.roles?.includes('district_center')

  const isOverdue = () => {
    if (!supervision) return false
    if (['verified', 'pending_verify'].includes(supervision.status)) return false
    return dayjs(supervision.deadline).isBefore(dayjs())
  }

  const getRemainingDays = () => {
    if (!supervision) return 0
    return dayjs(supervision.deadline).diff(dayjs(), 'day')
  }

  const getStepItems = () => {
    if (!supervision) return []
    const steps = [
      { title: '督办下达', status: 'finish', description: dayjs(supervision.created_at).format('YYYY-MM-DD HH:mm') },
    ]
    if (supervision.accept_time) {
      steps.push({ title: '区县签收', status: 'finish', description: dayjs(supervision.accept_time).format('YYYY-MM-DD HH:mm') })
    } else if (supervision.status === 'pending_accept') {
      steps.push({ title: '区县签收', status: 'process' })
    } else {
      steps.push({ title: '区县签收', status: 'wait' })
    }
    if (supervision.status === 'in_progress') {
      steps.push({ title: '办理中', status: 'process', description: `${supervision.progress_percent || 0}%` })
    } else if (['pending_verify', 'verified'].includes(supervision.status)) {
      steps.push({ title: '办理中', status: 'finish', description: '100%' })
    } else {
      steps.push({ title: '办理中', status: 'wait' })
    }
    if (supervision.status === 'pending_verify') {
      steps.push({ title: '待核销', status: 'process' })
    } else if (supervision.status === 'verified') {
      steps.push({ title: '已核销', status: 'finish', description: supervision.verified_at ? dayjs(supervision.verified_at).format('YYYY-MM-DD HH:mm') : '' })
    } else {
      steps.push({ title: '待核销', status: 'wait' })
    }
    return steps
  }

  const appealColumns = [
    {
      title: '诉求编号',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text) => <a onClick={() => navigate(`/appeals/${text}`)}>{text}</a>,
    },
    {
      title: '诉求标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '事项类别',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 120,
    },
    {
      title: '紧急程度',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 100,
      render: (u) => <Tag>{u}</Tag>,
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => <Tag color={getSupervisionStatusColor(s)}>{getSupervisionStatusLabel(s)}</Tag>,
    },
    {
      title: '所属区县',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 120,
    },
  ]

  if (!supervision) return null

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <Title level={3} style={{ margin: 0 }}>
            <FlagOutlined /> 督办单详情
          </Title>
        </Space>
        <Space>
          {isDistrictCenter && supervision.status === 'pending_accept' && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setAcceptModalVisible(true)}>
              签收督办
            </Button>
          )}
          {isDistrictCenter && supervision.status === 'in_progress' && (
            <>
              <Button icon={<FormOutlined />} onClick={() => {
                progressForm.setFieldsValue({ progress_percent: supervision.progress_percent || 0 })
                setProgressModalVisible(true)
              }}>
                更新进展
              </Button>
              <Button type="primary" icon={<FileDoneOutlined />} onClick={() => setCompleteModalVisible(true)}>
                申请核销
              </Button>
            </>
          )}
          {isCityAdmin && supervision.status === 'pending_verify' && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setVerifyModalVisible(true)}>
              审核核销
            </Button>
          )}
          {isCityAdmin && ['pending_accept', 'in_progress', 'pending_verify'].includes(supervision.status) && (
            <Button danger icon={<UpCircleOutlined />} onClick={() => setEscalateModalVisible(true)}>
              升级催办
            </Button>
          )}
        </Space>
      </div>

      {isOverdue() && (
        <Alert
          message="该督办单已超过整改时限"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Steps
          items={getStepItems()}
          size="small"
          labelPlacement="vertical"
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="督办单号">{supervision.order_no}</Descriptions.Item>
              <Descriptions.Item label="督办标题">{supervision.title}</Descriptions.Item>
              <Descriptions.Item label="督办类型">
                {getSupervisionTypeIcon(supervision.type)} {getSupervisionTypeLabel(supervision.type)}
              </Descriptions.Item>
              <Descriptions.Item label="督办级别">
                <Tag color={getSupervisionLevelColor(supervision.level)}>{getSupervisionLevelLabel(supervision.level)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="所属区县">{supervision.district_name}</Descriptions.Item>
              <Descriptions.Item label="关联事项">{supervision.appeal_count} 件</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Space>
                  <Tag color={getSupervisionStatusColor(supervision.status)}>{getSupervisionStatusLabel(supervision.status)}</Tag>
                  {isOverdue() && <Tag color="red">已逾期</Tag>}
                  {supervision.escalated_count > 0 && <Tag color="orange">已催办{supervision.escalated_count}次</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="整改进度">
                <Progress percent={supervision.progress_percent || 0} size="small" width={120} />
              </Descriptions.Item>
              <Descriptions.Item label="下达时间">{dayjs(supervision.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="整改时限">
                <Space>
                  {dayjs(supervision.deadline).format('YYYY-MM-DD HH:mm')}
                  {!isOverdue() && supervision.status !== 'verified' && (
                    <Text type={getRemainingDays() <= 3 ? 'warning' : 'secondary'} style={{ fontSize: 12 }}>
                      还剩 {getRemainingDays()} 天
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="下达人">{supervision.issued_by_name}</Descriptions.Item>
              <Descriptions.Item label="签收人">{supervision.accepted_by_name || '-'}</Descriptions.Item>
              {supervision.description && (
                <Descriptions.Item label="督办说明" span={2}>{supervision.description}</Descriptions.Item>
              )}
              {supervision.result_description && (
                <Descriptions.Item label="整改结果说明" span={2}>{supervision.result_description}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title={`关联诉求（${appeals.length} 件）`} style={{ marginBottom: 16 }}>
            {appeals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#8c8c8c' }}>暂无关联诉求</div>
            ) : (
              <Table
                columns={appealColumns}
                dataSource={appeals}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>

          <Card title="流转记录">
            <Timeline
              items={flows.map((f, index) => ({
                color: ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'][index % 5],
                children: (
                  <div>
                    <Space>
                      <Text strong>{getSupervisionActionLabel(f.action)}</Text>
                      <Tag color={getSupervisionStatusColor(f.status_to)}>{getSupervisionStatusLabel(f.status_to)}</Tag>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">
                        <UserOutlined style={{ marginRight: 4 }} />{f.operator_name || '系统'}
                        <span style={{ margin: '0 8px' }}>•</span>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />{dayjs(f.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </div>
                    {f.comment && (
                      <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                        {f.comment}
                      </div>
                    )}
                    {f.progress_percent != null && (
                      <div style={{ marginTop: 8 }}>
                        <Progress percent={f.progress_percent} size="small" />
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title="督办统计"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={supervision.progress_percent || 0}
                size={120}
              />
              <Divider />
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>已催办</div>
                  <div style={{ fontSize: 20, color: '#faad14', fontWeight: 'bold' }}>{supervision.escalated_count || 0} 次</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>流转次数</div>
                  <div style={{ fontSize: 20, color: '#1677ff', fontWeight: 'bold' }}>{flows.length} 次</div>
                </Col>
              </Row>
            </div>
          </Card>

          {supervision.last_escalated_at && (
            <Alert
              message={`最近催办时间：${dayjs(supervision.last_escalated_at).format('YYYY-MM-DD HH:mm')}`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
        </Col>
      </Row>

      <Modal
        title="签收督办单"
        open={acceptModalVisible}
        onCancel={() => { setAcceptModalVisible(false); acceptForm.resetFields() }}
        footer={null}
      >
        <Form form={acceptForm} layout="vertical" onFinish={handleAccept}>
          <Form.Item name="comment" label="签收说明（可选）">
            <TextArea rows={3} placeholder="请输入签收说明" maxLength={200} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setAcceptModalVisible(false); acceptForm.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit">确认签收</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="更新办理进展"
        open={progressModalVisible}
        onCancel={() => { setProgressModalVisible(false); progressForm.resetFields() }}
        footer={null}
      >
        <Form form={progressForm} layout="vertical" onFinish={handleProgress}>
          <Form.Item name="progress_percent" label="完成进度" rules={[{ required: true, message: '请选择进度' }]}>
            <Select>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (
                <Option key={p} value={p}>{p}%</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="progress_description" label="进展说明" rules={[{ required: true, message: '请输入进展说明' }]}>
            <TextArea rows={4} placeholder="请详细描述当前办理进展、遇到的问题及下一步计划" maxLength={500} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setProgressModalVisible(false); progressForm.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit">提交进展</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="申请核销"
        open={completeModalVisible}
        onCancel={() => { setCompleteModalVisible(false); completeForm.resetFields() }}
        footer={null}
      >
        <Form form={completeForm} layout="vertical" onFinish={handleComplete}>
          <Alert
            message="申请核销后，市级将审核整改结果。审核不通过将退回重新办理。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="result_description" label="整改完成情况说明" rules={[{ required: true, message: '请输入整改完成情况说明' }]}>
            <TextArea rows={6} placeholder="请详细描述整改完成情况，包括各关联事项的处置结果、长效机制建立情况等" maxLength={1000} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setCompleteModalVisible(false); completeForm.resetFields() }}>取消</Button>
              <Button type="primary" icon={<SendOutlined />} htmlType="submit">提交核销申请</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审核核销"
        open={verifyModalVisible}
        onCancel={() => { setVerifyModalVisible(false); verifyForm.resetFields() }}
        footer={null}
      >
        <Form form={verifyForm} layout="vertical" onFinish={handleVerify}>
          <Form.Item name="verify_result" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
            <Select>
              <Option value="pass"><CheckOutlined style={{ color: '#52c41a' }} /> 审核通过，予以核销</Option>
              <Option value="reject"><CloseOutlined style={{ color: '#ff4d4f' }} /> 审核不通过，退回重新办理</Option>
            </Select>
          </Form.Item>
          <Form.Item name="comment" label="审核意见" rules={[{ required: true, message: '请输入审核意见' }]}>
            <TextArea rows={4} placeholder="请输入审核意见" maxLength={500} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setVerifyModalVisible(false); verifyForm.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit">确认审核</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="升级催办"
        open={escalateModalVisible}
        onCancel={() => { setEscalateModalVisible(false); escalateForm.resetFields() }}
        footer={null}
      >
        <Form form={escalateForm} layout="vertical" onFinish={handleEscalate}>
          <Alert
            message={`已催办 ${supervision.escalated_count || 0} 次，本次催办后将升级处理级别`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="comment" label="催办说明" rules={[{ required: true, message: '请输入催办说明' }]}>
            <TextArea rows={4} placeholder="请输入催办说明，明确整改要求和时限" maxLength={500} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setEscalateModalVisible(false); escalateForm.resetFields() }}>取消</Button>
              <Button type="primary" danger htmlType="submit">确认催办</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SupervisionDetail
