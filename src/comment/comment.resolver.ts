import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser, Roles } from 'src/auth/decorator'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import { DeletesService } from '../deletes/deletes.service'
import { Delete, PostAndCommentUnion } from '../deletes/models/deletes.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { VotesConnection } from '../votes/model/votes.model'
import { CommentService } from './comment.service'
import {
  AddCommentArgs,
  Comment,
  CommentId,
  CommentsConnection
} from './models/comment.model'

@Resolver(_of => Comment)
export class CommentResolver {
  constructor (
    private readonly commentService: CommentService,
    private readonly reportsService: ReportsService,
    private readonly deletesService: DeletesService
  ) {}

  @Query(of => Comment, { description: '以id获取一条评论' })
  async comment (@Args('id') id: CommentId) {
    return await this.commentService.comment(id)
  }

  @Query(of => CommentsConnection, { description: '获取所有被删除的评论' })
  @Roles(Role.Admin)
  async deletedComments (@Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.deletedComments(first, offset)
  }

  @Mutation(of => Comment, { description: '添加一条评论到评论' })
  async addCommentOnComment (@CurrentUser() user: User, @Args() args: AddCommentArgs) {
    return await this.commentService.addCommentOnComment(user.id, args)
  }

  @Mutation(of => Comment, { description: '添加一条评论到帖子' })
  async addCommentOnPost (@CurrentUser() user: User, @Args() args: AddCommentArgs) {
    return await this.commentService.addCommentOnPost(user.id, args)
  }

  @ResolveField(of => CommentsConnection, { description: '获取该评论下的所有评论' })
  async comments (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.getCommentsByCommentId(comment.id, first, offset)
  }

  @ResolveField(of => CommentsConnection, { description: '按热度获取该评论下的所有评论' })
  async trendingComments (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.trendingComments(comment.id, first, offset)
  }

  @ResolveField(of => VotesConnection, { description: '获取该评论下的点赞信息' })
  async votes (@CurrentUser() user: User, @Parent() comment: Comment, @Args() args: PagingConfigArgs) {
    return await this.commentService.getVotesByCommentId(user?.id, comment.id, args.first, args.offset)
  }

  @ResolveField(() => ReportsConnection, { description: '获取该评论的举报信息' })
  async reports (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByCommentId(comment.id, first, offset)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '获取被评论的对象' })
  async to (@Parent() comment: Comment) {
    return await this.commentService.to(comment.id)
  }

  @ResolveField(() => User, { nullable: true, description: '评论的创建者，评论是匿名评论时，creator为null' })
  async creator (@Parent() comment: Comment) {
    return await this.commentService.creator(comment.id)
  }

  @ResolveField(of => Delete, { description: '评论未被删除时，此项为null', nullable: true })
  async delete (@Parent() comment: Comment) {
    return await this.deletesService.findDeleteByCommentId(comment.id)
  }
}
