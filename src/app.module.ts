import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'

import { PostModule } from './post/post.module'
import { SharedModule } from './shared/shared.module'
import { UserModule } from './user/user.module'

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: './schema.gql'
    }),
    SharedModule,
    UserModule,
    PostModule
  ]
})
export class AppModule {}
