let multiExecAsync = (() => {
    var _ref = _asyncToGenerator(function* (client, multiFunction) {
        const multi = client.multi();
        multiFunction(multi);
        return Promise.promisify(multi.exec).call(multi);
    });

    return function multiExecAsync(_x, _x2) {
        return _ref.apply(this, arguments);
    };
})();

let delay = (() => {
    var _ref2 = _asyncToGenerator(function* (duration) {
        logger.debug('delay', duration);
        return new Promise(function (resolve) {
            return setTimeout(resolve, duration);
        });
    });

    return function delay(_x3) {
        return _ref2.apply(this, arguments);
    };
})();

let start = (() => {
    var _ref3 = _asyncToGenerator(function* () {
        state.started = Math.floor(Date.now() / 1000);
        state.pid = process.pid;
        state.instanceId = yield client.incrAsync(`${ config.namespace }:instance:seq`);
        const instanceKey = `${ config.namespace }:instance:${ state.instanceId }:h`;
        logger.info('start', { config, state, instanceKey });
        yield multiExecAsync(client, function (multi) {
            ['started', 'pid'].forEach(function (property) {
                multi.hset(instanceKey, property, state[property]);
            });
            multi.expire(instanceKey, config.processExpire);
        });
        if (process.env.NODE_ENV === 'development') {
            //await startDevelopment();
        } else if (process.env.NODE_ENV === 'test') {
            return startTest();
        } else {}
        client.on('message', function (channel, message) {
            handle(JSON.parse(message));
        });
        client.subscribe('telebot:' + config.secret);
    });

    return function start() {
        return _ref3.apply(this, arguments);
    };
})();

let handle = (() => {
    var _ref4 = _asyncToGenerator(function* (message) {
        logger.debug('handle', JSON.stringify(message, null, 2));
    });

    return function handle(_x4) {
        return _ref4.apply(this, arguments);
    };
})();

let startTest = (() => {
    var _ref5 = _asyncToGenerator(function* () {});

    return function startTest() {
        return _ref5.apply(this, arguments);
    };
})();

let startDevelopment = (() => {
    var _ref6 = _asyncToGenerator(function* () {
        logger.info('startDevelopment', config.namespace, queue.req);
        yield Promise.all(Object.keys(testData).map((() => {
            var _ref7 = _asyncToGenerator(function* (key, index) {
                const results = yield multiExecAsync(client, function (multi) {
                    testData[key](multi, { index });
                });
                logger.info('results', key, index, results.join(' '));
            });

            return function (_x5, _x6) {
                return _ref7.apply(this, arguments);
            };
        })()));
        logger.info('llen', queue.req, (yield client.llenAsync(queue.req)));
    });

    return function startDevelopment() {
        return _ref6.apply(this, arguments);
    };
})();

let end = (() => {
    var _ref8 = _asyncToGenerator(function* () {
        client.quit();
    });

    return function end() {
        return _ref8.apply(this, arguments);
    };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const assert = require('assert');
const fetch = require('node-fetch');
const lodash = require('lodash');
const Promise = require('bluebird');

const envName = process.env.NODE_ENV || 'production';
const config = require(process.env.configFile || `config/${ envName }`);
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

const testData = {
    ok: (multi, ctx) => {
        multi.hset(`${ config.namespace }:${ ctx.index }:h`, 'url', 'http://httpstat.us/200');
        multi.lpush(queue.req, ctx.index);
    }
};

start().then(() => {
    logger.info('started');
}).catch(err => {
    logger.error(err);
    return end();
}).finally(() => {});
