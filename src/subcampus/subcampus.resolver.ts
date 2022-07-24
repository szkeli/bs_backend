import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { Role, Roles } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CreateSubCampusArgs, DeleteSubCampusArgs, SubCampus, SubCampusesConnection } from './models/subcampus.model'
import { SubcampusService } from './subcampus.service'

@Resolver(of => SubCampus)
export class SubcampusResolver {
  constructor (private readonly subcampusService: SubcampusService) {}

  @Query(of => SubCampus)
  async subcampus (@Args('id') id: string) {
    return await this.subcampusService.subcampus(id)
  }

  @Query(of => SubCampusesConnection)
  async subcampuses (@Args() args: RelayPagingConfigArgs) {
    return await this.subcampusService.subcampuses(args)
  }

  @Mutation(of => SubCampus)
  @Roles(Role.Admin)
  async createSubCampus (@Args() args: CreateSubCampusArgs) {
    return await this.subcampusService.createSubCampus(args)
  }

  @Mutation(of => Boolean)
  @Roles(Role.Admin)
  async deleteSubCampus (@Args() args: DeleteSubCampusArgs) {
    return await this.subcampusService.deleteSubCampus(args)
  }
}
