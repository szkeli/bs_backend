import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { AdminAndUserUnion, PagingConfigArgs } from '../user/models/user.model'
import { AddPrivilegeOnAdmin, Privilege, PrivilegesConnection, RemovePrivilegeOnAdmin } from './models/privileges.model'
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
  async privileges (@Args() { first, offset }: PagingConfigArgs) {
    return await this.privilegesService.privileges(first, offset)
  }

  @Mutation(of => Privilege, { description: '添加一个权限到某管理员' })
  @Roles(Role.Admin)
  async addPrivilegeOnAdmin (@CurrentUser() admin: Admin, @Args() { privilege, adminId }: AddPrivilegeOnAdmin) {
    return await this.privilegesService.addPrivilegeOnAdmin(admin.id, privilege, adminId)
  }

  @Mutation(of => Boolean, { description: '从某管理员移除一个权限' })
  @Roles(Role.Admin)
  async removePrivilegeOnAdmin (@CurrentUser() admin: Admin, @Args() { privilege, from }: RemovePrivilegeOnAdmin) {
    return await this.privilegesService.removePrivilegeOnAdmin(admin.id, from, privilege)
  }

  @ResolveField(of => AdminAndUserUnion, { description: '权限作用的对象' })
  async to (@Parent() privilege: Privilege) {
    return await this.privilegesService.to(privilege.id)
  }

  @ResolveField(of => Admin, { description: '权限的创建者' })
  async creator (@Parent() privilege: Privilege) {
    return await this.privilegesService.creator(privilege.id)
  }
}
