import { ForbiddenException, Inject } from '@nestjs/common'
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql'
import { PubSub } from 'graphql-subscriptions'

import { CheckPolicies, CurrentUser, MaybeAuth, Roles } from 'src/auth/decorator'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { Comment } from '../comment/models/comment.model'
import { PUB_SUB_KEY } from '../constants'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { WithinArgs } from '../node/models/node.model'
import { Post } from '../posts/models/post.model'
import { Vote, VoteInterface, VotesConnection } from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver(_of => VoteInterface)
export class VotesResolver {
  constructor (
    private readonly votesService: VotesService,
    @Inject(PUB_SUB_KEY) private readonly pubSub: PubSub
  ) {}

  @Subscription(of => PostAndCommentUnion, {
    filter: (payload: {votesChanged: typeof PostAndCommentUnion}, variables: {ids: String[]}) => {
      return variables.ids.includes(payload.votesChanged.id)
    },
    description: '监听指定帖子或评论的点赞数'
  })
  @MaybeAuth()
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

  @Mutation(_of => Post, { description: '点赞一个帖子' })
  async addUpvoteOnPost (@CurrentUser() user: User, @Args('postId') postId: string) {
    const post = await this.votesService.addUpvoteOnPost(user.id, postId)
    await this.pubSub.publish('votesChanged', { votesChanged: post })
    return post
  }

  @Mutation(_of => Comment, { description: '点赞一条评论' })
  async addUpvoteOnComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    const comment = await this.votesService.addUpvoteOnComment(user.id, commentId)
    await this.pubSub.publish('votesChanged', { votesChanged: comment })

    return comment
  }

  @Mutation(_of => Comment, { description: '取消点赞' })
  async removeUpvoteOnComment (@CurrentUser() user: User, @Args('from') from: string) {
    const comment = await this.votesService.removeUpvoteOnComment(user.id, from)
    await this.pubSub.publish('votesChanged', { votesChanged: comment })

    return comment
  }

  @Mutation(_of => Post, { description: '取消点赞' })
  async removeUpvoteOnPost (@CurrentUser() user: User, @Args('from') from: string) {
    const post = await this.votesService.removeUpvoteOnPost(user.id, from)
    await this.pubSub.publish('votesChanged', { votesChanged: post })

    return post
  }

  @ResolveField(_of => PostAndCommentUnion, { description: '被点赞的对象' })
  async to (@Parent() vote: Vote) {
    return await this.votesService.to(vote.id)
  }
}
