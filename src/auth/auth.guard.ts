import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'
import { AuthGuard } from '@nestjs/passport'
import { memoize } from '@nestjs/passport/dist/utils/memoize.util'
import { Observable } from 'rxjs'

import { NO_AUTH_KEY, ROLES_KEY } from './decorator'
import { Role, UserWithRoles } from './model/auth.model'

@Injectable()
export class RoleAuthGuard implements CanActivate {
  constructor (private readonly reflector: Reflector) {}
  canActivate (context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const noAuth = this.reflector.get<boolean>(NO_AUTH_KEY, context.getHandler())
    const roles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler())
    if (noAuth) return true

    const guard = new (RoleGuard(roles || [Role.User]))()
    return guard.canActivate(context)
  }
}

export const RoleGuard = memoize((roles: Role[]) => {
  return class JwtAuthGuard extends AuthGuard('jwt') {
    getRequest (context: ExecutionContext) {
      const ctx = GqlExecutionContext.create(context)
      return ctx.getContext().req
    }

    handleRequest<TUser = any>(err: any, user: (UserWithRoles | null), info: any, context: any, status?: any): TUser {
      if (err) throw err
      if (!user) throw new UnauthorizedException('Not authorized')

      const notIncludes = roles.filter(r => !user.roles.includes(r))
      if (notIncludes.length !== 0) {
        throw new UnauthorizedException(`${user.id} not in [${notIncludes.toString()}] roles.`)
      }
      // const isAdmin = roles
      //   .filter(v => user.roles.includes(v))
      //   .includes(Role.Admin)

      // if (!isAdmin) throw new UnauthorizedException(` ${user.id} 不是管理员`)

      return user as unknown as any
    }
  }
})
