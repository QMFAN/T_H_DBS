import { Card, Space, Select, DatePicker, Button, message, Typography, Checkbox, Modal } from 'antd';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { analyticsService } from '../../services/analyticsService';
import type { AreaItem, SegmentItem } from '../../services/analyticsService';

const { RangePicker } = DatePicker;

interface Props {
  areas: AreaItem[];
  onDeleted?: (affected: number) => void;
}

const DeleteTool: FC<Props> = ({ areas, onDeleted }) => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [preview, setPreview] = useState<{ affected: number; byArea: Array<{ areaId: number; count: number }>; byRange: Array<{ start: string; end: string; count: number }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [segmentsByArea, setSegmentsByArea] = useState<Record<number, SegmentItem[]>>({});
  const [selectedSegmentsByArea, setSelectedSegmentsByArea] = useState<Record<number, SegmentItem[]>>({});

  const areaOptions = useMemo(() => areas.map((a) => ({ label: a.areaName, value: a.areaId })), [areas]);

  const handlePreview = async () => {
    const body: any = { areaIds: selectedIds, ranges: [] as { start: number; end: number }[] };
    if (range[0] && range[1]) body.ranges.push({ start: range[0].valueOf(), end: range[1].valueOf() });
    for (const id of selectedIds) {
      (selectedSegmentsByArea[id] ?? []).forEach((s) => body.ranges.push({ start: dayjs(s.start).valueOf(), end: dayjs(s.end).valueOf() }));
    }
    setLoading(true);
    try {
      const res = await analyticsService.deleteData({ ...body, dryRun: true });
      // eslint-disable-next-line no-console
      console.info('DELETE preview body', body);
      // eslint-disable-next-line no-console
      console.info('DELETE preview res', res);
      setPreview({ affected: res.affected, byArea: res.byArea ?? [], byRange: (res.byRange ?? []).map((r: any) => ({ start: r.start, end: r.end, count: r.count })) });
    } catch (e) {
      messageApi.error('预览失败');
    } finally {
      setLoading(false);
    }
  };

  const performDelete = async () => {
    setLoading(true);
    try {
      const body: any = { areaIds: selectedIds, ranges: [] as { start: number; end: number }[] };
      if (range[0] && range[1]) body.ranges.push({ start: range[0].valueOf(), end: range[1].valueOf() });
      for (const id of selectedIds) {
        (selectedSegmentsByArea[id] ?? []).forEach((s) => body.ranges.push({ start: dayjs(s.start).valueOf(), end: dayjs(s.end).valueOf() }));
      }
      const res = await analyticsService.deleteData({ ...body, dryRun: false });
      // eslint-disable-next-line no-console
      console.info('DELETE exec body', body);
      // eslint-disable-next-line no-console
      console.info('DELETE exec res', res);
      if ((res?.affected ?? 0) > 0) {
        messageApi.success(`已删除 ${res.affected} 条记录`);
        setPreview(null);
        await loadSegments(selectedIds); // 刷新内部段列表
        onDeleted && onDeleted(res.affected ?? 0);
      } else {
        messageApi.info('无可删除数据');
      }
    } catch (e) {
      messageApi.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = () => {
    const areaNames = selectedIds.map((id) => (areas.find((a) => a.areaId === id)?.areaName ?? String(id)).replace('检隔室','检疫室'));
    const segCount = Object.values(selectedSegmentsByArea).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
    const rangeCount = (range[0] && range[1] ? 1 : 0) + segCount;
    modal.confirm({
      title: '确认删除所选数据？',
      content: (
        <Space direction="vertical">
          <Typography.Text>区域：{areaNames.join('、') || '未选择'}</Typography.Text>
          <Typography.Text>范围/段：{rangeCount}（包含选择的时间范围与勾选的时间段）</Typography.Text>
          <Typography.Text type="secondary">删除后不可恢复，请谨慎操作。</Typography.Text>
        </Space>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      centered: true,
      onOk: () => { void performDelete(); },
    });
  };

  const loadSegments = async (ids: number[]) => {
    const map: Record<number, SegmentItem[]> = {};
    for (const id of ids) {
      const res = await analyticsService.getAreaSegments({ areaId: id, granularity: 'record', limit: 200, gapToleranceMinutes: 20 });
      map[id] = res.segments;
    }
    setSegmentsByArea(map);
    const defaults: Record<number, SegmentItem[]> = {};
    ids.forEach((id) => { defaults[id] = []; });
    setSelectedSegmentsByArea(defaults);
  };

  return (
    <Card title="删除工具" extra={<Space><Select style={{ minWidth: 260 }} mode="multiple" value={selectedIds} options={areaOptions} onChange={(ids) => { setSelectedIds(ids); void loadSegments(ids); }} placeholder="选择区域" /><RangePicker showTime value={range} onChange={(v) => setRange(v as any)} /></Space>}>
      {messageContextHolder}
      <Space>
        <Button onClick={handlePreview} loading={loading}>
          预览删除
        </Button>
        <Button danger type="primary" onClick={handleDeleteConfirm} loading={loading}>
          执行删除
        </Button>
      </Space>
      {modalContextHolder}
      {selectedIds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {selectedIds.map((id) => {
            const area = areas.find((a) => a.areaId === id);
            const segs = segmentsByArea[id] ?? [];
            const selected = selectedSegmentsByArea[id] ?? [];
            return (
              <Card key={id} size="small" title={`${(area?.areaName ?? String(id)).replace('检隔室','检疫室')} 的时间段`} style={{ marginTop: 8 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {segs.length === 0 ? (
                    <Typography.Text type="secondary">无可用时间段</Typography.Text>
                  ) : (
                    segs.map((s) => {
                      const key = `${s.start}-${s.end}`;
                      const checked = selected.some((x) => x.start === s.start && x.end === s.end);
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Checkbox
                            checked={checked}
                            onChange={(e) => {
                              const list = selected.slice();
                              if (e.target.checked) list.push(s); else {
                                const idx = list.findIndex((x) => x.start === s.start && x.end === s.end);
                                if (idx >= 0) list.splice(idx, 1);
                              }
                              setSelectedSegmentsByArea({ ...selectedSegmentsByArea, [id]: list });
                            }}
                          />
                          <Typography.Text>
                            {dayjs(s.start).format('YYYY-MM-DD HH:mm')} ~ {dayjs(s.end).format('YYYY-MM-DD HH:mm')}（{s.count}）
                          </Typography.Text>
                        </div>
                      );
                    })
                  )}
                </Space>
              </Card>
            );
          })}
        </div>
      )}
      {preview && (
        <div style={{ marginTop: 12 }}>
          <Typography.Text>预计删除：{preview.affected} 条</Typography.Text>
          <div style={{ marginTop: 8 }}>
            {preview.byArea.map((a) => {
              const area = areas.find((x) => x.areaId === a.areaId);
              return (
                <div key={a.areaId} style={{ fontSize: 12 }}>
                  {area?.areaName ?? a.areaId}：{a.count} 条
                </div>
              );
            })}
            {preview.byRange.map((r, idx) => (
              <div key={idx} style={{ fontSize: 12 }}>
                范围 {dayjs(r.start).format('YYYY-MM-DD HH:mm')} ~ {dayjs(r.end).format('YYYY-MM-DD HH:mm')}：{r.count} 条
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default DeleteTool;