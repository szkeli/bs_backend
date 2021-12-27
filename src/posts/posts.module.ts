import { Module } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { UserService } from 'src/user/user.service';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';

@Module({
  providers: [PostsResolver, DbService, PostsService, UserService]
})
export class PostsModule {}
