import { Injectable } from '@nestjs/common'
import { Client as NLPClient } from 'tencentcloud-sdk-nodejs/tencentcloud/services/nlp/v20190408/nlp_client'

import { KeywordsExtractionResult, NLP_SENTIMENT, TextClassificationResult } from './models/nlp.model'

@Injectable()
export class NlpService {
  async autoSummarization (content: string, length: number) {
    return await this.nlpClient.AutoSummarization({
      Text: content,
      Length: length
    }).then(r => r.Summary)
  }

  async textClassification (content: string): Promise<TextClassificationResult> {
    return await this.nlpClient.TextClassification({
      Text: content
    }).then(r =>
      Object.fromEntries(Object.entries(r.Classes[0])?.map(v => {
        v[0] = v[0].replace(v[0][0], v[0][0].toLowerCase())
        return v
      })) as TextClassificationResult
    )
  }

  private readonly nlpClient: NLPClient
  constructor () {
    const clientConfig = {
      credential: {
        secretId: process.env.COS_SECRET_ID,
        secretKey: process.env.COS_SECRET_KEY
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'nlp.tencentcloudapi.com'
        }
      }
    }

    this.nlpClient = new NLPClient(clientConfig)
  }

  async keywordsExtraction (content: string, num: number): Promise<KeywordsExtractionResult[]> {
    return await this.nlpClient.KeywordsExtraction({
      Text: content,
      Num: num
    }).then(r => r.Keywords?.map(k => ({ score: k.Score, word: k.Word })))
  }

  async sentimentAnalysis (content: string) {
    return await this.nlpClient.SentimentAnalysis({
      Text: content,
      Mode: '3class'
    }).then(r => ({
      negative: r.Negative,
      positive: r.Positive,
      neutral: r.Neutral,
      sentiment: r.Sentiment as NLP_SENTIMENT
    }))
  }
}
