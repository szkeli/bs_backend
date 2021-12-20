import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { Float } from '@nestjs/graphql';

@ObjectType()
export class PostAvgAggregate {

    @Field(() => Float, {nullable:true})
    upvoteCount?: number;

    @Field(() => Float, {nullable:true})
    downvoteCount?: number;

    @Field(() => Float, {nullable:true})
    flag?: number;
}
