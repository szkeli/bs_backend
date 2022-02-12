import { ForbiddenException, Inject } from '@nestjs/common'
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql'
import { PubSub } from 'graphql-subscriptions'

import { CheckPolicies, CurrentUser, NoAuth, Roles } from 'src/auth/decorator'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { PUB_SUB_KEY } from '../constants'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { WithinArgs } from '../node/models/node.model'
import { Votable, Vote, VotesConnection } from './model/votes.model'
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

  @Query(of => VotesConnection, { description: '某段时间内的所有点赞' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new ViewAppStatePolicyHandler())
  async votesCreatedWithin (@Args() { startTime, endTime }: WithinArgs, @Args(){ first, offset }: PagingConfigArgs) {
    return await this.votesService.votesCreatedWithin(startTime, endTime, first, offset)
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
