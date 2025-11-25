import { Card, DatePicker, Form, InputNumber, Select, Space, Button, Divider, Typography, Table, Tag, Row, Col, message, List, Switch, Drawer, Tabs } from 'antd';
import * as echarts from 'echarts';
import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { smartAnalysisService } from '../../services/smartAnalysisService';
import type { AnalyzeResult, QueryResult } from '../../types/smart-analysis';
import http from '../../services/http';

const { RangePicker } = DatePicker;

const SmartAnalysisPage: FC = () => {
  const [areas, setAreas] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [area, setArea] = useState<string>('');
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryRes, setQueryRes] = useState<QueryResult | null>(null);
  const [anaRes, setAnaRes] = useState<AnalyzeResult | null>(null);
  const [params, setParams] = useState<{ tempMin?: number; tempMax?: number; humidityMin?: number; humidityMax?: number; tempDurationMin?: number; humidityDurationMin?: number }>({});
  const [messageApi, contextHolder] = message.useMessage();
  const [timelineSegments, setTimelineSegments] = useState<{ start: string; end: string }[]>([]);
  const [timelineWindow, setTimelineWindow] = useState<{ start: string; end: string } | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const timelineChartRef = useRef<any>(null);
  const curveRef = useRef<HTMLDivElement | null>(null);
  const curveChartRef = useRef<any>(null);
  const [showTemp, setShowTemp] = useState<boolean>(true);
  const [showHum, setShowHum] = useState<boolean>(true);
  const [deviationDrawerOpen, setDeviationDrawerOpen] = useState<boolean>(false);
  const [deviationActiveTab, setDeviationActiveTab] = useState<string>('content');
  const [deviationTextCfg, setDeviationTextCfg] = useState<{ roomLabelSuffix: string; tempIntroTemplate: string; humIntroTemplate: string; tempLineTemplate?: string; humLineTemplate?: string; impactTempTemplate?: string; impactHumTemplate?: string } | null>(null);
  const fmt1 = (v: number | null | undefined) => (v == null ? '-' : Number(v).toFixed(1));
  const DEFAULTS = { tempMin: 20, tempMax: 26, humidityMin: 40, humidityMax: 70, tempDurationMin: 30, humidityDurationMin: 30 };
  const [form] = Form.useForm();
  const cacheLoadedRef = useRef(false);

  useEffect(() => {
    smartAnalysisService.getAreas().then((d) => {
      const list = d.areas || []
      const parse = (name: string) => { const m = name.match(/(\d+)([A-Za-z]*)/); return { num: m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER, suffix: m ? m[2] : '' } }
      const sorted = [...list].sort((a, b) => { const pa = parse(a.name); const pb = parse(b.name); if (pa.num !== pb.num) return pa.num - pb.num; return pa.suffix.localeCompare(pb.suffix) })
      setAreas(sorted)
    });
    const cached = localStorage.getItem('smart_analysis_cache');
    if (cached) {
      const c = JSON.parse(cached);
      if (c.area) setArea(c.area);
      if (c.range && Array.isArray(c.range) && c.range.length === 2) setRange([c.range[0] ? dayjs(c.range[0]) : null, c.range[1] ? dayjs(c.range[1]) : null]);
      if (c.params) { setParams(c.params); form.setFieldsValue(c.params); }
      if (c.queryRes) setQueryRes(c.queryRes);
      if (c.anaRes) setAnaRes(c.anaRes);
    }
    cacheLoadedRef.current = true;
  }, []);

  useEffect(() => {
    const BASE = { roomLabelSuffix: '动物室', tempIntroTemplate: '试验方案规定动物室内的温度为{tempMin}℃至{tempMax}℃，但本项目所在{areaText}出现温度偏离的情况：', humIntroTemplate: '试验方案规定动物室内的相对湿度为{humMin}%至{humMax}%，但本项目所在{areaText}出现相对湿度偏离的情况：', tempLineTemplate: '（{index}）在{date}的{startTime}至{endTime}，温度为{min}℃至{max}℃。', humLineTemplate: '（{index}）在{date}的{startTime}至{endTime}，相对湿度为{min}%至{max}%。', impactTempTemplate: '以上时间段温度偏离的幅度小，持续时间短，在{date}对动物进行一般临床观察未见相关异常，故认为该温度的偏离对试验结果的可靠性及试验的完整性无有害影响。该试验计划偏离将被写入报告。', impactHumTemplate: '以上时间段相对湿度偏离的幅度小，持续时间短，在{date}对动物进行一般临床观察未见相关异常，故认为该相对湿度的偏离对试验结果的可靠性及试验的完整性无有害影响。该试验计划偏离将被写入报告。' };
    http.get('/settings/deviation-text').then((r) => {
      const d = r?.data?.deviationTextCfg;
      if (!d) { setDeviationTextCfg(BASE); return; }
      const cfg = {
        roomLabelSuffix: typeof d.roomLabelSuffix === 'string' ? d.roomLabelSuffix : BASE.roomLabelSuffix,
        tempIntroTemplate: typeof d.tempIntroTemplate === 'string' ? d.tempIntroTemplate : BASE.tempIntroTemplate,
        humIntroTemplate: typeof d.humIntroTemplate === 'string' ? d.humIntroTemplate : BASE.humIntroTemplate,
        tempLineTemplate: typeof d.tempLineTemplate === 'string' ? d.tempLineTemplate : BASE.tempLineTemplate,
        humLineTemplate: typeof d.humLineTemplate === 'string' ? d.humLineTemplate : BASE.humLineTemplate,
        impactTempTemplate: typeof d.impactTempTemplate === 'string' ? d.impactTempTemplate : BASE.impactTempTemplate,
        impactHumTemplate: typeof d.impactHumTemplate === 'string' ? d.impactHumTemplate : BASE.impactHumTemplate,
      };
      setDeviationTextCfg(cfg);
    }).catch(() => { setDeviationTextCfg(BASE); });
  }, []);

  useEffect(() => {
    if (!cacheLoadedRef.current) return;
    const payload = { area, range: range ? [range[0]?.toISOString() ?? null, range[1]?.toISOString() ?? null] : null, params, queryRes, anaRes };
    localStorage.setItem('smart_analysis_cache', JSON.stringify(payload));
  }, [area, range, params, queryRes, anaRes]);

  useEffect(() => { form.setFieldsValue(params); }, [params]);

  useEffect(() => {
    if (!area) return;
    http.get('/settings/defaults', { params: { area } }).then((r) => {
      const d = r.data?.defaults;
      if (!d) return;
      const mapped: any = {
        tempMin: d.temp_min != null ? Number(d.temp_min) : undefined,
        tempMax: d.temp_max != null ? Number(d.temp_max) : undefined,
        humidityMin: d.humidity_min != null ? Number(d.humidity_min) : undefined,
        humidityMax: d.humidity_max != null ? Number(d.humidity_max) : undefined,
        tempDurationMin: d.temp_duration_min != null ? Number(d.temp_duration_min) : undefined,
        humidityDurationMin: d.humidity_duration_min != null ? Number(d.humidity_duration_min) : undefined,
      };
      setParams(mapped);
    }).catch(() => {});
  }, [area]);

  useEffect(() => {
    if (area) return;
    setParams({});
    form.resetFields();
  }, [area]);

  useEffect(() => {
    if (!area) { setTimelineSegments([]); setTimelineWindow(null); if (timelineChartRef.current) { timelineChartRef.current.dispose(); timelineChartRef.current = null; } return; }
    const hasRange = !!(range && range[0] && range[1]);
    const win = hasRange
      ? { start: (range![0] as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss'), end: (range![1] as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss') }
      : { start: '1970-01-01 00:00:00', end: '2100-12-31 23:59:59' };
    smartAnalysisService.segments({ area, start: win.start, end: win.end, granularity: 'record' })
      .then((res) => {
        const segs = res?.segments || [];
        setTimelineSegments(segs);
        if (segs.length) {
          const min = segs.reduce((m, s) => (m && m < s.start ? m : s.start), segs[0].start);
          const max = segs.reduce((m, s) => (m && m > s.end ? m : s.end), segs[0].end);
          if (hasRange) {
            setTimelineWindow({ start: win.start, end: win.end });
          } else {
            setTimelineWindow({ start: dayjs(min).format('YYYY-MM-DD HH:mm:ss'), end: dayjs(max).format('YYYY-MM-DD HH:mm:ss') });
          }
        } else {
          setTimelineWindow(win);
        }
      })
      .catch(() => { setTimelineSegments([]); setTimelineWindow(null); });
  }, [area, range]);

  useEffect(() => {
    const render = () => {
      if (!timelineRef.current) return;
      if (!timelineChartRef.current) timelineChartRef.current = echarts.init(timelineRef.current);
      const segs = timelineSegments || [];
      if (!segs.length && !timelineWindow) { timelineChartRef.current.clear(); return; }
      const hasRange = !!(range && range[0] && range[1]);
      const min = hasRange
        ? dayjs(range![0] as any).valueOf()
        : (segs.length
          ? dayjs(segs.reduce((m, s) => (m && m < s.start ? m : s.start), segs[0].start)).valueOf()
          : dayjs(timelineWindow!.start).valueOf());
      const max = hasRange
        ? dayjs(range![1] as any).valueOf()
        : (segs.length
          ? dayjs(segs.reduce((m, s) => (m && m > s.end ? m : s.end), segs[0].end)).valueOf()
          : dayjs(timelineWindow!.end).valueOf());
      const data = segs.map((s) => [dayjs(s.start).valueOf(), dayjs(s.end).valueOf(), 0]);
      timelineChartRef.current.setOption({
        grid: { left: 20, right: 10, top: 6, bottom: 18 },
        xAxis: { type: 'time', min, max, axisLabel: { hideOverlap: true } },
        yAxis: [
          { type: 'category', data: [], show: false, axisLabel: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
          { type: 'value', show: false, min: 0, max: 1 }
        ],
        tooltip: { trigger: 'item', formatter: (p: any) => `${dayjs(p.value[0]).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(p.value[1]).format('YYYY-MM-DD HH:mm')}` },
        series: [{
          type: 'custom',
          renderItem: (params: any, api: any) => {
            void params; const yIdx = api.value(2); const start = api.coord([api.value(0), yIdx]); const end = api.coord([api.value(1), yIdx]);
            const height = 12; return { type: 'rect', shape: { x: start[0], y: start[1] - height / 2, width: Math.max(1, end[0] - start[0]), height }, style: { fill: '#69c0ff' } };
          },
          encode: { x: [0, 1], y: 2 },
          data,
        },
        {
          name: '边界',
          type: 'line',
          yAxisIndex: 1,
          data: [],
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { color: '#8c8c8c', type: 'dashed' },
            label: { show: false },
            data: [ { xAxis: min }, { xAxis: max } ]
          }
        }],
      });
      timelineChartRef.current.resize();
    };
    render();
    const onResize = () => timelineChartRef.current && timelineChartRef.current.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [timelineSegments, timelineWindow, range]);
  useEffect(() => {
    const render = () => {
      if (!curveRef.current) return;
      if (!curveChartRef.current) curveChartRef.current = echarts.init(curveRef.current);
      const hasData = !!(queryRes && queryRes.data && queryRes.data.length);
      const temps = hasData ? (queryRes!.data || []).filter((d) => d.temperature != null).map((d) => [dayjs(d.timestamp).valueOf(), d.temperature as number]) : [];
      const hums = hasData ? (queryRes!.data || []).filter((d) => d.humidity != null).map((d) => [dayjs(d.timestamp).valueOf(), d.humidity as number]) : [];
      const minTime = (range && range[0]) ? dayjs(range[0] as any).valueOf() : (hasData ? dayjs((queryRes!.data || [])[0]?.timestamp || dayjs()).valueOf() : dayjs().startOf('day').valueOf());
      const maxTime = (range && range[1]) ? dayjs(range[1] as any).valueOf() : (hasData ? dayjs((queryRes!.data || []).slice(-1)[0]?.timestamp || dayjs()).valueOf() : dayjs().endOf('day').valueOf());
      const tMin = params.tempMin ?? DEFAULTS.tempMin; const tMax = params.tempMax ?? DEFAULTS.tempMax;
      const hMin = params.humidityMin ?? DEFAULTS.humidityMin; const hMax = params.humidityMax ?? DEFAULTS.humidityMax;
      const series: any[] = [];
      const legend: string[] = [];
      if (showTemp) {
        legend.push('温度');
        series.push({ name: '温度', type: 'line', showSymbol: false, smooth: true, yAxisIndex: 0, itemStyle: { color: '#ff7875' }, data: temps,
          markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { type: 'dashed', color: '#ff4d4f' }, data: [ { yAxis: tMin }, { yAxis: tMax } ] } });
      }
      if (showHum) {
        legend.push('湿度');
        series.push({ name: '湿度', type: 'line', showSymbol: false, smooth: true, yAxisIndex: 1, itemStyle: { color: '#40a9ff' }, data: hums,
          markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { type: 'dashed', color: '#1890ff' }, data: [ { yAxis: hMin }, { yAxis: hMax } ] } });
      }
      const option = {
        grid: { left: 40, right: 40, top: 20, bottom: 40 },
        legend: { data: legend },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, formatter: (items: any[]) => {
          if (!items || !items.length) return '';
          const t = dayjs(items[0].axisValue).format('YYYY-MM-DD HH:mm:ss');
          const lines = [t];
          items.forEach((it) => {
            const isTemp = it.seriesName === '温度';
            const unit = isTemp ? '℃' : '%';
            const val = it.data ? (Array.isArray(it.data) ? it.data[1] : it.data) : it.value;
            lines.push(`${it.marker}${it.seriesName}: ${val}${unit}`);
          });
          return lines.join('<br/>');
        } },
        xAxis: { type: 'time', min: minTime, max: maxTime },
        yAxis: [ { type: 'value', position: 'left', min: 0, max: 35 }, { type: 'value', position: 'right', min: 0, max: 100 } ],
        dataZoom: [ { type: 'slider', xAxisIndex: 0, startValue: minTime, endValue: maxTime }, { type: 'inside', xAxisIndex: 0, startValue: minTime, endValue: maxTime } ],
        series,
      } as any;
      curveChartRef.current.setOption(option, true);
      curveChartRef.current.resize();
    };
    render();
    const onResize = () => curveChartRef.current && curveChartRef.current.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [queryRes, showTemp, showHum, params, range]);

  const areaOptions = useMemo(() => areas.map((a) => ({ label: a.name.replace('检隔室','检疫室'), value: a.code })), [areas]);

  const handleQueryAnalyze = async () => {
    const missing: string[] = [];
    if (!area) missing.push('区域');
    if (!range || !range[0] || !range[1]) missing.push('时间范围');
    if (missing.length) { messageApi.warning(`请填写：${missing.join('、')}`); return; }
    const thresholdMissing: string[] = [];
    const effectiveParams = { ...params };
    if (effectiveParams.tempMin == null) { effectiveParams.tempMin = DEFAULTS.tempMin; thresholdMissing.push('温度下限'); }
    if (effectiveParams.tempMax == null) { effectiveParams.tempMax = DEFAULTS.tempMax; thresholdMissing.push('温度上限'); }
    if (effectiveParams.humidityMin == null) { effectiveParams.humidityMin = DEFAULTS.humidityMin; thresholdMissing.push('湿度下限'); }
    if (effectiveParams.humidityMax == null) { effectiveParams.humidityMax = DEFAULTS.humidityMax; thresholdMissing.push('湿度上限'); }
    if (effectiveParams.tempDurationMin == null) { effectiveParams.tempDurationMin = DEFAULTS.tempDurationMin; thresholdMissing.push('温度持续(分)'); }
    if (effectiveParams.humidityDurationMin == null) { effectiveParams.humidityDurationMin = DEFAULTS.humidityDurationMin; thresholdMissing.push('湿度持续(分)'); }
    if (thresholdMissing.length) { messageApi.info(`已使用系统默认阈值/持续：${thresholdMissing.join('、')}`); }
    setLoading(true);
    try {
      const [startD, endD] = range as [dayjs.Dayjs, dayjs.Dayjs];
      const start = startD.format('YYYY-MM-DD HH:mm:ss');
      const end = endD.format('YYYY-MM-DD HH:mm:ss');
      const qRes = await smartAnalysisService.query({ area, start, end });
      setQueryRes(qRes);
      if (!qRes?.success) {
        messageApi.warning(qRes?.message || '查询结果为空或失败');
      }
      const aRes = await smartAnalysisService.analyze({ area, start, end, ...effectiveParams });
      if (!aRes?.success) {
        messageApi.warning(aRes?.message || '分析失败');
        setAnaRes(null);
      } else {
        setAnaRes(aRes);
      }
    } catch (e: any) {
      messageApi.error(`查询分析失败：${e?.message ?? '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setArea('');
    setRange(null);
    setParams({});
    form.resetFields();
    setQueryRes(null);
    setAnaRes(null);
    setTimelineSegments([]);
    setTimelineWindow(null);
    if (timelineChartRef.current) { timelineChartRef.current.dispose(); timelineChartRef.current = null; }
    if (curveChartRef.current) { curveChartRef.current.dispose(); curveChartRef.current = null; }
    localStorage.removeItem('smart_analysis_cache');
    messageApi.success('已重置并清空缓存');
  };

  const missingDisplay = useMemo(() => {
    if (!queryRes) return [] as { start: string; end: string }[];
    return queryRes.missingRanges || [];
  }, [queryRes]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {contextHolder}
      <Card title="数据查询与分析">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Form layout="inline" style={{ flex: 1 }}>
            <Form.Item label="区域">
              <Select style={{ minWidth: 240 }} options={areaOptions} value={area || undefined} onChange={(v) => setArea(v ?? '')} placeholder="选择区域" allowClear showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          <Form.Item label="时间范围">
            <RangePicker showTime value={range as any} onChange={(v) => setRange(v as any)} allowClear />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleQueryAnalyze} loading={loading}>查询分析</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={handleReset}>重置</Button>
          </Form.Item>
        </Form>
        </div>
        {(Boolean(timelineWindow) || timelineSegments.length > 0) ? (
          <div style={{ marginTop: 12 }}>
            <div ref={timelineRef} style={{ width: '50%', height: 46 }} />
          </div>
        ) : null}
        <Divider />
        <Form layout="vertical" form={form} onValuesChange={(_, all) => setParams(all)}>
          <Row gutter={16}>
            <Col xs={12} sm={8} md={6} lg={6} xl={4}>
              <Form.Item label="温度下限（℃）" name="tempMin"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6} lg={6} xl={4}>
              <Form.Item label="温度上限（℃）" name="tempMax"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6} lg={6} xl={4}>
              <Form.Item label="湿度下限（%）" name="humidityMin"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6} lg={6} xl={4}>
              <Form.Item label="湿度上限（%）" name="humidityMax"><InputNumber step={0.1} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6} lg={6} xl={4}>
              <Form.Item label="温度持续(min)" name="tempDurationMin"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6} lg={6} xl={4}>
              <Form.Item label="湿度持续(min)" name="humidityDurationMin"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {queryRes && (
      <Card>
          {(!queryRes.availableRanges?.length && !missingDisplay?.length) ? (
            <Typography.Text type="secondary">暂无数据</Typography.Text>
          ) : (
            <Row gutter={16}>
              <Col xs={24} md={12}>
            <Typography.Text strong>存在时间段（{queryRes?.availableRanges?.length ?? 0}）</Typography.Text>
                <List grid={{ gutter: 12, column: 3 }} dataSource={queryRes.availableRanges || []} renderItem={(r) => (
                  <List.Item>
                    <Card size="small" hoverable bordered style={{ borderColor: '#8c8c8c' }} bodyStyle={{ padding: 8 }}>
                      <Typography.Text>开始：{r.start}</Typography.Text>
                      <br />
                      <Typography.Text>结束：{r.end}</Typography.Text>
                    </Card>
                  </List.Item>
                )} />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Text strong>缺失时间段（{missingDisplay?.length ?? 0}）：</Typography.Text>
                <List grid={{ gutter: 12, column: 3 }} dataSource={missingDisplay || []} renderItem={(r) => (
                  <List.Item>
                    <Card size="small" hoverable bordered style={{ borderColor: '#8c8c8c' }} bodyStyle={{ padding: 8 }}>
                      <Typography.Text>开始：{r.start}</Typography.Text>
                      <br />
                      <Typography.Text>结束：{r.end}</Typography.Text>
                    </Card>
                  </List.Item>
                )} />
              </Col>
            </Row>
          )}
        </Card>
      )}

    {(queryRes?.data?.length) ? (
      <Card title="温湿度数据曲线">
        <Space style={{ marginBottom: 8 }}>
          <Switch checked={showTemp} onChange={setShowTemp} checkedChildren="显示温度" unCheckedChildren="隐藏温度" />
          <Switch checked={showHum} onChange={setShowHum} checkedChildren="显示湿度" unCheckedChildren="隐藏湿度" />
        </Space>
        <div ref={curveRef} style={{ width: '100%', height: 320 }} />
      </Card>
    ) : null}

      {anaRes && (
        <Card title="异常分析结果" extra={<Button type="link" onClick={() => setDeviationDrawerOpen(true)}>偏离描述参考</Button>}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Title level={5}>温度连续异常区间（{anaRes.temperature_continuous_anomalies?.length ?? 0}）</Typography.Title>
                <Table size="small" rowKey={(r) => `${r.start_time}-${r.end_time}-${r.type}`} dataSource={anaRes.temperature_continuous_anomalies || []} pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '开始', dataIndex: 'start_time' },
                    { title: '结束', dataIndex: 'end_time' },
                    { title: '持续(min)', dataIndex: 'duration_minutes' },
                    { title: '类型', dataIndex: 'type', render: (t) => <Tag color={t === 'low' ? 'blue' : 'red'}>{t === 'low' ? '偏低' : '偏高'}</Tag> },
                    { title: '范围（℃）', render: (_, r: any) => `${fmt1(r.min_value)}-${fmt1(r.max_value)}` },
                  ]} />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5}>湿度连续异常区间（{anaRes.humidity_continuous_anomalies?.length ?? 0}）</Typography.Title>
                <Table size="small" rowKey={(r) => `${r.start_time}-${r.end_time}-${r.type}`} dataSource={anaRes.humidity_continuous_anomalies || []} pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '开始', dataIndex: 'start_time' },
                    { title: '结束', dataIndex: 'end_time' },
                    { title: '持续(min)', dataIndex: 'duration_minutes' },
                    { title: '类型', dataIndex: 'type', render: (t) => <Tag color={t === 'low' ? 'blue' : 'red'}>{t === 'low' ? '偏低' : '偏高'}</Tag> },
                    { title: '范围（%）', render: (_, r: any) => `${fmt1(r.min_value)}-${fmt1(r.max_value)}` },
                  ]} />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col xs={24} md={12}>
                <Typography.Title level={5}>温度异常数据点（{anaRes.temperature_anomalies?.length ?? 0}）</Typography.Title>
                <Table size="small" rowKey={(r) => `${r.timestamp}-${r.type}`}
                  dataSource={anaRes.temperature_anomalies || []}
                  pagination={{ pageSize: 10 }}
                  columns={[{ title: '时间', dataIndex: 'timestamp' }, { title: '温度', dataIndex: 'temperature', render: (v) => (v!=null ? `${v}℃` : '-') }, { title: '类型', dataIndex: 'type', render: (t) => <Tag color={t === 'low' ? 'blue' : 'red'}>{t === 'low' ? '偏低' : '偏高'}</Tag> }]} />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Title level={5}>湿度异常数据点（{anaRes.humidity_anomalies?.length ?? 0}）</Typography.Title>
                <Table size="small" rowKey={(r) => `${r.timestamp}-${r.type}`}
                  dataSource={anaRes.humidity_anomalies || []}
                  pagination={{ pageSize: 10 }}
                  columns={[{ title: '时间', dataIndex: 'timestamp' }, { title: '湿度', dataIndex: 'humidity', render: (v) => (v!=null ? `${v}%` : '-') }, { title: '类型', dataIndex: 'type', render: (t) => <Tag color={t === 'low' ? 'blue' : 'red'}>{t === 'low' ? '偏低' : '偏高'}</Tag> }]} />
              </Col>
            </Row>
        </Card>
      )}

      <Drawer title="偏离描述参考" placement="right" width="33vw" open={deviationDrawerOpen} onClose={() => setDeviationDrawerOpen(false)}>
        <Tabs activeKey={deviationActiveTab} onChange={setDeviationActiveTab}
          items={[
            { key: 'content', label: '偏离内容', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Title level={5}>温度偏离</Typography.Title>
                {(() => {
                  const tMin = params.tempMin ?? DEFAULTS.tempMin;
                  const tMax = params.tempMax ?? DEFAULTS.tempMax;
                  const areaText = `${area || ''}${(deviationTextCfg?.roomLabelSuffix ?? '动物室')}`;
                  const tpl = deviationTextCfg?.tempIntroTemplate ?? '试验方案规定动物室内的温度为{tempMin}℃至{tempMax}℃，但本项目所在{areaText}出现温度偏离的情况：';
                  const intro = tpl.replace(/\{tempMin\}/g, Number(tMin).toFixed(1)).replace(/\{tempMax\}/g, Number(tMax).toFixed(1)).replace(/\{areaText\}/g, areaText);
                  const list = (anaRes?.temperature_continuous_anomalies || []).map((r, idx) => {
                    const d = dayjs(r.start_time).format('YYYYMMDD');
                    const s = dayjs(r.start_time).format('H:mm');
                    const e = dayjs(r.end_time).format('H:mm');
                    const ltpl = deviationTextCfg?.tempLineTemplate ?? '（{index}）在{date}的{startTime}至{endTime}，温度为{min}℃至{max}℃。';
                    return ltpl
                      .replace(/\{index\}/g, String(idx + 1))
                      .replace(/\{date\}/g, d)
                      .replace(/\{startTime\}/g, s)
                      .replace(/\{endTime\}/g, e)
                      .replace(/\{min\}/g, fmt1(r.min_value))
                      .replace(/\{max\}/g, fmt1(r.max_value));
                  });
                  return (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Typography.Paragraph>{intro}</Typography.Paragraph>
                      {list.length ? list.map((line, i) => (<Typography.Paragraph key={`t-line-${i}`}>{`（${line}`}</Typography.Paragraph>)) : (
                        <Typography.Paragraph type="secondary">无温度连续异常区间</Typography.Paragraph>
                      )}
                    </Space>
                  );
                })()}
                <Divider />
                <Typography.Title level={5}>相对湿度偏离</Typography.Title>
                {(() => {
                  const hMin = params.humidityMin ?? DEFAULTS.humidityMin;
                  const hMax = params.humidityMax ?? DEFAULTS.humidityMax;
                  const areaText = `${area || ''}${(deviationTextCfg?.roomLabelSuffix ?? '动物室')}`;
                  const tpl = deviationTextCfg?.humIntroTemplate ?? '试验方案规定动物室内的相对湿度为{humMin}%至{humMax}%，但本项目所在{areaText}出现相对湿度偏离的情况：';
                  const intro = tpl.replace(/\{humMin\}/g, Number(hMin).toFixed(1)).replace(/\{humMax\}/g, Number(hMax).toFixed(1)).replace(/\{areaText\}/g, areaText);
                  const list = (anaRes?.humidity_continuous_anomalies || []).map((r, idx) => {
                    const d = dayjs(r.start_time).format('YYYYMMDD');
                    const s = dayjs(r.start_time).format('H:mm');
                    const e = dayjs(r.end_time).format('H:mm');
                    const ltpl = deviationTextCfg?.humLineTemplate ?? '（{index}）在{date}的{startTime}至{endTime}，相对湿度为{min}%至{max}%。';
                    return ltpl
                      .replace(/\{index\}/g, String(idx + 1))
                      .replace(/\{date\}/g, d)
                      .replace(/\{startTime\}/g, s)
                      .replace(/\{endTime\}/g, e)
                      .replace(/\{min\}/g, fmt1(r.min_value))
                      .replace(/\{max\}/g, fmt1(r.max_value));
                  });
                  return (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Typography.Paragraph>{intro}</Typography.Paragraph>
                      {list.length ? list.map((line, i) => (<Typography.Paragraph key={`h-line-${i}`}>{`（${line}`}</Typography.Paragraph>)) : (
                        <Typography.Paragraph type="secondary">无相对湿度连续异常区间</Typography.Paragraph>
                      )}
                    </Space>
                  );
                })()}
              </Space>
            ) },
            { key: 'reason', label: '偏离原因', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Title level={5}>偏离原因</Typography.Title>
                <Typography.Paragraph type="secondary">占位内容：后续补充可能原因的枚举、规则或说明。</Typography.Paragraph>
              </Space>
            ) },
            { key: 'impact', label: '影响评估', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Title level={5}>影响评估</Typography.Title>
                {(() => {
                  const tpl = deviationTextCfg?.impactTemplate ?? '以上时间段{温度/湿度}偏离的幅度小，持续时间短，在{日期}对动物进行一般临床观察未见相关异常，故认为该{温度/湿度}的偏离对试验结果的可靠性及试验的完整性无有害影响。该试验计划偏离将被写入报告。';
                  return (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Typography.Paragraph>{tpl}</Typography.Paragraph>
                    </Space>
                  )
                })()}
              </Space>
            ) },
          ]}
        />
      </Drawer>
    </Space>
  );
};

export default SmartAnalysisPage;
