import { Test } from '@nestjs/testing'
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock'

import { AuthModule } from '../auth/auth.module'
import { JwtStrategy } from '../auth/jwt.strategy'
import { DbService } from '../db/db.service'
import { SharedModule } from '../shared/shared.module'
import { CODE2SESSION_GRANT_TYPE, GENDER, UpdateUserArgs, User } from './models/user.model'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

const moduleMock = new ModuleMocker(global)

describe('UserResolver', () => {
  let userResolver: UserResolver

  const result = new User({
    id: '',
    openId: '',
    name: '',
    userId: '',
    unionId: '',
    gender: GENDER.FEMALE,
    createdAt: '',
    lastLoginedAt: '',
    updatedAt: ''
  })

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserResolver],
      imports: [AuthModule, SharedModule]
    })
      .overrideProvider(JwtStrategy)
      .useValue({})
      .overrideProvider(DbService)
      .useValue({})
      .overrideProvider(UserService)
      .useValue({
        getRandomUserId: jest.fn().mockImplementation(() => 'random_user_id'),
        registerUser: jest.fn().mockImplementation(() => result),
        updateUser: jest.fn().mockImplementation(() => result)
      })
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMock.getMetadata(token) as MockFunctionMetadata<any, any>
          const Mock = moduleMock.generateFromMetadata(mockMetadata)

          return new Mock()
        }
      })
      .compile()
    userResolver = moduleRef.get<UserResolver>(UserResolver)
  })

  describe('register', () => {
    it('should register a new user', async () => {
      const args = {
        userId: '',
        name: '',
        sign: '',
        grantType: CODE2SESSION_GRANT_TYPE.BLANK_SPACE
      }
      expect(await userResolver.register(args)).toBe(result)
    })
  })
  describe('update', () => {
    it('should update a user', async () => {
      const user = result
      const args: UpdateUserArgs = {
        name: 'new name'
      }
      expect(await userResolver.updateUser(user, args)).toBe(result)
    })
  })
})
