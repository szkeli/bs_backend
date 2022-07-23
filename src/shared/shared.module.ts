import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { JwtStrategy } from 'src/auth/jwt.strategy'

import { DbModule } from '../db/db.module'
import { UserModule } from '../user/user.module'

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
    }),
    DbModule,
    UserModule
  ],
  providers: [
    JwtStrategy
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtModule,
    DbModule
  ]
})
export class SharedModule {}
