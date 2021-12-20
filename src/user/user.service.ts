import { Injectable } from '@nestjs/common'

import { UserCreateInput } from '../@generated/prisma-nestjs-graphql/user/user-create.input'
import { UserUpdateInput } from '../@generated/prisma-nestjs-graphql/user/user-update.input'
import { PrismaService } from '../shared/prisma.service'

@Injectable()
export class UserService {
  constructor (private readonly prismaService: PrismaService) {}

  async create (input: UserCreateInput) {
    return await this.prismaService.user.create({
      data: input
    })
  }

  async findAll () {
    return await this.prismaService.user.findMany()
  }

  async findOne (id: string) {
    return await this.prismaService.user.findUnique({ where: { id } })
  }

  async update (id: string, input: UserUpdateInput) {
    return await this.prismaService.user.update({
      where: { id },
      data: input
    })
  }

  async remove (id: string) {
    return await this.prismaService.user.delete({ where: { id } })
  }
}
