const mongoose = require("mongoose");

class Transaction {

    constructor() {
        this.sessions = {};
    }
    // 开启事务
    async function startTransaction(key) {
        this.sessions[key] = await mongoose.startSession(); // 开启事务会话
        this.sessions[key].startTransaction(); // 开始事务
        return this.sessions[key]
    }
    function getSessions(key) {
        return this.sessions[key]
    }
    // 提交事务
    async function commitTransaction(key) {
        const session = this.sessions[key];
        if (session) {
            await session.commitTransaction();
            session.endSession();
            this.sessions[key] = null
        }
    }
    // 提交事务
    async function abortTransaction(key) {
        const session = this.sessions[key];
        if (session) {
            // 回滚事务
            await session.abortTransaction();
            session.endSession();
            this.sessions[key] = null;
        }
    }
}

module.exports = {
    Transaction
}