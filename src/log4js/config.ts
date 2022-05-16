export default {
  appenders: {
    log: {
      type: 'dateFile', // 如果需要区分日期的，这个值可以改为dateFile
      filename: './logs/log.log',
      maxLogSize: 1024 * 1024 * 50, // 日志文件的大小，我这里配置的是50M
      encoding: 'utf-8',
      backups: 100,
      compress: false, // 如果需要压缩，这个值改为true,是的话，这里会得到.gz格式的日志
      keepFileExt: true, // 是否保持文件扩展名，不是的话，会成.1,.2,.3这样的日志文件
      layout: {
        type: 'messagePassThrough' // 是直接跳过头部生成，我这里已经有自定义的头部生成, 所以就不需要这个了
      }
    },
    err: {
      type: 'dateFile',
      filename: './logs/err.log',
      maxLogSize: 1024 * 1024 * 50,
      encoding: 'utf-8',
      backups: 100,
      compress: true,
      keepFileExt: true,
      layout: {
        type: 'messagePassThrough'
      }
    },
    console: {
      type: 'stdout', // 使用标准输出，会比console的性能高
      layout: { type: 'messagePassThrough' }
    }
  },
  categories: {
    default: { appenders: ['log'], level: 'ALL' },
    error: { appenders: ['err'], level: 'ALL' },
    console: { appenders: ['console'], level: 'ALL' }
  }
}
