import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext().req.user
  }
)

export const CurrentJwtToken = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext().req.header('authorization')
  }
)

export const NoAuth = () => SetMetadata('no-auth', true)
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)

export const ROLES_KEY = 'roles'
export const NO_AUTH_KEY = 'no-auth'
