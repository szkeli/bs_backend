import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { StringFilter } from '../prisma/string-filter.input';
import { EnumGenderFilter } from '../prisma/enum-gender-filter.input';
import { IntFilter } from '../prisma/int-filter.input';
import { DateTimeFilter } from '../prisma/date-time-filter.input';
import { StringNullableFilter } from '../prisma/string-nullable-filter.input';

@InputType()
export class UserWhereInput {

    @Field(() => [UserWhereInput], {nullable:true})
    AND?: Array<UserWhereInput>;

    @Field(() => [UserWhereInput], {nullable:true})
    OR?: Array<UserWhereInput>;

    @Field(() => [UserWhereInput], {nullable:true})
    NOT?: Array<UserWhereInput>;

    @Field(() => StringFilter, {nullable:true})
    id?: StringFilter;

    @Field(() => StringFilter, {nullable:true})
    openId?: StringFilter;

    @Field(() => StringFilter, {nullable:true})
    unionId?: StringFilter;

    @Field(() => StringFilter, {nullable:true})
    nickName?: StringFilter;

    @Field(() => EnumGenderFilter, {nullable:true})
    gender?: EnumGenderFilter;

    @Field(() => IntFilter, {nullable:true})
    flag?: IntFilter;

    @Field(() => DateTimeFilter, {nullable:true})
    createAt?: DateTimeFilter;

    @Field(() => DateTimeFilter, {nullable:true})
    lastLoginAt?: DateTimeFilter;

    @Field(() => StringNullableFilter, {nullable:true})
    avatarUrl?: StringNullableFilter;

    @Field(() => StringNullableFilter, {nullable:true})
    school?: StringNullableFilter;

    @Field(() => StringNullableFilter, {nullable:true})
    grade?: StringNullableFilter;
}
