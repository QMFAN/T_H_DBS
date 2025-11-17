import { Card, Space, Select, DatePicker, Button, message } from 'antd';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { analyticsService } from '../../services/analyticsService';
import type { AreaItem, SegmentItem } from '../../services/analyticsService';

const { RangePicker } = DatePicker;

interface Props {
  areas: AreaItem[];
}

const ExportTool: FC<Props> = ({ areas }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mode, setMode] = useState<'range' | 'segments'>('range');
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [selectedSegmentsByArea, setSelectedSegmentsByArea] = useState<Record<number, SegmentItem[]>>({});

  const areaOptions = useMemo(() => areas.map((a) => ({ label: a.areaName, value: a.areaId })), [areas]);

  const handleExport = async () => {
    if (!selectedIds.length) {
      message.warning('请选择至少一个区域');
      return;
    }
    if (mode === 'range') {
      if (!range[0] || !range[1]) {
        message.warning('请选择时间范围');
        return;
      }
      const body = { areaIds: selectedIds, ranges: [{ start: range[0].valueOf(), end: range[1].valueOf() }], granularity: 'record' as const };
      const blob = await analyticsService.exportCsv(body);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'export.csv'; a.click(); URL.revokeObjectURL(url);
      return;
    }
    const ranges: { start: number; end: number }[] = [];
    for (const id of selectedIds) {
      (selectedSegmentsByArea[id] ?? []).forEach((s) => ranges.push({ start: dayjs(s.start).valueOf(), end: dayjs(s.end).valueOf() }));
    }
    if (!ranges.length) {
      message.warning('请先选择至少一个时间段');
      return;
    }
    const blob = await analyticsService.exportCsv({ areaIds: selectedIds, ranges, granularity: 'record' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'export.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const loadSegments = async (ids: number[]) => {
    const selected: Record<number, SegmentItem[]> = {};
    for (const id of ids) {
      const res = await analyticsService.getAreaSegments({ areaId: id, granularity: 'record', gapToleranceMinutes: 20 });
      selected[id] = res.segments.slice(0, 5); // 默认勾选前5段，便于快速导出
    }
    setSelectedSegmentsByArea(selected);
  };

  return (
    <Card title="导出工具" extra={<Space><Select mode="multiple" style={{ minWidth: 260 }} value={selectedIds} options={areaOptions} onChange={(ids) => { setSelectedIds(ids); if (mode === 'segments') void loadSegments(ids); }} placeholder="选择导出区域" /><Select value={mode} options={[{ label: '按范围', value: 'range' }, { label: '按段', value: 'segments' }]} onChange={(m) => { setMode(m); if (m === 'segments' && selectedIds.length) void loadSegments(selectedIds); }} /></Space>}>
      {mode === 'range' ? (
        <Space>
          <RangePicker showTime value={range} onChange={(v) => setRange(v as any)} />
          <Button type="primary" onClick={handleExport}>
            导出 CSV
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {selectedIds.map((id) => {
            const area = areas.find((a) => a.areaId === id);
            const segs = selectedSegmentsByArea[id] ?? [];
            return (
              <Card key={id} size="small" title={area?.areaName ?? String(id)}>
                <Space wrap>
                  {segs.map((s) => (
                    <Button key={`${s.start}-${s.end}`} onClick={() => {
                      const next = (selectedSegmentsByArea[id] ?? []).filter((x) => !(x.start === s.start && x.end === s.end));
                      setSelectedSegmentsByArea({ ...selectedSegmentsByArea, [id]: next });
                    }}>
                      {dayjs(s.start).format('YYYY-MM-DD HH:mm')} ~ {dayjs(s.end).format('YYYY-MM-DD HH:mm')}
                    </Button>
                  ))}
                </Space>
              </Card>
            );
          })}
          <Button type="primary" onClick={handleExport}>导出选中段（CSV）</Button>
        </Space>
      )}
    </Card>
  );
};

export default ExportTool;