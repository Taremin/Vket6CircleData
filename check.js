const fs = require('fs');
const path = require('path');

const circle_urls = require('./dist/ciecle_urls.json');
const data = require('./dist/twitter.json');

for (let i = 0, il = circle_urls.length; i < il; ++i) {
    circle_id = path.basename(circle_urls[i]);
    if (!data[circle_id]) {
        console.log(`circle id: ${circle_id}`);
    }
}
