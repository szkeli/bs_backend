import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentUpdateWithoutCommentInput } from './comment-update-without-comment.input';
import { CommentCreateWithoutCommentInput } from './comment-create-without-comment.input';

@InputType()
export class CommentUpsertWithoutCommentInput {

    @Field(() => CommentUpdateWithoutCommentInput, {nullable:false})
    update!: CommentUpdateWithoutCommentInput;

    @Field(() => CommentCreateWithoutCommentInput, {nullable:false})
    create!: CommentCreateWithoutCommentInput;
}
