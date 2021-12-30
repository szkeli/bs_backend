import { Injectable } from '@nestjs/common'

import { PagingConfigInput } from 'src/comment/models/comment.model'
import { DbService } from 'src/db/db.service'
import { PostId, UserId } from 'src/db/model/db.model'

import { CreateAPostInput, PostsCommentsInput } from './models/post.model'

@Injectable()
export class PostsService {
  constructor (private readonly dbService: DbService) {}

  async createAPost (creator: UserId, input: CreateAPostInput) {
    return await this.dbService.createAPost(creator, input)
  }

  async deleteAPost (creator: UserId, id: PostId) {
    return await this.dbService.deleteAPost(creator, id)
  }

  async getAPost (id: PostId) {
    return await this.dbService.getAPost(id)
  }

  async getPosts (input: PagingConfigInput) {
    return await this.dbService.getPosts(input)
  }

  async getUserByPostId (id: PostId) {
    return await this.dbService.getUserByPostId(id)
  }

  async getCommentsByPostId (id: PostId, input: PostsCommentsInput) {
    return await this.dbService.getCommentsByPostId(id, input)
  }
}
