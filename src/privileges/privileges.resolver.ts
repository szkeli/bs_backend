import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { AdminAndUserUnion } from '../user/models/user.model'
import { AddPrivilegeOnAdmin, Privilege } from './models/privileges.model'
import { PrivilegesService } from './privileges.service'

@Resolver(of => Privilege)
export class PrivilegesResolver {
  constructor (private readonly privilegesService: PrivilegesService) {}

  @Query(returns => Privilege)
  async privilege (@Args('id') id: string) {
    return await this.privilegesService.privilege(id)
  }

  @Mutation(returns => Privilege)
  @Roles(Role.Admin)
  async addPrivilegeOnAdmin (@CurrentUser() admin: Admin, @Args() { privilege, adminId }: AddPrivilegeOnAdmin) {
    return await this.privilegesService.addPrivilegeOnAdmin(admin.id, privilege, adminId)
  }

  @ResolveField(() => AdminAndUserUnion)
  async to (@Parent() privilege: Privilege) {
    return await this.privilegesService.to(privilege.id)
  }

  @ResolveField(() => Admin)
  async creator (@Parent() privilege: Privilege) {
    return await this.privilegesService.creator(privilege.id)
  }
}
