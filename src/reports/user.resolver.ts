import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { PagingConfigArgs, Person, User } from '../user/models/user.model'
import { ReportsConnection } from './models/reports.model'
import { ReportsService } from './reports.service'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly reportsService: ReportsService) {}
  @ResolveField(of => ReportsConnection, { description: '当前用户收到的所有举报' })
  async reports (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByUid(user.id, first, offset)
  }
}
