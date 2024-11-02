const { getGlobalVariables, setGlobalVariables } = require('../globalVariables');
// 定义 Redis 键名
const GLOBAL_KEY = "MadingSequence";

module.exports = {
    getGlobalVariables: getGlobalVariables.bind(null, GLOBAL_KEY),
    setGlobalVariables: setGlobalVariables.bind(null, GLOBAL_KEY),
};
