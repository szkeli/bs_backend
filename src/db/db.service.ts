import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GENDER, User, UserCreateInput, UserUpdateInput } from 'src/user/models/user.model';
import * as crypto from 'crypto';
import * as pretty from "prettyjson";
import { exec } from 'src/tool';
import { Post } from 'src/posts/models/post.model';
import { Comment } from 'src/comment/models/comment.model';

@Injectable()
export class DbService {
  
  origin = 'http://w3.onism.cc:8084/graphs/hugegraph';
  baseUrl = 'http://w3.onism.cc:8084/graphs/hugegraph/schema/propertykeys';
  base = 'http://w3.onism.cc:8084/graphs/hugegraph/schema';
  async init() {}
  private hash(content: string) {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  // dealing with Property
  async createAPropertyKey(name: string, dataType: DATA_TYPE) {
    return await axios.post<any, any, CreateAPropertyKeyDTO>(this.baseUrl, {
      data_type: dataType,
      cardinality: CARDINALITY.SINGLE,
      name,
    }).then<CreateAPropertyKeyDTO>(r => r.data);
  }
  async getAllPropertyKey() {
    return await axios.get<GetAllPropertyKeyDto>(this.baseUrl).then(r => r.data);
  }
  async getAPropertyKeyByName(name: string) {
    return await axios.get<PropertyKey>(`${this.baseUrl}/${name}`).then(r => r.data);
  }
  async removeAPropertyKeyByName(name: string) {
    return await axios.delete(`${this.baseUrl}/${name}`).then(r => r.data);
  }
  // dealing with VertexLabel
  async createAVertexLabel(vertexLabel: CreateVertexLabelDto) {
    return await axios.post<any, any, CreateVertexLabelDto>(`${this.base}/vertexlabels`, {
      ...vertexLabel
    }).then<CreateVertexLabelDto>(r => r.data);
  }
  async removeVertexLabelByName(name: string) {
    return await axios.delete<DeleteVertexLabelByNameDto>(`${this.base}/vertexlabels/${name}`).then(r => r.data);
  }
  async getAVertexLabelByName(name: string) {
    return await axios.get<VertexLabel>(`${this.base}/vertexlabels/${name}`).then(r => r.data);
  }
  async getAllVertexLabel() {
    return await axios.get<GetAllVertexLabel>(`${this.base}/vertexlabels`).then(r => r.data);
  }

  // dealing with EdgeLabel

  async createAUser(input: CreateUserDto) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`);
    return await exec<CreateUserDto, DbResponse<User>>(
      `
        g.traversal()
          .addV("user")
          .property(id, "${id}")
          .as("u")
          .property("nickName", nickName)
          .property("lastLoginAt", lastLoginAt)
          .property("createAt", createAt)
          .property("avatarUrl", avatarUrl)
          .property("unionId", unionId)
          .property("openId", openId)
          .property("school", school)
          .property("grade", grade)
          .property("gender", gender)
          .select("u")
          .valueMap(true).by(unfold())
      `, input
    );
  }
  async getUser(id: UserId) {
    return await exec<UserId, DbResponse<User>>(
      `
        g.traversal()
          .V("${id}")
          .hasLabel("user")
          .valueMap(true).by(unfold())
      `, {}
    );
  }
  async updateAUser(input: UserUpdateInput) {
    console.error(input);
    return await exec(
      `
        g.traversal()
          .V("${input.id}")
          .hasLabel("user")
          ${input.nickName?'.property("nickName", nickName)':''}
          ${input.openId?'.property("openId", openId)':''}
          ${input.unionId?'.property("unionId", unionId)':''}
          ${input.school?'.property("school", school)':''}
          ${input.avatarUrl?'.property("avatarUrl", avatarUrl)':''}
          ${input.gender?'.property("gender", gender)':''}
          ${input.grade?'.property("grade", grade)':''}
      `, {
        nickName: input.nickName,
        openId: input.openId,
        school: input.school,
        avatarUrl: input.avatarUrl,
        gender: input.gender,
        unionId: input.unionId,
        grade: input.grade,
      }
    );
  }

  async createAPost(input: CreateAPostDto) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`)
    return await exec(
      `
        g.traversal()
          .addV("post")
          .property(id, "${id}")
          .as("post")
          .property("title", title)
          .property("content", content)
          .property("createAt", createAt)
          .V("${input.userId}")
          .addE("created_post")
          .to("post")
      `, {
        title: input.title,
        content: input.content,
        createAt: input.createAt,
    })
  }

  async getAUserAllPost(input: GetAUserAllPostDto) {
    return await exec<UserId, DbResponse<Post>>(`
      g.traversal()
        .V("${input.id}")
        .hasLabel("user")
        .out()
        .hasLabel("post")
        .order()
        .by("createAt", ${input.range})
        .valueMap(true)
        .range(${input.skip + 1}, ${input.limit + input.skip + 1})
      `, {}).then(r => {
        r.result.data.map(r => {
          delete r['label'];
          r.title = r.title[0];
          r.content = r.content[0];
          r.createAt = r.createAt[0];
        })
        return r;
      })
  }

  async getAPost(id: PostId) {
    return await exec<PostId, DbResponse<Post>>(`
      g.traversal()
        .V("${id}")
        .hasLabel("post")
    `, {});
  }
  async createACommentAtPost(input: CreateACommentDto) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`);
    return await exec(
      `
        g.traversal()
          .V("${input.userId}")
          .as("user")
          .V("${input.postId}")
          .as("post")
          .addV("comment")
          .as("newComment")
          .property(id, "${id}")
          .property("createAt", createAt)
          .property("content", content)
          .addE("owned")
          .to("post")
          .select("user")
          .addE("created_comment")
          .to("newComment")
      `, {
        content: input.content,
        createAt: input.createAt,
      }
    )
  }

  async createACommentAtComment(input: CreateACommentAtCommentDto) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`);
    return await exec<string, DbResponse<Comment>>(
      `
        g.traversal()
          .V("${input.creator}")
          .hasLabel("user")
          .as("user")
          .V("${input.commentId}")
          .hasLabel("comment")
          .as("comment")
          .addV("comment")
          .as("newComment")
          .property(id, "${id}")
          .property("createAt", createAt)
          .property("content", content)
          .addE("commented")
          .to("comment")
          .select("user")
          .addE("created_comment")
          .to("newComment")
          .select("newComment")
          .valueMap(true).by(unfold())
      `, {
        content: input.content,
        createAt: input.createAt,
      }
    );
  }

  async followAPerson(input: FollowAPersonDto) {
    return await exec(
      `
        g.traversal()
          .V("${input.to}")
          .as("to")
          .V("${input.from}")
          .addE("followed")
          .to("to")
      `, {}
    )
  }

  async unFollowAPerson(input: UnFollowAPersonDto) {
    return await exec(
      `
        g.traversal()
          .V("${input.to}")
          .inE()
          .as("e")
          .outV()
          .hasId("${input.from}")
          .select("e")
          .drop()
      `, {}
    );
  }
  async dropAVertex(id: string) {
    return await exec(
      `
        g.traversal().V("${id}").drop()
      `, {}
    );
  }

  async commentsPaging(postId: PostId, skip: number, limit: number) {
    return await exec<UserId, DbResponse<Comment>>(`
      g.traversal()
        .V("${postId}")
        .hasLabel("post")
        .in()
        .hasLabel("comment")
        .order()
        .by("createAt", ${RANGE.DECR})
        .valueMap(true)
        .by(unfold())
        .range(${skip + 1}, ${limit + skip + 1})
    `, {}).then(r => {
      return r;
    });
  }

  async createAdminer(input: CreateAAdminerDto) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`);
    return await exec(
      `
        g.traversal()
          .V("${input.createBy}")
          .as("pre")
          .addV("admin")
          .property(id, "${id}")
          .as("newAdmin")
          .property("createAt", createAt)
          .property("nickName", nickName)
          .property("lastLoginAt", lastLoginAt)
          .property("action", action)
          .select("pre")
          .addE("authorised")
          .to("newAdmin")
      `, {
        createAt: input.createAt,
        nickName: input.nickName,
        lastLoginAt: input.lastLoginAt,
        action: input.action,
      }
    )    
  }
  // TODO 修改管理员权限等属性的函数
  async deleteAdminer(id: UserId) {
    return await exec(
      `
        g.traversal()
          .V("${id}")
          .drop()
      `, {}
    );
  }

  async testClear() {
    return await exec(
      `
        g.traversal()
          // .V()
          // .hasLabel("comment")
          // .where(inE("created_comment").count().is(0))
          // .drop()
          .V()
          .hasLabel("comment")
          .where(outE("owned").count().is(0))
          .drop()
      `, {}
    );
  }
}

export enum ERROR_NUMBER {
  _200 = 200,
  _400 = 400,
  _500 = 500,
}

export type DbResponse<T> = {
  requestId: string;
  status: {
    message: string;
    code: ERROR_NUMBER;
    attributes: {
      [index: string]: string,
    }
  },
  result: {
    data: T[],
  },
  meta: {
    [index: string]: string,
  }
} 
export type UserId = string; 
export type PostId = string;
export type CommentId = string;
export type Time = number;
export class GetAUserAllPostDto {
  id: UserId;
  skip: number;
  limit: number;
  range: RANGE;
}
export enum RANGE {
  INCR = 'incr',
  DECR = 'decr',
  // 随机排序
  SHUFFLE = 'shuffle',
}
export class CreateUserDto {
  nickName: string;
  createAt: Time;
  lastLoginAt: Time;
  avatarUrl: string;
  unionId: string;
  openId: string;
  school: string;
  grade: string;
  gender: string;
}
export class CreateAAdminerDto {
  action: string[];
  createAt: Time;
  lastLoginAt: Time;
  createBy: UserId;
  privilege: PRIVILEGE;
  nickName: string;
}

export enum PRIVILEGE {
  NORMAL = 'ADMIN',
}
export class UnFollowAPersonDto {
  from: UserId;
  to: UserId;
}
export class FollowAPersonDto {
  /**
   * 关注者
   */
  from: UserId;
  /**
   * 被关注者
   */
  to: UserId;
}
export interface CreateACommentAtCommentDto {
  creator: UserId;
  commentId: CommentId;
  content: string;
  createAt: Time;
}
export class CreateAPostDto {
  userId: UserId;
  content: string;
  title: string;
  createAt: Time;
}
export class CreateACommentDto {
  userId: UserId;
  postId: PostId;
  content: string;
  createAt: Time;
}

export interface MyData {
  [index: string]: string;
}

export class CreateVertexLabelDto {
  name: string;
  id_strategy: ID_STRATEGY;
  properties?: string[];
  primary_keys?: string[];
  nullable_keys?: string[];
  enable_label_index?: boolean;
  // only hugegraph version >= v0.11.2
  ttl?: number;
  // only hugegraph version >= v0.11.2
  ttl_start_time?: string;
  user_data?: MyData;
}

export class CreateVertexLabelResponseDto {
  id: number | string;
  primary_keys: [string];
  id_strategy: ID_STRATEGY;
  name: string;
  index_names: [string];
  properties: [string]
  nullable_keys: [string]
  enable_label_index: boolean;
  user_data: MyData;
}

export class GetAllVertexLabel {
  vertexlabels: [VertexLabel];
}

export class VertexLabel {
  id: number;
  primary_keys: [string];
  id_strategy: ID_STRATEGY;
  name: string;
  index_names: [string];
  properties: [string];
  nullable_keys: [string];
  // 类型索引 开启会影响性能
  enable_label_index: boolean;
  user_data: MyData;
  
}

export enum ICON_SIZE {
  NORMAL = 'NORMAL',
  HUGE = 'HUGE',
  BIG = 'BIG',
  SMALL = 'SMALL',
  TINY = 'TINY',
}

export enum ID_STRATEGY {
  DEFAULT = 'AUTOMATIC',
  AUTOMATIC = 'AUTOMATIC',
  CUSTOMIZE_STRING = 'CUSTOMIZE_STRING',
  CUSTOMIZE_NUMBER = 'CUSTOMIZE_NUMBER',
  CUSTOMIZE_UUID = 'CUSTOMIZE_UUID'
}

export class DeleteVertexLabelByNameDto {
  task_id: number;
}

export class GetAllPropertyKeyDto {
  propertykeys: [PropertyKey];
}

export class PropertyKey {
  id: number;
  name: string;
  data_type: DATA_TYPE;
  cardinality: CARDINALITY;
  properties: [any];
  user_data: MyData;
}

export class CreateAPropertyKeyDTO {
  name: string;
  data_type: DATA_TYPE;
  cardinality: CARDINALITY;
}

export enum DATA_TYPE {
  TEXT = 'TEXT',
  INT = 'INT',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  BYTE = 'BYTE',
  LONG = 'LONG',
  FLOAT = 'FLOAT',
  DATE = 'DATE',
  UUID = 'UUID',
  BLOB = 'BLOB',
}

export enum CARDINALITY {
  SINGLE = 'SINGLE',
  LIST = 'LIST',
  SET = 'SET',
}