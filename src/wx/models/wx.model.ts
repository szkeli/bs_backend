import { ArgsType, Field, InputType, Int } from '@nestjs/graphql'

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
