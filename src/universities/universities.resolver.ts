import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { InstitutesConnection } from '../institutes/models/institutes.model'
import { SubCampusesConnection } from '../subcampus/models/subcampus.model'
import { SubjectsConnection } from '../subject/model/subject.model'
import { UsersConnection } from '../user/models/user.model'
import { CreateUniversityArgs, UniversitiesConnection, University, UpdateUniversityArgs } from './models/universities.models'
import { UniversitiesService } from './universities.service'

@Resolver(of => University)
export class UniversitiesResolver {
  constructor (private readonly universitiesService: UniversitiesService) {}

  @Query(of => University)
  @NoAuth()
  async university (@Args('id') id: string) {
    return await this.universitiesService.university(id)
  }

  @Query(of => UniversitiesConnection)
  @NoAuth()
  async universities (@Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.universities(args)
  }

  @Mutation(of => University)
  @Roles(Role.Admin)
  //   添加权限检测
  async createUniversity (@Args() args: CreateUniversityArgs) {
    return await this.universitiesService.createUniversity(args)
  }

  @Mutation(of => University)
  @Roles(Role.Admin)
  async updateUniversity (@Args() args: UpdateUniversityArgs) {
    return await this.universitiesService.updateUniversity(args)
  }

  // 对于 University 只能实现添加 Delete 来实现标记删除
  // @Mutation(of => Boolean)
  // @Roles(Role.Admin)
  // //
  // async deleteUniversity (@Args() args: DeleteUniversityArgs) {
  //   return await this.universitiesService.deleteUniversity(args)
  // }

  @ResolveField(of => InstitutesConnection, { description: '该大学的所有学院' })
  async institutes (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.institutes(university.id, args)
  }

  @ResolveField(of => SubCampusesConnection, { description: '该大学的所有校区' })
  async subcampuses (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.subcampuses(university.id, args)
  }

  @ResolveField(of => UsersConnection, { description: '该大学内的所有 User' })
  async users (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.users(university.id, args)
  }

  @ResolveField(of => SubjectsConnection, { description: '该大学拥有的所有 Subject' })
  async subjects (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.subjects(university.id, args)
  }
}
