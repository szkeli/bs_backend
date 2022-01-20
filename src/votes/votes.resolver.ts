import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { User } from 'src/user/models/user.model'

import {
  Votable
} from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver()
export class VotesResolver {
  constructor (private readonly votesService: VotesService) {}

  @Mutation(returns => Votable)
  async addUpvoteOnPost (@CurrentUser() user: User, @Args('postId') postId: string) {
    return await this.votesService.addUpvoteOnPost(user.id, postId)
  }

  @Mutation(returns => Votable)
  async addUpvoteOnComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    return await this.votesService.addUpvoteOnComment(user.id, commentId)
  }

  @Mutation(returns => Votable)
  async removeUpvoteOnComment (@CurrentUser() user: User, @Args('from') from: string) {
    return await this.votesService.unvoteAComment(user.id, from)
  }

  @Mutation(returns => Votable)
  async removeUpvoteOnPost (@CurrentUser() user: User, @Args('from') from: string) {
    return await this.votesService.unvoteAPost(user.id, from)
  }
}
