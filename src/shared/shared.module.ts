import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { JwtStrategy } from 'src/auth/jwt.strategy'
import { DbService } from 'src/db/db.service'
import { UserService } from 'src/user/user.service'

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt'
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET + '',
      signOptions: {
        expiresIn: '2 days'
      }
    })
  ],
  providers: [
    JwtStrategy,
    UserService,
    DbService
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtModule
  ]
})
export class SharedModule {}
