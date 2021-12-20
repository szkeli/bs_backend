import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';

@InputType()
export class UserCountAggregateInput {

    @Field(() => Boolean, {nullable:true})
    id?: true;

    @Field(() => Boolean, {nullable:true})
    openId?: true;

    @Field(() => Boolean, {nullable:true})
    unionId?: true;

    @Field(() => Boolean, {nullable:true})
    nickName?: true;

    @Field(() => Boolean, {nullable:true})
    gender?: true;

    @Field(() => Boolean, {nullable:true})
    flag?: true;

    @Field(() => Boolean, {nullable:true})
    createAt?: true;

    @Field(() => Boolean, {nullable:true})
    lastLoginAt?: true;

    @Field(() => Boolean, {nullable:true})
    avatarUrl?: true;

    @Field(() => Boolean, {nullable:true})
    school?: true;

    @Field(() => Boolean, {nullable:true})
    grade?: true;

    @Field(() => Boolean, {nullable:true})
    _all?: true;
}
