import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { University } from '../universities/models/universities.models'
import { CreateSubCampusArgs, SubCampus, SubCampusesConnection } from './models/subcampus.model'
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
  async createSubCampus (@Args() args: CreateSubCampusArgs) {
    return await this.subcampusService.createSubCampus(args)
  }

  @ResolveField(of => University)
  async university (@Parent() subcampus: SubCampus) {
    return await this.subcampusService.university(subcampus.id)
  }
}
