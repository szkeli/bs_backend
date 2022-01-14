import { UseGuards } from '@nestjs/common'
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import {
  CommentsConnection
} from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'
import { Subject, SubjectId } from 'src/subject/model/subject.model'
import { SubjectService } from 'src/subject/subject.service'
import { User } from 'src/user/models/user.model'

import {
  Post,
  PostsConnection
} from './models/post.model'
import { PostsService } from './posts.service'

@Resolver((_of: Post) => Post)
export class PostsResolver {
  constructor (
    private readonly postsService: PostsService,
    private readonly subjectService: SubjectService
  ) {}

  @Query(returns => Post)
  async post (@Args('id') id: PostId): Promise<Post> {
    return await this.postsService.getPost(id)
  }

  @Query(returns => PostsConnection)
  async posts (
  @Args('first', { nullable: true, type: () => Int, defaultValue: 0 }) first: number,
    @Args('offset', { nullable: true, type: () => Int, defaultValue: 0 }) offset: number
  ) {
    return await this.postsService.getPosts(
      first,
      offset
    )
  }

  @Mutation(returns => Post)
  @UseGuards(GqlAuthGuard)
  async createPost (
  @CurrentUser() user: User,
    @Args('title') title: string,
    @Args('content') content: string,
    @Args('images', { type: () => [String] }) images: [string],
    @Args('subjectId', { nullable: true }) subjectId: SubjectId
  ) {
    return await this.postsService.createAPost(
      user.id,
      title,
      content,
      images,
      subjectId
    )
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async deletePost (
  @CurrentUser() user: User,
    @Args('id') id: PostId
  ) {
    return await this.postsService.deleteAPost(user.userId, id)
  }

  @ResolveField(returns => User)
  async creator (@Parent() post: Post): Promise<User> {
    return await this.postsService.getUserByPostId(post.id)
  }

  @ResolveField(returns => CommentsConnection)
  async comments (
  @Parent() post: Post,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 0 }) first: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 2 }) offset: number
  ) {
    return await this.postsService.getCommentsByPostId(
      post.id,
      first,
      offset
    )
  }

  @ResolveField(returns => Subject, { nullable: true })
  async subject (@Parent() post: Post): Promise<Subject | null> {
    return await this.subjectService.findASubjectByPostId(post.id)
  }
}
