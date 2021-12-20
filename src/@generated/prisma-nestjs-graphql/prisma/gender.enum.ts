import { registerEnumType } from '@nestjs/graphql';

export enum Gender {
    NONE = "NONE",
    MALE = "MALE",
    FEMALE = "FEMALE"
}


registerEnumType(Gender, { name: 'Gender', description: undefined })
