import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser, Role, Roles } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { User } from '../user/models/user.model'
import { ExperiencesService } from './experiences.service'
import { Experience, ExperiencesConnection, MintForSZTUArgs } from './models/experiences.model'

@Resolver(of => Experience)
export class ExperiencesResolver {
  constructor (private readonly experiencesService: ExperiencesService) {}

  @Query(of => Experience)
  async experiencePointsTransaction (@Args('id') id: string) {
    return await this.experiencesService.experiencePointsTransaction(id)
  }

  @Query(of => ExperiencesConnection)
  async experiencePointsTransactions (@Args() args: RelayPagingConfigArgs) {
    return await this.experiencesService.experiencePointsTransactions(args)
  }

  @Mutation(of => Experience, { description: '每日签到' })
  @Roles(Role.User)
  async dailyCheckIn (@CurrentUser() user: User) {
    return await this.experiencesService.dailyCheckIn(user.id)
  }

  @Mutation(of => Experience, { description: 'mint from sztu' })
  @Roles(Role.User)
  async mintForSZTU (@CurrentUser() user: User, @Args() args: MintForSZTUArgs) {
    return await this.experiencesService.mintForSZTU(user, args)
  }
}
