import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateWithoutReplyToInput } from './comment-create-without-reply-to.input';
import { CommentCreateOrConnectWithoutReplyToInput } from './comment-create-or-connect-without-reply-to.input';
import { CommentCreateManyReplyToInputEnvelope } from './comment-create-many-reply-to-input-envelope.input';
import { CommentWhereUniqueInput } from './comment-where-unique.input';

@InputType()
export class CommentUncheckedCreateNestedManyWithoutReplyToInput {

    @Field(() => [CommentCreateWithoutReplyToInput], {nullable:true})
    create?: Array<CommentCreateWithoutReplyToInput>;

    @Field(() => [CommentCreateOrConnectWithoutReplyToInput], {nullable:true})
    connectOrCreate?: Array<CommentCreateOrConnectWithoutReplyToInput>;

    @Field(() => CommentCreateManyReplyToInputEnvelope, {nullable:true})
    createMany?: CommentCreateManyReplyToInputEnvelope;

    @Field(() => [CommentWhereUniqueInput], {nullable:true})
    connect?: Array<CommentWhereUniqueInput>;
}
