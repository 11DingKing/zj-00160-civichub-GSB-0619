import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Radio,
  message,
  Steps,
  Result,
  Space,
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { APPEAL_TYPES, SOURCES, PRIORITIES } from "../utils/constants.js";

const { TextArea } = Input;
const { Step } = Steps;

function AppealCreate() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedAppeal, setSubmittedAppeal] = useState(null);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const response = await api.get("/districts");
      setDistricts(response.data);
    } catch (error) {
      console.error("Load districts failed:", error);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const source = hasRole("citizen") ? "online" : values.source;
      const submitter_name = hasRole("citizen")
        ? user.name
        : values.submitter_name;
      const submitter_phone = hasRole("citizen")
        ? user.phone
        : values.submitter_phone;

      const response = await api.post("/appeals", {
        title: values.title,
        content: values.content,
        type: values.type,
        source,
        submitter_name,
        submitter_phone,
        district_id: values.district_id,
        priority: values.priority || "normal",
      });
      setSubmittedAppeal(response.data);
      setSubmitSuccess(true);
      setCurrentStep(2);
    } catch (error) {
      message.error(error.response?.data?.error || "提交失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const fieldsToValidate = ["title", "content", "type", "district_id"];
    if (!hasRole("citizen")) {
      fieldsToValidate.push("priority");
    }
    form.validateFields(fieldsToValidate).then(() => {
      setCurrentStep(1);
    });
  };

  const handlePrev = () => {
    setCurrentStep(0);
  };

  const steps = [
    { title: "填写诉求内容", icon: <FileTextOutlined /> },
    { title: "确认信息并提交", icon: <UserOutlined /> },
    { title: "提交成功", icon: <CheckCircleOutlined /> },
  ];

  if (submitSuccess) {
    return (
      <div className="page-container">
        <Card className="card-shadow">
          <Result
            status="success"
            title="诉求提交成功"
            subTitle={
              <Space
                direction="vertical"
                style={{ textAlign: "center", width: "100%" }}
              >
                <div>您的诉求已提交，请耐心等待处理</div>
                <div
                  style={{ color: "#1677ff", fontSize: 16, fontWeight: 500 }}
                >
                  诉求编号：{submittedAppeal?.id}
                </div>
                <Alert
                  type="info"
                  showIcon
                  message="您可以在『我的诉求』中查看办理进度，也会收到短信通知"
                  style={{ marginTop: 16 }}
                />
              </Space>
            }
            extra={[
              <Button
                type="primary"
                key="view"
                onClick={() => navigate("/appeals")}
              >
                查看我的诉求
              </Button>,
              <Button
                key="continue"
                onClick={() => {
                  setSubmitSuccess(false);
                  setCurrentStep(0);
                  form.resetFields();
                }}
              >
                继续提交
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        返回
      </Button>

      <Card
        className="card-shadow"
        title={hasRole("citizen") ? "提交诉求" : "窗口代录诉求"}
        extra={
          <Space>
            <span style={{ color: "#8c8c8c" }}>提交来源：</span>
            <span
              style={{
                color: hasRole("citizen") ? "#1677ff" : "#52c41a",
                fontWeight: 500,
              }}
            >
              {hasRole("citizen") ? "群众线上提交" : "窗口工作人员代录"}
            </span>
          </Space>
        }
      >
        <Steps
          current={currentStep}
          items={steps}
          style={{ marginBottom: 32 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            priority: "normal",
            source: hasRole("citizen") ? undefined : "window",
          }}
        >
          {currentStep === 0 && (
            <>
              <Alert
                message="温馨提示"
                description="请如实填写诉求内容，我们将依法保护您的个人信息，诉求内容将作为处理依据，请认真核对。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <Row gutter={24}>
                <Col span={24}>
                  <Form.Item
                    name="title"
                    label="诉求标题"
                    rules={[
                      { required: true, message: "请输入诉求标题" },
                      { min: 5, max: 100, message: "标题长度应在5-100字之间" },
                    ]}
                  >
                    <Input
                      placeholder="请简要描述您的诉求（5-100字）"
                      size="large"
                      prefix={<FileTextOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="诉求类型"
                    rules={[{ required: true, message: "请选择诉求类型" }]}
                  >
                    <Select
                      placeholder="请选择诉求类型"
                      size="large"
                      options={APPEAL_TYPES.map((t) => ({
                        label: t.label,
                        value: t.value,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="district_id"
                    label="所属区县"
                    rules={[{ required: true, message: "请选择所属区县" }]}
                  >
                    <Select
                      placeholder="请选择所属区县"
                      size="large"
                      prefix={<EnvironmentOutlined />}
                      options={districts.map((d) => ({
                        label: d.name,
                        value: d.id,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="content"
                    label="诉求详情"
                    rules={[
                      { required: true, message: "请详细描述诉求内容" },
                      { min: 20, message: "诉求内容不少于20字，请详细描述" },
                    ]}
                  >
                    <TextArea
                      rows={6}
                      placeholder="请详细描述您遇到的问题、发生的时间、地点、涉及人员等相关信息，以便我们更好地为您处理..."
                      size="large"
                      showCount
                      maxLength={2000}
                    />
                  </Form.Item>
                </Col>
                {!hasRole("citizen") && (
                  <Col span={12}>
                    <Form.Item
                      name="priority"
                      label="优先级"
                      rules={[{ required: true, message: "请选择优先级" }]}
                    >
                      <Radio.Group size="large">
                        {PRIORITIES.map((p) => (
                          <Radio.Button key={p.value} value={p.value}>
                            {p.label}
                          </Radio.Button>
                        ))}
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                )}
              </Row>
              <Row justify="end">
                <Button type="primary" size="large" onClick={handleNext}>
                  下一步
                </Button>
              </Row>
            </>
          )}

          {currentStep === 1 && (
            <>
              <Card
                size="small"
                style={{ marginBottom: 24, background: "#fafafa" }}
              >
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>
                    诉求标题：
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {form.getFieldValue("title")}
                  </span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>
                    诉求类型：
                  </span>
                  <span>
                    {
                      APPEAL_TYPES.find(
                        (t) => t.value === form.getFieldValue("type"),
                      )?.label
                    }
                  </span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>
                    所属区县：
                  </span>
                  <span>
                    {
                      districts.find(
                        (d) => d.id === form.getFieldValue("district_id"),
                      )?.name
                    }
                  </span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: "#8c8c8c", marginRight: 8 }}>
                    诉求内容：
                  </span>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      color: "#595959",
                      marginTop: 4,
                    }}
                  >
                    {form.getFieldValue("content")}
                  </div>
                </div>
              </Card>

              {!hasRole("citizen") && (
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item
                      name="source"
                      label="诉求来源"
                      rules={[{ required: true, message: "请选择来源" }]}
                      initialValue="window"
                    >
                      <Select
                        placeholder="请选择诉求来源"
                        size="large"
                        options={SOURCES.map((s) => ({
                          label: s.label,
                          value: s.value,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="submitter_name"
                    label={hasRole("citizen") ? "您的姓名" : "诉求人姓名"}
                    rules={[{ required: true, message: "请输入姓名" }]}
                    initialValue={hasRole("citizen") ? user?.name : undefined}
                  >
                    <Input
                      placeholder="请输入姓名"
                      size="large"
                      prefix={<UserOutlined />}
                      disabled={hasRole("citizen")}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="submitter_phone"
                    label={hasRole("citizen") ? "联系电话" : "诉求人电话"}
                    rules={[
                      { required: true, message: "请输入联系电话" },
                      {
                        pattern: /^1[3-9]\d{9}$/,
                        message: "请输入正确的手机号码",
                      },
                    ]}
                    initialValue={hasRole("citizen") ? user?.phone : undefined}
                  >
                    <Input
                      placeholder="请输入手机号码"
                      size="large"
                      prefix={<PhoneOutlined />}
                      disabled={hasRole("citizen")}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row justify="space-between">
                <Button size="large" onClick={handlePrev}>
                  上一步
                </Button>
                <Space>
                  <Button size="large" onClick={() => navigate("/appeals")}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={loading}
                  >
                    确认提交
                  </Button>
                </Space>
              </Row>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
}

export default AppealCreate;
