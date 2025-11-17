import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AnalyzeDto {
  @IsString()
  area!: string;

  @IsString()
  start!: string;

  @IsString()
  end!: string;

  @IsOptional()
  @IsNumber()
  tempMin?: number;

  @IsOptional()
  @IsNumber()
  tempMax?: number;

  @IsOptional()
  @IsNumber()
  humidityMin?: number;

  @IsOptional()
  @IsNumber()
  humidityMax?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tempDurationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  humidityDurationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  toleranceNormalBudget?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  gapToleranceMinutes?: number;
}