import { Layout, Menu, Typography, Space, Button, message } from 'antd';
import type { FC } from 'react';
import type { MenuProps } from 'antd';
import { CloudUploadOutlined, DashboardOutlined, SettingOutlined, LineChartOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'import',
    icon: <CloudUploadOutlined />,
    label: 'Excel 导入',
  },
  {
    key: 'status',
    icon: <DashboardOutlined />,
    label: '数据库状态',
  },
  {
    key: 'analysis',
    icon: <LineChartOutlined />,
    label: '数据查询与分析',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    disabled: false,
  },
  {
    key: 'users',
    icon: <SettingOutlined />,
    label: '用户管理',
  },
];
type Role = 'admin' | 'manager' | 'user'
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['import', 'status', 'analysis', 'settings', 'users'],
  manager: ['import', 'status', 'analysis', 'settings'],
  user: ['analysis'],
}

const BasicLayout: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const [msg, holder] = message.useMessage();

  const selectedKeys = useMemo(() => {
    if (location.pathname.startsWith('/import')) return ['import'];
    if (location.pathname.startsWith('/status')) return ['status'];
    if (location.pathname.startsWith('/analysis')) return ['analysis'];
    if (location.pathname.startsWith('/settings')) return ['settings'];
    if (location.pathname.startsWith('/users')) return ['users'];
    return [];
  }, [location.pathname]);

  const visibleMenu = useMemo(() => {
    const role: Role = (user?.role as Role) || 'user'
    const allowed = ROLE_PERMISSIONS[role]
    return MENU_ITEMS.filter((i: any) => allowed.includes(i.key as string))
  }, [user])

  

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'import') navigate('/import');
    if (key === 'status') navigate('/status');
    if (key === 'analysis') navigate('/analysis');
    if (key === 'settings') navigate('/settings');
    if (key === 'users') navigate('/users');
  };

  useEffect(() => {
    authService.me().then((r) => {
      if (r?.user) setUser(r.user);
    }).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const handler = () => {
      authService.me().then((r) => {
        if (r?.user) setUser(r.user); else setUser(null);
      }).catch(() => setUser(null));
    }
    window.addEventListener('auth-changed', handler)
    return () => { window.removeEventListener('auth-changed', handler) }
  }, [])

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    msg.success('已退出登录');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        breakpoint="lg"
        collapsedWidth={64}
        style={{ background: 'var(--color-bg-card)' }}
      >
        <div style={{
          height: 'var(--layout-header-height)',
          display: 'flex', alignItems: 'center', paddingInline: 16,
          borderBottom: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <img src="/EnHealth.png" alt="EnHealth" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1677ff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 170 }}>实验动物室环境数据系统</span>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={visibleMenu}
          onClick={handleMenuClick}
          style={{ paddingTop: 16, borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span />
          <Space>
            {holder}
            {user ? (
              <>
                <Typography.Text>{user.username}</Typography.Text>
                <Button size="small" onClick={logout}>退出</Button>
              </>
            ) : (
              <Button size="small" onClick={() => navigate('/login')}>登录</Button>
            )}
          </Space>
        </Header>
        <Content>
          <div className="page-container">
            {/* 移除页面面包屑显示 */}
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default BasicLayout;
