import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { DeadlinesService } from './deadlines.service'
import { AddDealineArgs, Deadline } from './models/deadlines.model'

@Resolver(of => Deadline)
export class DeadlinesResolver {
  constructor (private readonly deadlinesService: DeadlinesService) {}

  @Query(of => Deadline)
  async deadline (@Args('deadlineId') deadlineId: string) {
    await this.deadlinesService.deadline(deadlineId)
  }

  @Mutation(of => Deadline, { description: '在当前用户上添加一个ddl' })
  async addDeadline (@CurrentUser() user: User, @Args() args: AddDealineArgs) {
    return await this.deadlinesService.addDeadline(user.id, args)
  }
}
