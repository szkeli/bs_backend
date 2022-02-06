import { Inject } from '@nestjs/common'
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
import { PUB_SUB_KEY } from '../constants'
import { DeletesService } from '../deletes/deletes.service'
import { Delete } from '../deletes/models/deletes.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { Votable, VotesConnection } from '../votes/model/votes.model'
import {
  CreatePostArgs,
  Nullable,
  Post,
  PostsConnection
} from './models/post.model'
import { PostsService } from './posts.service'

@Resolver((_of: Post) => Post)
export class PostsResolver {
  constructor (
    private readonly postsService: PostsService,
    private readonly subjectService: SubjectService,
    private readonly reportsService: ReportsService,
    private readonly commentService: CommentService,
    private readonly deletesService: DeletesService,
    @Inject(PUB_SUB_KEY) private readonly pubSub: PubSub
  ) {}

  @Subscription(of => Votable)
  voteChanged () {
    return this.pubSub.asyncIterator('voteChanged')
  }

  @Query(of => Post, { description: '以postId获取一个帖子' })
  @MaybeAuth()
  // @CheckPolicies(new ReadPostPolicyHandler())
  async post (@Args('id') id: PostId): Promise<Post> {
    return await this.postsService.post(id)
  }

  @Query(of => PostsConnection, { description: '获取所有帖子' })
  @MaybeAuth()
  async posts (@Args() { first, offset }: PagingConfigArgs): Promise<PostsConnection> {
    return await this.postsService.posts(first, offset)
  }

  @Query(of => PostsConnection, { description: '按热度获取所有帖子' })
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
    return await this.postsService.creator(post.id)
  }

  @ResolveField(of => CommentsConnection, { description: '帖子的所有评论' })
  async comments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.getCommentsByPostId(post.id, first, offset)
  }

  @ResolveField(of => Subject, { nullable: true, description: '帖子所属的主题' })
  async subject (@Parent() post: Post): Promise<Subject | null> {
    return await this.subjectService.findASubjectByPostId(post.id)
  }

  @ResolveField(of => VotesConnection, { description: '帖子的点赞' })
  async votes (@Parent() post: Post, @CurrentUser() user: User, @Args() args: PagingConfigArgs) {
    return await this.postsService.getVotesByPostId(user?.id, post.id, args.first, args.offset)
  }

  @ResolveField(of => ReportsConnection, { description: '帖子收到的举报' })
  async reports (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByPostId(post.id, first, offset)
  }

  @ResolveField(of => CommentsConnection, { description: '帖子的折叠评论' })
  async foldedComments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.findFoldedCommentsByPostId(post.id, first, offset)
  }

  @ResolveField(of => CommentsConnection, { description: '按热度返回评论' })
  async trendingComments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.trendingComments(post.id, first, offset)
  }

  @ResolveField(of => Delete, { description: '帖子未被删除时，此项为空' })
  async delete (@Parent() post: Post) {
    return await this.deletesService.findDeleteByPostId(post.id)
  }
}
