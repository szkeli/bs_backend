import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { User } from 'src/user/models/user.model';
import * as crypto from 'crypto';
import { exec } from 'src/tool';

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

  async createAUser(input: User) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`);
    return await axios.post(
      `${this.origin}/graph/vertices`,
      {
        label: 'user',
        id,
        properties: {
          nickName: input.nickName,
          createAt: input.createAt,
          lastLoginAt: input.lastLoginAt,
          avatarUrl: input.avatarUrl,
          unionId: input.unionId,
          openId: input.openId,
          school: input.school,
          grade: input.grade,
          gender: input.gender,
        }
      }
    ).then(r => r.data);
  }

  async createAPost(input: CreateAPostDto) {
    const id = this.hash(`${JSON.stringify(input)}:${Date.now()}`)
    // 事务
    // 创建帖子 关联用户和帖子
    return await exec(
      `
      post = hugegraph.traversal().addV("post")
          .property(id, "${id}")
          .property("title", title)
          .property("content", content)
          .property("createAt", createAt)
      hugegraph.traversal().addE("created_post")
          .from(hugegraph.traversal().V("${input.userId}"))
          .to(post)
      `, {
        title: input.title,
        content: input.content,
        createAt: input.createAt,
    })
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
    return await exec(
      `
        g.traversal()
          .V("${input.userId}")
          .as("user")
          .V("${input.commentId}")
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
      `, {
        content: input.content,
        createAt: input.createAt,
      }
    );
  }

  async dropAVertex(id: string) {
    return await exec(
      `
        g.traversal().V("${id}").drop()
      `, {}
    );
  }
}

export type UserId = string; 
export type PostId = string;
export type CommentId = string;

export class CreateACommentAtCommentDto {
  userId: UserId;
  commentId: CommentId;
  content: string;
  createAt: number;
}
export class CreateAPostDto {
  userId: UserId;
  content: string;
  title: string;
  createAt: number;
}
export class CreateACommentDto {
  userId: UserId;
  postId: PostId;
  content: string;
  createAt: number;
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