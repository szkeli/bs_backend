import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser, Role, Roles } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { DeadlinesService } from './deadlines.service'
import { AddDealineArgs, Deadline } from './models/deadlines.model'

@Resolver(of => Deadline)
export class DeadlinesResolver {
  constructor (private readonly deadlinesService: DeadlinesService) {}

  @Query(of => Deadline, { description: '以 id 获取指定 deadline' })
  async deadline (@Args('id') id: string) {
    return await this.deadlinesService.deadline(id)
  }

  @Mutation(of => Deadline, { description: '用户添加一个 deadline' })
  @Roles(Role.User)
  async addDeadline (@CurrentUser() user: User, @Args() args: AddDealineArgs) {
    return await this.deadlinesService.addDeadline(user.id, args)
  }
}
