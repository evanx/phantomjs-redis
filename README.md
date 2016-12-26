# phantomjs-redis

NodeJS microservice to interact with PhantomJS via Redis

## Configuration

`config/development.js`
```javascript
namespace: 'phantomjs-redis',
loggerLevel: 'debug'
```
where all Redis keys will be prefixed with `phantomjs-redis`

```javascript
```

## Test data

```javascript
const testData = {
    ok: (multi, ctx) => {
    },
};
```

Note our convention that Redis keys for hashes are postfixed with `:h`


## Error handling

```javascript
```
