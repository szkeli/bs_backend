import { Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Hashtag {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field()
    title: string
}

@ObjectType()
export class HashtagsConnection extends Connection<Hashtag>(Hashtag) {}
