import { Args, Int, Query, Resolver } from '@nestjs/graphql'

import { Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { KeywordsExtractionResult, SentimentAnalysisResult, TextClassificationResult } from './models/nlp.model'
import { NlpService } from './nlp.service'

@Resolver()
export class NlpResolver {
  constructor (private readonly nlpService: NlpService) {}

  @Query(of => SentimentAnalysisResult, { description: '分析一段文本的情感' })
  @Roles(Role.Admin)
  async sentimentAnalysis (@Args('content') content: string) {
    return await this.nlpService.sentimentAnalysis(content)
  }

  @Query(of => [KeywordsExtractionResult])
  @Roles(Role.Admin)
  async keywordsExtraction (
  @Args('content') content: string,
    @Args('keywordNum', { type: () => Int, nullable: true, defaultValue: 5 }) keywordNum: number
  ) {
    return await this.nlpService.keywordsExtraction(content, keywordNum)
  }

  @Query(of => TextClassificationResult)
  @Roles(Role.Admin)
  async textClassification (@Args('content') content: string) {
    return await this.nlpService.textClassification(content)
  }

  @Query(of => String)
  @Roles(Role.Admin)
  async autoSummarization (@Args('content') content: string, @Args('length', { type: () => Int, nullable: true, defaultValue: 200 }) length: number) {
    return await this.nlpService.autoSummarization(content, length)
  }
}
