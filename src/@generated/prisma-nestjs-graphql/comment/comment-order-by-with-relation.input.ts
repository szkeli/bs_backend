import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { SortOrder } from '../prisma/sort-order.enum';
import { CommentOrderByRelationAggregateInput } from './comment-order-by-relation-aggregate.input';

@InputType()
export class CommentOrderByWithRelationInput {

    @Field(() => SortOrder, {nullable:true})
    id?: keyof typeof SortOrder;

    @Field(() => SortOrder, {nullable:true})
    content?: keyof typeof SortOrder;

    @Field(() => CommentOrderByWithRelationInput, {nullable:true})
    replyTo?: CommentOrderByWithRelationInput;

    @Field(() => SortOrder, {nullable:true})
    replyToId?: keyof typeof SortOrder;

    @Field(() => CommentOrderByRelationAggregateInput, {nullable:true})
    Comment?: CommentOrderByRelationAggregateInput;
}
