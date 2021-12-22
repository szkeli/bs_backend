import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthorsService {
  findOneById(id: number) {
    return {
      id: 0,
      firstName: '',
      lastName: '',
      posts: [],
    };
  }
}
