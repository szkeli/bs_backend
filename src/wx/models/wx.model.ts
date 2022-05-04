import { ArgsType, Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

@InputType()
export class GetUnlimitedWXacodeArgsLineColor {
  @Field(of => Int, { defaultValue: 0 })
    r: number

  @Field(of => Int, { defaultValue: 0 })
    g: number

  @Field(of => Int, { defaultValue: 0 })
    b: number
}

@ArgsType()
export class GetUnlimitedWXacodeArgs {
  @Field(of => String, { description: '详情见 https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.getUnlimited.html' })
    scene: string

  @Field(of => String, { description: '页面 page，例如 pages/index/index，根路径前不要填加 /，不能携带参数（参数请放在scene字段里），如果不填写这个字段，默认跳主页面', nullable: true })
    page: string | null

  @Field(of => Boolean, { defaultValue: true, description: '检查page 是否存在，为 true 时 page 必须是已经发布的小程序存在的页面（否则报错）；为 false 时允许小程序未发布或者 page 不存在， 但page 有数量上限（60000个）请勿滥用', nullable: true })
    check_path: boolean | null

  @Field(of => String, { defaultValue: 'release', description: '要打开的小程序版本。正式版为 "release"，体验版为 "trial"，开发版为 "develop"', nullable: true })
    env_version: string | null

  @Field(of => Int, { description: '二维码的宽度，单位 px，最小 280px，最大 1280px', nullable: true, defaultValue: 430 })
    width: number | null

  @Field(of => Boolean, { description: '自动配置线条颜色，如果颜色依然是黑色，则说明不建议配置主色调，默认 false', defaultValue: false, nullable: true })
    auto_color: boolean

  @Field(of => GetUnlimitedWXacodeArgsLineColor, { description: 'auto_color 为 false 时生效，使用 rgb 设置颜色 例如 {"r":"xxx","g":"xxx","b":"xxx"} 十进制表示', nullable: true, defaultValue: { r: 0, g: 0, b: 0 } })
    line_color: GetUnlimitedWXacodeArgsLineColor

  @Field(of => Boolean, { defaultValue: false, nullable: true, description: '是否需要透明底色，为 true 时，生成透明底色的小程序' })
    is_hyaline: boolean|null
}

@ArgsType()
export class GetWXMiniProgrameShortLinkArgs {
  @Field(of => String, { description: '通过 Short Link 进入的小程序页面路径，必须是已经发布的小程序存在的页面，可携带 query，最大1024个字符' })
    page_url: string

  @Field(of => String, { description: '页面标题，不能包含违法信息，超过20字符会用... 截断代替' })
    page_title: string

  @Field(of => Boolean, { defaultValue: false, nullable: true, description: '生成的 Short Link 类型，短期有效：false，永久有效：true' })
    is_permanent: boolean
}

@InputType()
export class WeappTemplateMsg {
  @Field(of => String, { description: '小程序模板ID' })
    template_id: string

  @Field(of => String, { description: '小程序页面路径' })
    page: string

  @Field(of => String, { description: '小程序模板消息formid' })
    form_id: string

  @Field(of => String, { description: '小程序模板数据' })
    data: string

  @Field(of => String, { description: '小程序模板放大关键词' })
    emphasis_keyword: string
}

@InputType()
export class MpTemplateMsg {
  @Field(of => String, { description: '公众号appid，要求与小程序有绑定且同主体' })
    appid: string

  @Field(of => String, { description: '公众号模板id' })
    template_id: string

  @Field(of => String, { description: '公众号模板消息所要跳转的url' })
    url: string

  @Field(of => String, { description: '公众号模板消息所要跳转的小程序，小程序的必须与公众号具有绑定关系' })
    miniprogram: string

  @Field(of => String, { description: '公众号模板消息的数据' })
    data: string
}

@ArgsType()
export class SendUniformMessageArgs {
  @Field(of => String, { description: '用户openid，可以是小程序的openid，也可以是mp_template_msg.appid对应的公众号的openid' })
    touser: string

  @Field(of => WeappTemplateMsg, { nullable: true, description: '小程序模板消息相关的信息，可以参考小程序模板消息接口; 有此节点则优先发送小程序模板消息；（小程序模板消息已下线，不用传此节点）' })
    weapp_template_msg?: WeappTemplateMsg | null

  @Field(of => MpTemplateMsg, { description: '公众号模板消息相关的信息，可以参考公众号模板消息接口；有此节点并且没有weapp_template_msg节点时，发送公众号模板消息' })
    mp_template_msg: MpTemplateMsg
}

@ArgsType()
export class SendSubscribeMessageArgs {
  @Field(of => String, { description: '接收者（用户）的 openid' })
    touser: string

  @Field(of => String, { description: '所需下发的订阅模板id' })
    template_id: string

  @Field(of => String, { nullable: true, description: '点击模板卡片后的跳转页面，仅限本小程序内的页面。支持带参数,（示例index?foo=bar）。该字段不填则模板无跳转。' })
    page: string

  @Field(of => String, { description: '模板内容，格式形如 { "key1": { "value": any }, "key2": { "value": any } }' })
    data: string

  @Field(of => String, { description: '跳转小程序类型：developer为开发版；trial为体验版；formal为正式版；默认为正式版', nullable: true })
    miniprograme_state: string

  @Field(of => String, { description: '进入小程序查看”的语言类型，支持zh_CN(简体中文)、en_US(英文)、zh_HK(繁体中文)、zh_TW(繁体中文)，默认为zh_CN', nullable: true })
    lang: string
}

export enum WX_SUBSCRIBE_SCENE {
  ADD_SCENE_SEARCH = 'ADD_SCENE_SEARCH',
  ADD_SCENE_ACCOUNT_MIGRATION = 'ADD_SCENE_ACCOUNT_MIGRATION',
  ADD_SCENE_PROFILE_CARD = 'ADD_SCENE_PROFILE_CARD',
  ADD_SCENE_QR_CODE = 'ADD_SCENE_QR_CODE',
  ADD_SCENE_PROFILE_LINK = 'ADD_SCENE_PROFILE_LINK',
  ADD_SCENE_PROFILE_ITEM = 'ADD_SCENE_PROFILE_ITEM',
  ADD_SCENE_PAID = 'ADD_SCENE_PAID',
  ADD_SCENE_WECHAT_ADVERTISEMENT = 'ADD_SCENE_WECHAT_ADVERTISEMENT',
  ADD_SCENE_REPRINT = 'ADD_SCENE_REPRINT',
  ADD_SCENE_LIVESTREAM = 'ADD_SCENE_LIVESTREAM',
  ADD_SCENE_CHANNELS = 'ADD_SCENE_CHANNELS',
  ADD_SCENE_OTHERS = 'ADD_SCENE_OTHERS',
}

registerEnumType(WX_SUBSCRIBE_SCENE, {
  name: 'WX_SUBSCRIBE_SCENE',
  valuesMap: {
    ADD_SCENE_SEARCH: {
      description: '公众号搜索'
    },
    ADD_SCENE_ACCOUNT_MIGRATION: {
      description: '公众号迁移'
    },
    ADD_SCENE_PROFILE_CARD: {
      description: '名片分享'
    },
    ADD_SCENE_QR_CODE: {
      description: '扫描二维码'
    },
    ADD_SCENE_PROFILE_LINK: {
      description: '图文页内名称点击'
    },
    ADD_SCENE_PROFILE_ITEM: {
      description: '图文页右上角菜单'
    },
    ADD_SCENE_PAID: {
      description: '支付后关注'
    },
    ADD_SCENE_WECHAT_ADVERTISEMENT: {
      description: '微信广告'
    },
    ADD_SCENE_REPRINT: {
      description: '他人转载'
    },
    ADD_SCENE_LIVESTREAM: {
      description: '视频号直播'
    },
    ADD_SCENE_CHANNELS: {
      description: '视频号'
    },
    ADD_SCENE_OTHERS: {
      description: '其他'
    }
  }
})

export enum WX_SUBSCRIBE_INFO_LANG {
  ZH_CN = 'zh_CN',
  ZH_TW = 'zh_TW',
  EN = 'en'
}

registerEnumType(WX_SUBSCRIBE_INFO_LANG, {
  name: 'WX_SUBSCRIBE_INFO_LANG'
})

@ArgsType()
export class GetWXSubscriptionInfoArgs {
  @Field(of => WX_SUBSCRIBE_INFO_LANG, { description: '返回国家地区语言版本，zh_CN 简体，zh_TW 繁体，en 英语', nullable: true })
    lang: WX_SUBSCRIBE_INFO_LANG

  @Field(of => String)
    openid: string
}

@ObjectType()
export class WxSubscriptionInfo {
  @Field(of => Int, { description: '用户是否订阅该公众号标识，值为0时，代表此用户没有关注该公众号，拉取不到其余信息。' })
    subscribe: 0 | 1

  @Field(of => String, { description: '用户的标识，对当前公众号唯一' })
    openid: string

  @Field(of => String, { description: '用户的语言，简体中文为zh_CN' })
    language: string

  @Field(of => Int, { description: '用户关注时间，为时间戳。如果用户曾多次关注，则取最后关注时间' })
    subscribe_time: number

  @Field(of => String, { description: '只有在用户将公众号绑定到微信开放平台帐号后，才会出现该字段。' })
    unionid: string

  @Field(of => String, { description: '公众号运营者对粉丝的备注，公众号运营者可在微信公众平台用户管理界面对粉丝添加备注' })
    remark: string

  @Field(of => String, { description: '用户所在的分组ID（兼容旧的用户分组接口）' })
    groupid: string

  @Field(of => [Int], { description: '用户被打上的标签ID列表' })
    tagid_list: number[]

  @Field(of => WX_SUBSCRIBE_SCENE, { description: '返回用户关注的渠道来源' })
    subscribe_scene: WX_SUBSCRIBE_SCENE
}

@ArgsType()
export class TriggerLessonNotificationArgs {
  @Field()
    lessonId: string

  @Field({ description: '被通知的 User 的 id' })
    to: string
}
