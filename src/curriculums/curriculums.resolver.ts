import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Role, Roles } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { CurriculumsService } from './curriculums.service'
import { AddCurriculumArgs, Curriculum, CurriculumsConnection, UpdateCurriculumArgs } from './models/curriculums.model'

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

  @Mutation(of => Curriculum, { description: '管理员更新一个课程' })
  @Roles(Role.Admin)
  async updateCurriculum (@CurrentUser() admin: Admin, @Args() args: UpdateCurriculumArgs) {
    return await this.curriculumsService.updateCurriculum(admin.id, args)
  }

  @Query(of => CurriculumsConnection, { description: '获取所有的课程' })
  async curriculums (@Args() args: RelayPagingConfigArgs) {
    return await this.curriculumsService.curriculums(args)
  }

  @Query(of => Curriculum, { description: '以id获取课程' })
  async curriculum (@Args('id') id: string) {
    return await this.curriculumsService.curriculum(id)
  }
}
