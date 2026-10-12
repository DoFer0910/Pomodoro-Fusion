const http = require('http');
const path = require('path');
const handler = require('serve-handler');
http.createServer((request, response) => handler(request, response, {
    public: path.join(__dirname, '..', 'out'), cleanUrls: true,
})).listen(3107, '127.0.0.1');
