import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFieldUpdateOperationsInput } from '../prisma/string-field-update-operations.input';
import { CommentUpdateOneRequiredWithoutCommentInput } from './comment-update-one-required-without-comment.input';
import { CommentUpdateManyWithoutReplyToInput } from './comment-update-many-without-reply-to.input';

@InputType()
export class CommentUpdateInput {

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    id?: StringFieldUpdateOperationsInput;

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    content?: StringFieldUpdateOperationsInput;

    @Field(() => CommentUpdateOneRequiredWithoutCommentInput, {nullable:true})
    replyTo?: CommentUpdateOneRequiredWithoutCommentInput;

    @Field(() => CommentUpdateManyWithoutReplyToInput, {nullable:true})
    Comment?: CommentUpdateManyWithoutReplyToInput;
}
