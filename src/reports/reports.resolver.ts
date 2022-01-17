import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { CommentId } from '../comment/models/comment.model'
import { Conversation } from '../conversations/models/conversations.model'
import { PostId } from '../db/model/db.model'
import { User } from '../user/models/user.model'
import { AddReportOnUserArgs, Report, Report2Union } from './models/reports.model'
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
  async addReportOnComment (@CurrentUser() user: User, @Args('id') id: CommentId) {
    return await this.reportsService.addReportOnComment(user.id, id)
  }

  @Mutation(returns => Report)
  async addReportOnPost (@CurrentUser() user: User, @Args('id') id: PostId) {
    return await this.reportsService.addReportOnPost(user.id, id)
  }

  @Mutation(returns => Report)
  async addReportOnUser (@CurrentUser() user: User, @Args() { type, description, userId }: AddReportOnUserArgs) {
    return await this.reportsService.addReportOnUser(user.id, userId, type, description)
  }

  @ResolveField(returns => Report2Union)
  async to (@Parent() report: Report) {
    return await this.reportsService.findReport2ByReportId(report.id)
  }

  @ResolveField(returns => Conversation)
  async conversation (@Parent() report: Report) {
    return await this.reportsService.findConversationByReportId(report.id)
  }
}
