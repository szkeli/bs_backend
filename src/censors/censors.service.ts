import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core'
import {
  ModerationClient,
  RunTextModerationRequest,
  TextDetectionItemsReq,
  TextDetectionReq
} from '@huaweicloud/huaweicloud-sdk-moderation'
import { ForbiddenException, Injectable } from '@nestjs/common'

@Injectable()
export class CensorsService {
  private readonly client: ModerationClient
  constructor () {
    const ak = process.env.ACCESS_KEY
    const sk = process.env.SECRET_KEY
    const endpoint = process.env.ENDPOINT
    const projectId = process.env.PROJECT_ID

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
      throw new ForbiddenException('内容长度暂时不能大于5000')
    }

    const request = new RunTextModerationRequest()
    request.withBody(new TextDetectionReq().withItems([
      new TextDetectionItemsReq().withText(content)
    ]))

    return await this.client
      .runTextModeration(request)
      .then(r => r.result)
  }
}
