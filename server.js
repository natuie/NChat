// 加载net模块
const net = require("net");
// 加载时间模块
var moment = require('moment');
// 创建net实例对象
var server = net.createServer();
// 保存所有客户的socket对象
var users = [];
// 保存所有房间ID
var homeIDs = Array();


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

// 建立监听
server.listen(3000, function () {
    console.log('Starting NChat server...');
    console.log('http://127.0.0.1:3000');
    console.log('');
})


server.on('connection', function (socket) {
    // 客户端发送的数据
    var client_data;

    // 将加入聊天室的用户加入至数组
    users.push(socket); 

    socket.on('data', function (data) {   
        console.log(data.toString());
        client_data = JSON.parse(data);
        
        // 房间用户初始化
        if(homeIDs[client_data.homeID] == undefined){
            homeIDs[client_data.homeID] = Array();
        }

        // 昵称为空判断
        if(client_data.username == null){
            //为空则初始化昵称
            client_data.username = "User" + socket.remotePort;
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
            homeIDs[client_data.homeID].push(socket);
            var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
            console.log(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' Join ' + client_data.homeID + ' home(Online num: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
            for(var j = 0; j < homeIDs[client_data.homeID].length; j++){
                if(homeIDs[client_data.homeID][j] != undefined && homeIDs[client_data.homeID][j] != socket){
                    homeIDs[client_data.homeID][j].write(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + '加入了 ' + client_data.homeID + ' 房间(在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
                    
                } else if(homeIDs[client_data.homeID][j] != undefined){
                    socket.write('加入 ' + client_data.homeID + ' 房间成功! 在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')\n');
                }
            };
        }

        // 发送信息
        for(var k = 0; k < homeIDs[client_data.homeID].length; k++){
            if(homeIDs[client_data.homeID][k] != undefined && client_data.message != undefined && homeIDs[client_data.homeID][k] != socket){
                var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
                homeIDs[client_data.homeID][k].write(time + '\n' + client_data.username + ': ' + client_data.message);
            }
        }
    })

    // 用户退出调用
    socket.on('close', function (err) {
        var time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        console.log(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' Exit ' + client_data.homeID + ' home(Online num: ' + count_array_num(homeIDs[client_data.homeID]) + ')');
        // 删除房间里面的退出去的用户
        for(var j = 0; j < homeIDs[client_data.homeID].length; j++){
            if(homeIDs[client_data.homeID][j] == socket){
                delete homeIDs[client_data.homeID][j];
            } else if(homeIDs[client_data.homeID][j] != undefined){
                // 输出退出信息,不输出给退出的用户
                homeIDs[client_data.homeID][j].write(time + ' ' + client_data.username + '(' + socket.remotePort + ')' + ' 退出了 ' + client_data.homeID + ' 房间(在线人数: ' + count_array_num(homeIDs[client_data.homeID]) + ')\n');
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
    })
})

// 服务器异常
server.on('error', function () {
    console.log('Server error');
});