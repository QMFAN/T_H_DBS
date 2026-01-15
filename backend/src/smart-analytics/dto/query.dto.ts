import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryDto {
  @IsString()
  area!: string;

  @IsString()
  start!: string;

  @IsString()
  end!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  gapToleranceMinutes?: number;
}
