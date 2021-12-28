import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { AddACommentOnCommentInput, AddACommentOnPostInput, Comment, CommentId } from './models/comment.model';

@Injectable()
export class CommentService {
  constructor(private readonly dbService: DbService) {}
  
  async getCommentPaging(parent: Comment, skip: number, limit: number) {
    throw new Error('Method not implemented.');
  }

  async addACommentOnComment(input: AddACommentOnCommentInput) {
    return await this.dbService.addACommentOnComment(input);
  }

  async addACommentOnPost(input: AddACommentOnPostInput) {
    return await this.dbService.addACommentOnPost(input);
  }

  async getACommentById(id: CommentId) {
    return await this.dbService.getACommentById(id);
  }
}
