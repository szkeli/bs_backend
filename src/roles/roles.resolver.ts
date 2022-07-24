import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Role as RoleGuard, Roles } from '../auth/decorator'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { User, UsersConnectionWithRelay } from '../user/models/user.model'
import { CreateRoleArgs, Role, RolesConnection } from './models/roles.model'
import { RolesService } from './roles.service'

@Resolver(of => Role)
export class RolesResolver {
  constructor (private readonly rolesService: RolesService) {}

  @ResolveField(of => UsersConnectionWithRelay, { description: '具有该角色的所有用户' })
  async users (@Parent() role: Role, @Args() args: RelayPagingConfigArgs) {
    return await this.rolesService.users(role.id, args)
  }

  @ResolveField(of => Admin, { description: '角色的创建者' })
  async creator (@Parent() role: Role) {
    return await this.rolesService.creator(role.id)
  }

  @Query(of => RolesConnection, { description: '所有的角色' })
  @Roles(RoleGuard.Admin)
  async roles (@Args() args: RelayPagingConfigArgs) {
    return await this.rolesService.roles(args)
  }

  @Mutation(of => User, { description: '添加一个角色到某用户' })
  @Roles(RoleGuard.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  //   TODO 管理员应该有相应的权限才能添加用户角色
  async addRoleOnUser (
  @CurrentUser() admin: Admin,
    @Args('to') to: string,
    @Args('roleId') roleId: string
  ) {
    return await this.rolesService.addRoleOnUser(admin.id, to, roleId)
  }

  @Mutation(of => Role, { description: '创建角色' })
  @Roles(RoleGuard.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async createRole (@CurrentUser() admin: Admin, @Args() args: CreateRoleArgs) {
    return await this.rolesService.createRole(admin.id, args)
  }
}
