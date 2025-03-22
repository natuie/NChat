const crypto = require('crypto');

class CryptoManager {
    constructor() {
        // 生成RSA密钥对
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.peerPublicKeys = new Map(); // 存储其他用户的公钥
    }

    // 获取公钥
    getPublicKey() {
        return this.publicKey;
    }

    // 存储对方的公钥
    setPeerPublicKey(peerId, publicKey) {
        this.peerPublicKeys.set(peerId, publicKey);
    }

    // 加密消息
    encrypt(message, peerId) {
        const peerPublicKey = this.peerPublicKeys.get(peerId);
        if (!peerPublicKey) {
            throw new Error('未找到对方的公钥');
        }

        const encryptedData = crypto.publicEncrypt(
            {
                key: peerPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            Buffer.from(message)
        );

        return encryptedData.toString('base64');
    }

    // 解密消息
    decrypt(encryptedMessage) {
        const decryptedData = crypto.privateDecrypt(
            {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            Buffer.from(encryptedMessage, 'base64')
        );

        return decryptedData.toString();
    }

    // 加密文件
    encryptFile(fileBuffer, peerId) {
        // 生成随机AES密钥
        const aesKey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // 使用AES加密文件内容
        const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
        const encryptedFile = Buffer.concat([
            cipher.update(fileBuffer),
            cipher.final()
        ]);

        // 使用RSA加密AES密钥
        const peerPublicKey = this.peerPublicKeys.get(peerId);
        if (!peerPublicKey) {
            throw new Error('未找到对方的公钥');
        }

        const encryptedKey = crypto.publicEncrypt(
            {
                key: peerPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            Buffer.concat([aesKey, iv])
        );

        return {
            encryptedFile: encryptedFile.toString('base64'),
            encryptedKey: encryptedKey.toString('base64')
        };
    }

    // 解密文件
    decryptFile(encryptedFile, encryptedKey) {
        // 解密AES密钥
        const keyBuffer = crypto.privateDecrypt(
            {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            Buffer.from(encryptedKey, 'base64')
        );

        const aesKey = keyBuffer.slice(0, 32);
        const iv = keyBuffer.slice(32);

        // 使用AES解密文件内容
        const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
        const decryptedFile = Buffer.concat([
            decipher.update(Buffer.from(encryptedFile, 'base64')),
            decipher.final()
        ]);

        return decryptedFile;
    }
}

module.exports = CryptoManager;