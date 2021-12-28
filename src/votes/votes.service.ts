import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { UnvoteACommentInput, UnvoteAPostInput, VoteACommentInput, VoteAPostInput } from './model/votes.model';

@Injectable()
export class VotesService {
  constructor(private readonly dbService: DbService) {}

  async voteAComment(input: VoteACommentInput) {
    return await this.dbService.voteAComment(input);
  }
  async voteAPost(input: VoteAPostInput) {
    return await this.dbService.voteAPost(input);
  }
  async unvoteAComment(input: UnvoteACommentInput): Promise<boolean> {
    return await this.dbService.unvoteAComment(input);
  }
  async unvoteAPost(input: UnvoteAPostInput): Promise<boolean> {
    return await this.dbService.unvoteAPost(input);
  }
}
