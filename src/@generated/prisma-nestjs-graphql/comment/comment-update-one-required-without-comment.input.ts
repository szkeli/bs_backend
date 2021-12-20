import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateWithoutCommentInput } from './comment-create-without-comment.input';
import { CommentCreateOrConnectWithoutCommentInput } from './comment-create-or-connect-without-comment.input';
import { CommentUpsertWithoutCommentInput } from './comment-upsert-without-comment.input';
import { CommentWhereUniqueInput } from './comment-where-unique.input';
import { CommentUpdateWithoutCommentInput } from './comment-update-without-comment.input';

@InputType()
export class CommentUpdateOneRequiredWithoutCommentInput {

    @Field(() => CommentCreateWithoutCommentInput, {nullable:true})
    create?: CommentCreateWithoutCommentInput;

    @Field(() => CommentCreateOrConnectWithoutCommentInput, {nullable:true})
    connectOrCreate?: CommentCreateOrConnectWithoutCommentInput;

    @Field(() => CommentUpsertWithoutCommentInput, {nullable:true})
    upsert?: CommentUpsertWithoutCommentInput;

    @Field(() => CommentWhereUniqueInput, {nullable:true})
    connect?: CommentWhereUniqueInput;

    @Field(() => CommentUpdateWithoutCommentInput, {nullable:true})
    update?: CommentUpdateWithoutCommentInput;
}
