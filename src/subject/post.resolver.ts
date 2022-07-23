import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Post } from '../posts/models/post.model'
import { Subject } from './model/subject.model'
import { SubjectService } from './subject.service'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly subjectService: SubjectService) {}

  @ResolveField(of => Subject, { nullable: true, description: '帖子所属的主题' })
  async subject (@Parent() post: Post): Promise<Subject | null> {
    return await this.subjectService.findSubjectByPostId(post.id)
  }
}
