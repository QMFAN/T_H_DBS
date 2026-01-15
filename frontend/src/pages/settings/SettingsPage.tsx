import { Card, Form, InputNumber, Button, Space, message, Table, Drawer, Modal, Input } from 'antd'
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
  const [tplForm] = Form.useForm()
  const [tplLoading, setTplLoading] = useState(false)

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
      const parse = (name: string) => { const m = name.match(/(\d+)([A-Za-z]*)/); return { num: m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER, suffix: m ? m[2] : '' } }
      const sorted = [...list].sort((a, b) => { const pa = parse(a.area_name); const pb = parse(b.area_name); if (pa.num !== pb.num) return pa.num - pb.num; return pa.suffix.localeCompare(pb.suffix) })
      setRows(sorted)
    } catch (e: any) { msg.error(e?.message ?? '加载失败') }
    finally { setLoading(false) }
  }

  const loadDeviationText = async () => {
    setTplLoading(true)
    try {
      const r = await http.get('/settings/deviation-text')
      const cfg = r?.data?.deviationTextCfg || {}
      tplForm.setFieldsValue({
        roomLabelSuffix: cfg.roomLabelSuffix ?? '动物室',
        tempIntroTemplate: cfg.tempIntroTemplate ?? '试验方案规定动物室内的温度为{tempMin}℃至{tempMax}℃，但本项目所在{areaText}出现温度偏离的情况：',
        humIntroTemplate: cfg.humIntroTemplate ?? '试验方案规定动物室内的相对湿度为{humMin}%至{humMax}%，但本项目所在{areaText}出现相对湿度偏离的情况：',
        tempLineTemplate: cfg.tempLineTemplate ?? '（{index}）在{date}的{startTime}至{endTime}，温度为{min}℃至{max}℃。',
        humLineTemplate: cfg.humLineTemplate ?? '（{index}）在{date}的{startTime}至{endTime}，相对湿度为{min}%至{max}%。',
        impactTemplate: cfg.impactTemplate ?? '以上时间段{温度/湿度}偏离的幅度小，持续时间短，在{日期}对动物进行一般临床观察未见相关异常，故认为该{温度/湿度}的偏离对试验结果的可靠性及试验的完整性无有害影响。该试验计划偏离将被写入报告。',
      })
    } catch (e: any) { msg.error(e?.message ?? '加载模板失败') }
    finally { setTplLoading(false) }
  }

  useEffect(() => { void loadAll(); void loadDeviationText() }, [])

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
          pagination={false}
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
            { title: '操作', render: (_: any, r: any) => (
              <Space>
                <Button type="link" onClick={()=>openEdit([r.area_code], false)}>编辑</Button>
                <Button type="link" danger onClick={() => {
                  Modal.confirm({
                    title: '确认删除该区域？',
                    content: '仅当数据库不存在该区域的记录时允许删除，将同时移除默认参数与区域信息。',
                    okText: '确认删除',
                    okType: 'danger',
                    cancelText: '取消',
                    centered: true,
                    onOk: async () => {
                      try {
                        await http.delete(`/settings/areas/${r.area_code}`)
                        msg.success('已删除')
                        await loadAll()
                      } catch (e: any) {
                        const serverMsg = e?.response?.data?.message
                        msg.error(serverMsg ? String(serverMsg) : (e?.message ?? '删除失败'))
                      }
                    },
                  })
                }}>删除</Button>
              </Space>
            ) },
          ]}
        />
        <Drawer title={drawerTitle} open={drawerOpen} onClose={()=>setDrawerOpen(false)} width={360} destroyOnHidden>
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

      <Card title="系统设置（偏离内容模板）" extra={<Button onClick={loadDeviationText} loading={tplLoading}>刷新</Button>}>
        <Form form={tplForm} layout="vertical" onFinish={async (v) => {
          setTplLoading(true)
          try {
            const payload = {
              roomLabelSuffix: v.roomLabelSuffix,
              tempIntroTemplate: v.tempIntroTemplate,
              humIntroTemplate: v.humIntroTemplate,
              tempLineTemplate: v.tempLineTemplate,
              humLineTemplate: v.humLineTemplate,
              impactTemplate: v.impactTemplate,
            }
            const r = await http.put('/settings/deviation-text', payload)
            const ok = r?.data?.success === true
            if (ok) { msg.success('模板已保存') } else { msg.warning('保存结果未知') }
          } catch (e: any) { msg.error(e?.response?.data?.message ?? (e?.message ?? '保存失败')) }
          finally { setTplLoading(false) }
        }}>
          <Form.Item label="房间后缀" name="roomLabelSuffix" rules={[{ required: true }]}>
            <Input placeholder="例如：动物室" />
          </Form.Item>
          <Form.Item label="温度偏离引言模板" name="tempIntroTemplate" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="包含 {tempMin}、{tempMax}、{areaText} 变量" />
          </Form.Item>
          <Form.Item label="相对湿度偏离引言模板" name="humIntroTemplate" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="包含 {humMin}、{humMax}、{areaText} 变量" />
          </Form.Item>
          <Form.Item label="温度行模板" name="tempLineTemplate" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="包含 {index}、{date}、{startTime}、{endTime}、{min}、{max} 变量" />
          </Form.Item>
          <Form.Item label="相对湿度行模板" name="humLineTemplate" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="包含 {index}、{date}、{startTime}、{endTime}、{min}、{max} 变量" />
          </Form.Item>
          <Form.Item label="影响评估统一模板" name="impactTemplate" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入固定文本，不替换任何变量" />
          </Form.Item>
          <Space>
            <Button htmlType="submit" type="primary" loading={tplLoading}>保存模板</Button>
          </Space>
        </Form>
      </Card>
    </Space>
  )
}

export default SettingsPage
