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
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const express = __importStar(require("express"));
const node_path_1 = require("node:path");
const app_module_1 = require("./app.module");
function normalizePublicPath(raw) {
    if (!raw) {
        return '/imports';
    }
    try {
        const url = new URL(raw);
        const pathname = url.pathname.replace(/\/$/, '') || '/';
        return pathname.startsWith('/') ? pathname : `/${pathname}`;
    }
    catch (error) {
        const trimmed = raw.replace(/\/$/, '');
        return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    }
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    const defaultStorage = (0, node_path_1.join)(process.cwd(), 'storage', 'imports');
    const storageDir = configService.get('IMPORT_STORAGE_DIR', defaultStorage);
    const publicBaseUrl = configService.get('IMPORT_STORAGE_BASE_URL', '/imports');
    const staticPath = normalizePublicPath(publicBaseUrl);
    app.use(staticPath, express.static(storageDir, {
        setHeaders(res, filePath) {
            const fileName = (0, node_path_1.basename)(filePath);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        },
    }));
    app.enableCors({
        origin: (origin, callback) => {
            const raw = configService.get('ALLOWED_ORIGINS');
            if (!raw || raw.trim() === '') {
                return callback(null, true);
            }
            const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
            if (!origin)
                return callback(null, true);
            if (list.includes(origin))
                return callback(null, true);
            return callback(new Error(`Origin ${origin} not allowed`), false);
        },
    });
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT ?? 3005, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map