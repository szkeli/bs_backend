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
