import { registerEnumType } from '@nestjs/graphql';

export enum PostScalarFieldEnum {
    id = "id",
    authorId = "authorId",
    content = "content",
    upvoteCount = "upvoteCount",
    downvoteCount = "downvoteCount",
    flag = "flag",
    createAt = "createAt",
    updateAt = "updateAt"
}


registerEnumType(PostScalarFieldEnum, { name: 'PostScalarFieldEnum', description: undefined })
