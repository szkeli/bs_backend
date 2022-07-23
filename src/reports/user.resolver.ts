import { Resolver } from '@nestjs/graphql'

import { Person } from '../user/models/user.model'
import { ReportsService } from './reports.service'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly reportsService: ReportsService) {}
  // @ResolveField(of => ReportsConnection, { description: '当前用户收到的所有举报' })
  // async reports (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
  //   return await this.reportsService.findReportsByUid(user.id, first, offset)
  // }
}
