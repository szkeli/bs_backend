import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateWithoutCommentInput } from './comment-create-without-comment.input';
import { CommentCreateOrConnectWithoutCommentInput } from './comment-create-or-connect-without-comment.input';
import { CommentWhereUniqueInput } from './comment-where-unique.input';

@InputType()
export class CommentCreateNestedOneWithoutCommentInput {

    @Field(() => CommentCreateWithoutCommentInput, {nullable:true})
    create?: CommentCreateWithoutCommentInput;

    @Field(() => CommentCreateOrConnectWithoutCommentInput, {nullable:true})
    connectOrCreate?: CommentCreateOrConnectWithoutCommentInput;

    @Field(() => CommentWhereUniqueInput, {nullable:true})
    connect?: CommentWhereUniqueInput;
}
