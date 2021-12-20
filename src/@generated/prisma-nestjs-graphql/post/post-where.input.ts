import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFilter } from '../prisma/string-filter.input';
import { IntFilter } from '../prisma/int-filter.input';
import { DateTimeFilter } from '../prisma/date-time-filter.input';

@InputType()
export class PostWhereInput {

    @Field(() => [PostWhereInput], {nullable:true})
    AND?: Array<PostWhereInput>;

    @Field(() => [PostWhereInput], {nullable:true})
    OR?: Array<PostWhereInput>;

    @Field(() => [PostWhereInput], {nullable:true})
    NOT?: Array<PostWhereInput>;

    @Field(() => StringFilter, {nullable:true})
    id?: StringFilter;

    @Field(() => StringFilter, {nullable:true})
    authorId?: StringFilter;

    @Field(() => StringFilter, {nullable:true})
    content?: StringFilter;

    @Field(() => IntFilter, {nullable:true})
    upvoteCount?: IntFilter;

    @Field(() => IntFilter, {nullable:true})
    downvoteCount?: IntFilter;

    @Field(() => IntFilter, {nullable:true})
    flag?: IntFilter;

    @Field(() => DateTimeFilter, {nullable:true})
    createAt?: DateTimeFilter;

    @Field(() => DateTimeFilter, {nullable:true})
    updateAt?: DateTimeFilter;
}
