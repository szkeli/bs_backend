import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Comment } from 'src/comment/models/comment.model';
import { Post } from 'src/posts/models/post.model';
import { UnvoteACommentInput, UnvoteAPostInput, VoteACommentInput, VoteAPostInput } from './model/votes.model';
import { VotesService } from './votes.service';

@Resolver()
export class VotesResolver {
  constructor(private readonly votesService: VotesService) {}

  @Mutation(returns => Post)
  async voteAPost(@Args('input') input: VoteAPostInput) {
    return await this.votesService.voteAPost(input);
  }

  @Mutation(returns => Comment)
  async voteAComment(@Args('input') input: VoteACommentInput) {
    return await this.votesService.voteAComment(input);
  }

  @Mutation(returns => Boolean)
  async unvoteAComment(@Args('input') input: UnvoteACommentInput) {
    return await this.votesService.unvoteAComment(input);
  }

  @Mutation(returns => Boolean)
  async unvoteAPost(@Args('input') input: UnvoteAPostInput) {
    return await this.votesService.unvoteAPost(input);
  }
}
