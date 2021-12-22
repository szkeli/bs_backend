import { Module } from '@nestjs/common';
import { PostsModule } from 'src/posts/posts.module';
import { PostsService } from 'src/posts/posts.service';
import { AuthorsResolver } from './authors.resolver';
import { AuthorsService } from './authors.service';

@Module({
  imports: [PostsModule],
  providers: [AuthorsResolver, AuthorsService, PostsService],
})
export class AuthorsModule {}
