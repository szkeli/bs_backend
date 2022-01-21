import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { Conversation } from '../conversations/models/conversations.model'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { AddReportToArgs, Report, Report2Union, ReportsConnection } from './models/reports.model'
import { ReportsService } from './reports.service'

// 1. 创建一个会话
// 2. 创建一个举报并添加入该会话
// 3. 创建者 被举报者加入该会话
// 4. 管理员加入该会话 同时举报的状态改变为pending
// 5. 处理完成 关闭举报 关闭会话
@Resolver(_of => Report)
export class ReportsResolver {
  constructor (private readonly reportsService: ReportsService) {}

  @Query(() => Report, { description: '根据举报id返回举报' })
  async report (@Args('id') id: string) {
    return await this.reportsService.report(id)
  }

  @Query(() => ReportsConnection, { description: '所有的举报' })
  async reports (@Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.reports(first, offset)
  }

  @Mutation(returns => Report, { description: '举报一条评论' })
  async addReportOnComment (@CurrentUser() user: User, @Args() { type, description, to }: AddReportToArgs) {
    return await this.reportsService.addReportOnComment(user.id, to, type, description)
  }

  @Mutation(returns => Report, { description: '举报一个帖子' })
  async addReportOnPost (@CurrentUser() user: User, @Args() { type, description, to }: AddReportToArgs) {
    return await this.reportsService.addReportOnPost(user.id, to, type, description)
  }

  @Mutation(returns => Report, { description: '举报一个用户' })
  async addReportOnUser (@CurrentUser() user: User, @Args() { type, description, to }: AddReportToArgs) {
    return await this.reportsService.addReportOnUser(user.id, to, type, description)
  }

  @Mutation(() => Boolean, { description: '管理员接口：认为举报无效' })
  @Roles(Role.Admin)
  async discardReport (@Args('reportId') reportId: string, @Args('content') content: string, @CurrentUser() user: User) {
    return await this.reportsService.discardReport(user.id, reportId, content)
  }

  @Mutation(() => Boolean, { description: '管理员接口：认为举报有效' })
  @Roles(Role.Admin)
  async acceptReport (@Args('reportId') reportId: string, @Args('content') content: string, @CurrentUser() user: User) {
    return await this.reportsService.acceptReport(user.id, reportId, content)
  }

  @ResolveField(returns => Report2Union, { description: '被举报的对象' })
  async to (@Parent() report: Report) {
    return await this.reportsService.to(report.id)
  }

  @ResolveField(returns => User, { description: '举报的创建者' })
  async creator (@Parent() report: Report) {
    return await this.reportsService.findCreatorOfReport(report.id)
  }

  @ResolveField(returns => Conversation, { description: '举报所在的会话' })
  async conversation (@Parent() report: Report) {
    return await this.reportsService.findConversationByReportId(report.id)
  }
}
