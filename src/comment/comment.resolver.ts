import { ForbiddenException, Inject } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription
} from '@nestjs/graphql'
import { PubSub } from 'graphql-subscriptions'

import { CheckPolicies, CurrentUser, MaybeAuth, NoAuth, Roles } from 'src/auth/decorator'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { PUB_SUB_KEY } from '../constants'
import { Mention, MentionsConnection } from '../mentions/models/mentions.model'
import { WithinArgs } from '../node/models/node.model'
import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { CommentService } from './comment.service'
import {
  AddCommentArgs,
  Comment,
  CommentsConnection,
  CommentsConnectionWithRelay,
  CommentToUnion,
  CommentWithTo
} from './models/comment.model'

@Resolver(_of => Comment)
export class CommentResolver {
  constructor (
    private readonly commentService: CommentService,
    @Inject(PUB_SUB_KEY)private readonly pubSub: PubSub
  ) {}

  @Subscription(of => Comment, {
    filter: (payload: {addCommented: CommentWithTo}, variables: {ids: String[]}) => {
      return variables.ids?.includes(payload.addCommented.to)
    },
    description: '监听置顶帖子或评论的评论'
  })
  @MaybeAuth()
  addCommented (@Args('ids', { type: () => [String] }) ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new ForbiddenException('ids 不能为null')
    }
    return this.pubSub.asyncIterator('addCommented')
  }

  @Query(of => CommentsConnection, { description: '查询某时间段内发布的所有评论' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new ViewAppStatePolicyHandler())
  async commentsCreatedWithin (@Args() { startTime, endTime }: WithinArgs, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.commentsCreatedWithin(startTime, endTime, first, offset)
  }

  @Query(of => Comment, { description: '以id获取一条评论' })
  async comment (@Args('id') id: string) {
    return await this.commentService.comment(id)
  }

  @Query(of => CommentsConnectionWithRelay, { description: 'Relay版 以id获取某评论下所有评论' })
  async commentCommentsWithRelay (@Args('id') id: string, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.commentsWithRelay(id, paging)
  }

  @Query(of => Post, { description: '根据评论获取原帖子' })
  @NoAuth()
  async findOriginPostByCommentId (@Args('id') id: string) {
    return await this.commentService.findOriginPostByCommentId(id)
  }

  @Query(of => CommentsConnection, { description: '获取所有被删除的评论' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async deletedComments (@Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.deletedComments(first, offset)
  }

  @Mutation(of => Comment, { description: '添加一条评论到评论' })
  async addCommentOnComment (@CurrentUser() user: User, @Args() args: AddCommentArgs): Promise<Comment> {
    const commentWithTo = await this.commentService.addCommentOnComment(user.id, args)
    await this.pubSub.publish('addCommented', { addCommented: commentWithTo })
    return commentWithTo
  }

  @Mutation(of => Comment, { description: '添加一条评论到评论的创建者' })
  async addCommentOnUser (@CurrentUser() user: User, @Args() args: AddCommentArgs) {
    return await this.commentService.addCommentOnUser(user.id, args)
  }

  @Mutation(of => Comment, { description: '添加一条评论到帖子' })
  async addCommentOnPost (@CurrentUser() user: User, @Args() args: AddCommentArgs): Promise<Comment> {
    const commentWithTo = await this.commentService.addCommentOnPost(user.id, args)
    await this.pubSub.publish('addCommented', { addCommented: commentWithTo })
    return commentWithTo
  }

  @Mutation(of => Mention, { description: '将 Comment 以 Mention 形式回复某个 User' })
  async addMentionOnUser (@CurrentUser() user: User, @Args() args: AddCommentArgs, @Args('toUser') toUser: string) {
    return await this.commentService.addMentionOnUser(user.id, args, toUser)
  }

  @ResolveField(of => CommentsConnection, { description: '获取该评论下的所有评论' })
  async comments (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.getCommentsByCommentId(comment.id, first, offset)
  }

  @ResolveField(of => CommentsConnectionWithRelay, { description: 'Relay版comments' })
  async commentsWithRelay (@Parent() comment: Comment, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.commentsWithRelay(comment.id, paging)
  }

  @ResolveField(of => CommentsConnection, { description: '按热度获取该评论下的所有评论' })
  async trendingComments (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.trendingComments(comment.id, first, offset)
  }

  // @ResolveField(() => ReportsConnection, { description: '获取该评论的举报信息' })
  // async reports (@Parent() comment: Comment, @Args() { first, offset }: PagingConfigArgs) {
  //   return await this.reportsService.findReportsByCommentId(comment.id, first, offset)
  // }

  @ResolveField(of => CommentToUnion, { description: '获取被评论的对象' })
  async to (@Parent() comment: Comment) {
    return await this.commentService.to(comment.id)
  }

  @ResolveField(of => MentionsConnection, { description: 'User 回复 User' })
  async mentions (@Parent() comment: Comment, @Args() args: RelayPagingConfigArgs) {
    return await this.commentService.mentions(comment.id, args)
  }

  @ResolveField(of => [String], { description: '评论的图片', nullable: 'items' })
  async images (@Parent() comment: Comment): Promise<string[]> {
    return await this.commentService.images(comment.id)
  }
}
