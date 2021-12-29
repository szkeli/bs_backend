import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectResolver } from './subject.resolver';
import { DbService } from 'src/db/db.service';

@Module({
  providers: [
    SubjectService, 
    SubjectResolver,
    DbService,
  ]
})
export class SubjectModule {}
