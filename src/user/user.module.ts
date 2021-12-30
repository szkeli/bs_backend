import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'

import { AuthService } from 'src/auth/auth.service'
import { JwtStrategy } from 'src/auth/jwt.strategy'
import { LocalStrategy } from 'src/auth/local.strategy'
import { DbService } from 'src/db/db.service'
import { SharedModule } from 'src/shared/shared.module'

import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Module({
  providers: [
    UserResolver,
    UserService,
    AuthService,
    DbService,
    JwtStrategy
  ],
  imports: [
    SharedModule
  ]
})
export class UserModule {}
