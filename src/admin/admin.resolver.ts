import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { AdminService } from './admin.service'
import { Admin, CreateAdminInput, InviteTokenResult } from './models/admin.model'

@Resolver()
export class AdminResolver {
  constructor (private readonly adminService: AdminService) {}

  @Mutation(returns => Admin)
  async createAdmin (
  @Args('inviteToken') token: string,
    @Args('input') input: CreateAdminInput
  ) {
    return await this.adminService.createAdmin(input)
  }

  @Query(returns => InviteTokenResult)
  async createInviteToken () {
    // 当前用户是管理员
  }
}
