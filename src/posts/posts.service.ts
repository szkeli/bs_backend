import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  findAll(arg0: { authorId: number; }) {
    throw new Error("Method not implemented.");
  }
}
