import { registerEnumType } from '@nestjs/graphql';

export enum UserScalarFieldEnum {
    id = "id",
    openId = "openId",
    unionId = "unionId",
    nickName = "nickName",
    gender = "gender",
    flag = "flag",
    createAt = "createAt",
    lastLoginAt = "lastLoginAt",
    avatarUrl = "avatarUrl",
    school = "school",
    grade = "grade"
}


registerEnumType(UserScalarFieldEnum, { name: 'UserScalarFieldEnum', description: undefined })
