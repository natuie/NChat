//导入net
var net = require('net');
// 加载fs
var fs = require("fs");

//发送数据的实体
var data = {
    username: null,
    homeID: 2428,
    password: null,
    message: undefined,
    file: undefined,
    fileName: undefined,
}

var host = "127.0.0.1";
var port = 2428;
var filepath = null;

//处理参数
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  switch(argv[i]){
         case '--url'
            :host = argv[i +1];
            i++;
            break;
        case '--port'
            :url = argv[i +1];
            i++;
            break;
        case '-n':
            data.username = argv[i +1];
            i++;
            break;
        case '-id':
            data.homeID = argv[i +1];
            i++;
            break;
        case '-p':
            data.password = argv[i +1];
            i++;
            break;
        case '-f':
            filepath = argv[i +1];
            i++;
            break;
        case '-v':
            console.log('NChat Version: 1.1.2');
            console.log('NChat build date: 2022-8-27 5:10');
            process.exit(0);
        case '--help':
            console.log('Usage: nchat [options]');
            console.log('');
            console.log('Options:');
            console.log("  --url    Target NChat server url");
            console.log("  --port   Target NChat server port");
            console.log('  -n       Add username for current user');
            console.log('  -id      The room number to be added, if it does not exist, create it');
            console.log('  -p       The password you need to provide when joining a room, or set a password for the room when the room is created');
            console.log('  -f       Send files to all users in the current room');
            console.log('  -v       Get package information');
            console.log('  --help   Get help information');
            process.exit(0);
        default:
            console.log("Unknown parameter: " + argv[i]);
    }
}

// 创建连接
var socket = net.createConnection({
    host: host,
    port: port
})

// 输入消息
socket.on('connect', function () {
    if(filepath !== null) {
        data.fileName =  filepath.substr(filepath.lastIndexOf("/") +1);
        fs.readFile(filepath, function(err, buf) {
            if (!err) {
                data.file = buf;
                //提前告诉服务端个人信息
                socket.write(JSON.stringify(data));
            } else {
                console.log("Error: " + err);
            }
        });
    } else {
        //提前告诉服务端个人信息
        socket.write(JSON.stringify(data));
    }

    //读取要发送给用户的内容
    process.stdin.on('data', function (msg) {
        process.stdout.write('\n');
        data.message = msg.toString().slice(0, -1);
        socket.write(JSON.stringify(data));
    });
});

//接收消息
socket.on('data', function (data) {
    server_data = JSON.parse(data);
    console.log(server_data.message.toString() + '\n');
    if (server_data.file != null) {
        fs.writeFile("./" + server_data.fileName, Buffer.from(server_data.file.data), (error) => {
            if (error) {
                console.error(error);
            }
        });
        console.log("已保存用户发来的文件: " + server_data.fileName);
    }
});
//服务器异常
socket.on('error', function (error) {
    console.log('Server error: ' + error);
})
