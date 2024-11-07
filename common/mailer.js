require("dotenv").config(); // 引入dotenv模块，用于加载环境变量
const nodemailer = require("nodemailer");

const sendMailAcount = process.env.SEND_MAIL_ACOUNT; // 发送邮件的邮箱
const sendMailCode = process.env.SEND_MAIL_CODE; // 发送邮件的邮箱授权码
const recieveMailAcount = process.env.RECIEVE_MAIL_ACOUNT; // 接收者的邮箱

// 创建用于发送邮件的传输器
const transporter = nodemailer.createTransport({
    service: "qq",
    auth: {
        user: sendMailAcount, // 发送邮件的邮箱
        pass: sendMailCode, // 邮箱的授权码，而不是登录密码
    },
});

// 发送邮件

const sendMail = ({
    from, // 发送者邮箱
    to, // 接收者邮箱
    subject, // 邮件主题
    text, // 邮件正文
}) => {
    // 设置电子邮件内容
    setTimeout(() => {
        try {
            const mailOptions = {
                from: sendMailAcount, // 发送者邮箱
                to: recieveMailAcount, // 接收者邮箱
                subject, // 邮件主题
                text, // 邮件正文
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error occurred:", error);
                } else {
                    console.log("Email sent:", info.response);
                }
            });
        } catch (error) {
            console.log("邮件发送失败::", error);
        }
    });
};
module.exports = sendMail;
