import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

import { PolicyHandler } from './model/auth.model'

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext().req.user
  }
)

export const ROLES_KEY = 'roles'
export const NO_AUTH_KEY = 'no-auth'
export const CHECK_POLICIES_KEY = 'check_policy'
export const MAYBE_AUTH_KEY = 'maybe-auth'
export const NoAuth = () => SetMetadata(NO_AUTH_KEY, true)
export const MaybeAuth = () => SetMetadata(MAYBE_AUTH_KEY, true)
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
export const CheckPolicies = (...handlers: PolicyHandler[]) => SetMetadata(CHECK_POLICIES_KEY, handlers)
