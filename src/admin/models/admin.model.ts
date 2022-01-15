import { Field, InputType, ObjectType } from '@nestjs/graphql'

import { Node } from '../../node/models/node.model'
import { Person } from '../../user/models/user.model'

@ObjectType({
  implements: [Node, Person]
})
export class Admin implements Node, Person {
  @Field()
    id: string

  @Field()
    userId: string

  @Field()
    name: string

  @Field()
    avatarImageUrl: string

  @Field()
    createdAt: string

  @Field()
    updatedAt: string

  @Field()
    lastLoginedAt: string
}

@InputType()
export class CreateAdminInput {
  @Field()
    userId: string

  @Field()
    name: string

  @Field()
    avatarImageUrl: string
}

@ObjectType()
export class InviteTokenResult {
  @Field()
    token: string
}
