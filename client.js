const blessed = require('blessed');
const moment = require('moment');
const net = require('net');
const fs = require('fs');
const CryptoManager = require('./crypto');

/**
 * 启动TUI客户端
 * @param {Object} config - 客户端配置
 */
function startTUIClient(config) {
    // 初始化加密管理器
    const cryptoManager = new CryptoManager();
    // 加密模式 - 'on'开启加密, 'off'关闭加密
    let encryptionMode = 'on';
    // 创建屏幕对象
    const screen = blessed.screen({
        smartCSR: true,
        title: 'NChat - 文本聊天界面',
        dockBorders: true,
        fullUnicode: true
    });

    // 创建聊天区域框
    const chatBox = blessed.box({
        name: 'chatBox',
        top: 0,
        left: 0,
        width: '70%',
        height: '80%',
        label: ` 聊天室${encryptionMode === 'on' ? '(加密)' : ''} #${config.homeID} `,
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: 'blue'
            }
        },
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            bg: 'blue'
        }
    });

    // 创建用户列表框
    const userListBox = blessed.box({
        name: 'userListBox',
        top: 0,
        right: 0,
        width: '30%',
        height: '80%',
        label: ' 在线用户 ',
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: 'green'
            }
        },
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            bg: 'green'
        }
    });

    // 创建输入框
    const inputBox = blessed.textarea({
        name: 'inputBox',
        bottom: 0,
        left: 0,
        height: '20%',
        width: '100%',
        label: ' 输入消息 ',
        inputOnFocus: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: 'red'
            },
            focus: {
                border: {
                    fg: 'yellow'
                }
            }
        }
    });

    // 添加组件到屏幕
    screen.append(chatBox);
    screen.append(userListBox);
    screen.append(inputBox);

    // 设置初始焦点
    inputBox.focus();

    // 用户列表
    let onlineUsers = [];

    // 文件列表 - 用于接收文件时选择
    let pendingFiles = [];

    // 当前模式 - 'chat'聊天模式, 'command'命令模式
    let currentMode = 'chat';

    // 当前焦点元素
    let focusedElement = 'inputBox';

    // 发送数据的实体
    const data = {
        username: config.username,
        homeID: config.homeID,
        password: config.password,
        message: undefined,
        file: undefined,
        fileName: undefined,
        publicKey: cryptoManager.getPublicKey(), // 添加公钥，只在首次连接时发送
        encrypted: false, // 标记消息是否加密
        encryptedKey: undefined // 用于文件加密的密钥
    };
    
    // 创建不包含公钥的消息数据对象（用于后续消息发送）
    const messageData = {
        username: config.username,
        homeID: config.homeID,
        message: undefined,
        file: undefined,
        fileName: undefined,
        encrypted: false,
        encryptedKey: undefined
    };

    // 标记是否为房主（第一个加入房间的用户）
    let isRoomOwner = false;

    // 创建连接
    const socket = net.createConnection({
        host: config.host,
        port: config.port
    });

    // 添加消息到聊天框
    function addMessage(message, type = 'normal') {
        let formattedMessage = '';

        switch (type) {
            case 'system':
                formattedMessage = `{yellow-fg}${message}{/yellow-fg}`;
                break;
            case 'error':
                formattedMessage = `{red-fg}${message}{/red-fg}`;
                break;
            case 'success':
                formattedMessage = `{green-fg}${message}{/green-fg}`;
                break;
            case 'self':
                formattedMessage = `{cyan-fg}${message}{/cyan-fg}`;
                break;
            default:
                formattedMessage = message;
        }

        chatBox.pushLine(formattedMessage);
        chatBox.setScrollPerc(100);
        screen.render();
    }

    // 更新用户列表
    function updateUserList() {
        userListBox.setContent('');
        userListBox.pushLine(`{green-fg}总在线人数: ${onlineUsers.length}{/green-fg}`);
        userListBox.pushLine('');

        if (onlineUsers && onlineUsers.length > 0) {
            onlineUsers.forEach(user => {
                if (user) {
                    userListBox.pushLine(` • ${user.name} ${user.id ? `(${user.id})` : ''}`);
                }
            });
        } else {
            userListBox.pushLine('{gray-fg}暂无在线用户{/gray-fg}');
        }

        screen.render();
    }

    // 处理命令
    function processCommand(cmd) {
        const args = cmd.split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case '/help':
                addMessage('可用命令:', 'system');
                addMessage('/help - 显示帮助信息', 'system');
                addMessage('/send <文件路径> - 发送文件', 'system');
                addMessage('/list - 显示可接收的文件', 'system');
                addMessage('/receive <文件编号> - 接收文件', 'system');
                addMessage('/mode - 切换聊天/命令模式', 'system');
                addMessage('/encrypt <on|off> - 开启/关闭端到端加密', 'system');
                if (isRoomOwner) {
                    addMessage('/kill <用户ID> - 踢出指定用户 (仅房主可用)', 'system');
                }
                addMessage('/exit - 退出程序', 'system');
                break;

            case '/send':
                if (args.length < 2) {
                    addMessage('用法: /send <文件路径>', 'error');
                    return;
                }
                // 实现文件发送逻辑
                const filePath = args[1];
                try {
                    // 检查文件是否存在
                    if (!fs.existsSync(filePath)) {
                        addMessage(`文件不存在: ${filePath}`, 'error');
                        return;
                    }

                    // 读取文件内容
                    const fileContent = fs.readFileSync(filePath);
                    // 转换为Base64编码
                    const fileBase64 = fileContent.toString('base64');
                    // 获取文件名
                    const fileName = filePath.split(/[\\/]/).pop();

                    // 设置文件数据 - 使用不包含公钥的messageData
                    messageData.fileName = fileName;

                    // 检查是否需要加密文件
                    if (encryptionMode === 'on' && onlineUsers.length > 0) {
                        // 为每个用户加密文件
                        for (const user of onlineUsers) {
                            if (user.id !== socket.localPort && user.publicKey) {
                                try {
                                    // 加密文件
                                    const encryptedResult = cryptoManager.encryptFile(fileContent, user.id);
                                    
                                    // 发送加密文件
                                    const encryptedData = {
                                        ...messageData,
                                        file: encryptedResult.encryptedFile,
                                        encryptedKey: encryptedResult.encryptedKey,
                                        encrypted: true,
                                        peerId: user.id
                                    };
                                    socket.write(JSON.stringify(encryptedData));
                                } catch (err) {
                                    addMessage(`文件加密失败: ${err.message}`, 'error');
                                }
                            }
                        }
                        addMessage(`准备发送文件: ${fileName} (${(fileContent.length / 1024).toFixed(2)} KB) [已加密]`, 'system');
                    } else {
                        // 发送未加密文件
                        messageData.file = fileBase64;
                        messageData.encrypted = false;
                        addMessage(`准备发送文件: ${fileName} (${(fileContent.length / 1024).toFixed(2)} KB)`, 'system');
                        socket.write(JSON.stringify(messageData));
                    }

                    addMessage('文件发送完成！', 'success');

                    // 清空文件数据，避免重复发送
                    messageData.file = undefined;
                    messageData.fileName = undefined;
                } catch (err) {
                    addMessage(`文件发送失败: ${err.message}`, 'error');
                }
                break;

            case '/list':
                if (pendingFiles.length === 0) {
                    addMessage('没有待接收的文件', 'system');
                } else {
                    addMessage('可接收的文件:', 'system');
                    pendingFiles.forEach((file, index) => {
                        addMessage(`${index}: ${file.name} (来自 ${file.sender})`, 'system');
                    });
                }
                break;

            case '/receive':
                if (args.length < 2) {
                    addMessage('用法: /receive <文件编号>', 'error');
                    return;
                }
                const fileIndex = parseInt(args[1]);
                if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= pendingFiles.length) {
                    addMessage('无效的文件编号', 'error');
                    return;
                }

                // 实现文件接收逻辑
                const fileToReceive = pendingFiles[fileIndex];
                addMessage(`接收文件: ${fileToReceive.name}`, 'system');

                // 创建downloads目录（如果不存在）
                const downloadDir = './downloads';
                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir);
                }

                // 生成保存路径
                const savePath = `${downloadDir}/${fileToReceive.name}`;

                // 将Base64转换回二进制并保存
                try {
                    const fileBuffer = Buffer.from(fileToReceive.data, 'base64');
                    fs.writeFileSync(savePath, fileBuffer);
                    addMessage(`文件已保存至: ${savePath}`, 'success');

                    // 从待接收列表中移除
                    pendingFiles.splice(fileIndex, 1);
                } catch (err) {
                    addMessage(`文件保存失败: ${err.message}`, 'error');
                }
                break;

            case '/mode':
                currentMode = currentMode === 'chat' ? 'command' : 'chat';
                addMessage(`已切换到${currentMode === 'chat' ? '聊天' : '命令'}模式`, 'system');
                break;

            case '/encrypt':
                if (args.length < 2) {
                    addMessage('用法: /encrypt <on|off>', 'error');
                    return;
                }

                const encryptOption = args[1].toLowerCase();
                if (encryptOption === 'on') {
                    encryptionMode = 'on';
                    // 更新聊天室标题
                    chatBox.setLabel(` 聊天室(加密) #${config.homeID} `);
                    addMessage('已开启端到端加密', 'success');
                } else if (encryptOption === 'off') {
                    encryptionMode = 'off';
                    // 更新聊天室标题
                    chatBox.setLabel(` 聊天室 #${config.homeID} `);
                    addMessage('已关闭端到端加密', 'success');
                } else {
                    addMessage('无效的选项，请使用 on 或 off', 'error');
                }
                screen.render();
                break;

            case '/kill':
                if (!isRoomOwner) {
                    addMessage('只有房主才能执行此命令', 'error');
                    return;
                }

                if (args.length < 2) {
                    addMessage('用法: /kill <用户ID>', 'error');
                    return;
                }

                const targetUserId = args[1];
                // 检查用户是否存在
                const targetUser = onlineUsers.find(user => user.id.toString() === targetUserId);
                if (!targetUser) {
                    addMessage(`未找到ID为 ${targetUserId} 的用户`, 'error');
                    return;
                }

                // 发送踢出用户的命令
                socket.write(JSON.stringify({
                    username: config.username,
                    homeID: config.homeID,
                    command: 'kill',
                    targetUserId: targetUserId
                }));

                addMessage(`已发送踢出用户 ${targetUser.name} 的请求`, 'system');
                break;

            case '/exit':
                socket.end();
                process.exit(0);
                break;

            default:
                addMessage(`未知命令: ${command}`, 'error');
                addMessage('输入 /help 获取帮助', 'system');
        }
    }

    // 创建连接后
    socket.on('connect', function () {
        addMessage(`已连接到服务器: ${config.host}:${config.port}`, 'success');
        addMessage(`用户名: ${config.username || 'user_' + socket.localPort}`, 'system');
        addMessage(`房间ID: ${config.homeID}`, 'system');
        addMessage('输入 /help 获取命令帮助', 'system');
        addMessage('', 'system');

        // 提前告诉服务端个人信息
        socket.write(JSON.stringify(data));
    });

    // 接收消息
    socket.on('data', function (rawData) {
        try {
            const serverData = JSON.parse(rawData);

            // 处理文件接收
            if (serverData.file) {
                // 如果文件是加密的，先解密
                if (serverData.encrypted === true && serverData.encryptedKey) {
                    try {
                        // 解密文件密钥
                        const decryptedFile = cryptoManager.decryptFile(
                            serverData.file,
                            serverData.encryptedKey
                        );

                        pendingFiles.push({
                            name: serverData.fileName,
                            sender: serverData.sender || '未知用户',
                            data: decryptedFile.toString('base64')
                        });
                        addMessage(`收到新加密文件: ${serverData.fileName} [已解密]`, 'system');
                    } catch (err) {
                        addMessage(`文件解密失败: ${err.message}`, 'error');
                        pendingFiles.push({
                            name: serverData.fileName,
                            sender: serverData.sender || '未知用户',
                            data: serverData.file
                        });
                        addMessage(`收到新文件: ${serverData.fileName} [无法解密]`, 'system');
                    }
                } else {
                    pendingFiles.push({
                        name: serverData.fileName,
                        sender: serverData.sender || '未知用户',
                        data: serverData.file
                    });
                    addMessage(`收到新文件: ${serverData.fileName}`, 'system');
                }
                addMessage('使用 /list 查看可接收的文件', 'system');
            }

            // 处理用户列表更新
            if (serverData.userList) {
                onlineUsers = serverData.userList;
                updateUserList();

                // 检查是否为房主（第一个加入房间的用户）
                if (onlineUsers.length > 0 && onlineUsers[0].id === socket.localPort) {
                    if (!isRoomOwner) {
                        isRoomOwner = true;
                        addMessage('你现在是房主，可以使用 /kill 命令踢出其他用户', 'success');
                    }
                }

                // 存储其他用户的公钥
                for (const user of onlineUsers) {
                    if (user.id !== socket.localPort && user.publicKey) {
                        cryptoManager.setPeerPublicKey(user.id, user.publicKey);
                    }
                }
            }

            // 处理被踢出的情况
            if (serverData.code === 403) {
                addMessage(serverData.message, 'error');
                // 延迟关闭连接，让用户有时间看到消息
                setTimeout(() => {
                    socket.end();
                    process.exit(0);
                }, 5000);
            }

            // 处理普通消息
            if (serverData.message) {
                // 如果消息是加密的，尝试解密
                if (serverData.encrypted === true) {
                    try {
                        const decryptedMessage = cryptoManager.decrypt(serverData.message);
                        if (serverData.time !== undefined) addMessage(`${serverData.time} ${serverData.sender}: [加密] \n${decryptedMessage}\n`);
                        else addMessage(`${decryptedMessage}\n`);
                    } catch (err) {
                        addMessage(`收到加密消息，但无法解密: ${err.message}`, 'error');
                    }
                } else {
                    if (serverData.time !== undefined) addMessage(`${serverData.time} ${serverData.sender}: \n${serverData.message}\n`);
                    else addMessage(`${serverData.message}\n`);
                }
            }
            screen.render();
        } catch (e) {
            addMessage(`消息解析错误: ${e.message}`, 'error');
        }
    });

    // 服务器异常
    socket.on('error', function (error) {
        addMessage(`服务器错误: ${error.message}`, 'error');
    });

    // 断开连接处理
    socket.on('close', function () {
        addMessage('与服务器断开连接', 'error');

        if (config.reconnectAttempts < config.maxReconnectAttempts) {
            config.reconnectAttempts++;
            addMessage(`尝试重新连接(${config.reconnectAttempts}/${config.maxReconnectAttempts})...`, 'system');
            setTimeout(() => {
                socket.connect({
                    host: config.host,
                    port: config.port
                });
            }, config.reconnectInterval);
        } else {
            addMessage('重连次数达到上限，程序退出', 'error');
            setTimeout(() => process.exit(1), 3000);
        }
    });

    // 处理聊天框滚动
    chatBox.key(['up'], function () {
        chatBox.scroll(-1);
        screen.render();
    });

    chatBox.key(['down'], function () {
        chatBox.scroll(1);
        screen.render();
    });

    // 处理用户列表滚动
    userListBox.key(['up'], function () {
        userListBox.scroll(-1);
        screen.render();
    });

    userListBox.key(['down'], function () {
        userListBox.scroll(1);
        screen.render();
    });

    // 处理输入框Shirt+回车事件
    inputBox.key(['C-enter'], function () {
        inputBox.setValue(inputBox.getValue() + '\n');
        screen.render(); 
    })

    // 处理输入框事件
    inputBox.key(['enter'], function () {
        const message = inputBox.getValue().trim();
        if (!message) return;

        // 清空输入框
        inputBox.setValue('');

        // 处理命令或消息
        if (message.startsWith('/') && currentMode === 'command') {
            processCommand(message);
        } else if (!message.startsWith('/') || currentMode === 'chat') {
            // // 在聊天模式下，即使消息以/开头也当作普通消息处理
            // if (currentMode === 'chat' && message.startsWith('/')) {
            //     addMessage('当前处于聊天模式，命令无效。请使用Ctrl+A切换到命令模式', 'error');
            //     return;
            // }

            // 发送聊天消息
            if (encryptionMode === 'on' && onlineUsers.length > 0) {
                // 为每个用户加密消息
                for (const user of onlineUsers) {
                    if (user.id !== socket.localPort && user.publicKey) {
                        try {
                            // 存储对方公钥
                            //cryptoManager.setPeerPublicKey(user.id, user.publicKey);
                            // 加密消息
                            const encryptedMessage = cryptoManager.encrypt(message, user.id);

                            // 发送加密消息
                            const encryptedData = {
                                ...messageData,
                                message: encryptedMessage,
                                encrypted: true,
                                peerId: user.id
                            };
                            socket.write(JSON.stringify(encryptedData));
                        } catch (err) {
                            addMessage(`加密消息失败: ${err.message}`, 'error');
                        }
                    }
                }
                addMessage(`${moment().format('YYYY-MM-DD HH:mm:ss')} Me: [已加密]\n${message}\n\n`, 'self');
            } else {
                // 发送未加密消息
                messageData.message = message;
                messageData.encrypted = false;
                socket.write(JSON.stringify(messageData));
                addMessage(`${moment().format('YYYY-MM-DD HH:mm:ss')} Me: \n${message}\n\n`, 'self');
            }
        }

        screen.render();
    });

    // 全局按键处理
    screen.key(['C-a'], function () {
        // Ctrl+A键切换聊天/命令模式
        currentMode = currentMode === 'chat' ? 'command' : 'chat';
        addMessage(`已切换到${currentMode === 'chat' ? '聊天' : '命令'}模式`, 'system');

        // 自动将焦点切换到输入框
        focusedElement = 'inputBox';
        inputBox.focus();
        inputBox.style.border.fg = 'yellow';
        chatBox.style.border.fg = 'blue';
        userListBox.style.border.fg = 'green';

        screen.render();
    });

    screen.key(['tab'], function () {
        // Tab键切换焦点
        if (focusedElement === 'inputBox') {
            focusedElement = 'chatBox';
            chatBox.focus();
            chatBox.style.border.fg = 'yellow';
            inputBox.style.border.fg = 'red';
            userListBox.style.border.fg = 'green';
        } else if (focusedElement === 'chatBox') {
            focusedElement = 'userListBox';
            userListBox.focus();
            userListBox.style.border.fg = 'yellow';
            chatBox.style.border.fg = 'blue';
            inputBox.style.border.fg = 'red';
        } else {
            focusedElement = 'inputBox';
            inputBox.focus();
            inputBox.style.border.fg = 'yellow';
            chatBox.style.border.fg = 'blue';
            userListBox.style.border.fg = 'green';
        }
        screen.render();
    });

    // 退出快捷键
    screen.key(['C-c'], function () {
        socket.end();
        process.exit(0);
    });

    // 渲染屏幕
    screen.render();
}

module.exports = {
    startTUIClient
};