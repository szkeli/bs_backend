import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: process.env.JWT_SECRET,
          signOptions: {
            expiresIn: '1d'
          }
        }
      },
      inject: [ConfigService]
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
