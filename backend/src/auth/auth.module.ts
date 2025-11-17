import { Module } from '@nestjs/common'
import { AuthService, AuthController, AuthCommonController } from './index'
import { UsersModule } from '../users/users.module'
import { JwtModule } from '@nestjs/jwt'
import type { SignOptions } from 'jsonwebtoken'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const raw = cfg.get<string>('JWT_EXPIRES_IN', '2h')
        const expiresIn = (/^\d+$/.test(String(raw)) ? Number(raw) : (raw as unknown as SignOptions['expiresIn']))
        return {
          secret: cfg.get<string>('JWT_SECRET', 'dev_secret'),
          signOptions: { expiresIn },
        }
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController, AuthCommonController],
})
export class AuthModule {}