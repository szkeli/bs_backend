import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateNestedOneWithoutCommentInput } from './comment-create-nested-one-without-comment.input';

@InputType()
export class CommentCreateWithoutCommentInput {

    @Field(() => String, {nullable:true})
    id?: string;

    @Field(() => String, {nullable:false})
    content!: string;

    @Field(() => CommentCreateNestedOneWithoutCommentInput, {nullable:false})
    replyTo!: CommentCreateNestedOneWithoutCommentInput;
}
