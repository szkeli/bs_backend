import { ForbiddenException, Injectable, Module } from '@nestjs/common'

import { PagingConfigInput } from 'src/comment/models/comment.model'
import { DbService } from 'src/db/db.service'
import { PRIVILEGE, UserId } from 'src/db/model/db.model'

import {
  CreateFollowRelationInput,
  DeleteFollowRelationInput,
  GENDER,
  ORDERBY,
  User,
  UserCreateInput,
  UserFansInput,
  UserFollowASubjectInput,
  UserFollowOneInput,
  UserMyFollowedsInput,
  UserPostsInput,
  UserRegisterInput,
  UserUnFollowOneInput,
  UserUpdateProfileInput
} from './models/user.model'

@Injectable()
export class UserService {
  constructor (private readonly dbService: DbService) {}

  async findPostById (userId: UserId) {
    return await this.dbService.getAUserAllPost({
      userId,
      orderBy: ORDERBY.DESC,
      skip: 2,
      limit: 3
    }).then(r => {
      return r
    })
  }

  async findPostsByUserId (userId: UserId, input: UserPostsInput) {
    return await this.dbService.getAUserAllPost({
      userId,
      orderBy: input.orderBy,
      skip: input.skip,
      limit: input.limit
    })
  }

  async followOne (input: CreateFollowRelationInput) {
    if (input.from === input.to) {
      throw new ForbiddenException('禁止关注自己')
    }
    return await this.dbService.followAPerson(input)
  }

  async unFollowOne (input: DeleteFollowRelationInput) {
    if (input.from === input.to) {
      throw new ForbiddenException('禁止取消关注自己')
    }
    return await this.dbService.unFollowAPerson(input)
  }

  async findFansByUserId (id: UserId, input: UserFansInput) {
    return await this.dbService.findFansByUserId(id, input)
  }

  async findMyFollowedsByUserId (userId: UserId, input: UserMyFollowedsInput) {
    return await this.dbService.findMyFollowedsByUserId(userId, input)
  }

  async findMyFansCount (userId: UserId) {
    return await this.dbService.findMyFansCount(userId)
  }

  async findMyFollowedCount (userId: UserId) {
    return await this.dbService.findMyFollowedCount(userId)
  }

  async createUser (input: UserCreateInput) {
    const createAt = Date.now()
    return await this.dbService.createAUser({
      ...input,
      createAt: createAt,
      lastLoginAt: createAt
    })
  }

  async registerAUser (input: UserRegisterInput) {
    return await this.dbService.registerAUser(input)
  }

  async updateUser (userId: UserId, input: UserUpdateProfileInput) {
    return await this.dbService.updateAUser(userId, input)
  }

  async getUser (userId: UserId): Promise<User> {
    return await this.dbService.getUserById(userId).then(user => {
      // TODO: 更严格的判断用户是否存在
      if (!user || Object.entries(user).length === 0) {
        throw new ForbiddenException('该用户不存在')
      }
      return user
    })
  }

  async followASubject (l: UserFollowASubjectInput) {
    return await this.dbService.userFollowASubject(l)
  }

  async getMySubjectCount (userId: UserId) {
    return await this.dbService.getMySubjectCount(userId)
  }

  async findMySubjects (userId: UserId, input: PagingConfigInput) {
    return await this.dbService.findMySubjects(userId, input)
  }
}
