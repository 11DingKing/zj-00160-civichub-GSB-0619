import React, { useState } from 'react'
import { Form, Input, Button, Card } from 'antd'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES } from '../utils/constants.js'

const defaultAccounts = {
  city_admin: { username: 'admin', password: '123456' },
  district_center: { username: 'jiguan', password: '123456' },
  department: { username: 'dept_xfj', password: '123456' },
  citizen: { username: 'user1', password: '123456' },
}

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState('city_admin')
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const fillDefaultAccount = () => {
    const account = defaultAccounts[selectedRole]
    return account
  }

  const defaultAccount = fillDefaultAccount()

  return (
    <div className="login-container">
      <Card className="login-box" bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <SafetyOutlined style={{ fontSize: 48, color: '#1677ff' }} />
        </div>
        <h1 className="login-title">鸡西市市域社会治理综合平台</h1>
        <p className="login-subtitle">综治中心规范化建设 · 矛盾纠纷多元化解</p>

        <div className="role-selector">
          {ROLES.map((role) => (
            <div
              key={role.value}
              className={`role-card ${selectedRole === role.value ? 'active' : ''}`}
              onClick={() => handleRoleSelect(role.value)}
            >
              <div className="icon">{role.icon}</div>
              <div className="name">{role.label}</div>
            </div>
          ))}
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          initialValues={defaultAccount}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12, marginTop: 16 }}>
          <p>测试账号：admin / jiguan / dept_xfj / user1</p>
          <p>默认密码：123456</p>
        </div>
      </Card>
    </div>
  )
}

export default Login
