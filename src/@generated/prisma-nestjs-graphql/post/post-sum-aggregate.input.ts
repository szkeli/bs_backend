import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';

@InputType()
export class PostSumAggregateInput {

    @Field(() => Boolean, {nullable:true})
    upvoteCount?: true;

    @Field(() => Boolean, {nullable:true})
    downvoteCount?: true;

    @Field(() => Boolean, {nullable:true})
    flag?: true;
}
