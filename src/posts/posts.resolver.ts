import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser, MaybeAuth, Roles } from 'src/auth/decorator'
import {
  CommentsConnection
} from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'
import { Subject } from 'src/subject/model/subject.model'
import { SubjectService } from 'src/subject/subject.service'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import { CommentService } from '../comment/comment.service'
import { DeletesService } from '../deletes/deletes.service'
import { Delete } from '../deletes/models/deletes.model'
import { WithinArgs } from '../node/models/node.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { VotesConnection } from '../votes/model/votes.model'
import {
  CommentsConnectionWithRelay,
  CreatePostArgs,
  Nullable,
  Post,
  PostsConnection,
  PostsConnectionWithRelay,
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
  // @CheckPolicies(new ReadPostPolicyHandler())
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
  async postsCreatedWithin (@Args() { startTime, endTime }: WithinArgs, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.postsCreatedWithin(startTime, endTime, first, offset)
  }

  @Query(of => PostsConnectionWithRelay, { description: 'Relay分页版的posts接口' })
  @MaybeAuth()
  async postsWithRelay (@Args() paging: RelayPagingConfigArgs) {
    return await this.postsService.postsWithRelay(paging)
  }

  @Query(of => PostsConnectionWithRelay, { description: '按热度获取所有帖子' })
  @MaybeAuth()
  async trendingPostsWithRelay (@Args() paging: RelayPagingConfigArgs) {
    return await this.postsService.trendingPostsWithRelayForward(paging.first, paging.after)
  }

  @Query(of => PostsConnection)
  @MaybeAuth()
  async trendingPosts (@Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.trendingPosts(first, offset)
  }

  @Query(of => PostsConnection, { description: '获取所有被删除的帖子' })
  @Roles(Role.Admin)
  async deletedPosts (@Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.deletedPosts(first, offset)
  }

  @Mutation(of => Post, { description: '创建一个帖子' })
  async createPost (@CurrentUser() user: User, @Args() args: CreatePostArgs) {
    return await this.postsService.createPost(user.id, args)
  }

  @ResolveField(of => User, { nullable: true, description: '帖子的创建者，当帖子是匿名帖子时，返回null' })
  async creator (@Parent() post: Post): Promise<Nullable<User>> {
    return await this.postsService.creator(post.id.toString())
  }

  @ResolveField(of => CommentsConnection, { description: '帖子的所有评论' })
  async comments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.comments(post.id.toString(), first, offset)
  }

  @ResolveField(of => CommentsConnectionWithRelay, { description: '获取所有评论 relay分页版' })
  async commentsWithRelay (@Parent() post: Post, @Args() paging: RelayPagingConfigArgs) {
    return await this.postsService.commentsWithRelay(post.id, paging)
  }

  @ResolveField(of => Subject, { nullable: true, description: '帖子所属的主题' })
  async subject (@Parent() post: Post): Promise<Subject | null> {
    return await this.subjectService.findASubjectByPostId(post.id.toString())
  }

  @ResolveField(of => VotesConnection, { description: '帖子的点赞' })
  async votes (@Parent() post: Post, @CurrentUser() user: User, @Args() args: PagingConfigArgs) {
    return await this.postsService.getVotesByPostId(user?.id, post.id.toString(), args.first, args.offset)
  }

  @ResolveField(of => ReportsConnection, { description: '帖子收到的举报' })
  async reports (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByPostId(post.id.toString(), first, offset)
  }

  @ResolveField(of => CommentsConnection, { description: '帖子的折叠评论' })
  async foldedComments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.findFoldedCommentsByPostId(post.id.toString(), first, offset)
  }

  @ResolveField(of => CommentsConnection, { description: '按热度返回评论' })
  async trendingComments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.trendingComments(post.id.toString(), first, offset)
  }

  @ResolveField(of => Delete, { description: '帖子未被删除时，此项为空' })
  async delete (@Parent() post: Post) {
    return await this.deletesService.findDeleteByPostId(post.id.toString())
  }
}
