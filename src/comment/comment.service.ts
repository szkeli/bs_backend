import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { UserId } from 'src/db/model/db.model';
import { AddACommentOnCommentInput, AddACommentOnPostInput, Comment, CommentId, PagingConfigInput } from './models/comment.model';

@Injectable()
export class CommentService {
  constructor(private readonly dbService: DbService) {}
  
  async getCommentsByPostId(postId: CommentId, input: PagingConfigInput) {
    return await this.dbService.getCommentsByPostId(postId, input);
  }

  async getCommentsByCommentId(commentId: CommentId, input: PagingConfigInput) {
    return await this.dbService.getCommentsByCommentId(commentId, input);
  }

  async addACommentOnComment(creator: UserId, input: AddACommentOnCommentInput) {
    return await this.dbService.addACommentOnComment(creator, input);
  }

  async addACommentOnPost(creator: UserId, input: AddACommentOnPostInput) {
    return await this.dbService.addACommentOnPost(creator, input);
  }

  async getACommentById(id: CommentId) {
    return await this.dbService.getACommentById(id);
  }
}
