import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { GlobalService } from '../../utils/global/global.service';
import { AuthService } from './auth.service';
import { ControllerResDto } from '../../utils/global/dto/global.dto';
import { LoginReqDto, LoginResDto } from './dto/auth.dto';

@ApiTags('default - Admin: Auth') // Swagger tag (grouping)
@Controller({ path: 'admin/auth', version: '1' })
export class AuthController {
  constructor(
    private globalService: GlobalService,
    private authService: AuthService,
  ) {}

  /**
   * Admin login API
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin Login',
    description: 'Login as an admin using email and password.',
  })
  @ApiBody({ type: LoginReqDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  async login(
    @Body() loginDto: LoginReqDto,
  ): Promise<ControllerResDto<LoginResDto>> {
    const authData: LoginResDto = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    return this.globalService.setControllerResponse(
      authData,
      'Logged in successfully.',
    );
  }
}
