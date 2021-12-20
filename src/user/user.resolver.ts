import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection'
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { User } from '../@generated/prisma-nestjs-graphql/user/user.model'
import { UserCreateInput } from '../@generated/prisma-nestjs-graphql/user/user-create.input'
import { UserUpdateInput } from '../@generated/prisma-nestjs-graphql/user/user-update.input'
import { PostConnection } from '../pagination/post'
import { PrismaService } from '../shared/prisma.service'
import { UserService } from './user.service'

@Resolver(() => User)
export class UserResolver {
  constructor (
    private readonly userService: UserService,
    private readonly prismaService: PrismaService
  ) {}

  @Mutation(() => User)
  async createUser (@Args('input') input: UserCreateInput) {
    return await this.userService.create(input)
  }

  @Query(() => [User], { name: 'users' })
  async findAll () {
    return await this.userService.findAll()
  }

  @Query(() => User, { name: 'user' })
  async findOne (@Args('id') id: string) {
    return await this.userService.findOne(id)
  }

  @Mutation(() => User)
  async updateUser (@Args('id') id: string, @Args('input') input: UserUpdateInput) {
    return await this.userService.update(id, input)
  }

  @Mutation(() => User)
  async removeUser (@Args('id') id: string) {
    return await this.userService.remove(id)
  }

  @ResolveField(() => PostConnection)
  async posts (
  // eslint-disable-next-line @typescript-eslint/indent
    @Parent() parant: User,
    @Args('first', { nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('last', { nullable: true }) last?: number,
    @Args('before', { nullable: true }) before?: string
  ) {
    const post = this.prismaService.post
    const result = await findManyCursorConnection(
      args => post.findMany({
        where: { authorId: parant.id },
        orderBy: [{ createAt: 'desc' }],
        ...args
      }),
      () => post.count(),
      { first, after, last, before }
    )
    return result
  }
}
