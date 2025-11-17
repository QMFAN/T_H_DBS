import { Card, Space, Select, DatePicker } from 'antd';
import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { analyticsService } from '../../services/analyticsService';
import type { AreaItem, SegmentItem } from '../../services/analyticsService';
import * as echarts from 'echarts';

const { RangePicker } = DatePicker;

interface Props {
  areas: AreaItem[];
  refreshKey?: number;
}


const MultiAreaTimelineECharts: FC<Props> = ({ areas, refreshKey }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [segmentsByArea, setSegmentsByArea] = useState<Record<number, SegmentItem[]>>({});
  const [zoom, setZoom] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (areas.length) {
      const parse = (name: string) => {
        const m = name.match(/(\d+)([A-Za-z]*)/);
        const num = m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
        const suffix = m ? m[2] : '';
        return { num, suffix };
      };
      const sorted = [...areas].sort((a, b) => {
        const pa = parse(a.areaName);
        const pb = parse(b.areaName);
        if (pa.num !== pb.num) return pa.num - pb.num;
        return pa.suffix.localeCompare(pb.suffix);
      });
      const maxSelect = 50;
      setSelectedIds(sorted.slice(0, maxSelect).map((a) => a.areaId));
    }
  }, [areas]);

  useEffect(() => {
    const fetchData = async () => {
      const list: Record<number, SegmentItem[]> = {};
      for (const id of selectedIds) {
        const params: any = { areaId: id, granularity: 'day' };
        if (zoom[0] && zoom[1]) { params.start = zoom[0].valueOf(); params.end = zoom[1].valueOf(); }
        const res = await analyticsService.getAreaSegments(params);
        list[id] = res.segments;
      }
      setSegmentsByArea(list);
    };
    if (selectedIds.length) void fetchData();
  }, [selectedIds, refreshKey, zoom]);

  const globalRange = useMemo(() => {
    const segs = Object.values(segmentsByArea).flat();
    if (!segs.length) return null;
    const min = dayjs(segs.reduce((m, s) => (m && m < s.start ? m : s.start), segs[0].start));
    const max = dayjs(segs.reduce((m, s) => (m && m > s.end ? m : s.end), segs[0].end));
    return [min, max] as [dayjs.Dayjs, dayjs.Dayjs];
  }, [segmentsByArea]);

  useEffect(() => {
    const render = async () => {
      if (!ref.current) return;
      if (!chartRef.current) chartRef.current = echarts.init(ref.current);
      const yCats = selectedIds.map((id) => {
        const nm = areas.find((a) => a.areaId === id)?.areaName ?? String(id);
        return nm.replace('检隔室', '检疫室');
      });
      const baseStart = (zoom[0] ?? globalRange?.[0] ?? dayjs()).valueOf();
      const baseEnd = (zoom[1] ?? globalRange?.[1] ?? dayjs()).valueOf();
      const data: Array<{ name: string; value: [number, number] } & { yIndex: number }> = [];
      selectedIds.forEach((id, idx) => {
        (segmentsByArea[id] ?? []).forEach((s) => {
          const sStart = dayjs(s.start).valueOf(); const sEnd = dayjs(s.end).valueOf();
          const vs = Math.max(sStart, baseStart); const ve = Math.min(sEnd, baseEnd); if (ve <= vs) return;
          data.push({ name: yCats[idx], value: [vs, ve], yIndex: idx });
        });
      });
      chartRef.current.setOption({
        tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>${dayjs(p.value[0]).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(p.value[1]).format('YYYY-MM-DD HH:mm')}` },
        grid: { left: 80, right: 40, top: 20, bottom: 40 },
        xAxis: { type: 'time' },
        yAxis: { type: 'category', data: yCats },
        dataZoom: [
          { type: 'slider', xAxisIndex: 0 },
          { type: 'inside', xAxisIndex: 0 },
        ],
        series: [{
          type: 'custom',
          renderItem: (params: any, api: any) => {
            void params; const yIdx = api.value(2); const start = api.coord([api.value(0), yIdx]); const end = api.coord([api.value(1), yIdx]);
            const height = 18; return { type: 'rect', shape: { x: start[0], y: start[1] - height / 2, width: Math.max(1, end[0] - start[0]), height }, style: { fill: '#91d5ff', stroke: '#69c0ff' } };
          },
          encode: { x: [0, 1], y: 2 },
          data: data.map((d) => [d.value[0], d.value[1], d.yIndex]),
        }],
      });
      chartRef.current.resize();
    };
    void render();
    const onResize = () => chartRef.current && chartRef.current.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [selectedIds, segmentsByArea, zoom, globalRange, areas]);

  const rowH = 28;
  const height = Math.max(280, (selectedIds.length || areas.length || 1) * rowH + 80);
  return (
    <Card title="多区域时间线（ECharts）" extra={<Space><Select style={{ minWidth: 320 }} mode="multiple" value={selectedIds} onChange={setSelectedIds} 
      options={areas.map(a => ({ label: a.areaName.replace('检隔室','检疫室'), value: a.areaId }))}
      placeholder="选择区域" showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
      <RangePicker showTime value={zoom} onChange={(v) => setZoom(v as any)} /></Space>}>
      <div ref={ref} style={{ width: '100%', height }} />
    </Card>
  );
};

export default MultiAreaTimelineECharts;