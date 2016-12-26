const assert = require('assert');
const fetch = require('node-fetch');
const lodash = require('lodash');
const Promise = require('bluebird');

const envName = process.env.NODE_ENV || 'production';
const config = require(process.env.configFile || `config/${envName}`);
const state = {};
const redis = require('redis');
const client = Promise.promisifyAll(redis.createClient(config.redisUrl));

class Counter {
    constructor() {
        this.count = 0;
    }
}

class TimestampedCounter {
    constructor() {
        this.timestamp = Date.now();
        this.count = 0;
    }
}

const counters = {
    concurrent: new Counter(),
    perMinute: new TimestampedCounter()
};

async function multiExecAsync(client, multiFunction) {
    const multi = client.multi();
    multiFunction(multi);
    return Promise.promisify(multi.exec).call(multi);
}

async function delay(duration) {
    logger.debug('delay', duration);
    return new Promise(resolve => setTimeout(resolve, duration));
}

async function start() {
    state.started = Math.floor(Date.now()/1000);
    state.pid = process.pid;
    state.instanceId = await client.incrAsync(`${config.namespace}:instance:seq`);
    const instanceKey = `${config.namespace}:instance:${state.instanceId}:h`;
    logger.info('start', {config, state, instanceKey});
    await multiExecAsync(client, multi => {
        ['started', 'pid'].forEach(property => {
            multi.hset(instanceKey, property, state[property]);
        });
        multi.expire(instanceKey, config.processExpire);
    });
    if (process.env.NODE_ENV === 'development') {
        //await startDevelopment();
    } else if (process.env.NODE_ENV === 'test') {
        return startTest();
    } else {
    }
    client.on('message', (channel, message) => {
        handle(JSON.parse(message));
    });
    client.subscribe('telebot:' + config.secret);
}

async function handle(message) {
    logger.debug('handle', JSON.stringify(message, null, 2));
}

async function startTest() {
}

const testData = {
    ok: (multi, ctx) => {
        multi.hset(`${config.namespace}:${ctx.index}:h`, 'url', 'http://httpstat.us/200');
        multi.lpush(queue.req, ctx.index);
    },
};

async function startDevelopment() {
    logger.info('startDevelopment', config.namespace, queue.req);
    await Promise.all(Object.keys(testData).map(async (key, index) => {
        const results = await multiExecAsync(client, multi => {
            testData[key](multi, {index});
        });
        logger.info('results', key, index, results.join(' '));
    }));
    logger.info('llen', queue.req, await client.llenAsync(queue.req));
}

async function end() {
    client.quit();
}

start().then(() => {
    logger.info('started');
}).catch(err => {
    logger.error(err);
    return end();
}).finally(() => {
});
