import { ForbiddenException } from '@nestjs/common'
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser, Role, Roles } from '../auth/decorator'
import { Lesson } from '../lessons/models/lessons.model'
import { PersonWithRoles } from '../user/models/user.model'
import { DeadlinesService } from './deadlines.service'
import { AddDealineArgs, Deadline, DEADLINE_TYPE } from './models/deadlines.model'

@Resolver(of => Deadline)
export class DeadlinesResolver {
  constructor (private readonly deadlinesService: DeadlinesService) {}

  @Query(of => Deadline, { description: '以 id 获取指定 deadline' })
  async deadline (@Args('id') id: string) {
    return await this.deadlinesService.deadline(id)
  }

  @Mutation(of => Deadline, { description: '在指定用户上添加一个 deadline，如果指定的 curriculumId 存在，该 deadline 会关联到相应的课程' })
  @Roles(Role.Admin, Role.User)
  async addDeadline (@CurrentUser() person: PersonWithRoles, @Args() args: AddDealineArgs) {
    // 从内部网定时更新 deadline
    if (person.roles?.includes(Role.Admin) && person.id !== args.id && args.type === DEADLINE_TYPE.AUTO_IMPORT) {
      return await this.deadlinesService.addDeadlineByAutoImport(person.id, args)
    }

    // 用户主动创建 deadline
    if (person.roles?.includes(Role.User) && args.id === person.id && args.type === DEADLINE_TYPE.USER_CREATE) {
      return await this.deadlinesService.addDeadlineByUserCreate(args.id, args)
    }

    if (person.roles?.includes(Role.Admin) && person.id === args.id) {
      throw new ForbiddenException('管理员不能给自己添加 deadline: 发现 currentPerson.id === args.id')
    }

    if (person.roles?.includes(Role.Admin) && person.id !== args.id && args.type !== DEADLINE_TYPE.AUTO_IMPORT) {
      throw new ForbiddenException('管理员只能添加 AUTO_IMPORT 类型的 deadline: 发现 args.type !== DEADLINE_TYPE.AUTO_IMPORT')
    }

    throw new ForbiddenException()
  }

  @ResolveField(of => Lesson, { description: 'deadline 对应的课程' })
  async lesson (@Parent() deadline: Deadline) {
    return await this.deadlinesService.lesson(deadline.id)
  }
}
