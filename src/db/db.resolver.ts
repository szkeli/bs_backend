import { ForbiddenException } from '@nestjs/common'
import { Mutation, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { DbService } from './db.service'
import { SetDbSchema } from './model/db.model'

@Resolver()
export class DbResolver {
  constructor (private readonly dbService: DbService) {}

  @Mutation(of => SetDbSchema, { description: '重置数据库schema' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async setSchema () {
    return await this.dbService.setSchema()
  }

  @Mutation(of => Boolean, { description: '删除数据库所有数据，包括schema' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async dropAllData (@CurrentUser() admin: Admin) {
    if (admin.userId !== 'system') { throw new ForbiddenException('请使用system账号删库') }
    await this.dbService.dropAll()
    return true
  }

  @Mutation(of => Boolean, { description: '删除数据库所有数据，但保留schema' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async dropData (@CurrentUser() admin: Admin) {
    if (admin.userId !== 'system') { throw new ForbiddenException('请使用system账号删库') }
    await this.dbService.dropData()
    return true
  }
}
