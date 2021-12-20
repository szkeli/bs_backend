import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateNestedOneWithoutCommentInput } from './comment-create-nested-one-without-comment.input';
import { CommentCreateNestedManyWithoutReplyToInput } from './comment-create-nested-many-without-reply-to.input';

@InputType()
export class CommentCreateInput {

    @Field(() => String, {nullable:true})
    id?: string;

    @Field(() => String, {nullable:false})
    content!: string;

    @Field(() => CommentCreateNestedOneWithoutCommentInput, {nullable:false})
    replyTo!: CommentCreateNestedOneWithoutCommentInput;

    @Field(() => CommentCreateNestedManyWithoutReplyToInput, {nullable:true})
    Comment?: CommentCreateNestedManyWithoutReplyToInput;
}
