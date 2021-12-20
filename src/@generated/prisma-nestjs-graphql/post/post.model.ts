import { Field } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';
import { ID } from '@nestjs/graphql';
import { Int } from '@nestjs/graphql';

@ObjectType()
export class Post {

    @Field(() => ID, {nullable:false})
    id!: string;

    @Field(() => String, {nullable:false})
    authorId!: string;

    @Field(() => String, {nullable:false})
    content!: string;

    @Field(() => Int, {nullable:false,defaultValue:0})
    upvoteCount!: number;

    @Field(() => Int, {nullable:false,defaultValue:0})
    downvoteCount!: number;

    @Field(() => Int, {nullable:false,defaultValue:0})
    flag!: number;

    @Field(() => Date, {nullable:false})
    createAt!: Date;

    @Field(() => Date, {nullable:false})
    updateAt!: Date;
}
