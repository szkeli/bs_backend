import { ForbiddenException } from '@nestjs/common'
import { Mutation, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { DbService } from './db.service'
import { SetDbSchema } from './model/db.model'

@Resolver()
export class DbResolver {
  constructor (private readonly dbService: DbService) {}

  @Mutation(() => SetDbSchema)
  @Roles(Role.Admin)
  async setSchema () {
    return await this.dbService.setSchema()
  }

  @Mutation(() => Boolean)
  @Roles(Role.Admin)
  async dropAllData (@CurrentUser() admin: Admin) {
    if (admin.userId !== 'system') { throw new ForbiddenException('请使用system账号删库') }
    return await this.dbService.dropAll()
  }

  @Mutation(() => Boolean)
  @Roles(Role.Admin)
  async dropData (@CurrentUser() admin: Admin) {
    if (admin.userId !== 'system') { throw new ForbiddenException('请使用system账号删库') }
    return await this.dbService.dropData()
  }
}
