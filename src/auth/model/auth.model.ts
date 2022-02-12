import { AppAbility } from '../../casl/models/casl.model'
import { ICredential } from '../../credentials/models/credentials.model'
import { Privilege } from '../../privileges/models/privileges.model'
import { User } from '../../user/models/user.model'

export interface Payload {
  id: string
  roles: Role[]
}

export enum Role {
  User = 'User',
  Admin = 'Admin',
  None = 'None'
}

export interface InviteTokenPayload {
  id: string
}

export type UserWithRoles = User & {
  roles: Role[]
}
export type UserWithRolesAndPrivileges = UserWithRoles & {
  privileges: Privilege[]
}

export type UserWithRolesAndPrivilegesAndCredential = UserWithRolesAndPrivileges & {
  credential: ICredential
}

export interface IPolicyHandler {
  handle: (ability: AppAbility) => boolean
}

type PolicyHandlerCallback = (ability: AppAbility) => boolean

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback
