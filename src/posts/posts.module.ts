import { Module } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';

@Module({
  providers: [PostsResolver, DbService, PostsService]
})
export class PostsModule {}
