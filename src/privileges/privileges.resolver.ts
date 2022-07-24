import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { AddPrivilegeOnAdmin, AddPrivilegeOnUserArgs, Privilege, PrivilegesConnection, RemovePrivilegeArgs } from './models/privileges.model'
import { PrivilegesService } from './privileges.service'

@Resolver(of => Privilege)
export class PrivilegesResolver {
  constructor (private readonly privilegesService: PrivilegesService) {}

  @Query(of => Privilege, { description: '以id获取权限' })
  async privilege (@Args('id') id: string) {
    return await this.privilegesService.privilege(id)
  }

  @Query(of => PrivilegesConnection, { description: '获取所有权限' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async privileges (@Args() args: RelayPagingConfigArgs) {
    return await this.privilegesService.privileges(args)
  }

  @Mutation(of => Privilege, { description: '添加一个权限到某管理员' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())

  async addPrivilegeOnAdmin (@CurrentUser() admin: Admin, @Args() { privilege, adminId }: AddPrivilegeOnAdmin) {
    return await this.privilegesService.addPrivilegeOnAdmin(admin.id, privilege, adminId)
  }

  @Mutation(of => Privilege, { description: '添加一个权限到某用户' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async addPrivilegeOnUser (@CurrentUser() admin: Admin, @Args() { privilege, id }: AddPrivilegeOnUserArgs) {
    return await this.privilegesService.addPrivilegeOnUser(admin.id, privilege, id)
  }

  @Mutation(of => Boolean, { description: '从某用户移除一个权限' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async removePrivilegeOnUser (@CurrentUser() admin: Admin, @Args() { privilege, from }: RemovePrivilegeArgs) {
    return await this.privilegesService.removePrivilegeOnUser(admin.id, from, privilege)
  }

  @Mutation(of => Boolean, { description: '从某管理员移除一个权限' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async removePrivilegeOnAdmin (@CurrentUser() admin: Admin, @Args() { privilege, from }: RemovePrivilegeArgs) {
    return await this.privilegesService.removePrivilegeOnAdmin(admin.id, from, privilege)
  }
}
