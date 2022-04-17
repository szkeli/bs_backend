import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { Person, User } from '../user/models/user.model'
import { PolicyHandler } from './model/auth.model'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext()?.req?.user as User
  }
)

export const CurrentPerson = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext()?.req?.user as Person
  }
)

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext()?.req?.user as Admin
  }
)

export const ROLES_KEY = 'roles'
export const NO_AUTH_KEY = 'no-auth'
export const CHECK_POLICIES_KEY = 'check_policy'
export const MAYBE_AUTH_KEY = 'maybe-auth'

/**
 * 不要求检验token
 */
export const NoAuth = () => SetMetadata(NO_AUTH_KEY, true)
/**
 * authorization中存在token时会获取用户信息
 */
export const MaybeAuth = () => SetMetadata(MAYBE_AUTH_KEY, true)
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
export const CheckPolicies = (...handlers: PolicyHandler[]) => SetMetadata(CHECK_POLICIES_KEY, handlers)

export enum Role {
  User = 'User',
  Admin = 'Admin',
  None = 'None'
}
