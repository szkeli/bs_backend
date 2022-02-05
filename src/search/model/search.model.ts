import { createUnionType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Time } from 'src/db/model/db.model'

import { Comment } from '../../comment/models/comment.model'
import { Post } from '../../posts/models/post.model'
import { Subject } from '../../subject/model/subject.model'
import { User } from '../../user/models/user.model'

export enum SEARCHTYPE {
  USER = 'USER',
  COMMENT = 'COMMENT',
  POST = 'POST',
  SUBJECT = 'SUBJECT',
}

registerEnumType(SEARCHTYPE, {
  name: 'SEARCHTYPE'
})

@ObjectType()
export class SearchResultItemEdge {
  @Field(type => String)
    cursor: string

  @Field(type => SearchResultItem)
    node: typeof SearchResultItem
}

@ObjectType()
export class Search {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
}

@ObjectType()
export class SearchResultItemConnection {
  @Field(type => Int)
    totalCount: number

  @Field(type => [SearchResultItem])
    nodes: Array<typeof SearchResultItem>
}
export const SearchResultItem = createUnionType({
  name: 'SearchResultItem',
  types: () => [Post, User, Comment, Subject]
})
