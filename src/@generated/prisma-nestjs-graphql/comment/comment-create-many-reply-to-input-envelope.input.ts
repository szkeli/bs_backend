import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { CommentCreateManyReplyToInput } from './comment-create-many-reply-to.input';

@InputType()
export class CommentCreateManyReplyToInputEnvelope {

    @Field(() => [CommentCreateManyReplyToInput], {nullable:false})
    data!: Array<CommentCreateManyReplyToInput>;

    @Field(() => Boolean, {nullable:true})
    skipDuplicates?: boolean;
}
