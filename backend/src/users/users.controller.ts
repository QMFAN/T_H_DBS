import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from '../entities/user.entity';
import { AdminGuard } from '../rbac/admin.guard';

@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(): Promise<UserEntity[]> {
    return this.users.findAll();
  }

  @Post()
  async create(@Body() dto: Partial<UserEntity>): Promise<UserEntity> {
    if (!dto.username || String(dto.username).trim() === '') {
      throw new (await import('@nestjs/common')).BadRequestException(
        'username is required',
      );
    }
    const payload: any = { ...dto };
    if (typeof payload.status === 'string')
      payload.status = payload.status === 'enabled' ? 1 : 0;
    if (payload.status === undefined) payload.status = 1;
    try {
      return await this.users.createUser(payload);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new (await import('@nestjs/common')).ConflictException(
          'username already exists',
        );
      }
      throw e;
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UserEntity>,
  ): Promise<UserEntity | null> {
    const payload: any = { ...dto };
    if (typeof payload.status === 'string')
      payload.status = payload.status === 'enabled' ? 1 : 0;
    return this.users.updateUser(id, payload);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.users.deleteUser(id);
    return { success: true };
  }
}
