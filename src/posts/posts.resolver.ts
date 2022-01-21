import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import {
  CommentsConnection
} from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'
import { Subject } from 'src/subject/model/subject.model'
import { SubjectService } from 'src/subject/subject.service'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { VotesConnection } from '../votes/model/votes.model'
import {
  CreatePostArgs,
  Post,
  PostsConnection
} from './models/post.model'
import { PostsService } from './posts.service'

@Resolver((_of: Post) => Post)
export class PostsResolver {
  constructor (
    private readonly postsService: PostsService,
    private readonly subjectService: SubjectService,
    private readonly reportsService: ReportsService
  ) {}

  @Query(returns => Post)
  async post (@Args('id') id: PostId): Promise<Post> {
    return await this.postsService.post(id)
  }

  @Query(returns => PostsConnection)
  async posts (@Args() { first, offset }: PagingConfigArgs) {
    return await this.postsService.posts(first, offset)
  }

  @Mutation(returns => Post, { description: '创建一个帖子' })
  async createPost (@CurrentUser() user: User, @Args() args: CreatePostArgs) {
    return await this.postsService.createAPost(user.id, args)
  }

  @ResolveField(returns => User, { description: '帖子的创建者' })
  async creator (@Parent() post: Post): Promise<User> {
    return await this.postsService.getUserByPostId(post.id)
  }

  @ResolveField(returns => CommentsConnection, { description: '帖子的评论' })
  async comments (@Parent() post: Post, @Args() args: PagingConfigArgs) {
    return await this.postsService.getCommentsByPostId(
      post.id,
      args.first,
      args.offset
    )
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
