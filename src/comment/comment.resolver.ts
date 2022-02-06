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
import { Post } from '../posts/models/post.model'
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

  @Query(returns => Comment)
  async comment (@Args('id') id: CommentId) {
    return await this.commentService.comment(id)
  }

  @Query(of => CommentsConnection)
  @Roles(Role.Admin)
  async deletedComments (@Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.deletedComments(first, offset)
  }

  @Mutation(returns => Comment)
  async addCommentOnComment (@CurrentUser() user: User, @Args() args: AddCommentArgs) {
    return await this.commentService.addCommentOnComment(
      user.id,
      args
    )
  }

  @Mutation(returns => Comment)
  async addCommentOnPost (@CurrentUser() user: User, @Args() args: AddCommentArgs) {
    return await this.commentService.addCommentOnPost(user.id, args)
  }

  @ResolveField(returns => CommentsConnection)
  async comments (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.getCommentsByCommentId(comment.id, first, offset)
  }

  @ResolveField(of => CommentsConnection)
  async trendingComments (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.trendingComments(comment.id, first, offset)
  }

  @ResolveField(returns => VotesConnection)
  async votes (@CurrentUser() user: User, @Parent() comment: Comment, @Args() args: PagingConfigArgs) {
    return await this.commentService.getVotesByCommentId(user?.id, comment.id, args.first, args.offset)
  }

  @ResolveField(() => ReportsConnection)
  async reports (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByCommentId(comment.id, first, offset)
  }

  @ResolveField(() => Post)
  async post (@Parent() comment: Comment) {
    return await this.commentService.findPostByCommentId(comment.id)
  }

  @ResolveField(() => User, { nullable: true, description: '评论的创建者，评论是匿名评论时，creator为null' })
  async creator (@Parent() comment: Comment) {
    return await this.commentService.creator(comment.id)
  }
}
