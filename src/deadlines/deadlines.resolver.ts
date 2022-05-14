import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser, Role, Roles } from '../auth/decorator'
import { Lesson } from '../lessons/models/lessons.model'
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

  @ResolveField(of => Lesson, { description: 'deadline 对应的课程', nullable: true })
  async lesson (@Parent() deadline: Deadline) {
    return await this.deadlinesService.lesson(deadline.id)
  }
}
