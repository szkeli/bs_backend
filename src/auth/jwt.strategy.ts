import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserService } from '../user/user.service'
import { Payload } from './model/auth.model'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor (
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    })
  }

  async validate (payload: Payload) {
    const userWithRoles = await this.userService.getUserOrAdminWithRolesByUid(payload.id)
    if (!userWithRoles) {
      throw new UnauthorizedException(`用户 ${payload.id} 不存在`)
    }
    return userWithRoles
  }
}
