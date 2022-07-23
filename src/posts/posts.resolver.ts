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
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Anonymous } from '../anonymous/models/anonymous.model'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { CommentService } from '../comment/comment.service'
import { HashtagsConnection } from '../hashtags/models/hashtags.model'
import { WithinArgs } from '../node/models/node.model'
import { University } from '../universities/models/universities.models'
import {
  CreatePostArgs,
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
    private readonly commentService: CommentService
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
}
