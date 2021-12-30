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
import { VotesModule } from './votes/votes.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { SharedModule } from './shared/shared.module';
import { SubjectModule } from './subject/subject.module';
import { SearchModule } from './search/search.module';

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
    VotesModule,
    AdminModule,
    AuthModule,
    SharedModule,
    SubjectModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PostsService, 
    DbService, 
    CommentService, 
    UserService,
  ],
})
export class AppModule {}
