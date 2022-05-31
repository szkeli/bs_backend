import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Role, Roles } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { University } from '../universities/models/universities.models'
import { InstitutesService } from './institutes.service'
import { CreateInstituteArgs, Institute, InstitutesConnection } from './models/institutes.model'

@Resolver(of => Institute)
export class InstitutesResolver {
  constructor (private readonly institutesService: InstitutesService) {}

  @Query(of => Institute)
  async institute (@Args('id') id: string) {
    return await this.institutesService.institute(id)
  }

  @Query(of => InstitutesConnection)
  @Roles(Role.Admin, Role.User)
  async institutes (@Args() args: RelayPagingConfigArgs) {
    return await this.institutesService.institutes(args)
  }

  @Mutation(of => Institute)
  @Roles(Role.Admin)
  async createInstitute (@Args() args: CreateInstituteArgs) {
    return await this.institutesService.createInstitute(args)
  }

  @ResolveField(of => University, { description: '当前学院所在的大学' })
  async university (@Parent() university: University) {
    return await this.institutesService.university(university.id)
  }
}
