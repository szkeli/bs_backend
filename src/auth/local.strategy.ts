import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserId } from 'src/db/model/db.model'
import { UserLoginInput } from 'src/user/models/user.model'

import { AuthService } from './auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor (private readonly authService: AuthService) {
    super()
  }

  async validate<T>(userPatch: UserLoginInput): Promise<T | null> {
    console.error('local auth')
    const user = await this.authService.validateUser<T>(userPatch)
    if (!user) {
      throw new UnauthorizedException()
    }
    return user as T
  }
}
