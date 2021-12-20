import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateNestedManyWithoutReplyToInput } from './comment-create-nested-many-without-reply-to.input';

@InputType()
export class CommentCreateWithoutReplyToInput {

    @Field(() => String, {nullable:true})
    id?: string;

    @Field(() => String, {nullable:false})
    content!: string;

    @Field(() => CommentCreateNestedManyWithoutReplyToInput, {nullable:true})
    Comment?: CommentCreateNestedManyWithoutReplyToInput;
}
