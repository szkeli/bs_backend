import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection'
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Post } from '../@generated/prisma-nestjs-graphql/post/post.model'
import { PostCreateInput } from '../@generated/prisma-nestjs-graphql/post/post-create.input'
import { PostUpdateInput } from '../@generated/prisma-nestjs-graphql/post/post-update.input'
import { User } from '../@generated/prisma-nestjs-graphql/user/user.model'
import { PostConnection } from '../pagination/post'
import { PrismaService } from '../shared/prisma.service'
import { PostService } from './post.service'

@Resolver(() => Post)
export class PostResolver {
  constructor (
    private readonly prismaService: PrismaService,
    private readonly postService: PostService
  ) {}

  @Mutation(() => Post)
  async createPost (@Args('input') input: PostCreateInput) {
    return await this.postService.create(input)
  }

  @Query(() => [Post], { name: 'posts' })
  async findAll () {
    return await this.postService.findAll()
  }

  @Query(() => Post, { name: 'post' })
  async findOne (@Args('id') id: string) {
    return await this.postService.findOne(id)
  }

  @Mutation(() => Post)
  async updatePost (@Args('id') id: string, @Args('input') input: PostUpdateInput) {
    return await this.postService.update(id, input)
  }

  @Mutation(() => Post)
  async removePost (@Args('id') id: string) {
    return await this.postService.remove(id)
  }

  @Query(() => PostConnection)
  async latestPosts (
  // eslint-disable-next-line @typescript-eslint/indent
    @Args('first', { nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('last', { nullable: true }) last?: number,
    @Args('before', { nullable: true }) before?: string
  ) {
    const post = this.prismaService.post
    const result = await findManyCursorConnection(
      args => post.findMany({
        orderBy: [{ createAt: 'desc' }],
        ...args
      }),
      () => post.count(),
      { first, after, last, before }
    )
    return result
  }

  @ResolveField(() => User)
  async author (@Parent() parent: Post) {
    return await this.prismaService.user.findUnique({
      where: { id: parent.authorId }
    })
  }
}
