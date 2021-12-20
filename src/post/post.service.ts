import { Injectable } from '@nestjs/common'

import { PostCreateInput } from '../@generated/prisma-nestjs-graphql/post/post-create.input'
import { PostUpdateInput } from '../@generated/prisma-nestjs-graphql/post/post-update.input'
import { PrismaService } from '../shared/prisma.service'

@Injectable()
export class PostService {
  constructor (private readonly prismaService: PrismaService) {}
  async create (input: PostCreateInput) {
    return await this.prismaService.post.create({ data: input })
  }

  async findAll () {
    return await this.prismaService.post.findMany()
  }

  async findOne (id: string) {
    return await this.prismaService.post.findUnique({ where: { id } })
  }

  async update (id: string, input: PostUpdateInput) {
    return await this.prismaService.post.update({
      where: { id },
      data: input
    })
  }

  async remove (id: string) {
    return await this.prismaService.post.delete({ where: { id } })
  }
}
