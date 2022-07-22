//导入net
var net = require('net');

//发送数据的实体
var data = {
    username: null,
    homeID: null,
    message: undefined
}

//处理参数
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
    switch(argv[i]){
        case '-n':
            data.username = argv[i +1];
            i++;
            break;
        case '-id':
            data.homeID = argv[i +1];
            i++;
            break;
        case '-c':
            content = argv[i +1];
            i++;
            break;
        case '-v':
            console.log('NChat Version: 1.0 bate');
            process.exit(0);
        case '--help':
            console.log('Usage: nchat [options]');
            console.log('');
            console.log('Options:');
            console.log('  -n      add username');
            console.log('  -id      add homeid');
            console.log('  -c      send content');
            console.log('  -v      get version');
            console.log('  --help    help');
            process.exit(0);
        default:
            console.log("Unknown parameter");
    }
}

// 创建连接
var socket = net.createConnection({
    host: '127.0.0.1',
    port: 3000
})

// 输入消息
socket.on('connect', function () {
    // 待发送内容
    var content;
    
    //提前告诉服务端个人信息
    socket.write(JSON.stringify(data));

    if(content != null){
        data.message = content;
        socket.write(JSON.stringify(data));
        process.exit(0);
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
    console.log(data.toString() + '\n');
});
//服务器异常
socket.on('error', function (err) {
    console.log('Server error');
})