import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFilter } from '../prisma/string-filter.input';
import { CommentRelationFilter } from './comment-relation-filter.input';
import { CommentListRelationFilter } from './comment-list-relation-filter.input';

@InputType()
export class CommentWhereInput {

    @Field(() => [CommentWhereInput], {nullable:true})
    AND?: Array<CommentWhereInput>;

    @Field(() => [CommentWhereInput], {nullable:true})
    OR?: Array<CommentWhereInput>;

    @Field(() => [CommentWhereInput], {nullable:true})
    NOT?: Array<CommentWhereInput>;

    @Field(() => StringFilter, {nullable:true})
    id?: StringFilter;

    @Field(() => StringFilter, {nullable:true})
    content?: StringFilter;

    @Field(() => CommentRelationFilter, {nullable:true})
    replyTo?: CommentRelationFilter;

    @Field(() => StringFilter, {nullable:true})
    replyToId?: StringFilter;

    @Field(() => CommentListRelationFilter, {nullable:true})
    Comment?: CommentListRelationFilter;
}
