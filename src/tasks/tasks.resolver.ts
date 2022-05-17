import { Mutation, Resolver } from '@nestjs/graphql'

import { Role, Roles } from '../auth/decorator'
import { TasksService } from './tasks.service'

@Resolver()
export class TasksResolver {
  constructor (private readonly tasksService: TasksService) {}

  // @Mutation(of => String)
  // @NoAuth()
  // async tasksTest () {
  //   await this.tasksService.test()
  //   return ''
  // }

  @Mutation(of => String, { description: '手动触发一个课程通知任务' })
  @Roles(Role.Admin)
  async triggerTask () {
    return await this.tasksService.testTr()
  }
}
