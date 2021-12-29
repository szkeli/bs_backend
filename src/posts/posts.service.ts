import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { PostId, UserId } from 'src/db/model/db.model';
import { CreateAPostInput, Post, PostsCommentsInput } from './models/post.model';

@Injectable()
export class PostsService {
  constructor(private readonly dbService: DbService) {}
  
  async createAPost(creator: UserId, input: CreateAPostInput) {
    return this.dbService.createAPost(creator, input);
  }
  async deleteAPost(creator: UserId, id: PostId) {
    return this.dbService.deleteAPost(creator, id);
  }
  async getAPost(id: PostId) {
    return this.dbService.getAPost(id);
  }
  async getUserByPostId(id: PostId) {
    return this.dbService.getUserByPostId(id);
  }
  async getCommentsByPostId(id: PostId, input: PostsCommentsInput) {
    return await this.dbService.getCommentsByPostId(id, input);
  }
}
