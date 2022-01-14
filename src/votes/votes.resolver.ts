import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { User } from 'src/user/models/user.model'

import {
  Votable
} from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver()
export class VotesResolver {
  constructor (private readonly votesService: VotesService) {}

  @Mutation(returns => Votable)
  @UseGuards(GqlAuthGuard)
  async addUpvoteOnPost (
  @CurrentUser() user: User,
    @Args('to') to: string
  ) {
    return await this.votesService.voteAPost(user.userId, to)
  }

  @Mutation(returns => Votable)
  @UseGuards(GqlAuthGuard)
  async addUpvoteOnComment (
  @CurrentUser() user: User,
    @Args('to') to: string
  ) {
    // return await this.votesService.voteAComment(user.userId, input)
  }

  @Mutation(returns => Votable)
  @UseGuards(GqlAuthGuard)
  async removeUpvoteOnComment (
  @CurrentUser() user: User,
    @Args('to') to: string
  ) {
    // return await this.votesService.unvoteAComment(user.userId, input)
  }

  @Mutation(returns => Votable)
  @UseGuards(GqlAuthGuard)
  async removeUpvoteOnPost (
  @CurrentUser() user: User,
    @Args('to') to: string
  ) {
    // return await this.votesService.unvoteAPost(user.userId, input)
  }
}
