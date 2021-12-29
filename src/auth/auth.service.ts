import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from 'src/db/db.service';
import { UserId } from 'src/db/model/db.model';
import { LoginResult, User, UserLoginInput } from 'src/user/models/user.model';
import { UserService } from 'src/user/user.service';
import { Payload } from './model/auth.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dbService: DbService,
  ) {}

  async validateUser<T>(userPatch: UserLoginInput): Promise<T | null> {
    const user = await this.dbService.getUserById(userPatch.userId);
    if(user && user.sign === userPatch.sign) {
      return user as unknown as T;
    } 
    return null;
  }

  async login(userPatch: UserLoginInput): Promise<LoginResult> {
    const payload: Payload = { userId: userPatch.userId };
    const user = await this.validateUser<User>(userPatch);
    if(!user) {
      throw new UnauthorizedException('用户名id或密码错误');
    }
    const loginResult: LoginResult = {
      token: this.jwtService.sign(payload),
      ...user
    }
    return loginResult;
  }
}

