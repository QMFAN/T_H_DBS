import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { UsersService, UsersController } from './index';
import { UsersSchemaInitService } from './schema-init.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev_secret'),
      }),
    }),
  ],
  providers: [UsersService, UsersSchemaInitService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
