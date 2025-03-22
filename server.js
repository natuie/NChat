// 加载net模块
const net = require("net");
// 加载时间模块
var moment = require('moment');
// 加载颜色模块
const chalk = require('chalk');

/**
 * 启动服务器
 * @param {number} port - 服务器监听端口
 */
function startServer(port) {
    // 创建net实例对象
    var server = net.createServer();
    // 保存所有客户的socket对象
    var users = [];
    // 保存所有房间ID
    var homeIDs = Array();
    // 保存所有房间配置
    var homeConfigs = Array();
    // 保存所有房间用户信息
    var userList = Array();


    // 计算数组总数,不计空数组
    function count_array_num(array) {
        var num = 0;
        for (let i = 0; i < array.length; i++) {
            if (array[i] != undefined || array[i] != null) {
                num++;
            }
        }
        return num;
    }
    // 建立监听
        server.listen(port, function () {
            console.log(chalk.green('Starting NChat server...'));
            console.log(chalk.blue(`http://127.0.0.1:${port}`));
            console.log('');
        });

    server.on('connection', function (socket) {
        // 客户端发送的数据
        var client_data;

        // 将加入聊天室的用户加入至数组
        users.push(socket);

        socket.on('data', function (data) {
            client_data = JSON.parse(data);
            // 房间用户初始化
            if (count_array_num(homeIDs) == 0) {
                homeConfigs[client_data.homeID] = { password: client_data.password };
            }
            if (!Array.isArray(homeIDs[client_data.homeID])) {
                homeIDs[client_data.homeID] = [];
            }

            // 昵称为空判断
            if (client_data.username == null) {
                //为空则初始化昵称
                client_data.username = "user_" + socket.remotePort;
            }

            // 加入房间
            var isExist = 0; // o: false , 1: true
            for (var i = 0; i < homeIDs[client_data.homeID].length; i++) {
                // 用户加入判断
                if (homeIDs[client_data.homeID][i] != undefined && homeIDs[client_data.homeID][i].remotePort == socket.remotePort) {
                    isExist = 1;
                    break;
                }
            }

            // 如果用户没有加入房间则加入
            if (isExist == 0) {
                if (homeIDs.length != 0 && homeConfigs[client_data.homeID].password != null && client_data.password !== homeConfigs[client_data.homeID].password) {
                    socket.write(JSON.stringify({ code: 200, message: "密码错误！" }));
                    return;
                }
                homeIDs[client_data.homeID].push(socket);
                
                // 初始化房间的用户列表数组
                if (!Array.isArray(userList[client_data.homeID])) {
                    userList[client_data.homeID] = [];
                }
                
                // 添加用户到用户列表
                userList[client_data.homeID].push({
                    name: client_data.username,
                    id: socket.remotePort,
                    publicKey: client_data.publicKey // 保存用户公钥
                });
                
                var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                console.log(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' join ' + client_data.homeID + ' home(Online num: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
                
                // 发送消息给所有房间用户
                var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                for (var j = 0; j < homeIDs[client_data.homeID].length; j++) {
                    if (homeIDs[client_data.homeID][j] != undefined) {
                        if (homeIDs[client_data.homeID][j] != socket) {
                            // 给其他用户发送加入消息和用户列表
                            var joinMessage = time + ' ' + client_data.username + '(' + socket.remotePort + ')' + '加入了 ' + client_data.homeID + ' 房间(在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')';
                            homeIDs[client_data.homeID][j].write(JSON.stringify({ 
                                code: 200, 
                                message: joinMessage,
                                userList: userList[client_data.homeID]
                            }));
                        } else {
                            // 给当前用户发送成功加入消息和用户列表
                            var successMessage = '加入 ' + client_data.homeID + ' 房间成功! (在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')';
                            socket.write(JSON.stringify({ 
                                code: 1, 
                                message: successMessage,
                                userList: userList[client_data.homeID]
                            }));
                        }
                    }
                }
            }


            if (client_data.message !== undefined) {
                var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                 // 如果消息是加密的，转发时保持加密状态
                 const messageToSend = {
                    code: 200,
                    message: client_data.message,
                    time: time,
                    sender: client_data.username,
                    encrypted: client_data.encrypted,
                    peerId: socket.remotePort
                };

                for (var k = 0; k < homeIDs[client_data.homeID].length; k++) {
                    if (homeIDs[client_data.homeID][k] != undefined && homeIDs[client_data.homeID][k] != socket) {
                        var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                        homeIDs[client_data.homeID][k].write(JSON.stringify(messageToSend));
                    }
                }
            }

            // 处理踢出用户命令
            if (client_data.command === 'kill' && client_data.targetUserId) {
                // 检查是否为房主（第一个加入房间的用户）
                if (homeIDs[client_data.homeID] && homeIDs[client_data.homeID].length > 0 && 
                    homeIDs[client_data.homeID][0] === socket) {
                    
                    // 查找目标用户
                    const targetUserId = parseInt(client_data.targetUserId);
                    let targetSocket = null;
                    let targetIndex = -1;
                    
                    for (let i = 0; i < homeIDs[client_data.homeID].length; i++) {
                        if (homeIDs[client_data.homeID][i] && 
                            homeIDs[client_data.homeID][i].remotePort === targetUserId) {
                            targetSocket = homeIDs[client_data.homeID][i];
                            targetIndex = i;
                            break;
                        }
                    }
                    
                    if (targetSocket) {
                        // 通知所有用户有人被踢出
                        const targetUser = userList[client_data.homeID].find(u => u.id === targetUserId);
                        const kickMessage = `${client_data.username} 将用户 ${targetUser ? targetUser.name : '未知用户'} 踢出了房间`;
                        
                        for (let i = 0; i < homeIDs[client_data.homeID].length; i++) {
                            if (homeIDs[client_data.homeID][i] && homeIDs[client_data.homeID][i] !== targetSocket) {
                                homeIDs[client_data.homeID][i].write(JSON.stringify({
                                    code: 200,
                                    message: kickMessage
                                }));
                            }
                        }
                        
                        // 通知被踢出的用户
                        targetSocket.write(JSON.stringify({
                            code: 403,
                            message: `你被房主 ${client_data.username} 踢出了房间`
                        }));
                        
                        // 关闭被踢出用户的连接
                        targetSocket.end();
                    }
                } else {
                    // 非房主尝试踢人，发送错误消息
                    socket.write(JSON.stringify({
                        code: 403,
                        message: '只有房主才能踢出其他用户'
                    }));
                }
            }
            
            // 处理文件传输
            if (client_data.file && client_data.fileName) {
                var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                console.log(chalk.cyan(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' 发送文件: ' + client_data.fileName));
                
                // 将文件数据转换为Buffer
                let fileBuffer;
                if (typeof client_data.file === 'string') {
                    // 如果是Base64编码的字符串，转换为Buffer
                    fileBuffer = Buffer.from(client_data.file, 'base64');
                } else if (Buffer.isBuffer(client_data.file)) {
                    // 如果已经是Buffer，直接使用
                    fileBuffer = client_data.file;
                } else {
                    console.error(chalk.red('无效的文件格式'));
                    return;
                }
                
                // 转发文件给房间内的其他用户
                for (var k = 0; k < homeIDs[client_data.homeID].length; k++) {
                    if (homeIDs[client_data.homeID][k] != undefined && homeIDs[client_data.homeID][k] != socket) {
                        const fileData = {
                            code: 200,
                            message: chalk.cyan(time + '\n' + client_data.username + ' 发送了文件: ' + client_data.fileName),
                            file: fileBuffer.toString('base64'),
                            fileName: client_data.fileName,
                            sender: client_data.username,
                            fileSize: fileBuffer.length,
                            fileId: Date.now().toString(),
                            encryptedKey: client_data.encryptedKey, // 添加加密密钥
                            encrypted: client_data.encrypted // 标记是否加密
                        };
                        homeIDs[client_data.homeID][k].write(JSON.stringify(fileData));
                    }
                }
            }
        })

        // 用户退出调用
        socket.on('close', function (err) {
            var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
            console.log(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' exit ' + client_data.homeID + ' home(Online num: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
            
            // 从用户列表中移除退出的用户
            if (userList[client_data.homeID]) {
                userList[client_data.homeID] = userList[client_data.homeID].filter(user => user.id !== socket.remotePort);
            }

            // 删除房间里面的退出去的用户
            for (var j = 0; j < homeIDs[client_data.homeID].length; j++) {
                if (homeIDs[client_data.homeID][j] == socket) {
                    delete homeIDs[client_data.homeID][j];
                }
            }

            for (var j = 0; j < homeIDs[client_data.homeID].length; j++) {
                if (homeIDs[client_data.homeID][j] != undefined) {
                    // 发送退出信息和更新后的用户列表给其他用户
                    homeIDs[client_data.homeID][j].write(JSON.stringify({ 
                        code: 200, 
                        message: time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' 退出了 ' + client_data.homeID + ' 房间(在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')',
                        userList: userList[client_data.homeID]
                    }));
                }
            }

            users.forEach(function (uesr) {
                // 删除退出去的总用户
                for (var k = 0; k < users.length; k++) {
                    if (users[k] == socket) {
                        delete users[k];
                    }
                }
            });

            // 房间没人自动解散房间
            if (count_array_num(homeIDs[client_data.homeID]) === 0) {
                homeIDs[client_data.homeID] = undefined;
                homeConfigs[client_data.homeID] = undefined;
                userList[client_data.homeID] = undefined;
            }
        })

        // 服务器异常
        socket.on('error', function (error) {
            console.error(chalk.red("Server error: " + error.message));
        })

    })
}

module.exports = {
    startServer
};