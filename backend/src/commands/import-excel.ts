import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { AppModule } from '../app.module';
import { ExcelImportService } from '../excel-import/excel-import.service';
import type { AnomalySourceSummaryDto as AnomalySourceSummaryRecord } from '../excel-import/dto/import.dto';

async function bootstrap(): Promise<void> {
  const logger = new Logger('ImportExcelCLI');
  const argv = process.argv.slice(2);
  if (!argv.length) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run import:excel -- <file1.xlsx> <file2.xlsx> ...');
    process.exitCode = 1;
    return;
  }

  const files = expandInputs(argv);
  if (!files.length) {
    // eslint-disable-next-line no-console
    console.error('No readable .xlsx files found for given arguments.');
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const importService = app.get(ExcelImportService);
    const results = await importService.importFromPaths(files);

    for (const result of results) {
      const status = result.imported > 0 ? 'SUCCESS' : 'SKIPPED';
      const conflictSuffix = result.conflicts && result.conflicts > 0 ? `, conflicts=${result.conflicts}` : '';
      const resolvedSuffix = typeof result.resolved === 'number' ? `, resolved=${result.resolved}` : '';
      logger.log(
        `${status} :: ${result.filePath} -> imported=${result.imported}, total=${result.records}, skipped=${result.skipped}, duplicates=${result.duplicates ?? 0}${resolvedSuffix}${conflictSuffix}`,
      );
      if (result.anomalyGroups && result.anomalyGroups.length) {
        for (const conflict of result.anomalyGroups) {
          const variants = conflict.variants
            .map(
              (variant) =>
                `[variant=${variant.variantId}, temp=${variant.temperature ?? 'NULL'}, hum=${variant.humidity ?? 'NULL'}, total=${variant.totalCount}, new=${variant.newCount}, existing=${variant.existingCount}, sources=$${formatVariantSources(variant.sourceSummaries)}]`,
            )
            .join('; ');
          logger.warn(
            `Conflict requires action :: area=${conflict.areaName}, timestamp=${conflict.timestamp.toISOString()}, type=${conflict.type} -> ${variants}`,
          );
        }
      }
      if (result.message) {
        logger.warn(`Message: ${result.message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Import failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

function expandInputs(args: string[]): string[] {
  const resolved: string[] = [];
  for (const rawArg of args) {
    const cleaned = sanitizePathArgument(rawArg);
    const absolute = path.resolve(cleaned);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(absolute, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /\.xlsx?$/i.test(entry.name) && !entry.name.startsWith('~$')) {
          resolved.push(path.join(absolute, entry.name));
        }
      }
    } else if (stat.isFile()) {
      resolved.push(absolute);
    }
  }
  return resolved;
}

function sanitizePathArgument(arg: string): string {
  let cleaned = arg.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\^/g, '');
  return cleaned;
}

function formatVariantSources(summaries: AnomalySourceSummaryRecord[]): string {
  if (!summaries?.length) {
    return 'unknown';
  }
  return summaries
    .map((summary) => `${summary.label}(${summary.type === 'existing' ? '旧' : '新'}×${summary.count})`)
    .join('|');
}
