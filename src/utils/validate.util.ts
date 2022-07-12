import * as classTransformer from 'class-transformer'
import { ClassConstructor } from 'class-transformer'
import { validate } from 'class-validator'
import lodash from 'lodash'

export class ValidateUtil {
  private static instance: ValidateUtil
  static getInstance () {
    return this.instance ?? (this.instance = new ValidateUtil())
  }

  async transformAndValidate<U extends ClassConstructor<U>, T>(Class: U, data: T) {
    const obj = classTransformer.plainToInstance<U, T>(Class, data)
    return await this.validate(obj)
  }

  async validate <U extends object>(data: U) {
    const errors = await validate(data)
    console.error({ errors })
    if (errors.length > 0) {
      throw new Error(lodash.values(errors[0].constraints)[0])
    }

    return data
  }
}
