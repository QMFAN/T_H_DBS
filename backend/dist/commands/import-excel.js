"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const app_module_1 = require("../app.module");
const excel_import_service_1 = require("../excel-import/excel-import.service");
async function bootstrap() {
    const logger = new common_1.Logger('ImportExcelCLI');
    const argv = process.argv.slice(2);
    if (!argv.length) {
        console.error('Usage: npm run import:excel -- <file1.xlsx> <file2.xlsx> ...');
        process.exitCode = 1;
        return;
    }
    const files = expandInputs(argv);
    if (!files.length) {
        console.error('No readable .xlsx files found for given arguments.');
        process.exitCode = 1;
        return;
    }
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const importService = app.get(excel_import_service_1.ExcelImportService);
        const results = await importService.importFromPaths(files);
        for (const result of results) {
            const status = result.imported > 0 ? 'SUCCESS' : 'SKIPPED';
            const conflictSuffix = result.conflicts && result.conflicts > 0 ? `, conflicts=${result.conflicts}` : '';
            const resolvedSuffix = typeof result.resolved === 'number' ? `, resolved=${result.resolved}` : '';
            logger.log(`${status} :: ${result.filePath} -> imported=${result.imported}, total=${result.records}, skipped=${result.skipped}, duplicates=${result.duplicates ?? 0}${resolvedSuffix}${conflictSuffix}`);
            if (result.anomalyGroups && result.anomalyGroups.length) {
                for (const conflict of result.anomalyGroups) {
                    const variants = conflict.variants
                        .map((variant) => `[variant=${variant.variantId}, temp=${variant.temperature ?? 'NULL'}, hum=${variant.humidity ?? 'NULL'}, total=${variant.totalCount}, new=${variant.newCount}, existing=${variant.existingCount}, sources=$${formatVariantSources(variant.sourceSummaries)}]`)
                        .join('; ');
                    logger.warn(`Conflict requires action :: area=${conflict.areaName}, timestamp=${conflict.timestamp.toISOString()}, type=${conflict.type} -> ${variants}`);
                }
            }
            if (result.message) {
                logger.warn(`Message: ${result.message}`);
            }
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Import failed: ${message}`);
        process.exitCode = 1;
    }
    finally {
        await app.close();
    }
}
bootstrap().catch((error) => {
    console.error(error);
    process.exit(1);
});
function expandInputs(args) {
    const resolved = [];
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
        }
        else if (stat.isFile()) {
            resolved.push(absolute);
        }
    }
    return resolved;
}
function sanitizePathArgument(arg) {
    let cleaned = arg.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/\^/g, '');
    return cleaned;
}
function formatVariantSources(summaries) {
    if (!summaries?.length) {
        return 'unknown';
    }
    return summaries
        .map((summary) => `${summary.label}(${summary.type === 'existing' ? '旧' : '新'}×${summary.count})`)
        .join('|');
}
//# sourceMappingURL=import-excel.js.map