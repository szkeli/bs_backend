import { ForbiddenException, Inject } from '@nestjs/common'
import { Args, Mutation, Parent, ResolveField, Resolver, Subscription } from '@nestjs/graphql'
import { PubSub } from 'graphql-subscriptions'

import { CurrentUser, NoAuth } from 'src/auth/decorator'
import { User } from 'src/user/models/user.model'

import { PUB_SUB_KEY } from '../constants'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Votable, Vote } from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver(_of => Vote)
export class VotesResolver {
  constructor (
    private readonly votesService: VotesService,
    @Inject(PUB_SUB_KEY) private readonly pubSub: PubSub
  ) {}

  @Subscription(of => Votable, {
    filter: (payload: {votesChanged: Votable}, variables: {ids: String[]}) => {
      return variables.ids.includes(payload.votesChanged.to)
    },
    description: '监听指定帖子或评论的点赞数'
  })
  @NoAuth()
  votesChanged (@Args('ids', { type: () => [String], description: '帖子或评论的id' }) ids: string[]) {
    if (ids.length === 0) {
      throw new ForbiddenException('监听的列表不能为空')
    }
    return this.pubSub.asyncIterator('votesChanged')
  }

  @Mutation(_of => Votable, { description: '点赞一个帖子' })
  async addUpvoteOnPost (@CurrentUser() user: User, @Args('postId') postId: string) {
    const votable = await this.votesService.addUpvoteOnPost(user.id, postId)
    await this.pubSub.publish('votesChanged', { votesChanged: votable })

    return votable
  }

  @Mutation(_of => Votable, { description: '点赞一条评论' })
  async addUpvoteOnComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    const votable = await this.votesService.addUpvoteOnComment(user.id, commentId)
    await this.pubSub.publish('votesChanged', { votesChanged: votable })

    return votable
  }

  @Mutation(_of => Votable, { description: '取消点赞' })
  async removeUpvoteOnComment (@CurrentUser() user: User, @Args('from') from: string) {
    const votable = await this.votesService.removeUpvoteOnComment(user.id, from)
    await this.pubSub.publish('votesChanged', { votesChanged: votable })

    return votable
  }

  @Mutation(_of => Votable, { description: '取消点赞' })
  async removeUpvoteOnPost (@CurrentUser() user: User, @Args('from') from: string) {
    const votable = await this.votesService.removeUpvoteOnPost(user.id, from)
    await this.pubSub.publish('votesChanged', { votesChanged: votable })

    return votable
  }

  @ResolveField(_of => User, { description: '点赞的创建者' })
  async creator (@Parent() vote: Vote) {
    return await this.votesService.creator(vote.id)
  }

  @ResolveField(_of => PostAndCommentUnion, { description: '被点赞的对象' })
  async to (@Parent() vote: Vote) {
    return await this.votesService.to(vote.id)
  }
}
