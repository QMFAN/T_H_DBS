import { ConfigProvider, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import BasicLayout from '../layouts/BasicLayout';
import LoginPage from '../pages/login/LoginPage';
import LoginCallbackPage from '../pages/login/LoginCallbackPage';
import UsersPage from '../pages/users/UsersPage';
import SettingsPage from '../pages/settings/SettingsPage';
import ImportPage from '../pages/import/ImportPage';
import DatabaseStatusPage from '../pages/status/DatabaseStatusPage';
import SmartAnalysisPage from '../pages/analysis/SmartAnalysisPage';

const queryClient = new QueryClient();

const App: FC = () => {
  if (typeof window !== 'undefined') {
    const _warn = console.warn;
    const _err = console.error;
    const _log = console.log;
    console.warn = (...args: any[]) => {
      const msg = args && args[0];
      if (typeof msg === 'string' && (msg.includes('[antd: compatible]') || msg.includes('Tracking Prevention blocked access to storage'))) return;
      _warn(...args);
    };
    console.error = (...args: any[]) => {
      const msg = args && args[0];
      if (typeof msg === 'string' && msg.includes('Tracking Prevention blocked access to storage')) return;
      _err(...args);
    };
    console.log = (...args: any[]) => {
      const msg = args && args[0];
      if (typeof msg === 'string' && msg.includes('post message redirect')) return;
      _log(...args);
    };
  }
  const RequireAuth: FC<{ children: any }> = ({ children }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const [status, setStatus] = useState<'checking' | 'ok' | 'fail'>(token ? 'checking' : 'fail');
    const nav = useNavigate();
    useEffect(() => {
      if (!token) { setStatus('fail'); return; }
      import('../services/authService').then(({ authService }) => {
        authService.me().then((r: any) => {
          if (r?.user) setStatus('ok'); else {
            localStorage.removeItem('auth_token'); localStorage.removeItem('refresh_token'); setStatus('fail'); nav('/login', { replace: true });
          }
        }).catch(() => { localStorage.removeItem('auth_token'); localStorage.removeItem('refresh_token'); setStatus('fail'); nav('/login', { replace: true }); });
      });
    }, [token]);
    if (status === 'checking') return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Spin /></div>);
    if (status === 'fail') return <Navigate to="/login" replace />;
    return children as any;
  };
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2f66f6',
          borderRadius: 10,
          fontSize: 14,
          colorTextBase: '#1e1e2d',
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#ffffff',
          },
          Menu: {
            itemBorderRadius: 8,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/callback" element={<LoginCallbackPage />} />
            <Route path="/" element={<RequireAuth><BasicLayout /></RequireAuth>}>
              <Route index element={<Navigate to="/import" replace />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="status" element={<DatabaseStatusPage />} />
              <Route path="analysis" element={<SmartAnalysisPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/import" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
