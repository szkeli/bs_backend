import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { UserCreateWithoutPostInput } from './user-create-without-post.input';
import { UserCreateOrConnectWithoutPostInput } from './user-create-or-connect-without-post.input';
import { UserWhereUniqueInput } from './user-where-unique.input';

@InputType()
export class UserCreateNestedOneWithoutPostInput {

    @Field(() => UserCreateWithoutPostInput, {nullable:true})
    create?: UserCreateWithoutPostInput;

    @Field(() => UserCreateOrConnectWithoutPostInput, {nullable:true})
    connectOrCreate?: UserCreateOrConnectWithoutPostInput;

    @Field(() => UserWhereUniqueInput, {nullable:true})
    connect?: UserWhereUniqueInput;
}
