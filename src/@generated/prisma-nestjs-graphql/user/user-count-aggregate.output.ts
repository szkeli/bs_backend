import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { Int } from '@nestjs/graphql';

@ObjectType()
export class UserCountAggregate {

    @Field(() => Int, {nullable:false})
    id!: number;

    @Field(() => Int, {nullable:false})
    openId!: number;

    @Field(() => Int, {nullable:false})
    unionId!: number;

    @Field(() => Int, {nullable:false})
    nickName!: number;

    @Field(() => Int, {nullable:false})
    gender!: number;

    @Field(() => Int, {nullable:false})
    flag!: number;

    @Field(() => Int, {nullable:false})
    createAt!: number;

    @Field(() => Int, {nullable:false})
    lastLoginAt!: number;

    @Field(() => Int, {nullable:false})
    avatarUrl!: number;

    @Field(() => Int, {nullable:false})
    school!: number;

    @Field(() => Int, {nullable:false})
    grade!: number;

    @Field(() => Int, {nullable:false})
    _all!: number;
}
