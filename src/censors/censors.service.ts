import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core'
import {
  ModerationClient,
  RunTextModerationRequest,
  TextDetectionItemsReq,
  TextDetectionReq
} from '@huaweicloud/huaweicloud-sdk-moderation'
import { Injectable } from '@nestjs/common'

import { ContentLenExceedException } from '../app.exception'
import { CENSOR_SUGGESTION } from './models/censors.model'

@Injectable()
export class CensorsService {
  private readonly client: ModerationClient
  constructor () {
    const ak = process.env.ACCESS_KEY ?? ''
    const sk = process.env.SECRET_KEY ?? ''
    const endpoint = process.env.ENDPOINT ?? ''
    const projectId = process.env.PROJECT_ID ?? ''

    const credentials = new BasicCredentials()
      .withAk(ak)
      .withSk(sk)
      .withProjectId(projectId)

    this.client = ModerationClient.newBuilder()
      .withCredential(credentials)
      .withEndpoint(endpoint)
      .build()
  }

  async textCensor (content: string) {
    if (content.length >= 5000) {
      throw new ContentLenExceedException(5000)
    }

    const request = new RunTextModerationRequest()
    request.withBody(new TextDetectionReq().withItems([
      new TextDetectionItemsReq().withText(content)
    ]))

    const res = await this.client
      .runTextModeration(request)
      .then(r => r.result)

    return {
      detail: res?.detail ?? {},
      suggestion: res?.suggestion ?? CENSOR_SUGGESTION.PASS
    }
  }
}
