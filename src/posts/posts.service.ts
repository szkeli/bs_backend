import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  posts = [
    {
      id: 0,
      title: 'Post One',
      votes: 0,
    },
    {
      id: 1,
      title: 'Post Two',
      votes: 0,
    },
    {
      id: 2,
      title: 'Post 3',
      votes: 0,
    }
  ]

  async upvoteById(arg0: { id: number; }) {
    const post = this.posts.find(post => post.id === arg0.id);
    if(!post) throw Error("not such a post");
    post.votes++;
    return post;
  }

  findAll(arg0: { authorId: number; }) {
    throw new Error("Method not implemented.");
  }
}
