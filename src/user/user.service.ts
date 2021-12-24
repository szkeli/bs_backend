import { Injectable } from "@nestjs/common";
import {
  GENDER,
  User,
  UserCreateInput,
  UserFollowOneInput,
  UserUpdateInput,
} from "./models/user.model";
import * as pretty from "prettyjson";
import { exec } from "src/tool";
import { DATA_TYPE, DbService, ICON_SIZE, ID_STRATEGY } from "src/db/db.service";

@Injectable()
export class UserService {
  constructor(
    private readonly dbService: DbService,
  ) {}
  followOne(input: UserFollowOneInput) {
    throw new Error('Method not implemented.');
  }

  async createUser(input: UserCreateInput) {
    let doit = `
      g.traversal()
        .addV('person')
        .property('name', name)
        .property('createAt', createAt)
        .property('lastLoginAt', lastLoginAt)
        .property('flag', flag)
        .property('avatarUrl', avatarUrl)
        .property('openId', openId)
        .property('unionId', unionId)
        .property('school', school)
        .property('gender', gender)
        .property('grade', grade)
    `;
    
    let a = await exec<string, string>(doit, {
      name: input.nickName,
      createAt: input.createAt,
      lastLoginAt: input.lastLoginAt,
      flag: input.flag,
      avatarUrl: input.avatarUrl,
      openId: input.openId,
      unionId: input.unionId,
      school: input.school,
      gender: input.gender + "",
      grade: input.grade,
    });

    console.error(pretty.render(a));

    return {};
  }

  updateUser(input: UserUpdateInput) {
    throw new Error("Method not implemented.");
  }

  async getUser(id: string) {
    // await this.dbService.createAPropertyKey('nickdsaNddsadssdsame', DATA_TYPE.TEXT);
    // const all = await this.dbService.getAllPropertyKey();
    // console.error(all);

    // add a vertexLabel 
    // const res = await this.dbService.createAVertexLabel({
    //   name: 'root',
    //   id_strategy: ID_STRATEGY.CUSTOMIZE_STRING,
    //   enable_label_index: false,
    //   primary_keys: [],
    //   properties: [],
    // }).catch(e => {
    //   console.error(e);
    // });
    // console.error(res)

    // const res = await this.dbService.createAUser({
    //   nickName: 'famouscat',
    //   createAt: Date.now(),
    //   lastLoginAt: Date.now(),
    //   avatarUrl: 'dsadas',
    //   unionId: 'dsadsa',
    //   openId: 'dsadsa',
    //   school: '深圳大学',
    //   grade: '大三',
    //   gender: GENDER.FEMALE,
    // })

    // const ress = await this.dbService.createAPost({
    //   userId: 'e90414ac707ccaca34efb5a12d21c4b5f9d072bf828a5ca96a16d82e25e76eef',
    //   content: '测试帖子-内容',
    //   title: `测试帖子-标题-${Date.now()}`,
    // });
    // console.error(ress);

    // const res = await this.dbService.createACommentAtPost({
    //   userId: 'c80d776394d002272c0052cd7ea516eb9b853ba8e64819c550d2258b1975ae6c',
    //   postId: '1a815febad9d83a627fdd53b84d4f0e9d62a9ecb6b1f94cc93ddfdc0df6a023f',
    //   content: '哈哈哈哈哈哈-测试-3',
    //   createAt: Date.now(),
    // });

    const res = await this.dbService.createACommentAtComment({
      userId: '55aab6532f405753b4c937f6c3fa75596424ecaef5752e282a760adf4d31857e',
      commentId: '715586950c181bda769ec2f5135fc0a8eea3d039c8ca717a108149ee7a6882a3',
      createAt: Date.now(),
      content: '评论了你的评论',
    })
    console.error(res)
    return null;
  }
}
