import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { Comment, PagingConfigInput } from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'
import { Subject } from 'src/subject/model/subject.model'
import { SubjectService } from 'src/subject/subject.service'
import { User } from 'src/user/models/user.model'

import { CreateAPostInput, Post, PostsCommentsInput } from './models/post.model'
import { PostsService } from './posts.service'

@Resolver((_of: Post) => Post)
export class PostsResolver {
  constructor (
    private readonly postsService: PostsService,
    private readonly subjectService: SubjectService
  ) {}

  @Query(returns => Post)
  async post (@Args('id') id: PostId) {
    return await this.postsService.getAPost(id)
  }

  @Query(returns => [Post])
  async posts (@Args('input') input: PagingConfigInput) {
    return await this.postsService.getPosts(input)
  }

  // TODO 个性推荐帖子

  @Mutation(returns => Post)
  @UseGuards(GqlAuthGuard)
  async createAPost (
  @CurrentUser() user: User,
    @Args('input') input: CreateAPostInput
  ) {
    return await this.postsService.createAPost(user.userId, input)
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteAPost (
  @CurrentUser() user: User,
    @Args('id') id: PostId
  ) {
    return await this.postsService.deleteAPost(user.userId, id)
  }

  @ResolveField(returns => User)
  async creator (@Parent() parent: Post) {
    return await this.postsService.getUserByPostId(parent.id)
  }

  @ResolveField(returns => [Comment])
  async comments (
  @Parent() parent: Post,
    @Args('input') input: PostsCommentsInput
  ) {
    return await this.postsService.getCommentsByPostId(parent.id, input)
  }

  @ResolveField(returns => Subject, { nullable: true })
  async subject (@Parent() post: Post) {
    const v = await this.subjectService.findASubjectByPostId(post.id)
    return v.id ? v : null
  }
}
