import {
  UseGuards,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';

import { PermissionDecorator } from '../../decorators/permission.decorator';
import { AdminAuthDecorator } from '../../decorators/adminAuth.decorator';
import { AdminAuthGuard } from '../../guards/adminAuth.guard';
import { GlobalService } from '../../utils/global/global.service';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { rolePermissionsConstant } from './constants/permission.constant';
import {
  ControllerResDto,
  PaginationResDto,
  ServiceResDto,
} from '../../utils/global/dto/global.dto';
import {
  FindManyRoleQueryReq,
  PrimaryKeysRoleDto,
  CreateRoleBodyReqDto,
  UpdateRoleBodyReqDto,
  DeleteRoleBodyReqDto,
  UpdateRolePermissionBodyReqDto,
  RoleResponseDto,
} from './dto/role.dto';
import { plainToInstance } from 'class-transformer';
import {
  ApiPaginatedResponse,
  ApiStandardResponse,
} from '../../utils/genralSwaggerResponse.decorator';

@ApiExtraModels(RoleResponseDto, ControllerResDto, PaginationResDto)
@ApiTags('default - Admin:Roles')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin/roles', version: '1' })
@UseGuards(AdminAuthGuard)
export class RoleController {
  constructor(
    private globalService: GlobalService,
    private roleService: RoleService,
  ) {}

  /**
   * ROLE API: find many roles
   */

  @Get()
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_FIND_ALL)
  @ApiOperation({ summary: 'Find many roles' })
  @ApiPaginatedResponse(RoleResponseDto, 'Roles fetched successfully')
  async findMany(
    @Query() findManyRoleQueryReq: FindManyRoleQueryReq,
  ): Promise<ControllerResDto<RoleResponseDto[]>> {
    const { page, limit } = findManyRoleQueryReq;
    const { data, pagination }: ServiceResDto<Role[]> =
      await this.roleService.findMany(null, page, limit);

    const modifiedList: RoleResponseDto[] = plainToInstance(
      RoleResponseDto,
      data ?? [],
      {
        excludeExtraneousValues: true,
      },
    );

    return this.globalService.setControllerResponse(
      modifiedList,
      'Roles fetched successfully.',
      pagination,
    );
  }

  /**
   * ROLE API: find one role by role id
   */

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_FIND_ONE)
  @ApiOperation({ summary: 'Find one role by ID' })
  @ApiStandardResponse(RoleResponseDto, 'Role fetched successfully')
  async findOne(
    @Param() finOneRoleParamReqDto: PrimaryKeysRoleDto,
  ): Promise<ControllerResDto<RoleResponseDto>> {
    const { id: roleId } = finOneRoleParamReqDto;
    const serviceResponse: Role = await this.roleService.findOne({
      id: roleId,
    });
    const modifiedResponse = plainToInstance(RoleResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });

    return this.globalService.setControllerResponse(
      modifiedResponse,
      'Role fetched successfully.',
    );
  }

  /**
   * ROLE API: create new role
   */

  @Post()
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_CREATE)
  @ApiOperation({ summary: 'Create new role' })
  @ApiStandardResponse(RoleResponseDto, 'Role created successfully')
  async create(
    @AdminAuthDecorator() adminAuth: any,
    @Body() createRoleBodyReq: CreateRoleBodyReqDto,
  ): Promise<ControllerResDto<RoleResponseDto>> {
    const serviceResponse: Role = await this.roleService.create(
      createRoleBodyReq,
      adminAuth,
    );
    const modifiedResponse = plainToInstance(RoleResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'Role created successfully.',
    );
  }

  /**
   * ROLE API: update role by role id
   */

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_UPDATE)
  @ApiOperation({ summary: 'Update role by ID' })
  @ApiStandardResponse(RoleResponseDto, 'Role updated successfully')
  async update(
    @AdminAuthDecorator() adminAuth: any,
    @Param() updateRoleParamReq: PrimaryKeysRoleDto,
    @Body() updateRoleBodyReq: UpdateRoleBodyReqDto,
  ): Promise<ControllerResDto<RoleResponseDto>> {
    const { id: roleId } = updateRoleParamReq;
    const serviceResponse: Role = await this.roleService.update(
      roleId,
      updateRoleBodyReq,
      adminAuth,
    );
    const modifiedResponse = plainToInstance(RoleResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'Role updated successfully.',
    );
  }

  /**
   * ROLE API: soft delete role by role id
   */

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_SOFT_DELETE)
  @ApiOperation({ summary: 'Soft delete role by ID' })
  @ApiResponse({
    status: 200,
    description: 'Soft deleted role',
    example: {
      statusCode: 200,
      message: 'Role soft deleted successfully.',
      data: { isDeleted: true },
    },
  })
  async softDelete(
    @AdminAuthDecorator() adminAuth: any,
    @Param() deleteRoleParamReq: PrimaryKeysRoleDto,
  ): Promise<ControllerResDto<{ isDeleted: boolean }>> {
    const { id: roleId } = deleteRoleParamReq;
    const updateRoleBodyReq: DeleteRoleBodyReqDto = {
      hasSoftDeleted: true,
    };
    const serviceResponse: Role = await this.roleService.update(
      roleId,
      updateRoleBodyReq,
      adminAuth,
    );

    return this.globalService.setControllerResponse(
      { isDeleted: serviceResponse ? true : false },
      'Role  soft deleted successfully.',
    );
  }

  /**
   * ROLE API: rollback soft deleted role by role id
   */

  @Put(':id/rollback')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_ROLLBACK)
  @ApiOperation({ summary: 'Rollback soft deleted role by ID' })
  @ApiStandardResponse(RoleResponseDto, 'Deleted role rollback successfully')
  async rollback(
    @AdminAuthDecorator() adminAuth: any,
    @Param() deleteRoleParamReq: PrimaryKeysRoleDto,
  ): Promise<ControllerResDto<RoleResponseDto>> {
    const { id: roleId } = deleteRoleParamReq;
    const updateRoleBodyReq: DeleteRoleBodyReqDto = {
      hasSoftDeleted: false,
    };
    const serviceResponse: Role = await this.roleService.update(
      roleId,
      updateRoleBodyReq,
      adminAuth,
      true,
    );
    const modifiedResponse = plainToInstance(RoleResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'Deleted role rollback successfully.',
    );
  }

  /**
   * ROLE API: hard delete role by role id
   */
  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_HARD_DELETE)
  @ApiOperation({ summary: 'Hard delete role by ID' })
  @ApiResponse({
    status: 200,
    description: 'Hard deleted role',
    example: {
      statusCode: 200,
      message: 'Role deleted successfully.',
      data: true,
    },
  })
  async hardDelete(
    @Param() deleteRoleParamReq: PrimaryKeysRoleDto,
  ): Promise<ControllerResDto<{ isDeleted: boolean }>> {
    const { id: roleId } = deleteRoleParamReq;
    const isDeleted: boolean = await this.roleService.delete(roleId);
    return this.globalService.setControllerResponse(
      isDeleted,
      'Role deleted successfully.',
    );
  }

  /**
   * ROLE API: update permission into role by role id
   */

  @Put(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(rolePermissionsConstant.ADMIN_ROLE_UPDATE_PERMISSION)
  @ApiOperation({ summary: 'Update permissions for role' })
  @ApiStandardResponse(
    RoleResponseDto,
    'Role updated with permission successfully.',
  )
  async updatePermission(
    @AdminAuthDecorator() adminAuth: any,
    @Param() updateRoleParamReq: PrimaryKeysRoleDto,
    @Body() updateRolePermissionBodyReq: UpdateRolePermissionBodyReqDto,
  ): Promise<ControllerResDto<RoleResponseDto>> {
    const { id: roleId } = updateRoleParamReq;
    const serviceResponse: Role = await this.roleService.updatePermissions(
      roleId,
      updateRolePermissionBodyReq,
      adminAuth,
    );
    const modifiedResponse = plainToInstance(RoleResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'Role updated with permission successfully.',
    );
  }
}
