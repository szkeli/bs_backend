import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { UserAuthenInfo } from './model/auth.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => UserAuthenInfo, { description: '当前用户提交的认证信息', nullable: true })
  async authenInfo (@Parent() user: User) {
    return await this.userService.authenInfo(user.id)
  }
}
