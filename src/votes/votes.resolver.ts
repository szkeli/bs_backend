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

  @Mutation(of => Votable, { description: '点赞一个帖子' })
  async addUpvoteOnPost (@CurrentUser() user: User, @Args('postId') postId: string) {
    return await this.votesService.addUpvoteOnPost(user.id, postId)
  }

  @Mutation(of => Votable, { description: '点赞一条评论' })
  async addUpvoteOnComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    return await this.votesService.addUpvoteOnComment(user.id, commentId)
  }

  @Mutation(of => Votable, { description: '取消点赞' })
  async removeUpvoteOnComment (@CurrentUser() user: User, @Args('from') from: string) {
    return await this.votesService.removeUpvoteOnComment(user.id, from)
  }

  @Mutation(of => Votable, { description: '取消点赞' })
  async removeUpvoteOnPost (@CurrentUser() user: User, @Args('from') from: string) {
    return await this.votesService.removeUpvoteOnPost(user.id, from)
  }

  @ResolveField(of => User, { description: '点赞的创建者' })
  async creator (@Parent() vote: Vote) {
    return await this.votesService.creator(vote.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被点赞的对象' })
  async to (@Parent() vote: Vote) {
    return await this.votesService.to(vote.id)
  }
}
