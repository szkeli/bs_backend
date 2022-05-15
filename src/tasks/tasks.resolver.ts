/* eslint-disable @typescript-eslint/no-unused-vars */
import { Mutation, Resolver } from '@nestjs/graphql'

import { NoAuth } from '../auth/decorator'
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

  // @Mutation(of => String)
  // @NoAuth()
  // async tasksTestTr () {
  //   return await this.tasksService.testTr()
  // }
}
