import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { sign as sign_calculus } from 'src/tool'

import { CheckPolicies, NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { BlocksService } from '../blocks/blocks.service'
import { BlocksConnection } from '../blocks/models/blocks.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { ICredential, ICredentialsConnection } from '../credentials/models/credentials.model'
import { DeletesConnection } from '../deletes/models/deletes.model'
import { FoldsService } from '../folds/folds.service'
import { FoldsConnection } from '../folds/models/folds.model'
import { PinsConnection } from '../pins/models/pins.model'
import { PinsService } from '../pins/pins.service'
import { PrivilegesConnection } from '../privileges/models/privileges.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { AdminService } from './admin.service'
import {
  Admin,
  AdminsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (
    private readonly adminService: AdminService,
    private readonly foldsService: FoldsService,
    private readonly blocksService: BlocksService,
    private readonly pinsService: PinsService
  ) {}

  @Mutation(of => Admin, { description: '注册一个管理员，需要使用authen认证新注册的管理员' })
  @NoAuth()
  async registerAdmin (@Args() args: RegisterAdminArgs) {
    args.sign = sign_calculus(args.sign)
    return await this.adminService.registerAdmin(args)
  }

  @Query(of => Admin, { description: '以id获取管理员' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async admin (@Args('id') id: string) {
    return await this.adminService.admin(id)
  }

  @Query(of => AdminsConnection, { description: '获取所有管理员' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async admins (@Args() { first, offset }: PagingConfigArgs) {
    return await this.adminService.admins(first, offset)
  }

  @ResolveField(of => ICredential, { nullable: true, description: '管理员的凭证' })
  async credential (@Parent() admin: Admin) {
    return await this.adminService.findCredentialByAdminId(admin.id)
  }

  @ResolveField(of => ICredentialsConnection, { description: '当前管理员认证过的其他管理员' })
  async credentials (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.adminService.findCredentialsByAdminId(admin.id, first, offset)
  }

  @ResolveField(of => PrivilegesConnection, { description: '当前管理员拥有的权限' })
  async privileges (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.adminService.privileges(admin.id, first, offset)
  }

  @ResolveField(of => FoldsConnection, { description: '当前管理员折叠的评论' })
  async folds (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.foldsService.findFoldsByAdminId(admin.id, first, offset)
  }

  @ResolveField(of => BlocksConnection, { description: '当前管理员拉黑的用户' })
  async blocks (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.blocksService.findBlocksByAdminId(admin.id, first, offset)
  }

  @ResolveField(of => PinsConnection, { description: '当前管理员创建的置顶' })
  async pins (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.pinsService.findPinsByAdminId(admin.id, first, offset)
  }

  @ResolveField(of => DeletesConnection, { description: '当前管理员的所有删除操作' })
  async deletes (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.adminService.deletes(admin.id, first, offset)
  }
}
