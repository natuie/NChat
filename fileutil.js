var fs = require('fs');
 
function writeBinary(filename, buf, callback) {
        var wstream = fs.createWriteStream(filename);
        wstream.write(buf);
        wstream.end();
        wstream.on('finish', function() {
                callback();
        });
        wstream.on('error', function(err) {
                callback(err);
        });
 
}
 
function readBinary(filename, callback) {
        var rstream = fs.createReadStream(filename);
        var chunks = [];
        var size = 0;
        rstream.on('readable', function() {
                var chunk = rstream.read();
                if (chunk != null) {
                        chunks.push(chunk);
                        size += chunk.length;
                }
        });
        rstream.on('end', function() {
                callback(null, Buffer.concat(chunks, size));
        });
        rstream.on('error', function(err) {
                callback(err, null);
        });
 
}

module.exports = {writeBinary, readBinary};