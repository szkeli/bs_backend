import { Injectable } from '@nestjs/common'

import { DbService } from 'src/db/db.service'
import { UserId } from 'src/db/model/db.model'

import { UnvoteACommentInput, UnvoteAPostInput, VoteACommentInput } from './model/votes.model'

@Injectable()
export class VotesService {
  constructor (private readonly dbService: DbService) {}

  async voteAComment (voter: UserId, input: VoteACommentInput) {
    return await this.dbService.voteAComment(voter, input)
  }

  async voteAPost (voter: UserId, to: string) {
    return await this.dbService.voteAPost(voter, to)
  }

  async unvoteAComment (voter: UserId, input: UnvoteACommentInput): Promise<boolean> {
    return await this.dbService.unvoteAComment(voter, input)
  }

  async unvoteAPost (voter: UserId, input: UnvoteAPostInput): Promise<boolean> {
    return await this.dbService.unvoteAPost(voter, input)
  }
}
