const fs = require("fs");
var log4js = require("log4js");
const { getDate } = require("./utils/functions.js");

log4js.configure({
    appenders: [
        { type: "console" },
        { type: "file", filename: "test-cheese.log", category: "cheese" },
        // { type: "file", filename: "cheese1.log", category: "cheese" },
    ],
    levels: {
        cheese: "INFO",
    },
});
var log = log4js.getLogger("cheese");
// log.trace("trace me");

let num = 0;
async function run() {
    while (num < 1000000) {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 100);
        }).then(() => {
            log.info("test shi da yin ...");
        });
        num++;
        if (num == 50) {
            // process.exit();
            var a = string();
        }
    }
}
run();
