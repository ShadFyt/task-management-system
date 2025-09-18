import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class UserDto {
  @Expose()
  @IsString()
  id: string;
  @Expose()
  @IsEmail()
  email: string;
  @Expose()
  @IsString()
  name: string;
}

export class AuthBodyDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthResponseDto {
  @Expose()
  access_token: string;

  @Expose()
  refresh_token: string;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;
}
