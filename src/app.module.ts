import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { PostsService } from './posts/posts.service';
import { PostsModule } from './posts/posts.module';
import { UserModule } from './user/user.module';
import { DbService } from './db/db.service';
import { CommentService } from './comment/comment.service';
import { CommentModule } from './comment/comment.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      debug: true,
      playground: true,
      sortSchema: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
    PostsModule,
    UserModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService, PostsService, DbService, CommentService],
})
export class AppModule {}
