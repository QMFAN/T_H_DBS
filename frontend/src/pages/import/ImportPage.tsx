import { Button, Flex, Space, Typography, Upload, Tag, Divider, message, Spin, Empty, Modal, Card, Progress, Checkbox, Pagination } from 'antd';
import { UploadOutlined, CloudSyncOutlined, WarningOutlined } from '@ant-design/icons';
import type { FC } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import SectionCard from '../../components/common/SectionCard';
import UnifiedProgressModal from '../../components/common/UnifiedProgressModal';
import importService from '../../services/importService';
import type {
  ConflictDetail,
  ConflictAreaGroup,
  ImportHistoryItem,
} from '../../types/import';
import config from '../../config/env';

const ImportPage: FC = () => {
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    visible: boolean;
    minimized: boolean;
    current: number;
    total: number;
    action: string;
    mode: 'determinate' | 'indeterminate';
  }>({
    visible: false,
    minimized: false,
    current: 0,
    total: 0,
    action: '',
    mode: 'determinate',
  });

  const invalidateImportQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['import-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['import-conflicts'] }),
      queryClient.invalidateQueries({ queryKey: ['import-history'] }),
    ]);
  }, [queryClient]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['import-summary'],
    queryFn: importService.fetchDashboardSummary,
  });

  const { data: conflictOverview, isLoading: conflictsLoading } = useQuery({
    queryKey: ['import-conflicts'],
    queryFn: importService.fetchConflicts,
  });

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const { data: historyPage, isLoading: historyLoading } = useQuery({
    queryKey: ['import-history', page, pageSize],
    queryFn: () => importService.fetchHistoryPaged(page, pageSize),
  });

  const refreshAfterDelete = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['import-history', page, pageSize] })
    await queryClient.refetchQueries({ queryKey: ['import-summary'] })
  }, [queryClient])

  const handleDeleteHistory = useCallback((taskId: string) => {
    let deleteFile = true
    modal.confirm({
      title: '确认删除该导入记录？',
      content: (
        <Space direction="vertical">
          <Typography.Text>删除后将移除导入历史，操作不可恢复。</Typography.Text>
          <Checkbox defaultChecked onChange={(e) => { deleteFile = e.target.checked }}>同时删除原始 Excel 文件</Checkbox>
        </Space>
      ),
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => {
        await importService.deleteHistoryItem(taskId, { deleteFile })
        await refreshAfterDelete()
      },
    })
  }, [modal, refreshAfterDelete])

  const uploadMutation = useMutation({
    mutationFn: (files: RcFile[]) => importService.uploadFiles(files),
    onSuccess: async (result) => {
      messageApi.success(`导入完成：新增 ${result.imported} 条，冲突 ${result.conflicts} 条`);
      setFileList([]);
      // 强制刷新所有数据
      await queryClient.refetchQueries({ queryKey: ['import-summary'] });
      await queryClient.refetchQueries({ queryKey: ['import-conflicts'] });
      await queryClient.refetchQueries({ queryKey: ['import-history'] });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : '导入失败，请稍后再试';
      messageApi.error(description);
    },
  });

  

  const onlyExcel = useCallback((files: UploadFile[]) => {
    return files.filter((f) => {
      const name = (f.originFileObj as File | undefined)?.name?.toLowerCase() || f.name?.toLowerCase() || ''
      return name.endsWith('.xls') || name.endsWith('.xlsx')
    })
  }, [])


  const toRcFiles = useCallback((items: UploadFile[]): RcFile[] => {
    return onlyExcel(items)
      .map((item) => item.originFileObj)
      .filter((file): file is RcFile => Boolean(file) && typeof (file as RcFile).uid === 'string');
  }, [onlyExcel]);

  const handleUpload = useCallback(async () => {
    const files = toRcFiles(fileList);

    if (!files.length) {
      messageApi.info('请先选择至少一个 Excel 文件');
      return;
    }

    await uploadMutation.mutateAsync(files);
  }, [fileList, messageApi, toRcFiles, uploadMutation]);

  

  const handleBulkSkipDuplicates = useCallback(async () => {
    if (processingKey?.startsWith('bulk-')) {
      messageApi.warning('当前已有批量操作正在进行，请稍后再试');
      return;
    }

    if (!conflictOverview?.duplicates.anomalyIds.length) {
      messageApi.info('没有待处理的重复数据');
      return;
    }

    const anomalyIds = conflictOverview.duplicates.anomalyIds;
    const total = anomalyIds.length;

    setBatchProgress({
      visible: true,
      minimized: false,
      current: 0,
      total,
      action: '跳过重复数据',
      mode: 'indeterminate',
    });
    setProcessingKey('bulk-skip-duplicates');

    try {
      await importService.bulkResolveConflicts({
        type: 'duplicate',
        action: 'skip',
        anomalyIds,
      });
      setBatchProgress(prev => ({ ...prev, current: prev.total }));
      messageApi.success(`已批量跳过 ${total} 条重复数据`);
      await invalidateImportQueries();
    } catch (error) {
      const description = error instanceof Error ? error.message : '操作失败，请稍后再试';
      messageApi.error(description);
    } finally {
      setBatchProgress({
        visible: false,
        minimized: false,
        current: 0,
        total: 0,
        action: '',
        mode: 'determinate',
      });
      setProcessingKey(null);
    }
  }, [conflictOverview, invalidateImportQueries, messageApi, processingKey]);

  const handleBulkOverwriteDuplicates = useCallback(async () => {
    console.log('批量覆盖按钮被点击');
    console.log('conflictOverview:', conflictOverview);
    console.log('anomalyIds:', conflictOverview?.duplicates.anomalyIds);

    if (processingKey?.startsWith('bulk-')) {
      messageApi.warning('当前已有批量操作正在进行，请稍后再试');
      return;
    }

    if (!conflictOverview?.duplicates.anomalyIds.length) {
      messageApi.info('没有待处理的重复数据');
      return;
    }

    console.log('准备显示确认对话框');

    modal.confirm({
      title: '确认批量覆盖重复数据？',
      content: '该操作将使用新导入的数据覆盖数据库中已有的记录，不可撤销。',
      okText: '确认覆盖',
      okType: 'danger',
      cancelText: '取消',
      centered: true,
      onOk: () => {
        void (async () => {
          console.log('用户点击了确认覆盖');
          const anomalyIds = conflictOverview.duplicates.anomalyIds;
          const total = anomalyIds.length;

          setBatchProgress({
            visible: true,
            minimized: false,
            current: 0,
            total,
            action: '覆盖重复数据',
            mode: 'indeterminate',
          });
          setProcessingKey('bulk-overwrite-duplicates');

          try {
            await importService.bulkResolveConflicts({
              type: 'duplicate',
              action: 'overwrite',
              anomalyIds,
            });

            setBatchProgress(prev => ({ ...prev, current: prev.total }));

            messageApi.success(`已批量覆盖 ${total} 条重复数据`);
            await invalidateImportQueries();
          } catch (error) {
            const description = error instanceof Error ? error.message : '操作失败，请稍后再试';
            messageApi.error(description);
          } finally {
            setBatchProgress({
              visible: false,
              minimized: false,
              current: 0,
              total: 0,
              action: '',
              mode: 'determinate',
            });
            setProcessingKey(null);
          }
        })();
      },
    });
  }, [conflictOverview, invalidateImportQueries, messageApi, modal, processingKey]);

  const handleSkipConflict = useCallback(
    async (anomalyId: string) => {
      const key = `skip:${anomalyId}`;
      setProcessingKey(key);
      try {
        await importService.skipConflict(anomalyId);
        messageApi.success('已跳过该冲突记录');
        await invalidateImportQueries();
      } catch (error) {
        const description = error instanceof Error ? error.message : '操作失败，请稍后再试';
        messageApi.error(description);
      } finally {
        setProcessingKey(null);
      }
    },
    [invalidateImportQueries, messageApi],
  );

  const handleOverwriteConflict = useCallback(
    async (anomalyId: string, variantId: string) => {
      const key = `overwrite:${anomalyId}:${variantId}`;
      setProcessingKey(key);
      try {
        await importService.overwriteConflict(anomalyId, variantId);
        messageApi.success('已覆盖并更新该冲突记录');
        await invalidateImportQueries();
      } catch (error) {
        const description = error instanceof Error ? error.message : '操作失败，请稍后再试';
        messageApi.error(description);
      } finally {
        setProcessingKey(null);
      }
    },
    [invalidateImportQueries, messageApi],
  );

  const handleBulkSkipConflicts = useCallback(
    async (anomalyIds: string[]) => {
      if (processingKey?.startsWith('bulk-')) {
        messageApi.warning('当前已有批量操作正在进行，请稍后再试');
        return;
      }

      if (!anomalyIds.length) {
        messageApi.info('没有待处理的冲突数据');
        return;
      }

      const total = anomalyIds.length;
      setBatchProgress({
        visible: true,
        minimized: false,
        current: 0,
        total,
        action: '跳过冲突数据',
        mode: 'indeterminate',
      });
      setProcessingKey('bulk-skip-conflicts');
      
      try {
        await importService.bulkResolveConflicts({ type: 'conflict', action: 'skip', anomalyIds });
        setBatchProgress(prev => ({ ...prev, current: prev.total }));
        messageApi.success(`已批量跳过 ${total} 条冲突数据`);
        await invalidateImportQueries();
      } catch (error) {
        const description = error instanceof Error ? error.message : '操作失败，请稍后再试';
        messageApi.error(description);
      } finally {
        setBatchProgress({
          visible: false,
          minimized: false,
          current: 0,
          total: 0,
          action: '',
          mode: 'determinate',
        });
        setProcessingKey(null);
      }
    },
    [invalidateImportQueries, messageApi, processingKey],
  );

  const handleBulkOverwriteConflicts = useCallback(
    async (anomalyIds: string[], areaName: string) => {
      if (processingKey?.startsWith('bulk-')) {
        messageApi.warning('当前已有批量操作正在进行，请稍后再试');
        return;
      }

      if (!anomalyIds.length) {
        messageApi.info('没有待处理的冲突数据');
        return;
      }

      modal.confirm({
        title: `确认批量覆盖${areaName ? ` ${areaName} ` : ''}数据？`,
        content: '该操作将使用新导入的数据覆盖数据库中已有的记录，不可撤销。',
        okText: '确认覆盖',
        okType: 'danger',
        cancelText: '取消',
        centered: true,
        onOk: async () => {
          const total = anomalyIds.length;
          setBatchProgress({
            visible: true,
            minimized: false,
            current: 0,
            total,
            action: '覆盖冲突数据',
            mode: 'indeterminate',
          });
          setProcessingKey('bulk-overwrite-conflicts');
          
          try {
            await importService.bulkResolveConflicts({ type: 'conflict', action: 'overwrite', anomalyIds });
            setBatchProgress(prev => ({ ...prev, current: prev.total }));
            messageApi.success(`已批量覆盖 ${total} 条冲突数据`);
            await invalidateImportQueries();
          } catch (error) {
            const description = error instanceof Error ? error.message : '操作失败，请稍后再试';
            messageApi.error(description);
          } finally {
            setBatchProgress({
              visible: false,
              minimized: false,
              current: 0,
              total: 0,
              action: '',
              mode: 'determinate',
            });
            setProcessingKey(null);
          }
        },
      });
    },
    [invalidateImportQueries, messageApi, modal, processingKey],
  );

  const summaryStats = useMemo(() => {
    const pendingConflicts =
      (conflictOverview?.duplicates.pendingCount ?? 0) +
      (conflictOverview?.conflicts.reduce((sum, group) => sum + group.anomalies.length, 0) ?? 0);

    return {
      pendingFiles: summary?.pendingFiles ?? fileList.length,
      importedRecords: summary?.importedRecords ?? 0,
      pendingConflicts,
    };
  }, [summary, fileList.length, conflictOverview]);

  const historyList = useMemo(() => {
    return (historyPage?.items ?? []).map((item: ImportHistoryItem) => ({
      ...item,
      uploadedAtText: dayjs(item.uploadedAt).format('YYYY-MM-DD HH:mm'),
      fileUrl: item.fileUrl ? `${config.importsBaseUrl}${item.fileUrl}` : undefined,
    }));
  }, [historyPage]);

  const isUploading = uploadMutation.isPending;
  
  const isBulkProcessing = processingKey?.startsWith('bulk-') ?? false;
  const progressPercent = batchProgress.total > 0
    ? Math.round((batchProgress.current / batchProgress.total) * 100)
    : 0;

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}
      {/* 批量操作进度模态框 - 可拖拽、可最小化 */}
      {batchProgress.visible && (
        <UnifiedProgressModal
          visible={batchProgress.visible}
          minimized={batchProgress.minimized}
          actionText={batchProgress.action}
          total={batchProgress.total}
          current={batchProgress.current}
          mode={batchProgress.mode}
          onMinimize={() => setBatchProgress(prev => ({ ...prev, minimized: !prev.minimized }))}
          onHideWindow={() => setBatchProgress(prev => ({ ...prev, visible: false }))}
        />
      )}


      {/* 最小化后的浮动按钮 */}
      {batchProgress.visible && batchProgress.minimized && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            cursor: 'pointer',
          }}
          onClick={() => setBatchProgress(prev => ({ ...prev, minimized: false }))}
        >
          <Card
            size="small"
            hoverable
            style={{
              width: 280,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Flex align="center" gap={12}>
              <Spin size="small" />
              <div style={{ flex: 1 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                  {batchProgress.action}中...
                </Typography.Text>
                {batchProgress.mode === 'determinate' ? (
                  <>
                    <Progress
                      percent={progressPercent}
                      size="small"
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {batchProgress.current} / {batchProgress.total}
                    </Typography.Text>
                  </>
                ) : (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    共 {batchProgress.total} 条数据正在处理...
                  </Typography.Text>
                )}
              </div>
            </Flex>
          </Card>
        </div>
      )}


      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <SectionCard
          title="导入文件"
          description="支持一次导入多个 Excel 文件，系统会自动校验时间戳与区域映射，检测重复与冲突数据。"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(420px, 1fr)', gap: 24, alignItems: 'start' }}>
            <div>
              <Flex wrap gap={24}>
                <StatBox label="待导入文件" value={summaryStats.pendingFiles} loading={summaryLoading} />
                <StatBox label="已导入记录" value={summaryStats.importedRecords} loading={summaryLoading} valueColor="var(--color-success)" />
                <StatBox label="需人工处理" value={summaryStats.pendingConflicts} loading={summaryLoading} valueColor="var(--color-warning)" />
              </Flex>
            </div>
            <div style={{ position: 'relative' }}>
              <Upload.Dragger
                multiple
                accept=".xls,.xlsx"
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: nextList }) => setFileList(onlyExcel(nextList))}
                onRemove={(file) => {
                  setFileList(prev => prev.filter(f => f.uid !== file.uid))
                  return true
                }}
                showUploadList={{ showRemoveIcon: true }}
                disabled={isUploading}
              >
                <p className="ant-upload-drag-icon">
                  <CloudSyncOutlined style={{ color: 'var(--color-primary)' }} />
                </p>
                <Typography.Title level={4} style={{ marginBottom: 8 }}>
                  拖拽或点击上传 Excel
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                  支持 .xlsx / .xls；可拖拽文件或点击下方按钮选择文件夹批量导入（自动识别文件夹内的 Excel 文件）。文件将存储并生成下载链接 ({config.importsBaseUrl})
                </Typography.Paragraph>
              </Upload.Dragger>
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <Upload
                  directory
                  beforeUpload={() => false}
                  showUploadList={false}
                  onChange={({ fileList: dirFiles }) => setFileList(onlyExcel(dirFiles))}
                >
                  <Button icon={<UploadOutlined />}>选择文件夹</Button>
                </Upload>
              </div>
              {isUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                  <Flex vertical align="center" gap={12}>
                    <Spin size="large" />
                    <Typography.Text>正在导入，请稍候...</Typography.Text>
                  </Flex>
                </div>
              )}
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <Button type="primary" icon={<UploadOutlined />} onClick={handleUpload} loading={isUploading}>
                  开始导入
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>

      <SectionCard
        title="导入历史"
        description="查看最近导入记录，可快速定位冲突并决定跳过或覆盖。"
        extra={null}
      >
        {historyLoading ? (
          <Flex justify="center" style={{ paddingBlock: 32 }}>
            <Spin />
          </Flex>
        ) : historyList.length ? (
          <>
            <HistoryList items={historyList} onDelete={handleDeleteHistory} />
            <Flex justify="end" style={{ marginTop: 16 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={historyPage?.total ?? 0}
                showSizeChanger
                onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
              />
            </Flex>
          </>
        ) : (
          <Empty description="暂无导入记录" />
        )}
      </SectionCard>

      <SectionCard
        title="重复数据处理"
        description="以下数据与数据库已有记录完全相同，可批量跳过或覆盖。"
      >
        {conflictsLoading ? (
          <Flex justify="center" style={{ paddingBlock: 32 }}>
            <Spin />
          </Flex>
        ) : conflictOverview && conflictOverview.duplicates.pendingCount > 0 ? (
          <Card size="small" style={{ background: 'var(--color-warning-bg, #fffbe6)', borderColor: 'var(--color-warning)' }}>
            <Flex justify="space-between" align="center" wrap gap={16}>
              <Space direction="vertical" size={4}>
                <Typography.Text strong>
                  <WarningOutlined style={{ color: 'var(--color-warning)', marginRight: 8 }} />
                  共 {conflictOverview.duplicates.pendingCount} 条重复记录，涉及 {conflictOverview.duplicates.recordCount} 条数据
                </Typography.Text>
                <Space wrap>
                  {conflictOverview.duplicates.areaSummaries.map((area) => (
                    <Tag key={area.areaName} color="gold">
                      {area.areaName}：{area.anomalyCount} 条异常 / {area.recordCount} 条记录
                    </Tag>
                  ))}
                </Space>
              </Space>
              <Space>
                <Button onClick={handleBulkSkipDuplicates} loading={isBulkProcessing && processingKey === 'bulk-skip-duplicates'}>
                  批量跳过
                </Button>
                <Button type="primary" danger onClick={handleBulkOverwriteDuplicates} loading={isBulkProcessing && processingKey === 'bulk-overwrite-duplicates'}>
                  批量覆盖
                </Button>
              </Space>
            </Flex>
          </Card>
        ) : (
          <Empty description="暂无重复数据" />
        )}
      </SectionCard>

      <SectionCard
        title="数据冲突处理"
        description="以下时间点存在多个不同的温湿度值，请选择需要保留的数据。"
      >
        {conflictsLoading ? (
          <Flex justify="center" style={{ paddingBlock: 32 }}>
            <Spin />
          </Flex>
        ) : conflictOverview && conflictOverview.conflicts.length > 0 ? (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            {conflictOverview.conflicts.map((group: ConflictAreaGroup) => {
              const pendingAnomalies = group.anomalies.filter(a => a.status === 'pending');
              const anomalyIds = pendingAnomalies.map(a => a.anomalyId);
              return (
                <div key={group.areaName}>
                  <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
                    <Flex align="center" gap={12}>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        {group.areaName}
                      </Typography.Title>
                      <Tag color="magenta">{group.anomalies.length} 条冲突</Tag>
                    </Flex>
                    {pendingAnomalies.length > 0 && (
                      <Space>
                        <Button size="small" onClick={() => handleBulkSkipConflicts(anomalyIds)} loading={isBulkProcessing && processingKey === 'bulk-skip-conflicts'}>
                          批量跳过
                        </Button>
                        <Button size="small" type="primary" danger onClick={() => handleBulkOverwriteConflicts(anomalyIds, group.areaName)} loading={isBulkProcessing && processingKey === 'bulk-overwrite-conflicts'}>
                          批量覆盖
                        </Button>
                      </Space>
                    )}
                  </Flex>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {group.anomalies.map((conflict: ConflictDetail) => {
                      const existingVariant = conflict.variants.find(v => v.existingCount > 0 && v.newCount === 0);
                      const newVariant = conflict.variants.find(v => v.newCount > 0);
                      return (
                        <Card key={conflict.anomalyId} size="small" style={{ background: '#fff', border: '1px solid #d9d9d9' }}>
                          <Flex vertical gap={4}>
                            <Flex justify="space-between" align="center">
                              <Typography.Text strong style={{ fontSize: 11 }}>
                                {dayjs(conflict.timestamp).format('YYYY-MM-DD HH:mm')}
                              </Typography.Text>
                              {conflict.status === 'resolved' ? (
                                <Tag color="success" style={{ margin: 0, fontSize: 10, padding: '0 3px', lineHeight: '16px' }}>已处理</Tag>
                              ) : (
                                <Tag color="warning" style={{ margin: 0, fontSize: 10, padding: '0 3px', lineHeight: '16px' }}>待确认</Tag>
                              )}
                            </Flex>
                            <Divider style={{ margin: '1px 0' }} />
                            <Flex gap={4}>
                              {existingVariant && (
                                <div style={{ flex: 1, padding: 4, background: '#f5f5f5', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                                  <Typography.Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 1 }}>已存在</Typography.Text>
                                  <Typography.Text style={{ fontSize: 10, display: 'block', lineHeight: '14px' }}>温度 {existingVariant.temperature ?? '—'}</Typography.Text>
                                  <Typography.Text style={{ fontSize: 10, display: 'block', lineHeight: '14px' }}>湿度 {existingVariant.humidity ?? '—'}</Typography.Text>
                                </div>
                              )}
                              {newVariant && (
                                <div style={{ flex: 1, padding: 4, background: '#e6f7ff', borderRadius: 2, border: '1px solid #91d5ff' }}>
                                  <Typography.Text type="secondary" style={{ fontSize: 9, color: '#1890ff', display: 'block', marginBottom: 1 }}>新增</Typography.Text>
                                  <Typography.Text style={{ fontSize: 10, display: 'block', lineHeight: '14px' }}>温度 {newVariant.temperature ?? '—'}</Typography.Text>
                                  <Typography.Text style={{ fontSize: 10, display: 'block', lineHeight: '14px' }}>湿度 {newVariant.humidity ?? '—'}</Typography.Text>
                                </div>
                              )}
                            </Flex>
                            {conflict.status === 'pending' && (
                              <Flex gap={3} style={{ marginTop: 1 }}>
                                <Button size="small" block onClick={() => handleSkipConflict(conflict.anomalyId)} loading={processingKey === `skip:${conflict.anomalyId}`}>跳过</Button>
                                {newVariant && (
                                  <Button type="primary" size="small" block onClick={() => handleOverwriteConflict(conflict.anomalyId, newVariant.variantId)} loading={processingKey === `overwrite:${conflict.anomalyId}:${newVariant.variantId}`}>覆盖</Button>
                                )}
                              </Flex>
                            )}
                          </Flex>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Space>
        ) : (
          <Empty description="暂无冲突数据" />
        )}
      </SectionCard>

      </Space>
    </>
  );
};

interface HistoryListProps {
  items: Array<ImportHistoryItem & { uploadedAtText: string }>;
  onDelete: (taskId: string) => void;
}

const HistoryList: FC<HistoryListProps> = ({ items, onDelete }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {items.map((item) => (
        <Card
          key={item.id}
          hoverable
          style={{ borderRadius: 10 }}
          extra={
            <Space>
              {item.fileUrl && (
                <Button type="link" href={item.fileUrl} target="_blank">下载原文件</Button>
              )}
              <Button type="link" danger onClick={() => onDelete(item.id)}>
                删除
              </Button>
            </Space>
          }
        >
          <Flex vertical gap={6}>
            <Typography.Text strong>{item.fileName}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>导入时间：{item.uploadedAtText}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>成功 {item.imported} / 重复 {item.duplicates} / 冲突 {item.conflicts}</Typography.Text>
            {(item.anomaliesTotal ?? 0) > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                异常处理进度：{item.anomaliesProcessed ?? 0} / {item.anomaliesTotal}（跳过 {item.skipCount ?? 0} / 覆盖 {item.overwriteCount ?? 0}）
              </Typography.Text>
            )}
          </Flex>
        </Card>
      ))}
    </div>
  );
};

interface StatBoxProps {
  label: string;
  value: number;
  valueColor?: string;
  loading?: boolean;
}

const StatBox: FC<StatBoxProps> = ({ label, value, valueColor, loading }) => {
  return (
    <Flex
      vertical
      gap={8}
      style={{
        minWidth: 220,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '16px 20px',
      }}
    >
      <Typography.Text type="secondary">{label}</Typography.Text>
      {loading ? (
        <Spin size="small" />
      ) : (
        <Typography.Title
          level={4}
          style={{ margin: 0, color: valueColor ?? 'var(--color-text-base)' }}
        >
          {value}
        </Typography.Title>
      )}
    </Flex>
  );
};

export default ImportPage;
