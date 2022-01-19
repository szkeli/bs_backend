import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { sign as sign_calculus } from 'src/tool'

import { AuthService } from '../auth/auth.service'
import { CurrentUser, NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { AdminService } from './admin.service'
import {
  Admin,
  AdminsConnection,
  Credential,
  CredentialsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Resolver(() => Admin)
export class AdminResolver {
  constructor (
    private readonly adminService: AdminService,
    private readonly authService: AuthService
  ) {}

  @Mutation(returns => Admin)
  @NoAuth()
  async registerAdmin (@Args() args: RegisterAdminArgs) {
    args.sign = sign_calculus(args.sign)
    return await this.adminService.registerAdmin(args)
  }

  @Mutation(returns => Admin)
  @Roles(Role.Admin)
  async authenAdmin (@CurrentUser() user: User, @Args('to') to: string) {
    return await this.adminService.authenAdmin(user.id, to)
  }

  @Query(returns => AdminsConnection)
  @Roles(Role.Admin)
  async admins (@Args() { first, offset }: PagingConfigArgs) {
    return await this.adminService.admins(first, offset)
  }

  @Query(returns => Admin)
  @Roles(Role.Admin)
  async admin (@Args('id') id: string) {
    return await this.adminService.admin(id)
  }

  @ResolveField(() => Credential, { nullable: true })
  async credential (@Parent() admin: Admin) {
    return await this.adminService.findCredentialByAdminId(admin.id)
  }

  @ResolveField(() => CredentialsConnection)
  async credentials (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.adminService.findCredentialsByAdminId(admin.id, first, offset)
  }
}
