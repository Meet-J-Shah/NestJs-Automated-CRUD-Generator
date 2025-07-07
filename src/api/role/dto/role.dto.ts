/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsNotEmpty,
  MaxLength,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsArray,
  Matches,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../user/dto/user.dto';
import { PermissionResponseDto } from '../../permission/dto/permission.dto';
export class RoleFullBodyReqDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @ApiProperty({ example: 'Admin', description: 'Role name', required: false })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Administrator role',
    description: 'Role description',
    required: false,
  })
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'Marks role as admin',
    required: false,
  })
  isAdmin?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'Marks role as published',
    required: false,
  })
  hasPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: false,
    description: 'Soft deletion flag',
    required: false,
  })
  hasSoftDeleted?: boolean;
}

export class FindManyRoleQueryReq {
  @IsInt()
  @Transform(({ value }) => Number.parseInt(value))
  @ApiProperty({ example: 1, description: 'Page number for pagination' })
  page: number;

  @IsInt()
  @Transform(({ value }) => Number.parseInt(value))
  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;
}

export class PrimaryKeysRoleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'abc123', description: 'Primary key for the role' })
  id: string;
}

export class MultiplePrimaryKeysRoleDto {
  @ValidateNested({ each: true })
  @Type(() => PrimaryKeysRoleDto)
  @ApiProperty({
    type: [PrimaryKeysRoleDto],
    description: 'Array of primary keys for bulk actions',
  })
  items: PrimaryKeysRoleDto[];
}

export class CreateRoleBodyReqDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @ApiProperty({ example: 'Editor', description: 'Role name (max 20 chars)' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Can edit content',
    description: 'Optional description',
    required: false,
  })
  description?: string;
}

export class UpdateRoleBodyReqDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @ApiProperty({
    example: 'Manager',
    description: 'Updated role name',
    required: false,
  })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Updated description',
    description: 'Updated role description',
    required: false,
  })
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'Set to true to publish the role',
    required: false,
  })
  hasPublished?: boolean;
}

export class DeleteRoleBodyReqDto {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'True to soft delete the role',
    required: false,
  })
  hasSoftDeleted?: boolean;
}

export class UpdateRolePermissionBodyReqDto {
  @IsArray()
  @IsOptional()
  @ApiProperty({
    example: ['perm-1', 'perm-2'],
    description: 'IDs of permissions to connect',
    required: false,
  })
  connect?: string[];

  @IsArray()
  @IsOptional()
  @ApiProperty({
    example: ['perm-3'],
    description: 'IDs of permissions to disconnect',
    required: false,
  })
  disconnect?: string[];
}

export class RoleResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  name: string;

  @ApiProperty({
    example: 'Role with all permissions',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the role has admin access',
  })
  isAdmin: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-06-01T12:00:00Z',
    required: false,
  })
  publishedAt?: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-06-01T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-06-02T10:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => UserResponseDto,
    description: 'User who created this role',
    required: false,
  })
  createdBy?: UserResponseDto;

  @ApiProperty({
    type: () => UserResponseDto,
    description: 'User who last updated this role',
    required: false,
  })
  updatedBy?: UserResponseDto;

  @ApiProperty({
    type: () => [PermissionResponseDto],
    description: 'Permissions associated with this role',
    required: false,
  })
  permissions?: PermissionResponseDto[];

  @ApiProperty({
    type: () => [UserResponseDto],
    description: 'Users assigned to this role',
    required: false,
  })
  users?: UserResponseDto[];
}
