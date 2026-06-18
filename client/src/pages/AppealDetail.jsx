import React, { useState, useEffect } from 'react'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Rate,
  Row,
  Col,
  message,
  Divider,
  Timeline,
  Empty,
  Progress,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SendOutlined,
  StarOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getTypeLabel,
  getStatusLabel,
  getStatusColor,
  getSourceLabel,
  getPriorityLabel,
  getPriorityColor,
  getChannelLabel,
  getActionLabel,
  getActionColor,
} from '../utils/constants.js'

const { TextArea } = Input

function AppealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [appeal, setAppeal] = useState(null)
  const [flows, setFlows] = useState([])
  const [departments, setDepartments] = useState([])
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [completeModalVisible, setCompleteModalVisible] = useState(false)
  const [rateModalVisible, setRateModalVisible] = useState(false)
  const [coordinateModalVisible, setCoordinateModalVisible] = useState(false)
  const [progressForm] = Form.useForm()
  const [completeForm] = Form.useForm()
  const [rateForm] = Form.useForm()
  const [coordinateForm] = Form.useForm()

  useEffect(() => {
    loadData()
    loadDepartments()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/appeals/${id}`)
      setAppeal(response.data.appeal)
      setFlows(response.data.flows)
    } catch (error) {
      message.error('加载诉求详情失败')
      console.error('Load appeal detail failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const response = await api.get('/districts/departments')
      setDepartments(response.data)
    } catch (error) {
      console.error('Load departments failed:', error)
    }
  }

  const handleUpdateProgress = async () => {
    try {
      const values = await progressForm.validateFields()
      await api.put(`/appeals/${id}/progress`, values)
      message.success('进展已更新')
      setProgressModalVisible(false)
      progressForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败')
    }
  }

  const handleComplete = async () => {
    try {
      const values = await completeForm.validateFields()
      await api.put(`/appeals/${id}/complete`, values)
      message.success('事项已办结')
      setCompleteModalVisible(false)
      completeForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '办结失败')
    }
  }

  const handleRate = async () => {
    try {
      const values = await rateForm.validateFields()
      await api.put(`/appeals/${id}/rate`, values)
      message.success('评价已提交')
      setRateModalVisible(false)
      rateForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '评价失败')
    }
  }

  const handleCoordinate = async () => {
    try {
      const values = await coordinateForm.validateFields()
      await api.post(`/appeals/${id}/coordinate`, values)
      message.success('协同请求已发送')
      setCoordinateModalVisible(false)
      coordinateForm.resetFields()
      loadData()
    } catch (error) {
      message.error(error.response?.data?.error || '发送失败')
    }
  }

  const getDeadlineStatus = () => {
    if (!appeal?.expected_deadline) return null
    const deadline = dayjs(appeal.expected_deadline)
    const now = dayjs()
    const diffDays = deadline.diff(now, 'day')
    const diffHours = deadline.diff(now, 'hour')

    if (appeal.status === 'overdue') {
      return { status: 'error', text: `已超时 ${Math.abs(diffDays)} 天`, percent: 100 }
    }

    const created = dayjs(appeal.created_at)
    const totalHours = deadline.diff(created, 'hour')
    const elapsedHours = now.diff(created, 'hour')
    const percent = Math.min(Math.round((elapsedHours / totalHours) * 100), 100)

    if (diffDays < 0) {
      return { status: 'error', text: `已超时 ${Math.abs(diffDays)} 天`, percent: 100 }
    } else if (diffHours <= 24) {
      return { status: 'warning', text: `剩余 ${diffHours} 小时`, percent }
    } else {
      return { status: 'normal', text: `剩余 ${diffDays} 天`, percent }
    }
  }

  const deadlineStatus = getDeadlineStatus()

  const renderFlowTimeline = () => {
    if (flows.length === 0) {
      return <Empty description="暂无流转记录" />
    }

    return (
      <Timeline
        mode="left"
        items={flows.map((flow, index) => ({
          color: getActionColor(flow.action) === 'error' ? 'red' :
                 getActionColor(flow.action) === 'warning' ? 'orange' :
                 getActionColor(flow.action) === 'success' ? 'green' :
                 getActionColor(flow.action) === 'processing' ? 'blue' : 'blue',
          label: (
            <div style={{ minWidth: 150 }}>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                {dayjs(flow.created_at).format('YYYY-MM-DD')}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                {dayjs(flow.created_at).format('HH:mm:ss')}
              </div>
            </div>
          ),
          children: (
            <Card size="small" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Space>
                  <Tag color={getActionColor(flow.action)}>
                    {getActionLabel(flow.action)}
                  </Tag>
                  {flow.handler_name && (
                    <span style={{ color: '#595959', fontSize: 12 }}>
                      {flow.handler_name}
                      {flow.department_name && `（${flow.department_name}）`}
                    </span>
                  )}
                </Space>
                {flow.from_status && flow.to_status && (
                  <Space size="small">
                    <Tag color={getStatusColor(flow.from_status)}>
                      {getStatusLabel(flow.from_status)}
                    </Tag>
                    <span style={{ color: '#bfbfbf' }}>→</span>
                    <Tag color={getStatusColor(flow.to_status)}>
                      {getStatusLabel(flow.to_status)}
                    </Tag>
                  </Space>
                )}
              </div>
              <div style={{ color: '#262626' }}>{flow.comment}</div>
            </Card>
          ),
        }))}
      />
    )
  }

  if (!appeal) {
    return <div className="page-container">加载中...</div>
  }

  return (
    <div className="page-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card
        className="card-shadow"
        title={
          <Space>
            <span>{appeal.title}</span>
            <Tag color={getStatusColor(appeal.status)}>{getStatusLabel(appeal.status)}</Tag>
            <Tag color={getPriorityColor(appeal.priority)}>{getPriorityLabel(appeal.priority)}优先级</Tag>
            {appeal.need_rework === 1 && <span className="badge-rework">回流整改中</span>}
            {appeal.status === 'overdue' && <span className="badge-overdue">已超时</span>}
          </Space>
        }
        extra={
          <Space>
            {hasRole('district_center', 'department', 'city_admin') && appeal.status !== 'completed' && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setProgressModalVisible(true)}
              >
                更新进展
              </Button>
            )}
            {hasRole('district_center', 'department') && appeal.status !== 'completed' && appeal.status !== 'pending' && (
              <Button
                icon={<TeamOutlined />}
                onClick={() => setCoordinateModalVisible(true)}
              >
                跨部门协同
              </Button>
            )}
            {hasRole('district_center', 'department', 'city_admin') && appeal.status !== 'completed' && appeal.status !== 'pending' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setCompleteModalVisible(true)}
              >
                办结
              </Button>
            )}
            {hasRole('citizen') && appeal.status === 'completed' && !appeal.satisfaction_score && (
              <Button
                type="primary"
                icon={<StarOutlined />}
                onClick={() => setRateModalVisible(true)}
              >
                满意度评价
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={24}>
          <Col span={16}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="诉求类型">{getTypeLabel(appeal.type)}</Descriptions.Item>
              <Descriptions.Item label="来源">{getSourceLabel(appeal.source)}</Descriptions.Item>
              <Descriptions.Item label="提交人">{appeal.submitter_name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{appeal.submitter_phone}</Descriptions.Item>
              <Descriptions.Item label="所属区县">{appeal.district_name}</Descriptions.Item>
              <Descriptions.Item label="当前办理部门">{appeal.department_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="当前经办人">{appeal.handler_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="化解渠道">{appeal.resolution_channel ? getChannelLabel(appeal.resolution_channel) : '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>
                {dayjs(appeal.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="诉求内容" span={2}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{appeal.content}</div>
              </Descriptions.Item>
              {appeal.satisfaction_score && (
                <>
                  <Descriptions.Item label="满意度评分" span={2}>
                    <Rate disabled value={appeal.satisfaction_score} />
                    {appeal.satisfaction_comment && (
                      <div style={{ marginTop: 8, color: '#595959' }}>
                        评价：{appeal.satisfaction_comment}
                      </div>
                    )}
                  </Descriptions.Item>
                </>
              )}
              {appeal.actual_completed_at && (
                <Descriptions.Item label="实际办结时间" span={2}>
                  {dayjs(appeal.actual_completed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
          <Col span={8}>
            <Card title="办理时限" size="small" style={{ marginBottom: 16 }}>
              {appeal.expected_deadline ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#8c8c8c' }}>预计办结</span>
                      <span>{dayjs(appeal.expected_deadline).format('YYYY-MM-DD')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#8c8c8c' }}>时限状态</span>
                      <Tag color={deadlineStatus?.status === 'error' ? 'error' : deadlineStatus?.status === 'warning' ? 'warning' : 'success'}>
                        {deadlineStatus?.text}
                      </Tag>
                    </div>
                    <Progress
                      percent={deadlineStatus?.percent || 0}
                      status={deadlineStatus?.status}
                      size="small"
                      showInfo={false}
                    />
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    <div>化解渠道：{appeal.resolution_channel ? getChannelLabel(appeal.resolution_channel) : '未分配'}</div>
                    <div style={{ marginTop: 4 }}>
                      办理时限：{appeal.resolution_channel === 'mediation' ? '3个工作日' :
                               appeal.resolution_channel === 'cross_department' ? '7个工作日' :
                               appeal.resolution_channel === 'escalated' ? '15个工作日' : '-'}
                    </div>
                  </div>
                </>
              ) : (
                <Empty description="等待分配" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            {appeal.resolution_channel && (
              <Card title="节点留痕" size="small">
                <div className="timeline-flow">
                  <div className="flow-item">
                    <div className="flow-dot success"></div>
                    <div className="flow-content">
                      <div className="flow-header">
                        <span className="flow-title">诉求提交</span>
                        <span className="flow-time">{dayjs(appeal.created_at).format('MM-DD HH:mm')}</span>
                      </div>
                      <div className="flow-body">群众提交诉求</div>
                    </div>
                  </div>
                  {appeal.current_handler_id && (
                    <div className="flow-item">
                      <div className="flow-dot"></div>
                      <div className="flow-content">
                        <div className="flow-header">
                          <span className="flow-title">分配处理</span>
                          <span className="flow-time">{dayjs(appeal.updated_at).format('MM-DD HH:mm')}</span>
                        </div>
                        <div className="flow-body">
                          已分配至 {appeal.department_name}，化解渠道：{getChannelLabel(appeal.resolution_channel)}
                        </div>
                        <div className="flow-meta">经办人：{appeal.handler_name}</div>
                      </div>
                    </div>
                  )}
                  {appeal.status === 'completed' && (
                    <div className="flow-item">
                      <div className="flow-dot success"></div>
                      <div className="flow-content">
                        <div className="flow-header">
                          <span className="flow-title">事项办结</span>
                          <span className="flow-time">{dayjs(appeal.actual_completed_at).format('MM-DD HH:mm')}</span>
                        </div>
                        <div className="flow-body">事项已完成处理</div>
                      </div>
                    </div>
                  )}
                  {appeal.status === 'escalated' && (
                    <div className="flow-item">
                      <div className="flow-dot warning"></div>
                      <div className="flow-content">
                        <div className="flow-header">
                          <span className="flow-title">上级督办</span>
                        </div>
                        <div className="flow-body">案情复杂，已上报市级督办</div>
                      </div>
                    </div>
                  )}
                  {appeal.status === 'overdue' && (
                    <div className="flow-item">
                      <div className="flow-dot danger"></div>
                      <div className="flow-content">
                        <div className="flow-header">
                          <span className="flow-title">超时预警</span>
                        </div>
                        <div className="flow-body">办理已超时，请尽快处理！</div>
                      </div>
                    </div>
                  )}
                  {appeal.need_rework === 1 && (
                    <div className="flow-item">
                      <div className="flow-dot warning"></div>
                      <div className="flow-content">
                        <div className="flow-header">
                          <span className="flow-title">回流整改</span>
                        </div>
                        <div className="flow-body">群众评价不满意，已触发回流整改</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </Col>
        </Row>
      </Card>

      <Card title="流转记录" className="card-shadow" style={{ marginTop: 16 }}>
        {renderFlowTimeline()}
      </Card>

      <Modal
        title="更新办理进展"
        open={progressModalVisible}
        onOk={handleUpdateProgress}
        onCancel={() => setProgressModalVisible(false)}
        width={500}
      >
        <Form form={progressForm} layout="vertical">
          <Form.Item
            name="comment"
            label="办理进展"
            rules={[{ required: true, message: '请填写办理进展' }]}
          >
            <TextArea rows={4} placeholder="请详细描述当前办理进展..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="办结事项"
        open={completeModalVisible}
        onOk={handleComplete}
        onCancel={() => setCompleteModalVisible(false)}
        width={500}
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="result"
            label="办理结果"
            rules={[{ required: true, message: '请填写办理结果' }]}
          >
            <TextArea rows={4} placeholder="请详细描述办理结果和解决方案..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="满意度评价"
        open={rateModalVisible}
        onOk={handleRate}
        onCancel={() => setRateModalVisible(false)}
        width={400}
      >
        <Form form={rateForm} layout="vertical">
          <Form.Item
            name="score"
            label="请对本次服务进行评分"
            rules={[{ required: true, message: '请给出评分' }]}
          >
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="评价意见（选填）">
            <TextArea rows={3} placeholder="请输入您的评价意见..." />
          </Form.Item>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            提示：评分1-2分将触发回流整改机制
          </div>
        </Form>
      </Modal>

      <Modal
        title="发起跨部门协同"
        open={coordinateModalVisible}
        onOk={handleCoordinate}
        onCancel={() => setCoordinateModalVisible(false)}
        width={500}
      >
        <Form form={coordinateForm} layout="vertical">
          <Form.Item
            name="to_department_id"
            label="协同部门"
            rules={[{ required: true, message: '请选择协同部门' }]}
          >
            <Select placeholder="请选择需要协同的部门">
              {departments.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="request_content"
            label="协同内容"
            rules={[{ required: true, message: '请填写协同内容' }]}
          >
            <TextArea rows={4} placeholder="请描述需要协同办理的具体内容..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AppealDetail
