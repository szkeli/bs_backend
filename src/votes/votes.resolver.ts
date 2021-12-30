import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { Comment } from 'src/comment/models/comment.model'
import { Post } from 'src/posts/models/post.model'
import { User } from 'src/user/models/user.model'

import { UnvoteACommentInput, UnvoteAPostInput, VoteACommentInput, VoteAPostInput } from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver()
export class VotesResolver {
  constructor (private readonly votesService: VotesService) {}

  @Mutation(returns => Post)
  @UseGuards(GqlAuthGuard)
  async voteAPost (
  @CurrentUser() user: User,
    @Args('input') input: VoteAPostInput
  ) {
    return await this.votesService.voteAPost(user.userId, input)
  }

  @Mutation(returns => Comment)
  @UseGuards(GqlAuthGuard)
  async voteAComment (
  @CurrentUser() user: User,
    @Args('input') input: VoteACommentInput
  ) {
    return await this.votesService.voteAComment(user.userId, input)
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async unvoteAComment (
  @CurrentUser() user: User,
    @Args('input') input: UnvoteACommentInput
  ) {
    return await this.votesService.unvoteAComment(user.userId, input)
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async unvoteAPost (
  @CurrentUser() user: User,
    @Args('input') input: UnvoteAPostInput
  ) {
    return await this.votesService.unvoteAPost(user.userId, input)
  }
}
