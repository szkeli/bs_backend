import * as gremlin from 'gremlin'

import { CommentId } from 'src/comment/models/comment.model'
import { CreateAPostInput } from 'src/posts/models/post.model'
import { SubjectId, UpdateSubjectInput } from 'src/subject/model/subject.model'
import { ORDERBY, UserRegisterInput } from 'src/user/models/user.model'

import { CreateUserDto, PostId, UserId } from './model/db.model'
const T = gremlin.process.t
const __ = gremlin.process.statics

export class SocialTraversal extends gremlin.process.GraphTraversal {
  // constructor (
  //   graph: gremlin.structure.Graph,
  //   traversalStrategies: gremlin.process.TraversalStrategies,
  //   bytecode: gremlin.process.Bytecode
  // ) {
  //   super(graph, traversalStrategies, bytecode)
  // }

  aged (age: number) {
    return this.has('user', 'age', age)
  }

  filterAllUserProps () {
    return this
      .project(
        'id',
        'userId',
        'nickName',
        'openId',
        'unionId',
        'gender',
        'createAt',
        'lastLoginAt',
        'avatarUrl',
        'school',
        'grade',
        'sign'
      )
      .by(T.id)
      .by('userId')
      .by('nickName')
      .by('openId')
      .by('unionId')
      .by('gender')
      .by('createAt')
      .by('lastLoginAt')
      .by('avatarUrl')
      .by('school')
      .by('grade')
      .by('sign')
  }

  updateUserProps (user: CreateUserDto) {
    return this
      .property('createAt', user.createAt)
      .property('nickName', user.nickName)
      .property('lastLoginAt', user.lastLoginAt)
      .property('unionId', user.unionId)
      .property('openId', user.openId)
      .property('school', user.school)
      .property('grade', user.grade)
      .property('gender', user.gender)
      .property('avatarUrl', user.avatarUrl)
  }

  updateSubjectProps (subjectPatch: UpdateSubjectInput) {
    return this.property
  }

  registerUserProps (userPatch: UserRegisterInput) {
    const t = Date.now()
    return this
      .property('userId', userPatch.userId)
      .property('unionId', userPatch.unionId)
      .property('openId', userPatch.openId)
      .property('avatarUrl', userPatch.avatarUrl)
      .property('nickName', userPatch.nickName)
      .property('createAt', t)
      .property('lastLoginAt', t)
      .property('sign', userPatch.sign)
      .property('school', userPatch.school)
      .property('grade', userPatch.grade)
      .property('gender', userPatch.gender)
  }

  filterAllPostProps () {
    return this
      .project(
        'id',
        'title',
        'content',
        'createAt',
        'voteCount',
        'commentCount'
      )
      .by(T.id)
      .by('title')
      .by('content')
      .by('createAt')
      .by(__.in_('voted_post').hasLabel('user').count())
      .by(__.in_('owned').hasLabel('comment').count())
  }

  createAtNow () {
    return this.property('createAt', Date.now())
  }

  user (userId: UserId) {
    return this.V()
      .hasLabel('user')
      .has('userId', userId)
  }

  post (postId: PostId) {
    return this.V(postId)
  }

  subject (subjectId: SubjectId) {
    return this.V(subjectId).hasLabel('subject')
  }

  updatePostProps (post: CreateAPostInput) {
    return this
      .property('title', post.title)
      .property('content', post.content)
      .property('createAt', Date.now())
  }

  filterAllCommentProps () {
    return this
      .project(
        'id',
        'content',
        'createAt',
        'voteCount',
        'commentCount'
      )
      .by(T.id)
      .by('content')
      .by('createAt')
      .by(__.in_('voted_comment').hasLabel('user').count())
      .by(__.in_('commented').hasLabel('comment').count())
  }

  filterAllSubjectProps () {
    return this
      .project(
        'id',
        'title',
        'createAt',
        'subscription',
        'background',
        'avatarUrl'
      )
      .by(T.id)
      .by('title')
      .by('createAt')
      .by('subscription')
      .by('background')
      .by('avatarUrl')
  }
}

export class SocialTraversalSource extends gremlin.process.GraphTraversalSource {
  constructor (
    graph: gremlin.structure.Graph,
    traversalStrategies: gremlin.process.TraversalStrategies,
    bytecode: gremlin.process.Bytecode
  ) {
    super(graph, traversalStrategies, bytecode, SocialTraversalSource, SocialTraversal)
  }

  createUser () {
    return this.addV('user') as unknown as SocialTraversal
  }

  createPost (id: PostId) {
    return this.addV('post')
      .property(T.id, id) as unknown as SocialTraversal
  }

  createComment (id: CommentId) {
    return this.addV('comment')
      .property(T.id, id) as unknown as SocialTraversal
  }

  createSubject (id: SubjectId) {
    return this.addV('subject')
      .property(T.id, id) as unknown as SocialTraversal
  }

  userWithAllProps (id: UserId) {
    return this.user(id)
      .project(
        'id',
        'nickName',
        'openId',
        'unionId',
        'gender',
        'createAt',
        'lastLoginAt',
        'avatarUrl',
        'school',
        'grade'
      )
      .by(T.id)
      .by('nickName')
      .by('openId')
      .by('unionId')
      .by('gender')
      .by('createAt')
      .by('lastLoginAt')
      .by('avatarUrl')
      .by('school')
      .by('grade') as unknown as SocialTraversal
  }

  user (userId: UserId) {
    return this.V()
      .hasLabel('user')
      .has('userId', userId) as unknown as SocialTraversal
    // return this.V(id) as unknown as SocialTraversal
  }

  post (id: PostId) {
    return this.V(id) as unknown as SocialTraversal
  }

  comment (id: CommentId) {
    return this.V(id) as unknown as SocialTraversal
  }

  subject (id: SubjectId) {
    return this.V(id).hasLabel('subject') as unknown as SocialTraversal
  }

  orderBy (orderBy: ORDERBY) {
    return orderBy === ORDERBY.DESC
      ? gremlin.process.order.desc
      : orderBy === ORDERBY.ASC
        ? gremlin.process.order.asc
        : orderBy === ORDERBY.SHUFFLE
          ? gremlin.process.order.shuffle
          : gremlin.process.order.desc
  }

  v (id?: any) {
    if (id) { return this.V(id) as unknown as SocialTraversal } else return this.V() as unknown as SocialTraversal
  }
}

export function anonymous () {
  const Bytecode = gremlin.process.Bytecode
  return new SocialTraversal(null, null, new Bytecode())
}

export function aged (age: number) {
  return anonymous().aged(age)
}

export function objectify<T> (u: any) {
  const v = new Map(u as unknown as Map<string, string>)
  return Object.fromEntries<string>(v.entries()) as unknown as T
}
