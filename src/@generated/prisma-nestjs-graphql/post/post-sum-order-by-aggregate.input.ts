import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { SortOrder } from '../prisma/sort-order.enum';

@InputType()
export class PostSumOrderByAggregateInput {

    @Field(() => SortOrder, {nullable:true})
    upvoteCount?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    downvoteCount?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    flag?: keyof typeof SortOrder;
}
