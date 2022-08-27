// 加载net模块
const net = require("net");
// 加载http
const http = require("http");
// 加载fs
var fs = require('fs');
// 加载时间模块
var moment = require('moment');
const ms = require("ms");
// 创建net实例对象
var server = net.createServer();
// 保存所有客户的socket对象
var users = [];
// 保存所有房间ID
var homeIDs = Array();
// 保存所有房间配置
var homeConfigs = Array();


// 计算数组总数,不计空数组
function count_array_num(array){
    var num = 0;
    for (let i = 0; i < array.length; i++) {
        if(array[i] != undefined || array[i] != null){
            num++;
        }
    }
    return num;
}

var data = {
    code: 200,
    message: null,
    data: undefined,
}

// 建立监听
server.listen(2428, function () {
    console.log('Starting NChat server...');
    console.log('http://127.0.0.1:2428');
    console.log('');
})

server.on('connection', function (socket) {
    // 客户端发送的数据
    var client_data;

    // 将加入聊天室的用户加入至数组
    users.push(socket); 

    socket.on('data', function (data) {   
        client_data = JSON.parse(data);
        // 房间用户初始化
        if (count_array_num(homeIDs) == 0) {
            homeConfigs[client_data.homeID] = {password: client_data.password};
        }
        if(homeIDs[client_data.homeID] == undefined){
            homeIDs[client_data.homeID] = Array();
        }

        // 昵称为空判断
        if(client_data.username == null){
            //为空则初始化昵称
            client_data.username = "user_" + socket.remotePort;
        }

        // 加入房间
        var isExist = 0; // o: false , 1: true
        for(var i = 0; i < homeIDs[client_data.homeID].length; i++){
            // 用户加入判断
            if(homeIDs[client_data.homeID][i] != undefined && homeIDs[client_data.homeID][i].remotePort == socket.remotePort){
                isExist = 1;
                break;
            }
        }

        // 如果用户没有加入房间则加入
        if (isExist == 0) {
            if (homeIDs.length != 0 && homeConfigs[client_data.homeID].password != null && client_data.password !== homeConfigs[client_data.homeID].password) {
                socket.write(JSON.stringify({code: 200, message: "密码错误！"}));
                return;
            }
            homeIDs[client_data.homeID].push(socket);
            var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
            console.log(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' join ' + client_data.homeID + ' home(Online num: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
            for(var j = 0; j < homeIDs[client_data.homeID].length; j++){
                if(homeIDs[client_data.homeID][j] != undefined && homeIDs[client_data.homeID][j] != socket){
                    var msg = "";
                    if (client_data.file != null) {
                        msg = "\n用户" + client_data.username + "(" + socket.remotePort + ")" + "发来文件: " + client_data.fileName +"\n";
                    }
                    homeIDs[client_data.homeID][j].write(JSON.stringify({code: 200, fileName: client_data.fileName, file: client_data.file, message: time + ' ' + client_data.username + '(' + socket.remotePort + ')' + '加入了 ' + client_data.homeID + ' 房间(在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')\n' + msg}));
                } else if(homeIDs[client_data.homeID][j] != undefined){
                    var msg = "";
                    if (client_data.file != null) {
                        msg = "\n文件发送成功！\n"
                    }
                    socket.write(JSON.stringify({code: 200, message: '加入 ' + client_data.homeID + ' 房间成功! (在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')\n' + msg}));
                }
            };
            client_data.file = null;
            client_data.fileName = null;
        }

        // 发送信息
        for(var k = 0; k < homeIDs[client_data.homeID].length; k++){
            if(homeIDs[client_data.homeID][k] != undefined && client_data.message != undefined && homeIDs[client_data.homeID][k] != socket){
                var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                homeIDs[client_data.homeID][k].write(JSON.stringify({code: 200, message: time + '\n' + client_data.username + ': ' + client_data.message}));
            }
        }
    })

    // 用户退出调用
    socket.on('close', function (err) {
        var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        console.log(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' exit ' + client_data.homeID + ' home(Online num: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
        // 删除房间里面的退出去的用户
        for(var j = 0; j < homeIDs[client_data.homeID].length; j++){
            if(homeIDs[client_data.homeID][j] == socket){
                delete homeIDs[client_data.homeID][j];
            } else if(homeIDs[client_data.homeID][j] != undefined){
                // 输出退出信息,不输出给退出的用户
                homeIDs[client_data.homeID][j].write(JSON.stringify({code: 200, message: time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' 退出了 ' + client_data.homeID + ' 房间(在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')'}));
            }
        }

        users.forEach(function (uesr) {
            // 删除退出去的总用户
            for(var k = 0; k < users.length; k++){
                if( users[k] == socket){
                    delete users[k];
                }
            }
        });

        // 房间没人自动解散房间
        
        if (count_array_num(homeIDs[client_data.homeID] = 0)) {
            homeIDs[client_data.homeID] = undefined;
            homeConfigs[client_data.homeID] = undefined;
        }
    })
})

// 服务器异常
server.on('error', function (error) {
    console.log('Server error: ' + error);
})
