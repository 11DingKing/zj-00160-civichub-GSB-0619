import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Form,
  Input,
  Select,
  Row,
  Col,
  DatePicker,
  Modal,
  message,
  Pagination,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  APPEAL_TYPES,
  APPEAL_STATUSES,
  SOURCES,
  PRIORITIES,
  getTypeLabel,
  getStatusLabel,
  getStatusColor,
  getSourceLabel,
  getPriorityLabel,
  getPriorityColor,
  getChannelLabel,
} from '../utils/constants.js'

const { RangePicker } = DatePicker

function AppealList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasRole, user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [appeals, setAppeals] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [districts, setDistricts] = useState([])
  const [departments, setDepartments] = useState([])
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [currentAppeal, setCurrentAppeal] = useState(null)
  const [assignForm] = Form.useForm()

  useEffect(() => {
    loadDistrictsAndDepts()
  }, [])

  useEffect(() => {
    const status = searchParams.get('status')
    const districtId = searchParams.get('district_id')
    if (status) {
      form.setFieldsValue({ status })
    }
    if (districtId) {
      form.setFieldsValue({ district_id: districtId })
    }
    loadAppeals()
  }, [page, pageSize, searchParams])

  const loadDistrictsAndDepts = async () => {
    try {
      const [districtsRes, deptsRes] = await Promise.all([
        api.get('/districts'),
        api.get('/districts/departments'),
      ])
      setDistricts(districtsRes.data)
      setDepartments(deptsRes.data)
    } catch (error) {
      console.error('Load districts failed:', error)
    }
  }

  const loadAppeals = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        ...form.getFieldsValue(),
      }
      const status = searchParams.get('status')
      const districtId = searchParams.get('district_id')
      if (status && !params.status) params.status = status
      if (districtId && !params.district_id) params.district_id = districtId

      const response = await api.get('/appeals', { params })
      setAppeals(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Load appeals failed:', error)
      message.error('加载诉求列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadAppeals()
  }

  const handleReset = () => {
    form.resetFields()
    setSearchParams({})
    setPage(1)
    loadAppeals()
  }

  const handleAssign = (appeal) => {
    setCurrentAppeal(appeal)
    setAssignModalVisible(true)
    assignForm.resetFields()
  }

  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields()
      await api.put(`/appeals/${currentAppeal.id}/assign`, values)
      message.success('分配成功')
      setAssignModalVisible(false)
      loadAppeals()
    } catch (error) {
      message.error(error.response?.data?.error || '分配失败')
    }
  }

  const handleEscalate = (appeal) => {
    Modal.confirm({
      title: '确认上报',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将"${appeal.title}"上报到市级督办吗？`,
      okText: '确认上报',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.put(`/appeals/${appeal.id}/transfer`, { comment: '案情复杂，上报市级督办' })
          message.success('已上报市级督办')
          loadAppeals()
        } catch (error) {
          message.error(error.response?.data?.error || '上报失败')
        }
      },
    })
  }

  const columns = [
    {
      title: '诉求标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/appeals/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '诉求类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t) => getTypeLabel(t),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (s) => getSourceLabel(s),
    },
    {
      title: '提交人',
      dataIndex: 'submitter_name',
      key: 'submitter_name',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'submitter_phone',
      key: 'submitter_phone',
      width: 120,
    },
    {
      title: '所属区县',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 100,
    },
    {
      title: '当前办理部门',
      dataIndex: 'department_name',
      key: 'department_name',
      width: 120,
    },
    {
      title: '化解渠道',
      dataIndex: 'resolution_channel',
      key: 'resolution_channel',
      width: 110,
      render: (c) => c ? getChannelLabel(c) : '-',
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
      render: (s, record) => (
        <Space>
          <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>
          {record.need_rework === 1 && <span className="badge-rework">待整改</span>}
          {s === 'overdue' && <span className="badge-overdue">已超时</span>}
        </Space>
      ),
    },
    {
      title: '预计办结',
      dataIndex: 'expected_deadline',
      key: 'expected_deadline',
      width: 120,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/appeals/${record.id}`)}>
            详情
          </Button>
          {hasRole('district_center', 'city_admin') && record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => handleAssign(record)}>
              分配
            </Button>
          )}
          {hasRole('district_center', 'city_admin') && record.status !== 'pending' && record.status !== 'completed' && record.status !== 'escalated' && (
            <Button type="link" size="small" danger onClick={() => handleEscalate(record)}>
              上报
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="keyword" label="关键词搜索">
                <Input placeholder="请输入诉求标题或内容" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="status" label="状态">
                <Select placeholder="全部状态" allowClear>
                  {APPEAL_STATUSES.map(s => (
                    <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="type" label="诉求类型">
                <Select placeholder="全部类型" allowClear>
                  {APPEAL_TYPES.map(t => (
                    <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="priority" label="优先级">
                <Select placeholder="全部优先级" allowClear>
                  {PRIORITIES.map(p => (
                    <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {hasRole('city_admin') && (
              <Col span={4}>
                <Form.Item name="district_id" label="区县">
                  <Select placeholder="全部区县" allowClear>
                    {districts.map(d => (
                      <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col span={6}>
              <Form.Item name="date_range" label="提交时间">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="source" label="来源">
                <Select placeholder="全部来源" allowClear>
                  {SOURCES.map(s => (
                    <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end">
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
            </Space>
          </Row>
        </Form>
      </Card>

      <Card
        className="card-shadow"
        title={
          <Space>
            <span>诉求列表</span>
            <Tag color="blue">共 {total} 条</Tag>
          </Space>
        }
        extra={
          hasRole('district_center', 'city_admin') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/appeals/create')}>
              窗口代录
            </Button>
          )
        }
      >
        <Table
          columns={columns}
          dataSource={appeals}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1600 }}
        />
        <Row justify="end" style={{ marginTop: 16 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showQuickJumper
            showTotal={(t) => `共 ${t} 条`}
            onChange={(p, ps) => {
              setPage(p)
              setPageSize(ps)
            }}
          />
        </Row>
      </Card>

      <Modal
        title="分配诉求"
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setAssignModalVisible(false)}
        width={500}
      >
        {currentAppeal && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{currentAppeal.title}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{currentAppeal.content}</div>
          </div>
        )}
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="department_id"
            label="分配部门"
            rules={[{ required: true, message: '请选择办理部门' }]}
          >
            <Select placeholder="请选择办理部门">
              {departments.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="resolution_channel"
            label="化解渠道"
            rules={[{ required: true, message: '请选择化解渠道' }]}
          >
            <Select placeholder="请选择化解渠道">
              <Select.Option value="mediation">就地调解（3个工作日）</Select.Option>
              <Select.Option value="cross_department">跨部门协同（7个工作日）</Select.Option>
              <Select.Option value="escalated">上报上级督办（15个工作日）</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AppealList
