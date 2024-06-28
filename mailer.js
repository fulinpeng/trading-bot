const nodemailer = require("nodemailer");

// 创建用于发送邮件的传输器
const transporter = nodemailer.createTransport({
    service: "qq",
    auth: {
        // user: "946205162@qq.com", // 发送邮件的邮箱
        // pass: "jfbyhdzqbbcgbegb", // 邮箱的授权码，而不是登录密码
        user: "2235646394@qq.com", // 发送邮件的邮箱
        pass: "tyqrurlzqscqecdc", // 邮箱的授权码，而不是登录密码
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
            const _from = "2235646394@qq.com"; // 接收者邮箱
            const _to = "946205162@qq.com"; // 发送者邮箱
            const mailOptions = {
                from: from || _from,
                to: to || _to,
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
