import { ForbiddenException, Injectable } from '@nestjs/common'
import * as COS from 'cos-nodejs-sdk-v5'

@Injectable()
export class CosService {
  public readonly bucket = 'dev-1306842204'
  public readonly region = 'ap-guangzhou'
  private readonly wxacodeP = 'wxacodes/'

  getCOSInstance () {
    return new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY
    })
  }

  async putWXacodeInCOS (buffer: Buffer, configSign: string): Promise<string> {
    return await new Promise(resolve => {
      this.getCOSInstance().putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: `${this.wxacodeP}${configSign}`,
        StorageClass: 'STANDARD',
        Body: buffer
      }, (err, data) => {
        if (err) {
          throw new ForbiddenException(`上传小程序码到COS失败：${err.message}`)
        }
        resolve(data.Location)
      })
    })
  }

  async tryToGetWXacodeFromCOS (configSign: string): Promise<string | null> {
    return await new Promise((resolve, reject) => {
      this.getCOSInstance().getObjectUrl({
        Bucket: this.bucket,
        Region: this.region,
        Key: `${this.wxacodeP}${configSign}`,
        Sign: true
      }, (_err, data) => {
        resolve(data?.Url)
      })
    })
  }
}
