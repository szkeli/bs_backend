import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

export enum NLP_SENTIMENT {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral'
}

registerEnumType(NLP_SENTIMENT, {
  name: 'NLP_SENTIMENT'
})

@ObjectType()
export class SentimentAnalysisResult {
  @Field(of => Number, { description: '正面分数' })
    positive: number

  @Field(of => Number, { description: '中性分数' })
    neutral: number

  @Field(of => Number, { description: '负面分数' })
    negative: Number

  @Field(of => NLP_SENTIMENT, { description: '文本情感' })
    sentiment: NLP_SENTIMENT
}

@ObjectType()
export class KeywordsExtractionResult {
  @Field(of => Number, { nullable: true })
    score: number | undefined

  @Field(of => String, { nullable: true })
    word: string | undefined
}

@ObjectType()
export class TextClassificationResult {
  @Field(of => String, { nullable: true })
    firstClassName: string | null

  @Field(of => Number, { nullable: true })
    firstClassProbability: number | null

  @Field(of => String, { nullable: true })
    secondClassName: string | null

  @Field(of => Number, { nullable: true })
    secondClassProbability: number | null

  @Field(of => String, { nullable: true })
    thirdClassName: string | null

  @Field(of => Number, { nullable: true })
    thirdClassProbability: number | null

  @Field(of => String, { nullable: true })
    fourthClassName: string | null

  @Field(of => Number, { nullable: true })
    fourthClassProbability: number | null

  @Field(of => String, { nullable: true })
    fifthClassName: string | null

  @Field(of => Number, { nullable: true })
    fifthClassProbability: number | null
}
