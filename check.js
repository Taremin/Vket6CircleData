const fs = require('fs');
const path = require('path');

const circle_urls = require('./docs/ciecle_urls.json');
const data = require('./docs/circle_data.json');

for (let i = 0, il = circle_urls.length; i < il; ++i) {
    circle_id = path.basename(circle_urls[i]);
    if (!data[circle_id]) {
        console.log(`circle id: ${circle_id}`);
    }
}
