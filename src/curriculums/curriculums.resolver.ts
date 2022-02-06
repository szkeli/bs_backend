import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { CurriculumsService } from './curriculums.service'
import { AddCurriculumArgs, Curriculum, CurriculumsConnection } from './models/curriculums.model'

/**
 * 学生的课程
 */
@Resolver()
export class CurriculumsResolver {
  constructor (private readonly curriculumsService: CurriculumsService) {}

  @Mutation(of => Curriculum, { description: '添加一个课程到当前用户' })
  async addCurriculum (@CurrentUser() user: User, @Args() args: AddCurriculumArgs) {
    return await this.curriculumsService.addCurriculum(user.id, args)
  }

  @Query(of => CurriculumsConnection, { description: '获取所有课程' })
  async curriculums (@Args() { first, offset }: PagingConfigArgs) {
    return await this.curriculumsService.curriculums(first, offset)
  }

  @Query(of => Curriculum, { description: '以id获取课程' })
  async curriculum (@Args('id') id: string) {
    return await this.curriculumsService.curriculum(id)
  }
}
