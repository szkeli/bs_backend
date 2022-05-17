import { registerEnumType } from '@nestjs/graphql'

export enum TASK_TYPE {
  GM = 'GM',
  GF = 'GF'
}

registerEnumType(TASK_TYPE, {
  name: 'TASK_TYPE',
  valuesMap: {
    GM: {
      description: '早上8点的提醒'
    },
    GF: {
      description: '晚上10点的提醒'
    }
  }
})
