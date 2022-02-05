import { Injectable } from '@nestjs/common'
import { Client as TmsClient } from 'tencentcloud-sdk-nodejs/tencentcloud/services/tms/v20201229/tms_client'

@Injectable()
export class CensorsService {
  private readonly client: TmsClient
  constructor () {
    const config = {
      credential: {
        secretId: '',
        secretKey: ''
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'tms.tencentcloudapi.com'
        }
      }
    }
    this.client = new TmsClient(config)
  }

  async moderate (content: string) {
    return await this.client.TextModeration({
      Content: content
    })
  }
}
