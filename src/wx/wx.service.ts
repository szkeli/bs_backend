import { ForbiddenException, Injectable } from '@nestjs/common'
import axios from 'axios'

import { CosService } from '../cos/cos.service'
import { sha1 } from '../tool'
import { GetUnlimitedWXacodeArgs, GetWXMiniProgrameShortLinkArgs } from './models/wx.model'

@Injectable()
export class WxService {
  constructor (private readonly cosService: CosService) {}

  async getAccessToken () {
    const appId = process.env.APP_ID
    const appSecret = process.env.APP_SECRET
    const grantType = 'client_credential'

    const res = await axios({
      method: 'GET',
      url: 'https://api.weixin.qq.com/cgi-bin/token',
      params: {
        grant_type: grantType,
        appid: appId,
        secret: appSecret
      }
    }).then(r => r.data as unknown as {
      access_token: string | null
      expires_in: number | null
      errcode: -1 | 0 | 40001 | 40002 | 40003 | null
      errmsg: string | null
    })

    if (!res.access_token) {
      throw new ForbiddenException(res.errmsg)
    }
    return res.access_token
  }

  async getWXMiniProgrameShortLink (config: GetWXMiniProgrameShortLinkArgs) {
    const accessToken = await this.getAccessToken()
    return await axios({
      method: 'POST',
      url: 'https://api.weixin.qq.com/wxa/genwxashortlink',
      params: {
        access_token: accessToken
      },
      data: config
    }).then((r: {data: string}) => {
      if (typeof r.data === 'object') {
        throw new ForbiddenException(`获取短链失败：${JSON.stringify(r.data)}`)
      }
      return r.data
    })
  }

  async getUnlimitedWXacodeBuffer (config: GetUnlimitedWXacodeArgs) {
    const accessToken = await this.getAccessToken()

    const res = await axios({
      method: 'POST',
      url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit',
      params: {
        access_token: accessToken
      },
      data: config,
      responseType: 'arraybuffer'
    })
      .then(r => {
        const rd = r.data.toString()
        try {
          return JSON.parse(rd) as unknown as {
            errcode: 0 | 45009 | 41030 | 40097 | null
            errmsg: string | null
          }
        } catch {
          return r.data as Buffer
        }
      })
    if (Buffer.isBuffer(res)) {
      return res
    } else {
      throw new ForbiddenException(`获取小程序码失败：${JSON.stringify(res)}`)
    }
  }

  async getUnlimitedWXacode (config: GetUnlimitedWXacodeArgs) {
    const configSign = sha1(JSON.stringify(config))
    const maybe = await this.cosService.tryToGetWXacodeFromCOS(configSign)

    if (maybe) {
      return maybe
    }

    const buffer = await this.getUnlimitedWXacodeBuffer(config)
    const url = await this.cosService.putWXacodeInCOS(buffer, configSign)

    return url
  }
}
