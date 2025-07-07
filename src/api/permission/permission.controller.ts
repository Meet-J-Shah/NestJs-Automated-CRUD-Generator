/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  UseGuards,
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
  ApiBody,
  getSchemaPath,
  ApiResponse,
} from '@nestjs/swagger';

import { PermissionDecorator } from '../../decorators/permission.decorator';
import { AdminAuthGuard } from '../../guards/adminAuth.guard';
import { GlobalService } from '../../utils/global/global.service';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { permissionPermissionsConstant } from './constants/permission.constant';
import {
  ControllerResDto,
  PaginationResDto,
  ServiceResDto,
} from '../../utils/global/dto/global.dto';
import {
  FindManyPermissionQueryReq,
  PermissionResponseDto,
  PrimaryKeysPermissionDto,
} from './dto/permission.dto';
import { plainToInstance } from 'class-transformer';
import { ApiPaginatedResponse } from '../../utils/genralSwaggerResponse.decorator';
@ApiExtraModels(ControllerResDto, PaginationResDto, PermissionResponseDto)
@ApiTags('default - Admin: Permissions')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin/permissions', version: '1' })
@UseGuards(AdminAuthGuard)
export class AdminPermissionController {
  constructor(
    private globalService: GlobalService,
    private permissionService: PermissionService,
  ) {}

  /**
   * PERMISSION API: find many permissions
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(permissionPermissionsConstant.ADMIN_PERMISSION_FIND_ALL)
  @ApiOperation({ summary: 'Find all permissions with pagination' })
  @ApiQuery({
    name: 'page',
    required: true,
    type: Number,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: true,
    type: Number,
    example: 10,
    description: 'Number of records per page',
  })
  @ApiPaginatedResponse(
    PermissionResponseDto,
    'List of permissions returned successfully',
  )
  async findMany(
    @Query() findManyRoleQueryReq: FindManyPermissionQueryReq,
  ): Promise<ControllerResDto<PermissionResponseDto[]>> {
    const { page, limit } = findManyRoleQueryReq;
    const { data, pagination }: ServiceResDto<Permission[]> =
      await this.permissionService.findMany(null, page, limit);
    const dtoList = plainToInstance(PermissionResponseDto, data, {
      excludeExtraneousValues: true,
    });

    return this.globalService.setControllerResponse(dtoList, null, pagination);
  }
}
