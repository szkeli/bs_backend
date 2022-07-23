import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { Role, Roles } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { InstitutesService } from './institutes.service'
import { CreateInstituteArgs, DeleteInstituteArgs, Institute, InstitutesConnection } from './models/institutes.model'

@Resolver(of => Institute)
export class InstitutesResolver {
  constructor (private readonly institutesService: InstitutesService) {}

  @Query(of => Institute)
  @Roles(Role.Admin, Role.User)
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

  @Mutation(of => Boolean)
  @Roles(Role.Admin)
  async deleteInstitute (@Args() args: DeleteInstituteArgs) {
    return await this.institutesService.deleteInstitute(args)
  }
}
