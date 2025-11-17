import { Button, Card, Flex, Modal, Progress, Space, Spin, Typography } from 'antd'
import type { FC } from 'react'
import { MinusOutlined, CloseOutlined } from '@ant-design/icons'

interface UnifiedProgressModalProps {
  visible: boolean
  minimized: boolean
  actionText: string
  total: number
  current: number
  mode: 'indeterminate' | 'determinate'
  onMinimize: () => void
  onHideWindow: () => void
}

const UnifiedProgressModal: FC<UnifiedProgressModalProps> = ({ visible, minimized, actionText, total, current, mode, onMinimize, onHideWindow }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <>
      {visible && !minimized && (
        <Modal
          open
          title={
            <Flex justify="space-between" align="center">
              <span>正在{actionText}</span>
              <Space size={8}>
                <Button type="text" size="small" icon={<MinusOutlined />} onClick={onMinimize} title="最小化" />
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={onHideWindow} title="关闭" />
              </Space>
            </Flex>
          }
          footer={null}
          closable={false}
          mask={false}
          width={480}
          style={{ top: 100 }}
        >
          <Space direction="vertical" size={24} style={{ width: '100%', paddingTop: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
            </div>
            <div>
              {mode === 'determinate' ? (
                <>
                  <Flex justify="space-between" style={{ marginBottom: 8 }}>
                    <Typography.Text>处理进度</Typography.Text>
                    <Typography.Text strong>
                      {current} / {total}
                    </Typography.Text>
                  </Flex>
                  <Progress percent={percent} status="active" strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} />
                </>
              ) : (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text>已提交请求，共 {total} 条数据正在处理...</Typography.Text>
                  <Typography.Text type="secondary">操作完成后会自动刷新，大批量数据可能需要数秒。</Typography.Text>
                </Space>
              )}
            </div>
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
              批量操作在后台进行，您可以继续其他操作
            </Typography.Text>
          </Space>
        </Modal>
      )}
      {visible && minimized && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, cursor: 'pointer' }} onClick={onMinimize}>
          <Card size="small" hoverable style={{ width: 280, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <Flex align="center" gap={12}>
              <Spin size="small" />
              <div style={{ flex: 1 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                  {actionText}中...
                </Typography.Text>
                {mode === 'determinate' ? (
                  <>
                    <Progress percent={percent} size="small" showInfo={false} strokeColor="#1890ff" />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {current} / {total}
                    </Typography.Text>
                  </>
                ) : (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    共 {total} 条数据正在处理...
                  </Typography.Text>
                )}
              </div>
            </Flex>
          </Card>
        </div>
      )}
    </>
  )
}

export default UnifiedProgressModal