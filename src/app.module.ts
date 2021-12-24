import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { PostsService } from './posts/posts.service';
import { AuthorsService } from './authors/authors.service';
import { AuthorsModule } from './authors/authors.module';
import { PostsModule } from './posts/posts.module';
import { UserModule } from './user/user.module';
import { DbService } from './db/db.service';

@Module({
  imports: [
    GraphQLModule.forRoot({
      debug: true,
      playground: true,
      sortSchema: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
    AuthorsModule,
    PostsModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, PostsService, AuthorsService, DbService],
})
export class AppModule {}
