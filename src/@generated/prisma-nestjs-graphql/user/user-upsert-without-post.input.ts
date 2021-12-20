import { Field } from '@nestjs/graphql';
import { InputType } from '@nestjs/graphql';
import { UserUpdateWithoutPostInput } from './user-update-without-post.input';
import { UserCreateWithoutPostInput } from './user-create-without-post.input';

@InputType()
export class UserUpsertWithoutPostInput {

    @Field(() => UserUpdateWithoutPostInput, {nullable:false})
    update!: UserUpdateWithoutPostInput;

    @Field(() => UserCreateWithoutPostInput, {nullable:false})
    create!: UserCreateWithoutPostInput;
}
