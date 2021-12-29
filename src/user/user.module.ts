import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { DbService } from 'src/db/db.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { LocalStrategy } from 'src/auth/local.strategy';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  providers: [
    UserResolver, 
    UserService, 
    AuthService,
    DbService,
    JwtStrategy,
  ],
  imports: [
    SharedModule,
  ]
})
export class UserModule {}
