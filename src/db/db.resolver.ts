import { Mutation, Resolver } from '@nestjs/graphql'

import { Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { DbService } from './db.service'
import { SetDbSchema } from './model/db.model'

@Resolver()
export class DbResolver {
  constructor (private readonly dbService: DbService) {

  }

  @Mutation(() => SetDbSchema)
  @Roles(Role.Admin)
  async setSchema () {
    return await this.dbService.setSchema()
  }

  @Mutation(() => Boolean)
  async dropAllData () {
    return await this.dbService.dropAll()
  }

  @Mutation(() => Boolean)
  async dropData () {
    return await this.dbService.dropData()
  }
}
