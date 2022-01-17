import { Mutation, Resolver } from '@nestjs/graphql'

import { DbService } from './db.service'

@Resolver()
export class DbResolver {
  constructor (private readonly dbService: DbService) {

  }

  @Mutation(() => Boolean)
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
