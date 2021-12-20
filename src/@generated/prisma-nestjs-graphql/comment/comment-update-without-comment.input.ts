import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFieldUpdateOperationsInput } from '../prisma/string-field-update-operations.input';
import { CommentUpdateOneRequiredWithoutCommentInput } from './comment-update-one-required-without-comment.input';

@InputType()
export class CommentUpdateWithoutCommentInput {

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    id?: StringFieldUpdateOperationsInput;

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    content?: StringFieldUpdateOperationsInput;

    @Field(() => CommentUpdateOneRequiredWithoutCommentInput, {nullable:true})
    replyTo?: CommentUpdateOneRequiredWithoutCommentInput;
}
