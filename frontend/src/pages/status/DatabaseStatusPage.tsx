import { Card, Descriptions, Table, Drawer, Space, Button, DatePicker } from 'antd';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { analyticsService } from '../../services/analyticsService';
import MultiAreaTimelineECharts from '../../components/status/MultiAreaTimelineECharts';
import ExportTool from '../../components/status/ExportTool';
import DeleteTool from '../../components/status/DeleteTool';
import type { AreaItem } from '../../services/analyticsService';

const { RangePicker } = DatePicker;

const DatabaseStatusPage: FC = () => {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedArea, setSelectedArea] = useState<AreaItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: overview } = useQuery({ queryKey: ['analytics:overview'], queryFn: analyticsService.getOverview });

  const params = useMemo(() => {
    const start = range[0] ? range[0].valueOf() : undefined;
    const end = range[1] ? range[1].valueOf() : undefined;
    return { start, end, page, pageSize, sort: 'count' as const };
  }, [range, page, pageSize]);

  const { data: areas, refetch: refetchAreas, isLoading } = useQuery({ queryKey: ['analytics:areas', params], queryFn: () => analyticsService.getAreas(params) });

  const { data: segmentsData, refetch: refetchSegments } = useQuery({
    queryKey: ['analytics:segments', selectedArea?.areaId, range[0]?.valueOf(), range[1]?.valueOf()],
    queryFn: () =>
      selectedArea
        ? analyticsService.getAreaSegments({ areaId: selectedArea.areaId, start: range[0]?.valueOf(), end: range[1]?.valueOf(), granularity: 'record', limit: 200, gapToleranceMinutes: 20 })
        : Promise.resolve({ segments: [], segmentsCount: 0 }),
    enabled: !!selectedArea,
  });

  

  const columns = [
    { title: '区域', dataIndex: 'areaName', render: (v: string) => v.replace('检隔室','检疫室') },
    { title: '数据量', dataIndex: 'count', width: 120 },
    { title: '最早时间', dataIndex: 'timeMin', render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-') },
    { title: '最晚时间', dataIndex: 'timeMax', render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-') },
    { title: '段数量', dataIndex: 'segmentsCount', width: 120 },
    {
      title: '操作',
      width: 160,
      render: (_: any, record: AreaItem) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedArea(record);
              setDrawerOpen(true);
              setTimeout(() => refetchSegments(), 0);
            }}
          >
            查看时间段
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="数据库概览">
        <Descriptions column={3}>
          <Descriptions.Item label="区域总数">{overview?.areasTotal ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="记录总数">{overview?.recordsTotal ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="时间范围">
            {overview?.timeRange?.min ? dayjs(overview.timeRange.min).format('YYYY-MM-DD HH:mm') : '-'} ~{' '}
            {overview?.timeRange?.max ? dayjs(overview.timeRange.max).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="分区域统计" extra={<RangePicker value={range} onChange={(v) => setRange(v as any)} showTime />}> 
        <Table
          rowKey={(r) => String(r.areaId)}
          loading={isLoading}
          columns={columns as any}
          dataSource={areas?.list ?? []}
          pagination={{
            current: areas?.page ?? page,
            pageSize: areas?.pageSize ?? pageSize,
            total: areas?.total ?? 0,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              refetchAreas();
            },
          }}
        />
      </Card>

      {/* 多区域时间线（ECharts） */}
      <MultiAreaTimelineECharts areas={areas?.list ?? []} refreshKey={refreshKey} />

      {/* 导出工具（主界面） */}
      <ExportTool areas={areas?.list ?? []} />
      <DeleteTool areas={areas?.list ?? []} onDeleted={() => {
        queryClient.invalidateQueries({ queryKey: ['analytics:overview'] });
        queryClient.invalidateQueries({ queryKey: ['analytics:areas'] });
        if (selectedArea) setTimeout(() => refetchSegments(), 0);
        setRefreshKey((k) => k + 1);
      }} />

      <Drawer
        title={selectedArea ? `时间段（${selectedArea.areaName.replace('检隔室','检疫室')}）` : '时间段'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Table
            rowKey={(r) => `${r.start}-${r.end}`}
            dataSource={segmentsData?.segments ?? []}
            columns={[
              { title: '开始', dataIndex: 'start', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
              { title: '结束', dataIndex: 'end', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
              { title: '记录数', dataIndex: 'count', width: 120 },
            ] as any}
            pagination={false}
          />
          {segmentsData && segmentsData.segments.length > 1 ? (
            <Card size="small">
              缺失段数：{Math.max(0, (segmentsData.segments.length - 1))}；
              {(() => {
                const gaps = [] as Array<{ start: string; end: string }>;
                const segs = segmentsData.segments;
                for (let i = 1; i < segs.length; i++) {
                  gaps.push({ start: segs[i - 1].end, end: segs[i].start });
                }
                return (
                  <div style={{ marginTop: 8 }}>
                    {gaps.map((g, idx) => (
                      <div key={idx} style={{ fontSize: 12 }}>缺失：{dayjs(g.start).format('YYYY-MM-DD HH:mm')} ~ {dayjs(g.end).format('YYYY-MM-DD HH:mm')}</div>
                    ))}
                  </div>
                );
              })()}
            </Card>
          ) : null}
        </Space>
      </Drawer>
    </Space>
  );
};

export default DatabaseStatusPage;