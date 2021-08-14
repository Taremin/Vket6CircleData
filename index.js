const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const urljoin = require('url-join');
const path = require('path');

process.on('unhandledRejection', console.dir);

const options = {
    transform: (body) => {
        return cheerio.load(body);
    }
};

const MODE =
    null;
//    'CIRCLE_ONLY';

const url = 'https://vket6.v-market.work/catalog';
const request_delay = 1500;

async function get_links(url, re) {
    const data = await rp.get(url, options)
        .then((cheerio) => {
            return cheerio('a');
        }).catch(async (error) => {
            console.error('Error:', error);
        });
    if (!data) {
        // retry
        console.log("RETRY: waiting 30sec");
        await sleep(30 * 1000);
        return await get_links(url, re);

    }
    const pattern = new RegExp(re);

    const result = [];
    data.each((i) => {
        const href = data[i].attribs['href'];
        if (href && pattern.test(href)) {
            result.push(urljoin(new URL(url).origin, href));
        }
    });

    return result;
}

async function get_world_base_url(index_url) {
    return await get_links(index_url, '^/catalog/(\\d+)(\\?.*)$');
}

async function get_world_urls(index_url) {
    return await get_links(index_url, '^/catalog/(\\d+)/(\\d+)(\\?.*)$');
}

async function get_circle(url) {
    return await get_links(url, '^/circle/(\\d+)$');
}

async function get_circle_info(url) {
    const re = '^https://twitter.com/(.*)$';
    const cheerioDoc = await rp.get(url, options)
        .then((doc) => {
            return doc;
        }).catch(async (error) => {
            console.error('Error:', error);
        });
    if (!cheerioDoc) {
        // retry
        console.log("RETRY: waiting 30sec");
        await sleep(request_delay);
        return await get_circle_info(url);
    }

    const link = cheerioDoc('a');
    const pattern = new RegExp(re);

    // circle name
    const name = cheerioDoc('.ht-circle-detail-header__text').text().replace(/\n +/g, '');

    // description
    const description = cheerioDoc('.ht-circle-detail-top__description').text().replace(/^\s*/, '').replace(/\s*$/, '');

    // icon
    let icon = null;
    /*
    let icon = cheerioDoc('img.circle-card__icon')[0].attribs['src'];
    if (icon.slice(0, 1) === '/') {
        icon = urljoin(new URL(url).origin, icon);
    }
    */

    // header
    let header = cheerioDoc('img.ht-circle-detail-header__image');
    if (!header[0]) {
        header = null;
    } else {
        header = header[0].attribs['src'];
    }

    // location
    const location = cheerioDoc('.ht-circle-detail-top__caption').text().replace(/\n +/g, '');

    // twitter link
    const twitter = [];
    link.each((i) => {
        const href = link[i].attribs['href'];
        const split = href.split('?')
        const screenName = path.basename(split[0]);
        if (href && pattern.test(href) && screenName !== 'Virtual_Market_' && screenName !== 'tweet') {
            console.log("ScreenName:", screenName);
            twitter.push(href);
        }
    });

    return {
        circle_name: name,
        description: description,
        icon: icon,
        header: header,
        location: location,
        url: url,
        twitter: uniq(twitter)
    };
}

function uniq(ary) {
    const tmp = {};
    ary.forEach((item) => {
        tmp[item] = null;
    });
    return Object.keys(tmp);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function start() {
    // index -> worlds
    let world_urls;
    switch (MODE) {
        case 'CIRCLE_ONLY':
            world_urls = require('./docs/world_urls.json');
            break;
        default:
            world_urls = uniq(await get_world_urls(url));
            /*
            world_base_urls = uniq(await get_world_base_url(url));
            world_urls = []
            for (let i = 0, il = world_base_urls.length; i < il; ++i) {
                const url = world_base_urls[i];
                const urls = await get_world_urls(url);
                Array.prototype.push.apply(world_urls, urls)
            }
            */
            world_urls = (uniq(world_urls)).sort()
            fs.writeFileSync('docs/world_urls.json', JSON.stringify(world_urls, null, 2));
            break;
    }
    console.log(world_urls);

    // worlds -> circles
    let circle_urls = [];
    switch (MODE) {
        case 'CIRCLE_ONLY':
            circle_urls = require('./docs/circle_urls.json');
            break;
        default:
            for (let i = 0, il = world_urls.length; i < il; ++i) {
                const url = world_urls[i];
                console.log(`get circle from ${url}`);
                const circles = await get_circle(url);
                circle_urls.push(...circles);
                await sleep(request_delay);
            };
            circle_urls = uniq(circle_urls);
            fs.writeFileSync('docs/circle_urls.json', JSON.stringify(circle_urls, null, 2));
            break;
    }
    console.log(circle_urls);

    // circles -> Twitter name
    const data = {};
    for (let i = 0, il = circle_urls.length; i < il; ++i) {
        const url = circle_urls[i];
        console.log(`get circle information from ${url}`);

        const circle_id = path.basename(url);
        const circle_info = await get_circle_info(url);
        data[circle_id] = circle_info;
        console.log(circle_info);

        await sleep(request_delay);
    };
    fs.writeFileSync('docs/circle_data.json', JSON.stringify(data, null, 2));
}

start();