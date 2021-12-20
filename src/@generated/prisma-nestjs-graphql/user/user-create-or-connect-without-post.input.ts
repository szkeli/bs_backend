import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { UserWhereUniqueInput } from './user-where-unique.input';
import { UserCreateWithoutPostInput } from './user-create-without-post.input';

@InputType()
export class UserCreateOrConnectWithoutPostInput {

    @Field(() => UserWhereUniqueInput, {nullable:false})
    where!: UserWhereUniqueInput;

    @Field(() => UserCreateWithoutPostInput, {nullable:false})
    create!: UserCreateWithoutPostInput;
}
