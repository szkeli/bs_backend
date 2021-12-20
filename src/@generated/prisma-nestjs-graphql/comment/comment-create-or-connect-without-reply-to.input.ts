import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentWhereUniqueInput } from './comment-where-unique.input';
import { CommentCreateWithoutReplyToInput } from './comment-create-without-reply-to.input';

@InputType()
export class CommentCreateOrConnectWithoutReplyToInput {

    @Field(() => CommentWhereUniqueInput, {nullable:false})
    where!: CommentWhereUniqueInput;

    @Field(() => CommentCreateWithoutReplyToInput, {nullable:false})
    create!: CommentCreateWithoutReplyToInput;
}
