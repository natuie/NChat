#!/usr/bin/env node

// 导入必要模块
const { startServer } = require('./server');
const { startTUIClient } = require('./client');


// 全局配置
const DEFAULT_PORT = 2428;
const DEFAULT_HOST = '127.0.0.1';

// 命令行参数解析
const argv = process.argv.slice(2);
let isServer = false;
let isTUI = false;

let config = {
    username: null,
    homeID: 2428,
    password: null,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectInterval: 3000,
    encryption: 'on',  // 加密模式，默认开启
    autoReconnect: true,  // 自动重连，默认开启
    logLevel: 'info'  // 日志级别，默认info
};

// 解析命令行参数
for (let i = 0; i < argv.length; i++) {
    switch(argv[i]) {
        case '--server':
            isServer = true;
            break;
        case '--tui':
            isTUI = true;
            break;
        case '--url':
            config.host = argv[i + 1];
            i++;
            break;
        case '--port':
            config.port = parseInt(argv[i + 1]);
            i++;
            break;
        case '-n':
            config.username = argv[i + 1];
            i++;
            break;
        case '-id':
            config.homeID = argv[i + 1];
            i++;
            break;
        case '-p':
            config.password = argv[i + 1];
            i++;
            break;
        case '-f':
            config.filepath = argv[i + 1];
            i++;
            break;
        case '--encryption':
            config.encryption = argv[i + 1];
            if (config.encryption !== 'on' && config.encryption !== 'off') {
                console.log("Error: encryption must be 'on' or 'off'");
                process.exit(1);
            }
            i++;
            break;
        case '--max-reconnect':
            config.maxReconnectAttempts = parseInt(argv[i + 1]);
            if (isNaN(config.maxReconnectAttempts) || config.maxReconnectAttempts < 0) {
                console.log("Error: max-reconnect must be a positive number");
                process.exit(1);
            }
            i++;
            break;
        case '--reconnect-interval':
            config.reconnectInterval = parseInt(argv[i + 1]);
            if (isNaN(config.reconnectInterval) || config.reconnectInterval < 1000) {
                console.log("Error: reconnect-interval must be at least 1000ms");
                process.exit(1);
            }
            i++;
            break;
        case '--no-auto-reconnect':
            config.autoReconnect = false;
            break;
        case '--log-level':
            config.logLevel = argv[i + 1];
            if (!['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
                console.log("Error: log-level must be one of: debug, info, warn, error");
                process.exit(1);
            }
            i++;
            break;
        case '-v':
            console.log('NChat Version: 2.0.1');
            console.log('NChat build date: 2025-03-23 01:38');
            process.exit(0);
        case '--help':
            showHelp();
            process.exit(0);
        default:
            console.log("Unknown parameter: " + argv[i]);
    }
}

// 显示帮助信息
function showHelp() {
    console.log('Usage: npm run nchat [options]');
    console.log('');
    console.log('Options:');
    console.log('  --server                  Start NChat in server mode');
    console.log('  --tui                     Enable TUI (Text User Interface) mode');
    console.log("  --url                     Target NChat server url");
    console.log("  --port                    Target NChat server port");
    console.log('  -n                        Add username for current user');
    console.log('  -id                       The room number to be added, if it does not exist, create it');
    console.log('  -p                        The password you need to provide when joining a room, or set a password for the room when the room is created');
    console.log('  -f                        Send files to all users in the current room');
    console.log('  --encryption <on|off>     Enable or disable message encryption');
    console.log('  --max-reconnect <number>  Maximum reconnection attempts');
    console.log('  --reconnect-interval <ms> Interval between reconnection attempts');
    console.log('  --no-auto-reconnect       Disable automatic reconnection');
    console.log('  --log-level <level>       Set log level (debug|info|warn|error)');
    console.log('  -v                        Get package information');
    console.log('  --help                    Get help information');
}

// 根据参数决定启动服务器或客户端
if (isServer) {
    startServer(config.port);
} else {
    // 启动TUI模式客户端/普通命令行客户端
    startTUIClient(config);
}