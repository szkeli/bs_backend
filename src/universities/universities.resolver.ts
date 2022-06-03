import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentAdmin, NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { InstitutesConnection } from '../institutes/models/institutes.model'
import { SubCampusesConnection } from '../subcampus/models/subcampus.model'
import { SubjectsConnection } from '../subject/model/subject.model'
import { UsersConnectionWithRelay } from '../user/models/user.model'
import { CreateUniversityArgs, DeleteUniversityArgs, UniversitiesConnection, University, UpdateUniversityArgs } from './models/universities.models'
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

  @Mutation(of => Boolean, { description: '标记删除一个 University' })
  @Roles(Role.Admin)
  // 对于 University 只能实现添加 Delete 来实现标记删除
  // 因为仅仅删除 University 本身仍会留下它包含的
  // Institutes, SubCampuses, Users
  async deleteUniversity (@CurrentAdmin() admin: Admin, @Args() args: DeleteUniversityArgs) {
    return await this.universitiesService.deleteUniversity(admin.id, args)
  }

  @ResolveField(of => InstitutesConnection, { description: '该大学的所有学院' })
  async institutes (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.institutes(university.id, args)
  }

  @ResolveField(of => SubCampusesConnection, { description: '该大学的所有校区' })
  async subcampuses (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.subcampuses(university.id, args)
  }

  @ResolveField(of => UsersConnectionWithRelay, { description: '该大学内的所有 User' })
  async users (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.users(university.id, args)
  }

  @ResolveField(of => SubjectsConnection, { description: '该大学拥有的所有 Subject' })
  async subjects (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.subjects(university.id, args)
  }

  @Mutation(of => Boolean, { description: '测试接口，将当前所有用户添加到某个学校' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async addAllUserToUniversity (@Args('id') id: string) {
    return await this.universitiesService.addAllUserToUniversity(id)
  }

  @Mutation(of => Boolean, { description: '测试接口，将当前所有帖子添加到某个学校' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async addAllPostToUniversity (@Args('id') id: string) {
    return await this.universitiesService.addAllPostToUniversity(id)
  }
}
