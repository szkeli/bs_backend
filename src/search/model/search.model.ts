import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { Time } from 'src/db/model/db.model'

@InputType()
export class SearchInput {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
}

@ObjectType()
export class SearchResult {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
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
