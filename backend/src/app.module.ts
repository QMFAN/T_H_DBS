import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExcelImportModule } from './excel-import/excel-import.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SmartAnalyticsModule } from './smart-analytics/smart-analytics.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: parseInt(config.get<string>('DB_PORT', '3308'), 10),
        username: config.get<string>('DB_USER', 'th_user'),
        password: config.get<string>('DB_PASSWORD', 'th_password'),
        database: config.get<string>('DB_NAME', 'th_system'),
        timezone: config.get<string>('DB_TIMEZONE', '+08:00'),
        charset: 'utf8mb4',
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    ExcelImportModule,
    AnalyticsModule,
    SmartAnalyticsModule,
    UsersModule,
    SettingsModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
