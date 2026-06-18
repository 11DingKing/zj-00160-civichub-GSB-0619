import React from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Steps,
  Result,
  List,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  PhoneOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const { Title, Paragraph, Text } = Typography
const { Step } = Steps

function MyAppeals() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const services = [
    {
      icon: <FileTextOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
      title: '提交诉求',
      description: '在线提交您的诉求，我们将尽快处理',
      action: () => navigate('/appeals/create'),
      buttonText: '立即提交',
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      title: '查看进度',
      description: '实时查看诉求办理进度和状态',
      action: () => navigate('/appeals'),
      buttonText: '查看我的诉求',
    },
    {
      icon: <MessageOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: '满意度评价',
      description: '对已办结的事项进行评价反馈',
      action: () => navigate('/appeals'),
      buttonText: '去评价',
    },
  ]

  const flowSteps = [
    { title: '提交诉求', description: '线上提交或窗口代录' },
    { title: '分流转办', description: '按类型分派至相关部门' },
    { title: '调查处理', description: '责任部门调查核实处理' },
    { title: '结果反馈', description: '反馈处理结果给群众' },
    { title: '满意度评价', description: '群众评价并可申请整改' },
  ]

  const contactInfo = [
    { icon: <PhoneOutlined />, label: '服务热线', value: '12345' },
    { icon: <SafetyOutlined />, label: '监督电话', value: '0467-12345' },
    { icon: <TeamOutlined />, label: '工作时间', value: '周一至周五 9:00-17:00' },
  ]

  return (
    <div className="page-container">
      <Card
        className="card-shadow"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <Row align="middle" gutter={24}>
          <Col span={16}>
            <Title level={2} style={{ color: 'white', margin: 0, marginBottom: 8 }}>
              欢迎您，{user?.name}
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: 16 }}>
              鸡西市市域社会治理综合平台致力于为您提供高效、便捷的诉求受理和化解服务。
              您可以在这里提交诉求、查询办理进度、评价服务质量。
            </Paragraph>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/appeals/create')}
              style={{
                height: 48,
                padding: '0 32px',
                fontSize: 16,
                background: 'white',
                color: '#667eea',
                border: 'none',
                fontWeight: 500,
              }}
            >
              提交诉求
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {services.map((service, index) => (
          <Col span={8} key={index}>
            <Card className="card-shadow" hoverable onClick={service.action}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ marginBottom: 16 }}>{service.icon}</div>
                <Title level={4} style={{ marginBottom: 8 }}>{service.title}</Title>
                <Paragraph style={{ color: '#8c8c8c', marginBottom: 16 }}>
                  {service.description}
                </Paragraph>
                <Button type="primary" onClick={service.action}>
                  {service.buttonText}
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="办理流程"
        className="card-shadow"
        style={{ marginBottom: 24 }}
      >
        <Steps current={-1} size="small">
          {flowSteps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={<span style={{ color: '#1677ff', fontWeight: 'bold' }}>{index + 1}</span>}
            />
          ))}
        </Steps>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card
            title="诉求须知"
            className="card-shadow"
          >
            <List
              size="small"
              dataSource={[
                '请如实填写诉求内容，提供真实姓名和联系方式，以便我们及时与您沟通。',
                '诉求受理后，我们将根据诉求类型在1个工作日内分派至相关责任部门。',
                '就地调解类事项3个工作日内办结，跨部门协同类7个工作日内办结，复杂疑难事项15个工作日内办结。',
                '您可以随时在"我的诉求"中查看办理进度和当前处理人。',
                '事项办结后，请您对办理结果进行评价，评价不满意的事项将自动回流整改。',
                '对于故意捏造事实、诬告陷害他人的，将依法追究相关责任。',
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<span style={{ color: '#1677ff' }}>●</span>}
                    description={item}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="联系我们"
            className="card-shadow"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {contactInfo.map((info, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#e6f4ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1677ff',
                  }}>
                    {info.icon}
                  </div>
                  <div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>{info.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{info.value}</div>
                  </div>
                </div>
              ))}
            </Space>

            <div style={{ marginTop: 24, padding: 16, background: '#f6ffed', borderRadius: 8 }}>
              <Space>
                <Tag color="success">郑重承诺</Tag>
              </Space>
              <Paragraph style={{ margin: '8px 0 0 0', fontSize: 13, color: '#52c41a' }}>
                我们将严格保密您的个人信息，依法保护您的合法权益，确保诉求件件有着落、事事有回音。
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default MyAppeals
