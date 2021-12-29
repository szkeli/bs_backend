import { Injectable } from '@nestjs/common';
import { PagingConfigInput } from 'src/comment/models/comment.model';
import { DbService } from 'src/db/db.service';
import { UserId } from 'src/db/model/db.model';
import { CreateSubjectInput, SubjectId, UpdateSubjectInput } from './model/subject.model';

@Injectable()
export class SubjectService {
  constructor(private readonly dbService: DbService) {}

  async getUsersBySubjectId(id: SubjectId, input: PagingConfigInput) {
    return await this.dbService.getUsersBySubjectId(id, input);
  }

  async updateSubject(input: UpdateSubjectInput) {
    return await this.dbService.updateSubject(input);
  }
  async addSubject(creator: UserId, input: CreateSubjectInput) {
    return await this.dbService.addSubject(creator, input);
  }
  async subject(id: SubjectId) {
    return await this.dbService.subject(id);
  }
  async getCreatorOfSubject(id: SubjectId) {
    return await this.dbService.getCreatorOfSubject(id);
  }
  async findASubjectByPostId(id: SubjectId) {
    return await this.dbService.findASubjectByPostId(id);
  }
  async getPostsBySubjectId(id: SubjectId, input: PagingConfigInput) {
    return await this.dbService.getPostsBySubjectId(id, input);
  }
}
