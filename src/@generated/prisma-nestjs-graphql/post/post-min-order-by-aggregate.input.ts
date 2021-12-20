import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { SortOrder } from '../prisma/sort-order.enum';

@InputType()
export class PostMinOrderByAggregateInput {

    @Field(() => SortOrder, {nullable:true})
    id?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    authorId?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    content?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    upvoteCount?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    downvoteCount?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    flag?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    createAt?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    updateAt?: keyof typeof SortOrder;
}
