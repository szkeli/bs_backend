import { Test } from '@nestjs/testing'
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock'

import { DbService } from '../db/db.service'
import { UserService } from './user.service'

const moduleMock = new ModuleMocker(global)

describe('UserService', () => {
  let userService: UserService

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserService]
    })
      .overrideProvider(DbService)
      .useValue({})
      .overrideProvider(UserService)
      .useValue({
        getRandomUserId: jest.fn().mockImplementation(() => 'random_user_id')
      })
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMock.getMetadata(token) as MockFunctionMetadata<any, any>
          return new (moduleMock.generateFromMetadata(mockMetadata))()
        }
      })
      .compile()
    userService = moduleRef.get<UserService>(UserService)
  })
  describe('getRandomUserId', () => {
    it('should get random userId', async () => {
      expect(await userService.getRandomUserId()).toBe('random_user_id')
    })
  })
})
