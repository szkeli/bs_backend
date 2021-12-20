import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentWhereUniqueInput } from './comment-where-unique.input';
import { CommentUpdateWithoutReplyToInput } from './comment-update-without-reply-to.input';

@InputType()
export class CommentUpdateWithWhereUniqueWithoutReplyToInput {

    @Field(() => CommentWhereUniqueInput, {nullable:false})
    where!: CommentWhereUniqueInput;

    @Field(() => CommentUpdateWithoutReplyToInput, {nullable:false})
    data!: CommentUpdateWithoutReplyToInput;
}
