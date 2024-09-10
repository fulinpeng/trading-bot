let fs = require("fs");
let ws = fs.createWriteStream("1.txt", {
    flags: "w",
    encoding: "utf8",
    start: 0,
    highWaterMark: 5,
});
let i = 9;
function write() {
    let flag = true;
    while (flag && i >= 0) {
        flag = ws.write(i-- + ""); //往1.txt写入9876543210
        console.log(flag);
    }
}
ws.on("drain", () => {
    //缓存区充满并被写入完成，处于清空状态时触发
    console.log("干了");
    write(); //当缓存区清空后我们在继续写
});
write(); //第一次调用write方法
