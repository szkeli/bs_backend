import { ForbiddenException, Injectable } from "@nestjs/common";
import axios from "axios";
import {
  DeleteFollowRelationInput,
  GENDER,
  ORDERBY,
  User,
  UserCreateInput,
  UserFansInput,
  UserFollowASubjectInput,
  UserMyFollowedsInput,
  UserPostsInput,
  UserRegisterInput,
  UserUnFollowOneInput,
  UserUpdateProfileInput,
} from "src/user/models/user.model";
import * as crypto from "crypto";
import * as pretty from "prettyjson";
import * as gremlin from "gremlin";
import { exec, hash, sign } from "src/tool";
import {
  CreateAPostInput,
  Post,
  PostsCommentsInput,
} from "src/posts/models/post.model";
import {
  AddACommentOnCommentInput,
  AddACommentOnPostInput,
  Comment,
  CommentId,
  PagingConfigInput,
} from "src/comment/models/comment.model";
import {
  anonymous,
  objectify,
  SocialTraversal,
  SocialTraversalSource,
} from "./dsl";
import { skip } from "rxjs";
import {
  UnvoteACommentInput,
  UnvoteAPostInput,
  VoteACommentInput,
  VoteAPostInput,
} from "src/votes/model/votes.model";
import {
  CARDINALITY,
  CreateAAdminerDto,
  CreateAPropertyKeyDTO,
  CreateUserDto,
  CreateVertexLabelDto,
  DATA_TYPE,
  DeleteVertexLabelByNameDto,
  FollowAPersonDto,
  GetAllPropertyKeyDto,
  GetAllVertexLabel,
  GetAUserAllPostDto,
  PostId,
  RANGE,
  UserId,
  VertexLabel,
} from "./model/db.model";
import { CreateSubjectInput, Subject, SubjectId, UpdateSubjectInput } from "src/subject/model/subject.model";

const { unfold } = gremlin.process.statics;
const T = gremlin.process.t;
const __ = gremlin.process.statics;

@Injectable()
export class DbService {
  origin = "http://w3.onism.cc:8084/graphs/hugegraph";
  baseUrl = "http://w3.onism.cc:8084/graphs/hugegraph/schema/propertykeys";
  base = "http://w3.onism.cc:8084/graphs/hugegraph/schema";
  private readonly g: SocialTraversalSource;

  constructor() {
    const traversal = gremlin.process.AnonymousTraversalSource.traversal;
    const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
    this.g = traversal(SocialTraversalSource).withRemote(
      new DriverRemoteConnection("ws://42.194.215.104:8182/gremlin", {
        traversalSource: "hugegraph",
      }),
    );
  }
  async init() {}
  // dealing with Property
  async createAPropertyKey(name: string, dataType: DATA_TYPE) {
    return await axios.post<any, any, CreateAPropertyKeyDTO>(this.baseUrl, {
      data_type: dataType,
      cardinality: CARDINALITY.SINGLE,
      name,
    }).then<CreateAPropertyKeyDTO>((r) => r.data);
  }
  async getAllPropertyKey() {
    return await axios.get<GetAllPropertyKeyDto>(this.baseUrl).then((r) =>
      r.data
    );
  }
  async getAPropertyKeyByName(name: string) {
    return await axios.get<PropertyKey>(`${this.baseUrl}/${name}`).then((r) =>
      r.data
    );
  }
  async removeAPropertyKeyByName(name: string) {
    return await axios.delete(`${this.baseUrl}/${name}`).then((r) => r.data);
  }
  // dealing with VertexLabel
  async createAVertexLabel(vertexLabel: CreateVertexLabelDto) {
    return await axios.post<any, any, CreateVertexLabelDto>(
      `${this.base}/vertexlabels`,
      {
        ...vertexLabel,
      },
    ).then<CreateVertexLabelDto>((r) => r.data);
  }
  async removeVertexLabelByName(name: string) {
    return await axios.delete<DeleteVertexLabelByNameDto>(
      `${this.base}/vertexlabels/${name}`,
    ).then((r) => r.data);
  }
  async getAVertexLabelByName(name: string) {
    return await axios.get<VertexLabel>(`${this.base}/vertexlabels/${name}`)
      .then((r) => r.data);
  }
  async getAllVertexLabel() {
    return await axios.get<GetAllVertexLabel>(`${this.base}/vertexlabels`).then(
      (r) => r.data
    );
  }
  // dealing with EdgeLabel
  async createAUser(input: CreateUserDto) {
    return await this.g
      .createUser()
      .as("user")
      .updateUserProps(input)
      .select("user")
      .filterAllUserProps()
      .toList()
      .then((r) => objectify<User>(r[0]));
  }

  async registerAUser(input: UserRegisterInput) {
    // TODO 更严谨地判断当前userId是否已经被使用
    const isUserIdUsed = await this.g
      .user(input.userId)
      .count()
      .toList()
      .then((r) => r[0] === 1);
    if (isUserIdUsed) {
      throw new ForbiddenException("The UserId already has been used.");
    }
    return await this.g
      .createUser()
      .registerUserProps(input)
      .filterAllUserProps()
      .toList()
      .then((r) => objectify<User>(r[0]));
  }
  async getUserById(id: UserId) {
    return await this.g
      .user(id)
      .filterAllUserProps()
      .toList()
      .then((r) => objectify<User>(r[0]));
  }
  async updateAUser(userId: UserId, input: UserUpdateProfileInput) {
    let u = this.g.user(userId);
    for (let props of Object.entries(input)) {
      if (props[0] === "id" || props[0] === "userId") continue;
      u = u.property(props[0], props[1]);
    }
    return await u
      .filterAllUserProps()
      .toList()
      .then((r) => objectify<User>(r[0]));
  }
  async createAPost(creator: UserId, input: CreateAPostInput) {
    const id = hash({ creator, input });
    if(input.subject) {
      return this.g
        .createPost(id)
        .as('p')
        .updatePostProps(input)
        .user(creator)
        .addE('created_post')
        .to('p')
        .subject(input.subject)
        .addE('owned_subject')
        .from_('p')
        .select('p')
        .filterAllPostProps()
        .toList()
        .then(r => objectify<Post>(r[0]));
    }
    return this.g
      .createPost(id)
      .as("post")
      .updatePostProps(input)
      .user(creator)
      .addE("created_post")
      .to("post")
      .select("post")
      .filterAllPostProps()
      .toList()
      .then(r => objectify<Post>(r[0]));
  }
  async deleteAPost(creator: UserId, id: PostId) {
    // tips: 即使帖子不存在也返回删除成功
    return this.g
      .user(creator)
      .out('created_post')
      .post(id)
      .hasLabel('post')
      .drop()
      .next()
      .then(r => r.done);
  }
  async getAPost(id: PostId) {
    return await this.g
      .post(id)
      .filterAllPostProps()
      .toList()
      .then((r) => objectify<Post>(r[0]));
  }
  async getUserByPostId(id: PostId) {
    return await this.g
      .post(id)
      .hasLabel("post")
      .in_("created_post")
      .filterAllUserProps()
      .toList()
      .then((r) => objectify<User>(r[0]));
  }
  async getAUserAllPost(input: GetAUserAllPostDto) {
    return await this.g
      .user(input.userId)
      .out("created_post")
      .hasLabel("post")
      .order()
      .by("createAt", this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllPostProps()
      .toList()
      .then((r) => r.map((v) => objectify<Post>(v)));
  }
  async findFansByUserId(userId: UserId, input: UserFansInput) {
    // TODO v0.2对followed这条边执行一定的过滤操作
    // TODO orderBy
    return await this.g
      .user(userId)
      .in_("followed")
      .hasLabel("user")
      .order()
      .by("createAt", this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllUserProps()
      .toList()
      .then((r) => r.map((v) => objectify<User>(v)));
  }
  async findMyFollowedsByUserId(userId: UserId, input: UserMyFollowedsInput) {
    return await this.g
      .user(userId)
      .out("followed")
      .hasLabel("user")
      .order()
      .by("createAt", this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllUserProps()
      .toList()
      .then((r) => r.map((v) => objectify<User>(v)));
  }
  async findMyFollowedCount(userId: UserId) {
    return await this.g
      .user(userId)
      .out("followed")
      .hasLabel("user")
      .count()
      .toList()
      .then((r) => r[0]);
  }
  async findMyFansCount(userId: UserId) {
    return await this.g
      .user(userId)
      .in_("followed")
      .hasLabel("user")
      .count()
      .toList()
      .then((r) => r[0]);
  }
  async addACommentOnPost(creator: UserId, input: AddACommentOnPostInput) {
    const id = hash(input);
    return await this.g
      // 创建评论
      .createComment(id)
      .as("c")
      .property("content", input.content)
      .property("createAt", Date.now())
      // 关联到评论创作者
      .user(creator)
      .addE("created_comment")
      .to("c")
      // 关联到帖子
      .select("c")
      .addE("owned")
      .to(__.V(input.to))
      // 获取原评论信息返回
      .select("c")
      .filterAllCommentProps()
      .toList()
      .then((r) => objectify<Comment>(r[0]));
  }
  async addACommentOnComment(creator: UserId, input: AddACommentOnCommentInput) {
    const id = hash(input);
    return await this.g
      // 创建评论
      .createComment(id)
      .as("c")
      .property("content", input.content)
      .property("createAt", Date.now())
      // 关联到创建者
      .user(creator)
      .addE("created_comment")
      .to("c")
      // 关联到评论
      .select("c")
      .addE("commented")
      .to(__.V(input.to))
      // 过滤原评论的属性
      .select("c")
      .filterAllCommentProps()
      .toList()
      .then((r) => objectify<Comment>(r[0]));
  }
  async getCommentsByPostId(postId: PostId, input: PagingConfigInput) {
    return await this.g
      .post(postId)
      .hasLabel("post")
      .in_("owned")
      .hasLabel("comment")
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllCommentProps()
      .toList()
      .then(r => r.map(v => objectify<Comment>(v)));
  }
  async getCommentsByCommentId(commentId: CommentId, input: PagingConfigInput) {
    return await this.g
      .comment(commentId)
      .hasLabel('comment')
      .in_('commented')
      .hasLabel('comment')
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllCommentProps()
      .toList()
      .then(r => r.map(v => objectify<Comment>(v)))
  }

  async getACommentById(id: CommentId) {
    return await this.g
      .comment(id)
      .hasLabel("comment")
      .filterAllCommentProps()
      .toList()
      .then((r) => objectify<Comment>(r[0]));
  }
  async voteAPost(voter: UserId, input: VoteAPostInput) {
    return await this.g
      .user(voter)
      .addE("voted_post")
      .property("createAt", Date.now())
      .to(__.V(input.to))
      .V(input.to)
      .hasLabel("post")
      .filterAllPostProps()
      .toList()
      .then((r) => objectify<Post>(r[0]));
  }
  async voteAComment(voter: UserId, input: VoteACommentInput) {
    return await this.g
      .user(voter)
      .addE("voted_comment")
      .property("createAt", Date.now())
      .to(__.V(input.to)
      .hasLabel("comment"))
      .V(input.to)
      .hasLabel("comment")
      .filterAllCommentProps()
      .toList()
      .then((r) => objectify<Comment>(r[0]));
  }
  async unvoteAPost(voter: UserId, input: UnvoteAPostInput) {
    return await this.g
      .user(voter)
      .outE('voted_post')
      .as('e')
      .inV()
      .hasId(input.to)
      .hasLabel("post")
      .select('e')
      .drop()
      .next()
      .then((r) => r.done);
  }
  async unvoteAComment(voter: UserId, input: UnvoteACommentInput) {
    return await this.g
      .user(voter)
      .outE('voted_comment')
      .as('e')
      .inV()
      .hasId(input.to)
      .hasLabel("comment")
      .select('e')
      .drop()
      .next()
      .then((r) => r.done);
  }
  private async isUserExsit(userId: UserId) {
    return await this.g
      .user(userId)
      .count()
      .toList()
      .then((r) => r[0] === 1);
  }
  async followAPerson(input: FollowAPersonDto) {
    if(!await this.isUserExsit(input.to)) {
      throw new ForbiddenException("被关注用户不存在");
    }
    return await this.g
      .user(input.to)
      .as("to")
      .user(input.from)
      .addE("followed")
      .property("createAt", Date.now())
      .to("to")
      .toList()
      .then((r) => r.length === 0 ? false : true);
  }
  async unFollowAPerson(input: DeleteFollowRelationInput) {
    if(!await this.isUserExsit(input.to)) {
      throw new ForbiddenException("被取消关注的用户不存在");
    }
    return await this.g
      .user(input.to)
      .inE("followed")
      .as("e")
      .outV()
      .user(input.from)
      .select("e")
      .drop()
      .next()
      .then((r) => r.done);
  }

  async addSubject(creator: UserId, input: CreateSubjectInput) {
    const id = hash({ creator, input });
    return await this.g
      .createSubject(id)
      .as('s')
      .property('title', input.title)
      .property('createAt', Date.now())
      .property('subscription', input.subscription)
      .property('background', input.background)
      .property('avatarUrl', input.avatarUrl)
      .user(creator)
      .addE('created_subject')
      .to('s')
      .select('s')
      .filterAllSubjectProps()
      .toList()
      .then(r => objectify<Subject>(r[0]));
  }
  async subject(id: SubjectId) {
    return await this.g
      .subject(id)
      .filterAllSubjectProps()
      .toList()
      .then(r => objectify<Subject>(r[0]));
  }
  async updateSubject(input: UpdateSubjectInput) {
    let u = this.g.subject(input.id);
    for (let props of Object.entries(input)) {
      if (props[0] === "id") continue;
      u = u.property(props[0], props[1]);
    }
    return await u
      .filterAllSubjectProps()
      .toList()
      .then((r) => objectify<Subject>(r[0]));
  }
  async getCreatorOfSubject(id: SubjectId) {
    return await this.g
      .subject(id)
      .in_('created_subject')
      .hasLabel('user')
      .filterAllUserProps()
      .toList()
      .then(r => objectify<User>(r[0]));
  }
  async findASubjectByPostId(id: PostId) {
    return await this.g
      .post(id)
      .out('owned_subject')
      .hasLabel('subject')
      .filterAllSubjectProps()
      .toList()
      .then(r => objectify<Subject>(r[0]));
  }
  async getPostsBySubjectId(id: SubjectId, input: PagingConfigInput) {
    return await this.g
      .subject(id)
      .in_('owned_subject')
      .hasLabel('post')
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllPostProps()
      .toList()
      .then(r => r.map(v => objectify<Post>(v)))
  }
  async getPosts(input: PagingConfigInput) {
    return await this.g
      .v()
      .hasLabel('post')
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllPostProps()
      .toList()
      .then(r => r.map(v => objectify<Post>(v)))
  }
  async getUsersBySubjectId(id: SubjectId, input: PagingConfigInput) {
    return await this.g
      .subject(id)
      .in_('followed_subject')
      .hasLabel('user')
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllUserProps()
      .toList()
      .then(r => r.map(v => objectify<User>(v)))
  }

  async userFollowASubject(l: UserFollowASubjectInput) {
    // TODO 判断主题是否存在
    return await this.g
      .subject(l.to)
      .as('s')
      .user(l.from)
      .addE('followed_subject')
      .property('createAt', Date.now())
      .to('s')
      .select('s')
      .filterAllSubjectProps()
      .toList()
      .then(r => objectify<Subject>(r[0]))
  }
  async findMySubjects(userId: UserId, input: PagingConfigInput) {
    return await this.g
      .user(userId)
      .out('followed_subject')
      .hasLabel('subject')
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllSubjectProps()
      .toList()
      .then(r => r.map(v => objectify<Subject>(v)))
  }
  async getMySubjectCount(userId: UserId) {
    return await this.g
      .user(userId)
      .out('followed_subject')
      .hasLabel('subject')
      .count()
      .next()
      .then(r => r.value)
  }

  async dropAVertex(id: string) {
    return await this.g
      .V(id)
      .drop()
      .next()
      .then((r) => r.done);
  }

  // TODO
  async createAdminer(input: CreateAAdminerDto) {
    const id = hash(input);
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
      `,
      {
        createAt: input.createAt,
        nickName: input.nickName,
        lastLoginAt: input.lastLoginAt,
        action: input.action,
      },
    );
  }
  // TODO 修改管理员权限等属性的函数
  async deleteAdminer(id: UserId) {
    return await exec(
      `
        g.traversal()
          .V("${id}")
          .drop()
      `,
      {},
    );
  }
}
