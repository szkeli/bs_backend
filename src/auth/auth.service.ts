import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { DbService } from 'src/db/db.service'
import { LoginResult, User } from 'src/user/models/user.model'

import { Payload } from './model/auth.model'

@Injectable()
export class AuthService {
  constructor (
    private readonly jwtService: JwtService,
    private readonly dbService: DbService
  ) {}

  async validateUser<T>(userId: string, sign: string): Promise<T | null> {
    const user = await this.dbService.checkUserPasswordAndGetUser(userId, sign)
    return user as unknown as T
  }

  async login (userId: string, sign: string): Promise<LoginResult> {
    const user = await this.validateUser<User>(userId, sign)
    if (!user) {
      throw new UnauthorizedException('用户名id或密码错误')
    }
    const payload: Payload = { id: user.id }
    const loginResult: LoginResult = {
      token: this.jwtService.sign(payload),
      ...user
    }
    return loginResult
  }
}
