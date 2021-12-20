import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';

@InputType()
export class PostMinAggregateInput {

    @Field(() => Boolean, {nullable:true})
    id?: true;

    @Field(() => Boolean, {nullable:true})
    authorId?: true;

    @Field(() => Boolean, {nullable:true})
    content?: true;

    @Field(() => Boolean, {nullable:true})
    upvoteCount?: true;

    @Field(() => Boolean, {nullable:true})
    downvoteCount?: true;

    @Field(() => Boolean, {nullable:true})
    flag?: true;

    @Field(() => Boolean, {nullable:true})
    createAt?: true;

    @Field(() => Boolean, {nullable:true})
    updateAt?: true;
}
