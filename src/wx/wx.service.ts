import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

import { CosService } from '../cos/cos.service'
import { sha1 } from '../tool'
import { CODE2SESSION_GRANT_TYPE } from '../user/models/user.model'
import {
  GetUnlimitedWXacodeArgs,
  GetWXMiniProgrameShortLinkArgs,
  GetWXSubscriptionInfoArgs,
  SendSubscribeMessageArgs,
  SendUniformMessageArgs,
  WxSendUniformMessageRet
} from './models/wx.model'

@Injectable()
export class WxService {
  private readonly logger = new Logger(WxService.name)

  constructor (
    private readonly cosService: CosService
  ) {}

  async getWXSubscriptionInfo (id: string, { lang, openid, grantType }: GetWXSubscriptionInfoArgs) {
    const { appId, secret } = this.findAppIdAndSecretByGrantType(grantType)
    const accessToken = await this.getAccessToken(appId, secret)

    const res = await axios({
      method: 'GET',
      url: 'https://api.weixin.qq.com/cgi-bin/user/info',
      params: {
        access_token: accessToken,
        openid,
        lang
      }
    })
    console.error(res)
    throw new Error('Method not implemented.')
  }

  async sendSubscribeMessage ({ grantType, ...config }: SendSubscribeMessageArgs) {
    const { appId, secret } = this.findAppIdAndSecretByGrantType(grantType)
    const accessToken = await this.getAccessToken(appId, secret)
    // config.data = JSON.parse(config.data)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = {
      thing4: '人工审核',
      phrase1: '审核通过',
      time2: '2019年10月1日 15:01',
      thing3: '备注'
    }
    return await axios({
      method: 'POST',
      url: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
      params: {
        access_token: accessToken
      },
      data: config
    }).then(r => r.data as unknown as {
      errcode: 40003 | 40037 | 43101 | 47003 | 41030
      errmsg: string
    })
  }

  async getAccessToken (appId: string, secret: string) {
    const res = await axios({
      method: 'POST',
      url: 'https://api.szlikeyou.com/allocator',
      data: {
        appId, secret
      }
    }).then(r => r.data) as string

    if (!res) {
      throw new ForbiddenException('获取 access_token 失败')
    }
    return res
  }

  async sendUniformMessage (config: SendUniformMessageArgs, grantType: CODE2SESSION_GRANT_TYPE) {
    const { appId, secret } = this.findAppIdAndSecretByGrantType(grantType)
    const accessToken = await this.getAccessToken(appId, secret)
    return await axios({
      method: 'POST',
      url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/uniform_send',
      params: {
        access_token: accessToken
      },
      data: config
    }).then(r => r.data as unknown as WxSendUniformMessageRet)
  }

  async mockSendUniformMessage (_config: SendUniformMessageArgs, grantType: CODE2SESSION_GRANT_TYPE) {
    this.logger.debug(`mockSendUniformMessage, grantType: ${grantType}`)
    return {
      errcode: 0,
      errmsg: 'ok'
    } as unknown as WxSendUniformMessageRet
  }

  findAppIdAndSecretByGrantType (grantType: CODE2SESSION_GRANT_TYPE) {
    let appId: string
    let secret: string
    if (grantType === CODE2SESSION_GRANT_TYPE.BLANK_SPACE) {
      appId = process.env.APP_ID
      secret = process.env.APP_SECRET
    } else if (grantType === CODE2SESSION_GRANT_TYPE.CURRICULUM) {
      appId = process.env.APP_ID_2
      secret = process.env.APP_SECRET_2
    } else if (grantType === CODE2SESSION_GRANT_TYPE.WXOPEN) {
      appId = process.env.WX_OPEN_APP_ID
      secret = process.env.WX_OPEN_SECRET
    }

    return { appId, secret }
  }

  async getWXMiniProgrameShortLink ({ grantType, ...config }: GetWXMiniProgrameShortLinkArgs) {
    const { appId, secret } = this.findAppIdAndSecretByGrantType(grantType)
    const accessToken = await this.getAccessToken(appId, secret)
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

  async getUnlimitedWXacodeBuffer ({ grantType, ...config }: GetUnlimitedWXacodeArgs) {
    const { appId, secret } = this.findAppIdAndSecretByGrantType(grantType)
    const accessToken = await this.getAccessToken(appId, secret)

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
