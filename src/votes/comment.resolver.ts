import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { Vote, VotesConnection } from './model/votes.model'

@Resolver(of => Comment)
export class CommentResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => VotesConnection, { description: '获取该评论下的点赞信息' })
  async votes (@CurrentUser() user: User, @Parent() comment: Comment, @Args() args: PagingConfigArgs) {
    const viewerId = user.id
    const commentId = comment.id
    const { first, offset } = args
    if (!viewerId) {
      // 未登录时
      const query = `
          query v($commentId: string) {
            v(func: uid($commentId)) @filter(type(Comment)) {
              totalCount: count(votes @filter(type(Vote)))
            }
            u(func: uid($commentId)) @filter(type(Comment)) {
              votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
                id: uid
                expand(_all_)
              }
            }
          }
        `
      const res = await this.dbService.commitQuery<{
        v: Array<{totalCount: number}>
        u: Array<{votes: Vote[]}>
      }>({ query, vars: { $commentId: commentId } })
      return {
        totalCount: res.v[0]?.totalCount ?? 0,
        nodes: res.u[0]?.votes ?? [],
        viewerCanUpvote: true,
        viewerHasUpvoted: false
      }
    }
    const query = `
        query v($commentId: string, $viewerId: string) {
          v(func: uid($commentId)) @filter(type(Comment)) {
            totalCount: count(votes @filter(type(Vote)))
            canVote: votes @filter(uid_in(creator, $viewerId)) {
              uid
            }
          }
          u(func: uid($commentId)) @filter(type(Comment)) {
            votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      v: Array<{totalCount: number, canVote: Vote[]}>
      u: Array<{votes: Vote[]}>
    }>({
      query,
      vars: { $commentId: commentId, $viewerId: viewerId }
    })

    const u: VotesConnection = {
      nodes: res.u[0]?.votes || [],
      totalCount: res.v[0]?.totalCount,
      viewerCanUpvote: res.v[0]?.canVote === undefined,
      viewerHasUpvoted: res.v[0]?.canVote !== undefined
    }
    return u
  }
}
