import { ForbiddenException, Injectable } from "@nestjs/common";
import {
  GENDER,
  User,
  UserCreateInput,
  UserFollowOneInput,
  UserUpdateInput,
} from "./models/user.model";
import * as pretty from "prettyjson";
import { exec } from "src/tool";
import { DATA_TYPE, DbService, ICON_SIZE, ID_STRATEGY, PRIVILEGE, RANGE } from "src/db/db.service";

@Injectable()
export class UserService {
  constructor(private readonly dbService: DbService) {}

  async findPostById(id: string) {
    return await this.dbService.getAUserAllPost({
      id,
      range: RANGE.DECR,
      skip: 2,
      limit: 3,
    }).then(r => {

      const res = r.result.data;
      console.error(res)
      return res;
    })
  }

  followOne(input: UserFollowOneInput) {
    throw new Error('Method not implemented.');
  }

  async createUser(input: UserCreateInput) {
    return await this.dbService.createAUser({
      ...input,
      createAt: Date.now(),
      lastLoginAt: Date.now(),
    }).then(r => {
      console.error(r.result.data[0]);
      return r.result.data[0];
    });
  }

  async updateUser(input: UserUpdateInput) {
    return this.dbService.updateAUser(input).then(r => {
      console.error(r);
    })
  }

  async getUser(id: string) {
    return await this.dbService.getUser(id).then(r => {
      if(r.result.data.length === 0) {
        throw new ForbiddenException("该用户不存在");
      }
      console.error(r.result.data);
      return r.result.data[0]
    });
    
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

    // const res = await this.dbService.createACommentAtComment({
    //   userId: '55aab6532f405753b4c937f6c3fa75596424ecaef5752e282a760adf4d31857e',
    //   commentId: '715586950c181bda769ec2f5135fc0a8eea3d039c8ca717a108149ee7a6882a3',
    //   createAt: Date.now(),
    //   content: '评论了你的评论',
    // })

    // await this.dbService.dropAVertex('041b937b6526b91fd40aeb28a042d8d005a7d56d130351703e7dd5ed6a8268b2');
    
    // const res = await this.dbService.testClear();
    // const res = await this.dbService.unFollowAPerson({
    //   from: 'fcf2511a3adf4fbe504169d0772ed3c9f4a1562287b56af60063d905518f35c5',
    //   to: 'e90414ac707ccaca34efb5a12d21c4b5f9d072bf828a5ca96a16d82e25e76eef',
    // });

    const res = await this.dbService.createAdminer({
      createAt: Date.now(),
      createBy: 'e0a8dc834795e8be3789b0c30130236aeda6a2fc020fa24d36a020c254c48917',
      nickName: '管理员2号',
      lastLoginAt: Date.now(),
      action: ["action-1", "action-2"],
      privilege: PRIVILEGE.NORMAL,
    })
    console.error(res);
    return null;
  }
}
