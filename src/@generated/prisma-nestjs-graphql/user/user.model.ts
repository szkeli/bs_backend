import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { ID } from '@nestjs/graphql';
import { Gender } from '../prisma/gender.enum';
import { Int } from '@nestjs/graphql';

@ObjectType()
export class User {

    @Field(() => ID, {nullable:false})
    id!: string;

    @Field(() => String, {nullable:false})
    openId!: string;

    @Field(() => String, {nullable:false})
    unionId!: string;

    @Field(() => String, {nullable:false,defaultValue:'空格用户'})
    nickName!: string;

    @Field(() => Gender, {nullable:false,defaultValue:'NONE'})
    gender!: keyof typeof Gender;

    @Field(() => Int, {nullable:false,defaultValue:0})
    flag!: number;

    @Field(() => Date, {nullable:false})
    createAt!: Date;

    @Field(() => Date, {nullable:false})
    lastLoginAt!: Date;

    @Field(() => String, {nullable:true})
    avatarUrl!: string | null;

    @Field(() => String, {nullable:true})
    school!: string | null;

    @Field(() => String, {nullable:true})
    grade!: string | null;
}
