import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { Gender } from '../prisma/gender.enum';
import { Int } from '@nestjs/graphql';
import { UserCountAggregate } from './user-count-aggregate.output';
import { UserAvgAggregate } from './user-avg-aggregate.output';
import { UserSumAggregate } from './user-sum-aggregate.output';
import { UserMinAggregate } from './user-min-aggregate.output';
import { UserMaxAggregate } from './user-max-aggregate.output';

@ObjectType()
export class UserGroupBy {

    @Field(() => String, {nullable:false})
    id!: string;

    @Field(() => String, {nullable:false})
    openId!: string;

    @Field(() => String, {nullable:false})
    unionId!: string;

    @Field(() => String, {nullable:false})
    nickName!: string;

    @Field(() => Gender, {nullable:false})
    gender!: keyof typeof Gender;

    @Field(() => Int, {nullable:false})
    flag!: number;

    @Field(() => Date, {nullable:false})
    createAt!: Date | string;

    @Field(() => Date, {nullable:false})
    lastLoginAt!: Date | string;

    @Field(() => String, {nullable:true})
    avatarUrl?: string;

    @Field(() => String, {nullable:true})
    school?: string;

    @Field(() => String, {nullable:true})
    grade?: string;

    @Field(() => UserCountAggregate, {nullable:true})
    _count?: UserCountAggregate;

    @Field(() => UserAvgAggregate, {nullable:true})
    _avg?: UserAvgAggregate;

    @Field(() => UserSumAggregate, {nullable:true})
    _sum?: UserSumAggregate;

    @Field(() => UserMinAggregate, {nullable:true})
    _min?: UserMinAggregate;

    @Field(() => UserMaxAggregate, {nullable:true})
    _max?: UserMaxAggregate;
}
