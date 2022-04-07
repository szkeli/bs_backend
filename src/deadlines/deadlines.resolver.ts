import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Curriculum } from '../curriculums/models/curriculums.model'
import { User } from '../user/models/user.model'
import { DeadlinesService } from './deadlines.service'
import { AddDealineArgs, Deadline } from './models/deadlines.model'

@Resolver(of => Deadline)
export class DeadlinesResolver {
  constructor (private readonly deadlinesService: DeadlinesService) {}

  @Query(of => Deadline, { description: '以id获取ddl' })
  async deadline (@Args('deadlineId') deadlineId: string) {
    return await this.deadlinesService.deadline(deadlineId)
  }

  @Mutation(of => Deadline, { description: '在当前用户上添加一个 deadline，如果指定的 curriculumId 存在，该 deadline 会关联到相应的课程' })
  async addDeadline (@CurrentUser() user: User, @Args() args: AddDealineArgs) {
    return await this.deadlinesService.addDeadline(user.id, args)
  }

  @ResolveField(of => Curriculum, { description: 'deadline 所在的课程，仅当 deadline 是用户手动添加时为 null', nullable: true })
  async curriculum (@Parent() deadline: Deadline) {
    return await this.deadlinesService.curriculum(deadline.id)
  }
}
