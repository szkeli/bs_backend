import { Test, TestingModule } from '@nestjs/testing';
import { SubjectResolver } from './subject.resolver';

describe('SubjectResolver', () => {
  let resolver: SubjectResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubjectResolver],
    }).compile();

    resolver = module.get<SubjectResolver>(SubjectResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
