import { ForbiddenException, Injectable } from '@nestjs/common'
import axios from 'axios'

import { BadOpenIdException, UserNotFoundException, UserNotHasLessonsTodayExcepton } from '../app.exception'
import { CosService } from '../cos/cos.service'
import { LessonsService } from '../lessons/lessons.service'
import { fmtLessonTimeByDayInWeekThroughSchoolTimeTable, sha1 } from '../tool'
import {
  GetUnlimitedWXacodeArgs,
  GetWXMiniProgrameShortLinkArgs,
  GetWXSubscriptionInfoArgs,
  SendSubscribeMessageArgs,
  SendUniformMessageArgs,
  TriggerLessonNotificationArgs
} from './models/wx.model'

@Injectable()
export class WxService {
  constructor (
    private readonly cosService: CosService,
    private readonly lessonsService: LessonsService
  ) {}

  async triggerLessonNotification ({ to }: TriggerLessonNotificationArgs) {
    // 通过 to 查询相应用户的 openId
    const res = await this.lessonsService.filterLessons(to, {
      week: 7,
      dayInWeek: 3,
      startYear: 2019,
      endYear: 2020,
      semester: 1
    })

    if (res.user.length === 0) {
      throw new UserNotFoundException(to)
    }

    if (res.items.length === 0) {
      throw new UserNotHasLessonsTodayExcepton(to)
    }

    if (!res.user[0]?.openId || res.user[0]?.openId === '') {
      throw new BadOpenIdException(to)
    }

    console.error(res)

    const data = {
      // touser: 'opjHf5a56LcZvBI8cY9gi6M3y-ZE',
      touser: res.user[0]?.openId,
      mp_template_msg: {
        appid: 'wxfcf7b19fdd5d9770',
        template_id: '49nv12UdpuLNktBfXNrH61-ci3x71_FX8hhAew8fQoQ',
        url: 'http://weixin.qq.com/download',
        miniprogram: JSON.stringify({
          appid: 'wx10ac1dfea0e2b8c6',
          pagepath: '/pages/index/index'
        }),
        data: JSON.stringify({
          first: {
            value: '上课提醒'
          },
          keyword1: {
            value: `明天你有${res.items.length ?? 'N/A'}门课程`
          },
          // 所有课程
          // 线性代数；音乐；体育；（列举全部课程用分号连接）
          keyword2: {
            value: res.items.map(i => i.lesson?.name ?? 'N/A').join('；') ?? 'N/A'
          },
          // 课程名称和时间
          // 【1，2节】8:30-9：55 线性代数
          // 【1，2节】8:30-9：55 线性代数
          keyword3: {
            value: res.items
              .map(i => `${fmtLessonTimeByDayInWeekThroughSchoolTimeTable(i.start, i.end)} ${i.lesson?.name ?? 'N/A'}`)
              .join('\n')
          },
          // 上课地点
          // 【1，2节】师院B204
          // 【1，2节】师院B204
          remark: {
            value: res.items
              .map(i => `[${i.start},${i.end}] ${i.lesson?.destination ?? 'N/A'}`)
              .join('\n')
          }
        })
      }
    }
    return await this.sendUniformMessage(data)
  }

  async getWXSubscriptionInfo (id: string, { lang, openid }: GetWXSubscriptionInfoArgs) {
    const accessToken = await this.getAccessToken()

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

  async sendSubscribeMessage (config: SendSubscribeMessageArgs) {
    const accessToken = await this.getAccessToken()
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

  async getAccessToken () {
    const appId = process.env.APP_ID
    const appSecret = process.env.APP_SECRET
    const grantType = 'client_credential'

    const res = await axios({
      method: 'GET',
      url: 'http://api.weixin.qq.com/cgi-bin/token',
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

  async sendUniformMessage (config: SendUniformMessageArgs) {
    const accessToken = await this.getAccessToken()
    return await axios({
      method: 'POST',
      url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/uniform_send',
      params: {
        access_token: accessToken
      },
      data: config
    }).then(r => r.data as unknown as {
      errcode: 40037 | 41028 | 41029 | 41030 | 45009 | 40003 | 40013 | 0
      errmsg: string
    })
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
