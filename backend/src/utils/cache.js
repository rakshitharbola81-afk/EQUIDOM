const NodeCache = require('node-cache');
const scanCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
module.exports = scanCache;