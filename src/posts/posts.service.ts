import { Injectable } from '@nestjs/common';
import { DbService, PostId } from 'src/db/db.service';
import { CreateAPostInput, Post } from './models/post.model';

@Injectable()
export class PostsService {
 
  constructor(private readonly dbService: DbService) {}
  
  async createAPost(input: CreateAPostInput) {
    return this.dbService.createAPost(input);
  }
  async getAPost(id: PostId) {
    return this.dbService.getAPost(id);
  }
  async getUserByPostId(id: PostId) {
    return this.dbService.getUserByPostId(id);
  }

  async commentsPaging(parent: Post, skip: number, limit: number) {
    const { id: postId } = parent;
    return this.dbService.commentsPaging(postId, skip, limit).then(r => {
      console.error(r.result.data);

      return r.result.data

    });
  }
}
