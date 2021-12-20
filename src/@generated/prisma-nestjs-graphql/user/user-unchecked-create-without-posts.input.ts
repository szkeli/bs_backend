import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { Gender } from '../prisma/gender.enum';
import { Int } from '@nestjs/graphql';

@InputType()
export class UserUncheckedCreateWithoutPostsInput {

    @Field(() => String, {nullable:true})
    id?: string;

    @Field(() => String, {nullable:false})
    openId!: string;

    @Field(() => String, {nullable:false})
    unionId!: string;

    @Field(() => String, {nullable:true})
    nickName?: string;

    @Field(() => Gender, {nullable:true})
    gender?: keyof typeof Gender;

    @Field(() => Int, {nullable:true})
    flag?: number;

    @Field(() => Date, {nullable:true})
    createAt?: Date | string;

    @Field(() => Date, {nullable:true})
    lastLoginAt?: Date | string;

    @Field(() => String, {nullable:true})
    avatarUrl?: string;

    @Field(() => String, {nullable:true})
    school?: string;

    @Field(() => String, {nullable:true})
    grade?: string;
}
