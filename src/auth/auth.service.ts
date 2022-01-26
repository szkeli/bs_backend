import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { CheckUserResult, LoginResult } from 'src/user/models/user.model'

import { AdminService } from '../admin/admin.service'
import { UserService } from '../user/user.service'
import { Payload } from './model/auth.model'

@Injectable()
export class AuthService {
  constructor (
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly adminService: AdminService
  ) {}

  async validateUser<T>(userId: string, sign: string): Promise<T | null> {
    const user = await this.userService.checkUserPasswordAndGetUser(userId, sign)
    return user as unknown as T
  }

  async login (userId: string, sign: string): Promise<LoginResult> {
    const user = await this.validateUser<CheckUserResult>(userId, sign)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }
}
