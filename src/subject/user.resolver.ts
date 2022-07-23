import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { PagingConfigArgs, Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { SubjectsConnection } from './model/subject.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => SubjectsConnection, { description: '当前用户创建的所有主题' })
  async subjects (@Parent() user: User, @Args() args: PagingConfigArgs) {
    return await this.userService.findSubjectsByUid(user.id, args.first, args.offset)
  }
}
