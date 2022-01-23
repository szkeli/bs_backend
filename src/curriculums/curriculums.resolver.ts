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

  @Mutation(of => Curriculum)
  async addCurriculum (@CurrentUser() user: User, @Args() args: AddCurriculumArgs) {
    return await this.curriculumsService.addCurriculum(user.id, args)
  }

  @Query(of => CurriculumsConnection)
  async curriculums (@Args() { first, offset }: PagingConfigArgs) {
    return await this.curriculumsService.curriculums(first, offset)
  }

  @Query(of => Curriculum)
  async curriculum (@Args('id') id: string) {
    return await this.curriculumsService.curriculum(id)
  }
}
