import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Role as RoleGuard, Roles } from '../auth/decorator'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { AddRoleOnUserArgs, Role, RolesConnection } from './models/roles.model'
import { RolesService } from './roles.service'

@Resolver(of => Role)
export class RolesResolver {
  constructor (private readonly rolesService: RolesService) {}

  @ResolveField(of => User, { description: '角色授予的对象' })
  async to (@Parent() role: Role) {
    return await this.rolesService.to(role.id)
  }

  @ResolveField(of => Admin, { description: '角色的创建者' })
  async creator (@Parent() role: Role) {
    return await this.rolesService.creator(role.id)
  }

  @Query(of => RolesConnection, { description: '所有的角色' })
  async roles (@Args() arg: RelayPagingConfigArgs) {
    return await this.rolesService.roles(arg)
  }

  @Mutation(of => Role, { description: '添加一个角色到某用户' })
  @Roles(RoleGuard.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  //   TODO 管理员应该有相应的权限才能添加用户角色
  async addRoleOnUser (@CurrentUser() admin: Admin, @Args('to') to: string, @Args() args: AddRoleOnUserArgs) {
    return await this.rolesService.addRoleOnUser(admin.id, to, args)
  }
}
