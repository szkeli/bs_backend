import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard, IAuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

import { GqlAuthGuard } from './gql.strategy'

@Injectable()
export class RoleAuthGuard implements CanActivate {
  constructor (private readonly reflector: Reflector) {}
  canActivate (context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const noAuth = this.reflector.get<boolean>('no-auth', context.getHandler())
    const guard = RoleAuthGuard.getAuthGuard(noAuth)

    return guard.canActivate(context)
  }

  private static getAuthGuard (noAuth: boolean): IAuthGuard {
    if (noAuth) {
      return new (AuthGuard('local'))()
    } else {
      return new (GqlAuthGuard)()
    }
  }
}
