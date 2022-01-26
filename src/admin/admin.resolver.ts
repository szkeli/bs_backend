import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { sign as sign_calculus } from 'src/tool'

import { CurrentUser, NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { FoldsService } from '../folds/folds.service'
import { FoldsConnection } from '../folds/models/folds.model'
import { PrivilegesConnection } from '../privileges/models/privileges.model'
import { AdminService } from './admin.service'
import {
  Admin,
  AdminsConnection,
  Credential,
  CredentialsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (
    private readonly adminService: AdminService,
    private readonly foldsService: FoldsService
  ) {}

  @Mutation(returns => Admin, { description: '注册一个管理员，需要使用authen认证新注册的管理员' })
  @NoAuth()
  async registerAdmin (@Args() args: RegisterAdminArgs) {
    args.sign = sign_calculus(args.sign)
    return await this.adminService.registerAdmin(args)
  }

  @Mutation(returns => Admin, { description: '已存在的管理员认证一个新注册的管理员' })
  @Roles(Role.Admin)
  async authenAdmin (@CurrentUser() admin: Admin, @Args('to') to: string) {
    return await this.adminService.authenAdmin(admin.id, to)
  }

  @Query(returns => Admin, { description: '根据id返回管理员' })
  @Roles(Role.Admin)
  async admin (@Args('id') id: string) {
    return await this.adminService.admin(id)
  }

  @Query(returns => AdminsConnection, { description: '分页返回所有的管理员' })
  @Roles(Role.Admin)
  async admins (
  @Args('first', { type: () => Int }) first: number,
    @Args('offset', { type: () => Int }) offset: number
  ) {
    return await this.adminService.admins(first, offset)
  }

  @ResolveField(returns => Credential, { nullable: true, description: '管理员的认证者' })
  async credential (@Parent() admin: Admin) {
    return await this.adminService.findCredentialByAdminId(admin.id)
  }

  @ResolveField(returns => CredentialsConnection, { description: '当前管理员认证过的其他管理员' })
  async credentials (
  @Parent() admin: Admin,
    @Args('first', { type: () => Int }) first: number,
    @Args('offset', { type: () => Int }) offset: number
  ) {
    return await this.adminService.findCredentialsByAdminId(admin.id, first, offset)
  }

  @ResolveField(() => PrivilegesConnection)
  async privileges (
  @Parent() admin: Admin,
    @Args('first', { type: () => Int }) first: number,
    @Args('offset', { type: () => Int }) offset: number
  ) {
    return await this.adminService.privileges(admin.id, first, offset)
  }

  @ResolveField(of => FoldsConnection)
  async folds (
  @Parent() admin: Admin,
    @Args('first', { type: () => Int }) first: number,
    @Args('offset', { type: () => Int }) offset: number
  ) {
    return await this.foldsService.findFoldsByAdminId(admin.id, first, offset)
  }
}
