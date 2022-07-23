import {
  Args,
  Mutation,
  Query,
  Resolver
} from '@nestjs/graphql'

import { sign as sign_calculus } from 'src/tool'

import { CheckPolicies, NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { PinsService } from '../pins/pins.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
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
  async admins (@Args() args: RelayPagingConfigArgs) {
    return await this.adminService.admins(args)
  }
}
