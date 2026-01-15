import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsWarmupService implements OnModuleInit {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const enabled =
      (
        this.config.get<string>('ANALYTICS_WARMUP_ENABLED', 'true') || 'true'
      ).toLowerCase() === 'true';
    if (!enabled) return;
    const periodSec = parseInt(
      this.config.get<string>('ANALYTICS_WARMUP_CRON', '3600'),
      10,
    );
    const top = parseInt(
      this.config.get<string>('ANALYTICS_WARMUP_TOP', '20'),
      10,
    );
    await this.runOnce(top);
    setInterval(
      () => {
        void this.runOnce(top);
      },
      Math.max(60, periodSec) * 1000,
    );
  }

  private async runOnce(top: number) {
    try {
      await this.analytics.getOverview();
      const windows = [7, 30, 90];
      for (const d of windows) {
        const end = new Date();
        const start = new Date(end.getTime() - d * 24 * 60 * 60 * 1000);
        const areas = await this.analytics.getAreas({
          page: 1,
          pageSize: top,
          start,
          end,
          sort: 'count',
          order: 'desc',
        });
        for (const a of areas.list.slice(0, Math.min(top, areas.list.length))) {
          await this.analytics.getAreaSegments({
            areaId: a.areaId,
            start,
            end,
            granularity: 'day',
          });
        }
      }
    } catch {}
  }
}
