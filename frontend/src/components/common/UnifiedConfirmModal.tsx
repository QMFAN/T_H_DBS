import { Modal, Typography } from 'antd'
import type { FC } from 'react'

interface UnifiedConfirmModalProps {
  open: boolean
  scope: 'duplicate' | 'conflict'
  action: 'skip' | 'overwrite'
  count: number
  policyHint?: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

const UnifiedConfirmModal: FC<UnifiedConfirmModalProps> = ({ open, scope, action, count, policyHint, onConfirm, onCancel }) => {
  const title = action === 'skip' ? `确认批量跳过${scope === 'conflict' ? ' 冲突' : ' 重复'}数据？` : `确认批量覆盖${scope === 'conflict' ? ' 冲突' : ' 重复'}数据？`
  const contentSkip = `该操作不会写入数据库，仅清理本次导入产生的临时异常，共 ${count} 条数据。操作不可撤销。`
  const contentOverwrite = `该操作将使用新导入的数据覆盖数据库中已有的记录，共 ${count} 条数据。操作不可撤销。${policyHint ? `策略：${policyHint}` : ''}`
  return (
    <Modal
      open={open}
      title={title}
      okText={action === 'skip' ? '确认跳过' : '确认覆盖'}
      okType={action === 'skip' ? 'primary' : 'danger'}
      cancelText="取消"
      centered
      onOk={() => { void onConfirm() }}
      onCancel={onCancel}
    >
      <Typography.Paragraph>
        {action === 'skip' ? contentSkip : contentOverwrite}
      </Typography.Paragraph>
    </Modal>
  )
}

export default UnifiedConfirmModal