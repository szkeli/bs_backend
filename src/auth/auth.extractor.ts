import { JwtFromRequestFunction } from 'passport-jwt'

import { SubscriptionParams } from './model/auth.model'

export function subscriptionTokenExtractor (v: SubscriptionParams): JwtFromRequestFunction {
  return _req => {
    return v.authToken
  }
}
