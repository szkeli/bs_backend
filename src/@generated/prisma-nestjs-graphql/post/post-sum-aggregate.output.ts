import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { Int } from '@nestjs/graphql';

@ObjectType()
export class PostSumAggregate {

    @Field(() => Int, {nullable:true})
    upvoteCount?: number;

    @Field(() => Int, {nullable:true})
    downvoteCount?: number;

    @Field(() => Int, {nullable:true})
    flag?: number;
}
