import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentWhereUniqueInput } from './comment-where-unique.input';
import { CommentUpdateWithoutReplyToInput } from './comment-update-without-reply-to.input';
import { CommentCreateWithoutReplyToInput } from './comment-create-without-reply-to.input';

@InputType()
export class CommentUpsertWithWhereUniqueWithoutReplyToInput {

    @Field(() => CommentWhereUniqueInput, {nullable:false})
    where!: CommentWhereUniqueInput;

    @Field(() => CommentUpdateWithoutReplyToInput, {nullable:false})
    update!: CommentUpdateWithoutReplyToInput;

    @Field(() => CommentCreateWithoutReplyToInput, {nullable:false})
    create!: CommentCreateWithoutReplyToInput;
}
