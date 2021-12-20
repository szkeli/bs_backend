import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentUncheckedCreateNestedManyWithoutReplyToInput } from './comment-unchecked-create-nested-many-without-reply-to.input';

@InputType()
export class CommentUncheckedCreateInput {

    @Field(() => String, {nullable:true})
    id?: string;

    @Field(() => String, {nullable:false})
    content!: string;

    @Field(() => String, {nullable:false})
    replyToId!: string;

    @Field(() => CommentUncheckedCreateNestedManyWithoutReplyToInput, {nullable:true})
    Comment?: CommentUncheckedCreateNestedManyWithoutReplyToInput;
}
