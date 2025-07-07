import { ApiProperty } from '@nestjs/swagger';

export class PaginationResDto {
  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: 1, description: 'Previous page number (0 if none)' })
  previousPage: number;

  @ApiProperty({ example: 2, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: 3, description: 'Next page number (0 if none)' })
  nextPage: number;

  @ApiProperty({
    example: 100,
    description: 'Total number of records across all pages',
  })
  totalRecords: number;

  @ApiProperty({
    example: 20,
    description: 'Number of records skipped (for offset)',
  })
  skipRecords: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum number of records per page',
  })
  limit: number;
}

export class ControllerResDto<T> {
  statusCode?: number;
  message: string;
  data: T;
  pagination?: PaginationResDto;
  error?: any;
}

export class ServiceResDto<T> {
  data: T;
  pagination?: PaginationResDto;
}

export declare class TypeOrmUpdateResult {
  raw: any;
  affected?: number;
  generatedMaps: any;
}

export declare class TypeOrmDeleteResult {
  raw: any;
  affected?: number | null;
}
