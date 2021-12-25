import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { Post } from './models/post.model';

@Injectable()
export class PostsService {
  constructor(private readonly dbService: DbService) {}

  async commentsPaging(parent: Post, skip: number, limit: number) {
    const { id: postId } = parent;
    return this.dbService.commentsPaging(postId, skip, limit).then(r => {
      console.error(r.result.data);

      return r.result.data

    });
  }
}
