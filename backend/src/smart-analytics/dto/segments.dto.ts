import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SegmentsDto {
  @IsString()
  area!: string;

  @IsString()
  start!: string;

  @IsString()
  end!: string;

  @IsOptional()
  @IsString()
  granularity?: 'record' | 'day';

  @IsOptional()
  @IsInt()
  @Min(1)
  gapToleranceMinutes?: number;
}
