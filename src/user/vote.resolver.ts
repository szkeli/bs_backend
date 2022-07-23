import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Vote } from '../votes/model/votes.model'
import { User } from './models/user.model'

@Resolver(of => Vote)
export class VoteResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(_of => User, { description: '点赞的创建者' })
  async creator (@Parent() vote: Vote) {
    const { id } = vote
    const query = `
    query v($voteId: string) {
      vote(func: uid($voteId)) @filter(type(Vote)) {
        creator @filter(type(User)) {
          id: uid
          expand(_all_)
        }
      }
    }
  `
    const res = await this.dbService.commitQuery<{ vote: Array<{creator: User}>}>({ query, vars: { $voteId: id } })
    return res.vote[0]?.creator
  }
}
