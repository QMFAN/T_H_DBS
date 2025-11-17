"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const excel_import_module_1 = require("./excel-import/excel-import.module");
const analytics_module_1 = require("./analytics/analytics.module");
const smart_analytics_module_1 = require("./smart-analytics/smart-analytics.module");
const users_module_1 = require("./users/users.module");
const settings_module_1 = require("./settings/settings.module");
const auth_module_1 = require("./auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
                cache: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'mysql',
                    host: config.get('DB_HOST', '127.0.0.1'),
                    port: parseInt(config.get('DB_PORT', '3308'), 10),
                    username: config.get('DB_USER', 'th_user'),
                    password: config.get('DB_PASSWORD', 'th_password'),
                    database: config.get('DB_NAME', 'th_system'),
                    timezone: config.get('DB_TIMEZONE', '+08:00'),
                    charset: 'utf8mb4',
                    autoLoadEntities: true,
                    synchronize: false,
                    logging: config.get('DB_LOGGING', 'false') === 'true',
                }),
            }),
            excel_import_module_1.ExcelImportModule,
            analytics_module_1.AnalyticsModule,
            smart_analytics_module_1.SmartAnalyticsModule,
            users_module_1.UsersModule,
            settings_module_1.SettingsModule,
            auth_module_1.AuthModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map