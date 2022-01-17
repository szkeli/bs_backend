import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'

import { AuthService } from './auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor (private readonly authService: AuthService) {
    super()
  }

  async validate<T>(userId: string, sign: string): Promise<T | null> {
    console.error('hahaha')
    const user = await this.authService.validateUser<T>(userId, sign)
    if (!user) {
      throw new UnauthorizedException()
    }
    return user as T
  }
}
