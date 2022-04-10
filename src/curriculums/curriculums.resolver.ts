import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Role, Roles } from '../auth/decorator'
import { DeadlinesConnection } from '../deadlines/models/deadlines.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { PersonWithRoles } from '../user/models/user.model'
import { CurriculumsService } from './curriculums.service'
import { AddCurriculumArgs, Curriculum, CurriculumsConnection, UpdateCurriculumArgs } from './models/curriculums.model'

/**
 * 学生的课程
 */
@Resolver(of => Curriculum)
export class CurriculumsResolver {
  constructor (private readonly curriculumsService: CurriculumsService) {}

  @Mutation(of => Curriculum, { description: '添加一个课程到当前用户' })
  @Roles(Role.Admin, Role.User)
  async addCurriculum (@CurrentUser() person: PersonWithRoles, @Args() args: AddCurriculumArgs) {
    if (person.roles?.includes(Role.Admin) && person.id !== args.id) {
      // 管理员添加课程到指定用户
      return await this.curriculumsService.addCurriculum(person.id, args)
    }
    if (person.roles?.includes(Role.User)) {
      // 用户给自己添加课程
      return await this.curriculumsService.addCurriculumSelf(person.id, args)
    }
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

  @ResolveField(of => DeadlinesConnection, { description: '该课程下的所有deadlines' })
  async deadlines (@Parent() curriculum: Curriculum, @Args() args: RelayPagingConfigArgs) {
    return await this.curriculumsService.deadlines(curriculum.id, args)
  }
}
