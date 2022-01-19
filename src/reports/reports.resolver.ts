import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Conversation } from '../conversations/models/conversations.model'
import { User } from '../user/models/user.model'
import { AddReportToArgs, Report, Report2Union } from './models/reports.model'
import { ReportsService } from './reports.service'

// 1. 创建一个会话
// 2. 创建一个举报并添加入该会话
// 3. 创建者 被举报者加入该会话
// 4. 管理员加入该会话 同时举报的状态改变为pending
// 5. 处理完成 关闭举报 关闭会话
@Resolver(_of => Report)
export class ReportsResolver {
  constructor (private readonly reportsService: ReportsService) {}

  @Mutation(returns => Report)
  async addReportOnComment (@CurrentUser() user: User, @Args() { type, description, to }: AddReportToArgs) {
    return await this.reportsService.addReportOnComment(user.id, to, type, description)
  }

  @Mutation(returns => Report)
  async addReportOnPost (@CurrentUser() user: User, @Args() { type, description, to }: AddReportToArgs) {
    return await this.reportsService.addReportOnPost(user.id, to, type, description)
  }

  @Mutation(returns => Report)
  async addReportOnUser (@CurrentUser() user: User, @Args() { type, description, to }: AddReportToArgs) {
    return await this.reportsService.addReportOnUser(user.id, to, type, description)
  }

  @ResolveField(returns => Report2Union)
  async to (@Parent() report: Report) {
    return await this.reportsService.findReport2ByReportId(report.id)
  }

  @ResolveField(returns => User)
  async creator (@Parent() report: Report) {
    return await this.reportsService.findCreatorOfReport(report.id)
  }

  @ResolveField(returns => Conversation)
  async conversation (@Parent() report: Report) {
    return await this.reportsService.findConversationByReportId(report.id)
  }
}
