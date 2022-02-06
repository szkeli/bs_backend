import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { User } from 'src/user/models/user.model'

import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import {
  Votable, Vote
} from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver(of => Vote)
export class VotesResolver {
  constructor (private readonly votesService: VotesService) {}

  @Mutation(of => Votable)
  async addUpvoteOnPost (@CurrentUser() user: User, @Args('postId') postId: string) {
    return await this.votesService.addUpvoteOnPost(user.id, postId)
  }

  @Mutation(of => Votable)
  async addUpvoteOnComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    return await this.votesService.addUpvoteOnComment(user.id, commentId)
  }

  @Mutation(of => Votable)
  async removeUpvoteOnComment (@CurrentUser() user: User, @Args('from') from: string) {
    return await this.votesService.removeUpvoteOnComment(user.id, from)
  }

  @Mutation(of => Votable)
  async removeUpvoteOnPost (@CurrentUser() user: User, @Args('from') from: string) {
    return await this.votesService.removeUpvoteOnPost(user.id, from)
  }

  @ResolveField(of => User)
  async creator (@Parent() vote: Vote) {
    return await this.votesService.creator(vote.id)
  }

  @ResolveField(of => PostAndCommentUnion)
  async to (@Parent() vote: Vote) {
    return await this.votesService.to(vote.id)
  }
}
