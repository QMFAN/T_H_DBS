import { Card, Table, Space, message, Button, Modal, Form, Input, Select } from 'antd'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import http from '../../services/http'

const UsersPage: FC = () => {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, holder] = message.useMessage()
  const load = async () => { setLoading(true); try { const res = await http.get('/users'); setList(res.data || []) } catch (e: any) { msg.error(e?.message ?? '加载失败') } finally { setLoading(false) } }
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState<{ open: boolean; record?: any }>({ open: false })
  const [openReset, setOpenReset] = useState<{ open: boolean; record?: any }>({ open: false })
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [resetForm] = Form.useForm()
  useEffect(() => { void load() }, [])
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {holder}
      <Card title="用户管理" extra={<Button type="primary" onClick={()=>{ setOpenAdd(true); form.resetFields(); form.setFieldsValue({ username: '', role: undefined, password: '' }) }}>新增用户</Button>}>
        <Table rowKey="id" dataSource={list} loading={loading} pagination={{ pageSize: 10 }} columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '企业微信ID', dataIndex: 'wecom_user_id' },
          { title: '密码', dataIndex: 'password_hash', render: (v: any) => (v ? '已设置（不可显示）' : '未设置') },
          { title: '角色', dataIndex: 'role', render: (r: string) => r },
          { title: '状态', dataIndex: 'status', render: (s: any) => (s === 1 || s === '1' || s === 'enabled' ? '启用' : '禁用') },
          { title: '操作', render: (_: any, record: any) => (
            <Space>
              <Button size="small" onClick={()=>{ setOpenEdit({ open: true, record }); editForm.setFieldsValue({ role: record.role, status: (record.status===1||record.status==='1'||record.status==='enabled')?'enabled':'disabled' }) }}>编辑</Button>
              <Button size="small" onClick={()=>{ setOpenReset({ open: true, record }); resetForm.resetFields() }}>重置密码</Button>
              <Button size="small" danger onClick={async ()=>{ await http.delete(`/users/${record.id}`); msg.success('已删除'); load() }}>删除</Button>
            </Space>
          ) },
        ]} />
        <Modal title="新增用户" open={openAdd} destroyOnClose onCancel={()=>setOpenAdd(false)} onOk={async ()=>{
          const v = await form.validateFields()
          const res = await http.post('/users', { username: v.username, role: v.role, status: 1 })
          const created = res.data
          if (v.password) {
            await http.post('/auth/set-password', { userId: created.id, newPassword: v.password })
          }
          msg.success('已新增')
          setOpenAdd(false)
          load()
        }}>
          <Form form={form} layout="vertical" autoComplete="off">
            <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input autoComplete="off" /></Form.Item>
            <Form.Item name="role" label="角色" rules={[{ required: true }]}><Select options={[{value:'user',label:'user'},{value:'manager',label:'manager'},{value:'admin',label:'admin'}]} /></Form.Item>
            <Form.Item name="password" label="初始密码"><Input.Password autoComplete="new-password" /></Form.Item>
          </Form>
        </Modal>
        <Modal title="编辑用户" open={openEdit.open} onCancel={()=>setOpenEdit({ open:false })} onOk={async ()=>{
          const v = await editForm.validateFields()
          await http.put(`/users/${openEdit.record.id}`, { role: v.role, status: v.status })
          msg.success('已更新')
          setOpenEdit({ open:false })
          load()
        }}>
          <Form form={editForm} layout="vertical">
            <Form.Item name="role" label="角色" rules={[{ required: true }]}><Select options={[{value:'user',label:'user'},{value:'manager',label:'manager'},{value:'admin',label:'admin'}]} /></Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{value:'enabled',label:'enabled'},{value:'disabled',label:'disabled'}]} /></Form.Item>
          </Form>
        </Modal>
        <Modal title="重置密码" open={openReset.open} onCancel={()=>setOpenReset({ open:false })} onOk={async ()=>{
          const v = await resetForm.validateFields()
          await http.post('/auth/set-password', { userId: openReset.record.id, newPassword: v.password })
          msg.success('已重置')
          setOpenReset({ open:false })
        }}>
          <Form form={resetForm} layout="vertical">
            <Form.Item name="password" label="新密码" rules={[{ required: true }]}><Input.Password /></Form.Item>
          </Form>
        </Modal>
      </Card>
    </Space>
  )
}

export default UsersPage