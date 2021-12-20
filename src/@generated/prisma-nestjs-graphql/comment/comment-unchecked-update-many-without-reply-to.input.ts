import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateWithoutReplyToInput } from './comment-create-without-reply-to.input';
import { CommentCreateOrConnectWithoutReplyToInput } from './comment-create-or-connect-without-reply-to.input';
import { CommentUpsertWithWhereUniqueWithoutReplyToInput } from './comment-upsert-with-where-unique-without-reply-to.input';
import { CommentCreateManyReplyToInputEnvelope } from './comment-create-many-reply-to-input-envelope.input';
import { CommentWhereUniqueInput } from './comment-where-unique.input';
import { CommentUpdateWithWhereUniqueWithoutReplyToInput } from './comment-update-with-where-unique-without-reply-to.input';
import { CommentUpdateManyWithWhereWithoutReplyToInput } from './comment-update-many-with-where-without-reply-to.input';
import { CommentScalarWhereInput } from './comment-scalar-where.input';

@InputType()
export class CommentUncheckedUpdateManyWithoutReplyToInput {

    @Field(() => [CommentCreateWithoutReplyToInput], {nullable:true})
    create?: Array<CommentCreateWithoutReplyToInput>;

    @Field(() => [CommentCreateOrConnectWithoutReplyToInput], {nullable:true})
    connectOrCreate?: Array<CommentCreateOrConnectWithoutReplyToInput>;

    @Field(() => [CommentUpsertWithWhereUniqueWithoutReplyToInput], {nullable:true})
    upsert?: Array<CommentUpsertWithWhereUniqueWithoutReplyToInput>;

    @Field(() => CommentCreateManyReplyToInputEnvelope, {nullable:true})
    createMany?: CommentCreateManyReplyToInputEnvelope;

    @Field(() => [CommentWhereUniqueInput], {nullable:true})
    connect?: Array<CommentWhereUniqueInput>;

    @Field(() => [CommentWhereUniqueInput], {nullable:true})
    set?: Array<CommentWhereUniqueInput>;

    @Field(() => [CommentWhereUniqueInput], {nullable:true})
    disconnect?: Array<CommentWhereUniqueInput>;

    @Field(() => [CommentWhereUniqueInput], {nullable:true})
    delete?: Array<CommentWhereUniqueInput>;

    @Field(() => [CommentUpdateWithWhereUniqueWithoutReplyToInput], {nullable:true})
    update?: Array<CommentUpdateWithWhereUniqueWithoutReplyToInput>;

    @Field(() => [CommentUpdateManyWithWhereWithoutReplyToInput], {nullable:true})
    updateMany?: Array<CommentUpdateManyWithWhereWithoutReplyToInput>;

    @Field(() => [CommentScalarWhereInput], {nullable:true})
    deleteMany?: Array<CommentScalarWhereInput>;
}
