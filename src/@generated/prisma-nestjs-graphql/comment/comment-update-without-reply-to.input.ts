import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFieldUpdateOperationsInput } from '../prisma/string-field-update-operations.input';
import { CommentUpdateManyWithoutReplyToInput } from './comment-update-many-without-reply-to.input';

@InputType()
export class CommentUpdateWithoutReplyToInput {

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    id?: StringFieldUpdateOperationsInput;

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    content?: StringFieldUpdateOperationsInput;

    @Field(() => CommentUpdateManyWithoutReplyToInput, {nullable:true})
    Comment?: CommentUpdateManyWithoutReplyToInput;
}
