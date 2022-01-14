import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserService } from 'src/user/user.service'

import { User } from '../user/models/user.model'
import { jwtConstants } from './constants'
import { Payload } from './model/auth.model'

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
    const user = await this.userService.getUserByUid(payload.id) as unknown as User
    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }
    return user
  }
}
