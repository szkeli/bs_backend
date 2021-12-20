import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFieldUpdateOperationsInput } from '../prisma/string-field-update-operations.input';
import { CommentUncheckedUpdateManyWithoutReplyToInput } from './comment-unchecked-update-many-without-reply-to.input';

@InputType()
export class CommentUncheckedUpdateWithoutReplyToInput {

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    id?: StringFieldUpdateOperationsInput;

    @Field(() => StringFieldUpdateOperationsInput, {nullable:true})
    content?: StringFieldUpdateOperationsInput;

    @Field(() => CommentUncheckedUpdateManyWithoutReplyToInput, {nullable:true})
    Comment?: CommentUncheckedUpdateManyWithoutReplyToInput;
}
