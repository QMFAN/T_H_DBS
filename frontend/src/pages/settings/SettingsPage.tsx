import { Card, Form, InputNumber, Button, Space, message, Table, Drawer } from 'antd'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import http from '../../services/http'

const SettingsPage: FC = () => {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, holder] = message.useMessage()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTitle, setDrawerTitle] = useState('编辑参数')
  const [currentCodes, setCurrentCodes] = useState<string[]>([])
  const [editForm] = Form.useForm()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const loadAll = async () => {
    setLoading(true)
    try {
      const areaRes = await http.get('/settings/areas')
      const as: Array<{ code: string; name: string }> = areaRes.data.areas || []
      const tasks = as.map(a => http.get('/settings/defaults', { params: { area: a.code } }).then(r => ({ area: a, defaults: r.data?.defaults || null })))
      const results = await Promise.all(tasks)
      const list = results.map(({ area, defaults }) => ({
        key: area.code,
        area_code: area.code,
        area_name: area.name.replace('检隔室','检疫室'),
        temp_min: defaults?.temp_min ?? null,
        temp_max: defaults?.temp_max ?? null,
        humidity_min: defaults?.humidity_min ?? null,
        humidity_max: defaults?.humidity_max ?? null,
        temp_duration_min: defaults?.temp_duration_min ?? null,
        humidity_duration_min: defaults?.humidity_duration_min ?? null,
        gap_tolerance_minutes: defaults?.gap_tolerance_minutes ?? null,
        tolerance_normal_budget: defaults?.tolerance_normal_budget ?? null,
      }))
      setRows(list)
    } catch (e: any) { msg.error(e?.message ?? '加载失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadAll() }, [])

  const openEdit = (codes: string[], bulk: boolean) => {
    setCurrentCodes(codes)
    setDrawerTitle(bulk ? `批量修改（${codes.length} 项）` : '编辑参数')
    if (!bulk && codes.length === 1) {
      const row = rows.find(r => r.area_code === codes[0])
      editForm.setFieldsValue({
        temp_min: row?.temp_min ?? undefined,
        temp_max: row?.temp_max ?? undefined,
        humidity_min: row?.humidity_min ?? undefined,
        humidity_max: row?.humidity_max ?? undefined,
        temp_duration_min: row?.temp_duration_min ?? undefined,
        humidity_duration_min: row?.humidity_duration_min ?? undefined,
        gap_tolerance_minutes: row?.gap_tolerance_minutes ?? undefined,
        tolerance_normal_budget: row?.tolerance_normal_budget ?? undefined,
      })
    } else {
      editForm.resetFields()
    }
    setDrawerOpen(true)
  }

  const applyUpdate = async () => {
    const v = await editForm.validateFields()
    const payload = Object.fromEntries(Object.entries(v).filter(([_, val]) => val !== undefined && val !== null))
    setLoading(true)
    try {
      for (const code of currentCodes) {
        await http.put('/settings/defaults', { ...payload, area_code: code })
      }
      msg.success('已保存')
      setDrawerOpen(false)
      await loadAll()
    } catch (e: any) { msg.error(e?.message ?? '保存失败') }
    finally { setLoading(false) }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {holder}
      <Card title="系统设置（区域默认参数）" extra={
        <Space>
          <Button disabled={selectedRowKeys.length===0} onClick={()=>openEdit(selectedRowKeys as string[], true)}>批量修改</Button>
        </Space>
      }>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '区域', dataIndex: 'area_name' },
            { title: '代码', dataIndex: 'area_code' },
            { title: '温度下限', dataIndex: 'temp_min', render: (v: any) => (v!=null ? `${v}℃` : '-') },
            { title: '温度上限', dataIndex: 'temp_max', render: (v: any) => (v!=null ? `${v}℃` : '-') },
            { title: '湿度下限', dataIndex: 'humidity_min', render: (v: any) => (v!=null ? `${v}%` : '-') },
            { title: '湿度上限', dataIndex: 'humidity_max', render: (v: any) => (v!=null ? `${v}%` : '-') },
            { title: '温度持续(min)', dataIndex: 'temp_duration_min' },
            { title: '湿度持续(min)', dataIndex: 'humidity_duration_min' },
            { title: '拼接容忍(分)', dataIndex: 'gap_tolerance_minutes' },
            { title: '容错正常点', dataIndex: 'tolerance_normal_budget' },
            { title: '操作', render: (_: any, r: any) => (<Button type="link" onClick={()=>openEdit([r.area_code], false)}>编辑</Button>) },
          ]}
        />
        <Drawer title={drawerTitle} open={drawerOpen} onClose={()=>setDrawerOpen(false)} width={360} destroyOnClose>
          <Form form={editForm} layout="vertical">
            <Form.Item label="温度下限" name="temp_min"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="温度上限" name="temp_max"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="湿度下限" name="humidity_min"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="湿度上限" name="humidity_max"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="温度持续(min)" name="temp_duration_min"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="湿度持续(min)" name="humidity_duration_min"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="拼接容忍(分)" name="gap_tolerance_minutes"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="容错正常点" name="tolerance_normal_budget"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Space>
              <Button onClick={()=>setDrawerOpen(false)}>取消</Button>
              <Button type="primary" onClick={applyUpdate} loading={loading}>保存</Button>
            </Space>
          </Form>
        </Drawer>
      </Card>
    </Space>
  )
}

export default SettingsPage