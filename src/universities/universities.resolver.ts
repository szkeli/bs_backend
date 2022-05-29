import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { NoAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CreateUniversityArgs, UniversitiesConnection, University } from './models/universities.models'
import { UniversitiesService } from './universities.service'

@Resolver(of => University)
export class UniversitiesResolver {
  constructor (private readonly universitiesService: UniversitiesService) {}

  @Query(of => University)
  @NoAuth()
  async university (@Args('id') id: string) {
    return await this.universitiesService.university(id)
  }

  @Query(of => UniversitiesConnection)
  @NoAuth()
  async universities (@Args() args: RelayPagingConfigArgs) {
    return await this.universitiesService.universities(args)
  }

  @Mutation(of => University)
  @Roles(Role.Admin)
  //   添加权限检测
  async createUniversity (@Args() args: CreateUniversityArgs) {
    return await this.universitiesService.createUniversity(args)
  }
}
