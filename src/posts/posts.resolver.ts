import { ValidationPipe } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CheckPolicies, CurrentUser, MaybeAuth, Roles } from 'src/auth/decorator'
import {
  CommentsConnection, CommentsConnectionWithRelay
} from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'
import { Subject } from 'src/subject/model/subject.model'
import { SubjectService } from 'src/subject/subject.service'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Anonymous } from '../anonymous/models/anonymous.model'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { CommentService } from '../comment/comment.service'
import { DeletesService } from '../deletes/deletes.service'
import { Delete } from '../deletes/models/deletes.model'
import { HashtagsConnection } from '../hashtags/models/hashtags.model'
import { WithinArgs } from '../node/models/node.model'
import { OrderUnion } from '../orders/models/orders.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { University } from '../universities/models/universities.models'
import { VotesConnection, VotesConnectionWithRelay } from '../votes/model/votes.model'
import {
  CreatePostArgs,
  Nullable,
  Post,
  PostsConnection,
  PostsConnectionWithRelay,
  QueryPostsFilter,
  RelayPagingConfigArgs
} from './models/post.model'
import { PostsService } from './posts.service'

@Resolver(of => Post)
export class PostsResolver {
  constructor (
    private readonly postsService: PostsService,
    private readonly subjectService: SubjectService,
    private readonly reportsService: ReportsService,
    private readonly commentService: CommentService,
    private readonly deletesService: DeletesService
  ) {}

  @Query(of => Post, { description: '以postId获取一个帖子' })
  @MaybeAuth()
  async post (@Args('id') id: PostId): Promise<Post> {
    return await this.postsService.post(id)
  }

  @Query(of => PostsConnection, { deprecationReason: '请使用postsWithRelay', description: '获取所有帖子' })
  @MaybeAuth()
  async posts (@Args() { first, offset }: PagingConfigArgs): Promise<PostsConnection> {
    return await this.postsService.posts(first, offset)
  }

  @Query(of => PostsConnection, { description: '获取指定时间段内的帖子' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new ViewAppStatePolicyHandler())
  async postsCreatedWithin (@Args() { startTime, endTime }: WithinArgs, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.postsCreatedWithin(startTime, endTime, first, offset)
  }

  @Query(of => PostsConnectionWithRelay, { description: 'Relay分页版的posts接口' })
  @MaybeAuth()
  async postsWithRelay (@Args() paging: RelayPagingConfigArgs, @Args() filter: QueryPostsFilter) {
    return await this.postsService.postsWithRelay(paging, filter)
  }

  @Query(of => PostsConnectionWithRelay, { description: '按热度获取所有帖子' })
  @MaybeAuth()
  async trendingPostsWithRelay (@Args() paging: RelayPagingConfigArgs, filter: QueryPostsFilter) {
    return await this.postsService.trendingPostsWithRelay(paging, filter)
  }

  @Query(of => PostsConnection, { deprecationReason: '请使用 trendingPostsWithRelay' })
  @MaybeAuth()
  async trendingPosts (@Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.trendingPosts(first, offset)
  }

  @Query(of => PostsConnection, { description: '获取所有被删除的帖子' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async deletedPosts (@Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.deletedPosts(first, offset)
  }

  @Query(of => CommentsConnectionWithRelay, { description: 'relay分页版 以id获取某帖子下所有评论', deprecationReason: '请使用 Post.commentsWithRelay' })
  @MaybeAuth()
  async postCommentsWithRelay (@Args('id') id: PostId, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.commentsWithRelay(id, paging)
  }

  @Mutation(of => Post, { description: '创建一个帖子' })
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async createPost (@CurrentUser() user: User, @Args(new ValidationPipe()) args: CreatePostArgs) {
    return await this.postsService.createPost(user.id, args)
  }

  @ResolveField(of => User, { nullable: true, description: '帖子的创建者，当帖子是匿名帖子时，返回null' })
  async creator (@Parent() post: Post): Promise<Nullable<User>> {
    return await this.postsService.creator(post.id.toString())
  }

  @ResolveField(of => CommentsConnection, { description: '帖子的所有评论', deprecationReason: '请使用commentsWithRelay' })
  async comments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.comments(post.id.toString(), first, offset)
  }

  @ResolveField(of => CommentsConnectionWithRelay, { description: '获取所有评论 relay分页版' })
  async commentsWithRelay (@Parent() post: Post, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.commentsWithRelay(post.id, paging)
  }

  @ResolveField(of => Subject, { nullable: true, description: '帖子所属的主题' })
  async subject (@Parent() post: Post): Promise<Subject | null> {
    return await this.postsService.subject(post.id)
  }

  @ResolveField(of => VotesConnection, { description: '帖子的点赞' })
  async votes (@CurrentUser() user: User, @Parent() post: Post, @Args() args: PagingConfigArgs) {
    return await this.postsService.getVotesByPostId(user?.id, post.id, args)
  }

  @ResolveField(of => VotesConnectionWithRelay, { description: '帖子的点赞' })
  async votesWithRelay (@CurrentUser() user: User, @Parent() post: Post, @Args() args: RelayPagingConfigArgs) {
    return await this.postsService.votes(user?.id, post.id, args)
  }

  // @ResolveField(of => ReportsConnection, { description: '帖子收到的举报' })
  // async reports (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
  //   return await this.reportsService.findReportsByPostId(post.id.toString(), first, offset)
  // }

  @ResolveField(of => CommentsConnection, { description: '帖子的折叠评论' })
  async foldedComments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.findFoldedCommentsByPostId(post.id.toString(), first, offset)
  }

  @ResolveField(of => CommentsConnectionWithRelay, { description: '帖子的所有折叠评论' })
  async foldedCommentsWithRelay (@Parent() post: Post, @Args() paging: RelayPagingConfigArgs) {
    return await this.postsService.foldedCommentsWithRelay(post.id, paging)
  }

  @ResolveField(of => CommentsConnection, { description: '按热度返回评论' })
  async trendingComments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.trendingComments(post.id.toString(), first, offset)
  }

  @ResolveField(of => Delete, { description: '帖子未被删除时，此项为空', nullable: true })
  async delete (@Parent() post: Post) {
    return await this.deletesService.findDeleteByPostId(post.id.toString())
  }

  @ResolveField(of => Anonymous, { description: '帖子的匿名信息，非匿名帖子此项为空', nullable: true })
  async anonymous (@Parent() post: Post) {
    return await this.postsService.anonymous(post.id)
  }

  @ResolveField(of => HashtagsConnection, { description: '该帖子的所有 Hashtag' })
  async hashtags (@Args() args: RelayPagingConfigArgs, @Parent() post: Post) {
    return await this.postsService.hashtags(post.id, args)
  }

  @ResolveField(of => [String], { description: '帖子的图片', nullable: 'items' })
  async images (@Parent() post: Post): Promise<string[]> {
    return await this.postsService.imagesV2(post.id)
  }

  @ResolveField(of => University, { description: '该帖子所在的大学', nullable: true })
  async university (@Parent() post: Post): Promise<University> {
    return await this.postsService.university(post.id)
  }

  @ResolveField(of => OrderUnion, { description: '当前帖子携带的订单', nullable: true })
  async order (@Parent() post: Post): Promise<typeof OrderUnion> {
    return await this.postsService.order(post.id)
  }
}
