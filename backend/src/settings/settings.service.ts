import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaDefaultsEntity } from '../entities/area-defaults.entity';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { ImportTask } from '../entities/import-task.entity';
import { Inject } from '@nestjs/common';
import {
  ANOMALY_STORE,
  AnomalyStore,
} from '../excel-import/anomaly-store.interface';
import { AnalyticsCacheService } from '../analytics/analytics-cache.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AreaDefaultsEntity)
    private readonly repo: Repository<AreaDefaultsEntity>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(SensorData)
    private readonly sensorRepo: Repository<SensorData>,
    @InjectRepository(ImportTask)
    private readonly taskRepo: Repository<ImportTask>,
    @Inject(ANOMALY_STORE) private readonly anomalyStore: AnomalyStore,
    private readonly analyticsCache: AnalyticsCacheService,
    private readonly config: ConfigService,
  ) {}

  private deviationTextDefaults() {
    return {
      roomLabelSuffix: '动物室',
      tempIntroTemplate:
        '试验方案规定动物室内的温度为{tempMin}℃至{tempMax}℃，但本项目所在{areaText}出现温度偏离的情况：',
      humIntroTemplate:
        '试验方案规定动物室内的相对湿度为{humMin}%至{humMax}%，但本项目所在{areaText}出现相对湿度偏离的情况：',
      tempLineTemplate:
        '（{index}）在{date}的{startTime}至{endTime}，温度为{min}℃至{max}℃。',
      humLineTemplate:
        '（{index}）在{date}的{startTime}至{endTime}，相对湿度为{min}%至{max}%。',
      impactTemplate:
        '以上时间段{温度/湿度}偏离的幅度小，持续时间短，在{日期}对动物进行一般临床观察未见相关异常，故认为该{温度/湿度}的偏离对试验结果的可靠性及试验的完整性无有害影响。该试验计划偏离将被写入报告。',
    };
  }

  private deviationTextFilePath(): string {
    const base =
      this.config.get<string>('SETTINGS_STORAGE_DIR') ||
      path.join(process.cwd(), 'storage');
    return path.join(base, 'deviation-text.json');
  }

  async getDeviationText(): Promise<{
    roomLabelSuffix: string;
    tempIntroTemplate: string;
    humIntroTemplate: string;
    tempLineTemplate: string;
    humLineTemplate: string;
    impactTemplate: string;
  }> {
    const file = this.deviationTextFilePath();
    try {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      const buf = await fs.promises.readFile(file, 'utf8');
      const parsed = JSON.parse(buf);
      const d = this.deviationTextDefaults();
      return {
        roomLabelSuffix:
          typeof parsed.roomLabelSuffix === 'string'
            ? parsed.roomLabelSuffix
            : d.roomLabelSuffix,
        tempIntroTemplate:
          typeof parsed.tempIntroTemplate === 'string'
            ? parsed.tempIntroTemplate
            : d.tempIntroTemplate,
        humIntroTemplate:
          typeof parsed.humIntroTemplate === 'string'
            ? parsed.humIntroTemplate
            : d.humIntroTemplate,
        tempLineTemplate:
          typeof parsed.tempLineTemplate === 'string'
            ? parsed.tempLineTemplate
            : d.tempLineTemplate,
        humLineTemplate:
          typeof parsed.humLineTemplate === 'string'
            ? parsed.humLineTemplate
            : d.humLineTemplate,
        impactTemplate:
          typeof parsed.impactTemplate === 'string'
            ? parsed.impactTemplate
            : d.impactTemplate,
      };
    } catch {
      const d = this.deviationTextDefaults();
      await fs.promises.writeFile(file, JSON.stringify(d, null, 2), 'utf8');
      return d;
    }
  }

  async updateDeviationText(payload: any): Promise<{
    roomLabelSuffix: string;
    tempIntroTemplate: string;
    humIntroTemplate: string;
    tempLineTemplate: string;
    humLineTemplate: string;
    impactTemplate: string;
  }> {
    const d = this.deviationTextDefaults();
    const next = {
      roomLabelSuffix:
        typeof payload?.roomLabelSuffix === 'string'
          ? payload.roomLabelSuffix
          : d.roomLabelSuffix,
      tempIntroTemplate:
        typeof payload?.tempIntroTemplate === 'string'
          ? payload.tempIntroTemplate
          : d.tempIntroTemplate,
      humIntroTemplate:
        typeof payload?.humIntroTemplate === 'string'
          ? payload.humIntroTemplate
          : d.humIntroTemplate,
      tempLineTemplate:
        typeof payload?.tempLineTemplate === 'string'
          ? payload.tempLineTemplate
          : d.tempLineTemplate,
      humLineTemplate:
        typeof payload?.humLineTemplate === 'string'
          ? payload.humLineTemplate
          : d.humLineTemplate,
      impactTemplate:
        typeof payload?.impactTemplate === 'string'
          ? payload.impactTemplate
          : d.impactTemplate,
    };
    const file = this.deviationTextFilePath();
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  async listAreas(): Promise<Array<{ code: string; name: string }>> {
    const as = await this.areaRepo.find({ order: { id: 'ASC' } });
    return as.map((a) => ({ code: a.code, name: a.name }));
  }

  async getDefaults(area_code: string): Promise<AreaDefaultsEntity | null> {
    return this.repo.findOne({ where: { area_code } });
  }

  async upsertDefaults(
    payload: Partial<AreaDefaultsEntity>,
  ): Promise<AreaDefaultsEntity> {
    const ex = await this.repo.findOne({
      where: { area_code: payload.area_code! },
    });
    if (ex) {
      Object.assign(ex, payload);
      return this.repo.save(ex);
    }
    const base = {
      temp_min: 20,
      temp_max: 26,
      humidity_min: 40,
      humidity_max: 70,
      temp_duration_min: 30,
      humidity_duration_min: 30,
      gap_tolerance_minutes: 30,
      tolerance_normal_budget: 0,
    };
    const toSave: Partial<AreaDefaultsEntity> = { ...base, ...payload };
    const entity = this.repo.create(toSave as AreaDefaultsEntity);
    return this.repo.save(entity);
  }

  async deleteArea(code: string): Promise<void> {
    const area = await this.areaRepo.findOne({ where: { code } });
    if (!area) return;
    const count = await this.sensorRepo.count({ where: { areaId: area.id } });
    if (count > 0)
      throw new BadRequestException('该区域存在传感数据，无法删除');
    await this.repo.delete({ area_code: code });
    await this.areaRepo.delete({ id: area.id });
    const overview = await this.anomalyStore.getOverview();
    const parseCode = (name: string) => {
      const trimmed = name?.trim() ?? '';
      const normalized = trimmed.replace(/\s+/g, '');
      const baseMatch = normalized.match(
        /(动物室\d+[A-Za-z]*|检疫隔离室\d+[A-Za-z]*|检疫室\d+[A-Za-z]*|检隔室\d+[A-Za-z]*|隔离室\d+[A-Za-z]*)/,
      );
      let display = baseMatch ? baseMatch[0] : trimmed;
      const reorder = display.match(
        /^(\d+[A-Za-z]*)(检疫隔离室|检疫室|检隔室|隔离室|动物室)$/,
      );
      if (reorder) display = `${reorder[2]}${reorder[1]}`;
      const codeMatch = display.match(/(\d+[A-Za-z]*)/);
      return (codeMatch ? codeMatch[1] : 'UNKNOWN').toUpperCase();
    };
    const dupIds: string[] = [];
    for (const id of overview.duplicates.anomalyIds || []) {
      const item = await this.anomalyStore.findById(id);
      if (item && parseCode(item.areaName) === code.toUpperCase())
        dupIds.push(id);
    }
    const conflictIds = [] as string[];
    for (const g of overview.conflicts) {
      if (parseCode(g.areaName) === code.toUpperCase()) {
        for (const a of g.anomalies) conflictIds.push(a.anomalyId);
      }
    }
    if (dupIds.length)
      await this.updateTasksAfterBulk(
        await this.anomalyStore.bulkResolve('duplicate', 'skip', dupIds),
      );
    if (conflictIds.length)
      await this.updateTasksAfterBulk(
        await this.anomalyStore.bulkResolve('conflict', 'skip', conflictIds),
      );
    this.analyticsCache.del('analytics:overview');
    this.analyticsCache.del('analytics:areas');
    this.analyticsCache.del('analytics:segments:');
  }

  private async updateTasksAfterBulk(
    resolved: Array<{ taskNumericId: number }>,
  ): Promise<void> {
    if (!resolved.length) return;
    const byTask = new Map<number, number>();
    for (const r of resolved)
      byTask.set(r.taskNumericId, (byTask.get(r.taskNumericId) ?? 0) + 1);
    for (const [taskId, inc] of byTask.entries()) {
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      if (!task) continue;
      task.anomaliesProcessed = (task.anomaliesProcessed ?? 0) + inc;
      task.skipCount = (task.skipCount ?? 0) + inc;
      const pendingForTask =
        await this.anomalyStore.pendingCountForTask(taskId);
      task.status = pendingForTask === 0 ? 'completed' : 'processing';
      task.progressLastAt = new Date();
      await this.taskRepo.save(task);
    }
  }
}
