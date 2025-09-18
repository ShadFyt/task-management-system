import { Module } from '@nestjs/common';
import { Token } from './token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Token])],
  providers: [],
})
export class AuthModule {}
