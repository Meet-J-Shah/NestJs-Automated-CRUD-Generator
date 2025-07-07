import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginReqDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email address used to login',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Secure@123',
    description: 'Password for authentication',
  })
  readonly password: string;
}

export class LoginResDto {
  @ApiProperty({
    example: 'user-uuid-123',
    description: 'Unique identifier of the logged-in user',
  })
  id: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
  })
  lastName: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email of the user',
  })
  email: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refreshToken: string;
}

export class AdminAuthDto<T> {
  @ApiProperty({
    example: 'admin-id-123',
    description: 'Admin user ID',
  })
  id: string;

  @ApiProperty({
    example: 'Alice',
    description: 'Admin user first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Smith',
    description: 'Admin user last name',
  })
  lastName: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Admin email address',
  })
  email: string;

  @ApiProperty({
    description: 'Roles assigned to the admin',
    required: false,
    type: [String], // or replace with `T[]` if Swagger supports generic expansion via manual override
  })
  roles?: T[];

  @ApiProperty({
    description: 'List of permissions granted to the admin',
    required: false,
    type: [String],
    example: ['user_create', 'role_update'],
  })
  permissions?: string[];
}
