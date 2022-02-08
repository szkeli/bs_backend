import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'
import { AuthGuard } from '@nestjs/passport'

import { CaslAbilityFactory } from '../casl/casl-ability.factory'
import { AppAbility } from '../casl/models/casl.model'
import { CHECK_POLICIES_KEY, MAYBE_AUTH_KEY, NO_AUTH_KEY, ROLES_KEY } from './decorator'
import { PolicyHandler, Role, UserWithRoles } from './model/auth.model'

interface Props {
  roles: Role[]
  maybeAuth: boolean
}

@Injectable()
export class RoleAuthGuard implements CanActivate {
  constructor (
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory
  ) {}

  async canActivate (context: ExecutionContext): Promise<any> {
    const noAuth = this.reflector.get<boolean>(NO_AUTH_KEY, context.getHandler())
    const roles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler()) || [Role.User]
    const policies = this.reflector.get<PolicyHandler[]>(CHECK_POLICIES_KEY, context.getHandler()) || []
    // 请求头有token时，请求用户数据，没有则返回null;
    const maybeAuth = this.reflector.get<boolean>(MAYBE_AUTH_KEY, context.getHandler()) || false

    if (noAuth) return true

    const guard = new (RoleGuard({ roles, maybeAuth }))()

    const canActive = await guard.canActivate(context)

    const ctx = GqlExecutionContext.create(context)
    const { user } = ctx.getContext().req as unknown as { user: UserWithRoles }

    const ability = this.caslAbilityFactory.createForAdminAndUser(user)
    const hasAccess = policies.every(handler => this.execPolicyHandler(handler, ability))

    if (!hasAccess) throw new UnauthorizedException('权限不足')

    return canActive
  }

  private execPolicyHandler (handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') return handler(ability)
    return handler.handle(ability)
  }
}

export const RoleGuard = ({ roles, maybeAuth }: Props) => {
  return class GqlAuthGuard extends AuthGuard('jwt') {
    getRequest (context: ExecutionContext) {
      const ctx = GqlExecutionContext.create(context)
      return ctx?.getContext()?.req
    }

    handleRequest<TUser = any>(err: any, user: (UserWithRoles | null), info: any, context: any, status?: any): TUser {
      if (err) throw err
      if (!user && !maybeAuth) throw new UnauthorizedException('Not authorized')
      if (!user && maybeAuth) return null
      const notIncludes = roles.filter(r => !user.roles.includes(r))
      if (notIncludes.length === roles.length) {
        throw new UnauthorizedException(`${user.id} not in [${notIncludes.toString()}] roles.`)
      }

      return user as unknown as any
    }
  }
}
