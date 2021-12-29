import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { UserId } from 'src/db/model/db.model';
import { CreateSubjectInput, SubjectId, UpdateSubjectInput } from './model/subject.model';

@Injectable()
export class SubjectService {
  
  constructor(private readonly dbService: DbService) {}

  async updateSubject(input: UpdateSubjectInput) {
    return await this.dbService.updateSubject(input);
  }
  async addSubject(creator: UserId, input: CreateSubjectInput) {
    return await this.dbService.addSubject(creator, input);
  }
  async subject(id: SubjectId) {
    return await this.dbService.subject(id);
  }
}
