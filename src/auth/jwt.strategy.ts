import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserService } from 'src/user/user.service'

import { jwtConstants } from './constants'
import { Payload, UserWithRoles } from './model/auth.model'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor (
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret
    })
  }

  async validate (payload: Payload) {
    const userWithRoles = await this.userService.getUserOrAdminWithRolesByUid(payload.id) as unknown as UserWithRoles
    console.error({
      m: '请求认证信息',
      p: 'auth/jwt.strategy.ts',
      userWithRoles
    })
    if (!userWithRoles) {
      throw new UnauthorizedException(`用户 ${payload.id} 不存在`)
    }
    return userWithRoles
  }
}
