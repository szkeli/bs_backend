import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { AuthGuard } from '@nestjs/passport'

import { Role, UserWithRoles } from 'src/auth/model/auth.model'

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest (context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext().req
  }
}

@Injectable()
export class GqlAdminAuthGuard extends GqlAuthGuard {
  handleRequest<TUser = any>(err: any, user: (UserWithRoles | null), info: any, context: any, status?: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException()
    }
    if (!user.roles.includes(Role.Admin)) {
      throw err || new UnauthorizedException(`${user.id} 不是管理员`)
    }
    return user as unknown as any
  }
}

// export const RoleGuard = memoize((role: string) => {
//   return class JwtAuthGuard extends AuthGuard('jwt') {
//     getRequest (context: ExecutionContext) {
//       const ctx = GqlExecutionContext.create(context)
//       return ctx.getContext().req
//     }

//     handleRequest<TUser = any>(err: any, user: any, info: any, context: any, status?: any): TUser {
//       if (err) throw err
//       if (!user) throw new UnauthorizedException('Not authorized')
//       if (!user.roles.includes(role)) throw new UnauthorizedException('Role error')

//       return user
//     }
//   }
// })
