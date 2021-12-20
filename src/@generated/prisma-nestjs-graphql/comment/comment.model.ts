import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { ID } from '@nestjs/graphql';
import { CommentCount } from './comment-count.output';

@ObjectType()
export class Comment {

    @Field(() => ID, {nullable:false})
    id!: string;

    @Field(() => String, {nullable:false})
    content!: string;

    @Field(() => Comment, {nullable:false})
    replyTo?: Comment;

    @Field(() => String, {nullable:false})
    replyToId!: string;

    @Field(() => [Comment], {nullable:true})
    Comment?: Array<Comment>;

    @Field(() => CommentCount, {nullable:true})
    _count?: CommentCount | null;
}
