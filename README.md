# NChat
```
Cli chat service, support multi-room chat.
命令行聊天服务, 支持多房间交流.
```

---

## 下载与安装

``` bash
git clone https://github.com/natuie/NChat.git

cd NChat

npm install
```


### 命令的使用
nchat可以在任何一台设备通过连接服务端即可通信。

```
使用: npm run nchat [操作符]

操作符:
  --server 启动 NChat 服务器
  --url    目标 NChat 服务器 url
  --port   目标 NChat 服务器端口
  -n       为当前用户添加用户名
  -id      要添加的房间号，如果不存在则创建
  -p       加入房间时需要提供的密码，创建房间时设置密码
  -f       向当前房间的所有用户发送文件
  --encryption <on|off>     启用或禁用消息加密（默认: on）
  --max-reconnect <number>  最大重连尝试次数（默认: 10）
  --reconnect-interval <ms> 重连间隔时间（默认: 3000ms）
  --no-auto-reconnect      禁用自动重连
  --log-level <level>      设置日志级别（可选: debug|info|warn|error，默认: info）
  -v       获取软件包信息
  --help   获取帮助信息

实例: 
# 基本用法
npm run nchat --url 127.0.0.1 --port 2428 -n name -id 2428 -p nchat

# 在本地上--url与--port可省略
npm run nchat -n name -id 2428

# 禁用加密并设置重连参数
npm run nchat -n name -id 2428 --encryption off --max-reconnect 5 --reconnect-interval 5000

# 禁用自动重连并设置日志级别
npm run nchat -n name -id 2428 --no-auto-reconnect --log-level debug

# 启动NChat服务器
npm run serve

# 懒人专用，直接什么参数不带，全默认，但是部署服务器必须写URL
npm run nchat
```

### NChat TUI 快捷键
首先需要按 `ESC` 才能按下面的快捷键。
- Ctrl + A : 切换聊天模式和命令模式。
- Ctrl + Enter : 换行
- Tab : 切换焦点（在聊天框、用户列表和输入框之间）。
- Ctrl + C : 退出程序。

切换到对应窗口按上下按键滚动

### NChat TUI 指令
需要在命令模式才能使用。
- /help : 显示可用命令的帮助信息。
- /send <文件路径> : 发送文件到当前房间的所有用户。
- /list : 显示可接收的文件列表。
- /receive <文件编号> : 接收指定编号的文件。
- /mode : 切换聊天模式和命令模式。
- /encrypt <on|off> : 开启或关闭端到端加密。
- /kill <用户ID> : 踢出指定用户（仅房主可用）。
- /exit : 退出程序


### 功能介绍

<details>
  <summary>目前已开发功能</summary>

1.0(2022-7-23)

1.  多用户聊天
2.  支持创建房间

1.1.2(2022-8-27)

1.  增加通过参数指定URL:PORT来访问服务端
2.  增加加入房间密码

2.3.22(2024-5-26)
1.  文件传输（目前只支持小文件，普通的文本）
2.  增加快速安装脚本，以及添加2个二进制文件

2.0.1-alpha(2025-3-23)
1.  增加通信加密
2.  增加自动重连
3.  增加TUI界面
4. 重写文件传输，但是只能传输小文件，不然json会炸
5. 增加了命令行模式
6. 支持房主踢人功能
7. 美化输出
8. 取消了单一客户端与服务端文件来执行，改为通过一个主文件来选择执行
9. 修复了客户端断开链接，服务器也会挂问题
10. 修复了已知BUG
注意：这个版本并不完善，可能有bug，很多东西我都还没搞，但是可以使用，下次再更新，或许几年后。
</details>