import React, { useState } from "react";
import { Layout, Menu, Avatar, Dropdown, Button, Badge } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  UserOutlined,
  PlusOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  HomeOutlined,
  FlagOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getRoleLabel } from "../utils/constants.js";

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: `${user?.name}（${getRoleLabel(user?.role)}）`,
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: hasRole("citizen") ? "首页" : "总览",
    },
    {
      key: "/appeals",
      icon: <UnorderedListOutlined />,
      label: hasRole("citizen") ? "我的诉求" : "诉求管理",
    },
    ...(!hasRole("citizen")
      ? [
          {
            key: "/appeals/create",
            icon: <PlusOutlined />,
            label: "窗口代录",
          },
        ]
      : []),
    ...(hasRole("city_admin")
      ? [
          {
            key: "/supervision/city",
            icon: <FlagOutlined />,
            label: "督办管理",
          },
        ]
      : []),
    ...(hasRole("district_center")
      ? [
          {
            key: "/supervision/district",
            icon: <ExclamationCircleOutlined />,
            label: "督办办理",
          },
        ]
      : []),
    ...(!hasRole("citizen")
      ? [
          {
            key: "/statistics",
            icon: <BarChartOutlined />,
            label: "统计分析",
          },
        ]
      : []),
    ...(hasRole("citizen")
      ? [
          {
            key: "/my-appeals",
            icon: <HomeOutlined />,
            label: "提交诉求",
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={240}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: collapsed ? 16 : 18,
            fontWeight: 600,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {collapsed ? "综治" : "鸡西市综治平台"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: 64 }}
            />
            <div style={{ fontSize: 16, color: "#262626" }}>
              {hasRole("city_admin") && "市级管理者视图"}
              {hasRole("district_center") && "区县中心视图"}
              {hasRole("department") && "进驻部门视图"}
              {hasRole("citizen") && "群众服务视图"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {!hasRole("citizen") && (
              <Badge count={3} dot>
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#1677ff" }}
                />
                <span style={{ color: "#262626" }}>{user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
