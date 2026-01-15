import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CacheValue = unknown;

@Injectable()
export class AnalyticsCacheService {
  private readonly store = new Map<
    string,
    { v: CacheValue; expireAt: number }
  >();
  private readonly now = () => Date.now();

  constructor(private readonly config: ConfigService) {}

  get<T = any>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (this.now() >= hit.expireAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.v as T;
  }

  set(key: string, value: CacheValue, ttlMs: number): void {
    const expireAt = this.now() + Math.max(1000, ttlMs);
    this.store.set(key, { v: value, expireAt });
  }

  del(prefix: string): void {
    const keys = Array.from(this.store.keys()).filter((k) =>
      k.startsWith(prefix),
    );
    keys.forEach((k) => this.store.delete(k));
  }

  clearAll(): void {
    this.store.clear();
  }

  // keys helpers
  keyOverview() {
    return 'analytics:overview';
  }
  keyAreas(args: {
    page: number;
    pageSize: number;
    start?: Date;
    end?: Date;
    sort?: string;
    order?: string;
  }) {
    const s = args.start?.getTime() ?? 0;
    const e = args.end?.getTime() ?? 0;
    return `analytics:areas:${args.page}:${args.pageSize}:${s}:${e}:${args.sort ?? 'count'}:${args.order ?? 'desc'}`;
  }
  keySegmentsDay(areaId: number, start?: Date, end?: Date) {
    const s = start?.getTime() ?? 0;
    const e = end?.getTime() ?? 0;
    return `analytics:segments:day:${areaId}:${s}:${e}`;
  }
  keySegmentsRecord(areaId: number, start?: Date, end?: Date, gap?: number) {
    const s = start?.getTime() ?? 0;
    const e = end?.getTime() ?? 0;
    const g = gap ?? 20;
    return `analytics:segments:rec:${areaId}:${s}:${e}:${g}`;
  }
}
