const express = require('express')

const port = process.env.PORT || 8090

const app = express()

app.set('port', port)
app.use(express.static(`${__dirname}`))

// 定制 404 页面 (返回404状态码)
app.use(function(req, res) {
  const currentTime = new Date()
  res.type('text/plain')
  res.status(404)
  res.send('404 - 你访问的页面可能去了火星\n' + currentTime)
})

// 定制 500 页面 (返回500状态码)
app.use(function(err, req, res, next) {
  const currentTime = new Date()
  const errInfo = err.stack
  res.type('text/plain')
  res.status(500)
  res.send('500 - 服务器发生错误\n' + 'errInfo:' + errInfo + '\n' + 'currentTime:' + currentTime)
})

// 监听服务端口, 保证程序不会退出
app.listen(app.get('port'), function() {
  console.log('Express 服务正在运行在 http://localhost:' + app.get('port') + '; 按 Ctrl-C 关闭服务.')
})
