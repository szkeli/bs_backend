import { Field, ObjectType } from '@nestjs/graphql'

import { Post } from '../@generated/prisma-nestjs-graphql/post/post.model'
import { PageInfo } from './page-info'

@ObjectType()
export class PostEdge {
  @Field(() => String)
    cursor: string

  @Field(() => Post)
    node: Post
}

@ObjectType()
export class PostConnection {
  @Field(() => [PostEdge])
    edges: PostEdge[]

  @Field(() => PageInfo)
    pageInfo: PageInfo
}
