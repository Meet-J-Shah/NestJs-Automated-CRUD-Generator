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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AdminAuthDecorator } from '../../decorators/adminAuth.decorator';
import { PermissionDecorator } from '../../decorators/permission.decorator';
import { AdminAuthGuard } from '../../guards/adminAuth.guard';
import { GlobalService } from '../../utils/global/global.service';
import { UserService } from './user.service';
import { Role } from '../role/entities/role.entity';
import { User } from './entities/user.entity';
import { userPermissionConstant } from './constants/permission.constant';
import {
  ControllerResDto,
  ServiceResDto,
} from '../../utils/global/dto/global.dto';
import {
  UserBodyReqDto,
  PrimaryKeysUserDto,
  UserBodyUpdateReqDto,
  DeleteUserBodyReqDto,
  UserResponseDto,
} from './dto/user.dto';
import {
  ApiPaginatedResponse,
  ApiStandardResponse,
} from '../../utils/genralSwaggerResponse.decorator';
import { plainToInstance } from 'class-transformer';

@ApiTags('default - Admin: Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(AdminAuthGuard)
export class UserController {
  constructor(
    private globalService: GlobalService,
    private userService: UserService,
  ) {}

  /**
   * get all user api
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_FIND_ALL)
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: true, type: Number })
  @ApiQuery({ name: 'limit', required: true, type: Number })
  @ApiPaginatedResponse(UserResponseDto, 'Roles fetched successfully')
  async findMany(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ): Promise<ControllerResDto<UserResponseDto[]>> {
    const { data, pagination }: ServiceResDto<User[]> =
      await this.userService.findMany(null, page, limit);
    const modifiedList: UserResponseDto[] = plainToInstance(
      UserResponseDto,
      data ?? [],
      {
        excludeExtraneousValues: true,
      },
    );

    return this.globalService.setControllerResponse(
      modifiedList,
      'Users fetched successfully.',
      pagination,
    );
  }

  /**
   * create new user api
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_CREATE)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: UserBodyReqDto })
  @ApiStandardResponse(UserResponseDto, 'User created successfully')
  async create(
    @AdminAuthDecorator() adminAuth: any,
    @Body() userBodyReq: UserBodyReqDto<Role>,
  ): Promise<ControllerResDto<UserResponseDto>> {
    const serviceResponse: User = await this.userService.create(
      userBodyReq,
      adminAuth,
    );
    const modifiedResponse = plainToInstance(UserResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'User created successfully.',
    );
  }

  /**
   * get one user by id api
   */
  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_FIND_ONE)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiStandardResponse(UserResponseDto, 'User fetched successfully')
  async findOne(
    @Param() userParamReqDto: PrimaryKeysUserDto,
  ): Promise<ControllerResDto<UserResponseDto>> {
    const { userId } = userParamReqDto;
    const serviceResponse: User = await this.userService.findOne(userId);
    const modifiedResponse = plainToInstance(UserResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      ' User fetched successfully.',
    );
  }

  /**
   * update user by id api
   */
  @Put(':userId')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_UPDATE)
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiBody({ type: UserBodyUpdateReqDto })
  @ApiStandardResponse(UserResponseDto, 'User updated successfully')
  async update(
    @AdminAuthDecorator() adminAuth: any,
    @Param() userParamReq: PrimaryKeysUserDto,
    @Body() userBodyReq: UserBodyUpdateReqDto<Role>,
  ): Promise<ControllerResDto<UserResponseDto>> {
    const { userId } = userParamReq;
    const serviceResponse: User = await this.userService.update(
      userBodyReq,
      userId,
      adminAuth,
    );
    const modifiedResponse = plainToInstance(UserResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'User updated successfully.',
    );
  }

  /**
   * permanent delete user by id
   */
  @Delete(':userId/permanent')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_HARD_DELETE)
  @ApiOperation({ summary: 'Permanently delete a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Hard deleted User',
    example: {
      statusCode: 200,
      message: 'User permanently deleted successfully.',
      data: true,
    },
  })
  async hardDelete(
    @Param() userParamReq: PrimaryKeysUserDto,
  ): Promise<ControllerResDto<{ isDeleted: boolean }>> {
    const { userId } = userParamReq;
    const isDeleted: boolean = await this.userService.delete(userId);
    return this.globalService.setControllerResponse(
      isDeleted,
      'User deleted successfully.',
    );
  }

  /**
   * soft delete user by id
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_SOFT_DELETE)
  @ApiOperation({ summary: 'Soft delete a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Soft deleted user',
    example: {
      statusCode: 200,
      message: 'User soft deleted successfully.',
      data: { isDeleted: true },
    },
  })
  async softDelete(
    @AdminAuthDecorator() adminAuth: any,
    @Param() userParamReq: PrimaryKeysUserDto,
  ): Promise<ControllerResDto<{ isDeleted: boolean }>> {
    const { userId } = userParamReq;
    const updateUserBodyReq: DeleteUserBodyReqDto = {
      hasSoftDeleted: true,
    };
    const serviceResponse: User = await this.userService.update(
      updateUserBodyReq,
      userId,
      adminAuth,
    );
    return this.globalService.setControllerResponse(
      { isDeleted: serviceResponse ? true : false },
      'User deleted successfully.',
    );
  }

  /**
   * rollback soft deleted user by user id
   */
  @Put(':userId/rollback')
  @HttpCode(HttpStatus.OK)
  @PermissionDecorator(userPermissionConstant.ADMIN_USER_ROLLBACK)
  @ApiOperation({ summary: 'Rollback soft-deleted user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiStandardResponse(UserResponseDto, 'Deleted user rollback successfully')
  async rollback(
    @AdminAuthDecorator() adminAuth: any,
    @Param() deleteUserParamReq: PrimaryKeysUserDto,
  ): Promise<ControllerResDto<UserResponseDto>> {
    const { userId } = deleteUserParamReq;
    const updateRoleBodyReq: DeleteUserBodyReqDto = {
      hasSoftDeleted: false,
    };
    const serviceResponse: User = await this.userService.update(
      updateRoleBodyReq,
      userId,
      adminAuth,
      true,
    );
    const modifiedResponse = plainToInstance(UserResponseDto, serviceResponse, {
      excludeExtraneousValues: true,
    });
    return this.globalService.setControllerResponse(
      modifiedResponse,
      'Deleted user rollback successfully.',
    );
  }
}
