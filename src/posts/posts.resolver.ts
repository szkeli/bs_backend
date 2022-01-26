import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CheckPolicies, CurrentUser } from 'src/auth/decorator'
import {
  CommentsConnection
} from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'
import { Subject } from 'src/subject/model/subject.model'
import { SubjectService } from 'src/subject/subject.service'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { ReadPostPolicyHandler } from '../casl/casl.handler'
import { CommentService } from '../comment/comment.service'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { VotesConnection } from '../votes/model/votes.model'
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
    private readonly commentService: CommentService
  ) {}

  @Query(returns => Post)
  @CheckPolicies(new ReadPostPolicyHandler())
  async post (@CurrentUser() user: User, @Args('id') id: PostId): Promise<Post> {
    return await this.postsService.post(id)
  }

  @Query(returns => PostsConnection)
  @CheckPolicies(new ReadPostPolicyHandler())
  async posts (@Args() { first, offset }: PagingConfigArgs): Promise<PostsConnection> {
    return await this.postsService.posts(first, offset)
  }

  @Query(of => PostsConnection)
  async trendingPosts (@Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.trendingPosts(first, offset)
  }

  @Mutation(returns => Post, { description: '创建一个帖子' })
  async createPost (@CurrentUser() user: User, @Args() args: CreatePostArgs) {
    return await this.postsService.createPost(user.id, args)
  }

  @ResolveField(returns => User, { nullable: true, description: '帖子的创建者，当帖子是匿名帖子时，返回null' })
  async creator (@Parent() post: Post): Promise<Nullable<User>> {
    return await this.postsService.creator(post.id)
  }

  @ResolveField(returns => CommentsConnection, { description: '帖子的评论' })
  async comments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.getCommentsByPostId(post.id, first, offset)
  }

  @ResolveField(returns => Subject, { nullable: true, description: '帖子所属的主题' })
  async subject (@Parent() post: Post): Promise<Subject | null> {
    return await this.subjectService.findASubjectByPostId(post.id)
  }

  @ResolveField(returns => VotesConnection, { description: '帖子的点赞' })
  async votes (@CurrentUser() user: User, @Parent() post: Post, @Args() args: PagingConfigArgs) {
    return await this.postsService.getVotesByPostId(user.id, post.id, args.first, args.offset)
  }

  @ResolveField(returns => ReportsConnection, { description: '帖子收到的举报' })
  async reports (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByPostId(post.id, first, offset)
  }
}
