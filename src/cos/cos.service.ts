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

  getWXacodeKey (configSign: string) {
    return `${this.wxacodeP}${configSign}.png`
  }

  async putWXacodeInCOS (buffer: Buffer, configSign: string): Promise<string> {
    return await new Promise(resolve => {
      this.getCOSInstance().putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: this.getWXacodeKey(configSign),
        StorageClass: 'STANDARD',
        Body: buffer
      }, (err, data) => {
        if (err) {
          throw new ForbiddenException(`上传小程序码到COS失败：${err.message}`)
        }
        resolve(`https://${data.Location}`)
      })
    })
  }

  async tryToGetWXacodeFromCOS (configSign: string): Promise<string | null> {
    const key = this.getWXacodeKey(configSign)
    const ex = await this.doesObjectExist(key)

    if (!ex) {
      return null
    }
    return await new Promise(resolve => {
      this.getCOSInstance().getObjectUrl({
        Bucket: this.bucket,
        Region: this.region,
        Key: this.getWXacodeKey(configSign),
        Sign: false
      }, (_err, data) => {
        resolve(data?.Url)
      })
    })
  }

  async doesObjectExist (key: string): Promise<boolean> {
    return await new Promise(resolve => {
      this.getCOSInstance().headObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key
      }, (_err, data) => {
        resolve(!!data)
      })
    })
  }
}
