import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { CurriculumsService } from './curriculums.service'
import { AddCurriculumArgs, Curriculum } from './models/curriculums.model'

@Resolver()
export class CurriculumsResolver {
  constructor (private readonly curriculumsService: CurriculumsService) {}

  @Mutation(of => Curriculum)
  async addCurriculum (@CurrentUser() user: User, @Args() args: AddCurriculumArgs) {
    return await this.curriculumsService.addCurriculum(user.id, args)
  }
}
