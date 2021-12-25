import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { hash } from 'src/tool';
import { AddACommentOnCommentInput, Comment } from './models/comment.model';
import * as pretty from "prettyjson";

@Injectable()
export class CommentService {
  getCommentPaging(parent: Comment, skip: number, limit: number) {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly dbService: DbService) {}

  async addACommentOnComment(input: AddACommentOnCommentInput) {
    console.error(input);
    return await this.dbService.createACommentAtComment({
      creator: input.creator,
      createAt: Date.now(),
      content: input.content,
      commentId: input.to,
    }).then(r => {
      return r.result.data[0];
    })
  }

  async getACommentById(id: string) {
    throw new Error('Method not implemented.');
  }
}
