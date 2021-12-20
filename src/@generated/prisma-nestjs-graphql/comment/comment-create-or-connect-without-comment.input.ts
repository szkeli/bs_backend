import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentWhereUniqueInput } from './comment-where-unique.input';
import { CommentCreateWithoutCommentInput } from './comment-create-without-comment.input';

@InputType()
export class CommentCreateOrConnectWithoutCommentInput {

    @Field(() => CommentWhereUniqueInput, {nullable:false})
    where!: CommentWhereUniqueInput;

    @Field(() => CommentCreateWithoutCommentInput, {nullable:false})
    create!: CommentCreateWithoutCommentInput;
}
