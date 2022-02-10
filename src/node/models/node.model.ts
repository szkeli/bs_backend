import { ArgsType, Field, InterfaceType } from '@nestjs/graphql'

@InterfaceType()
export abstract class Node {
  @Field(type => String)
    id: string
}

@ArgsType()
export class WithinArgs {
  @Field()
    startTime: string

  @Field()
    endTime: string
}
