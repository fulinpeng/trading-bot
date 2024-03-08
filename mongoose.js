const mongoose = require("mongoose");

// 连接到本地 MongoDB 数据库
mongoose.connect("mongodb://localhost:27017/yourDatabaseName", { useNewUrlParser: true, useUnifiedTopology: true });

// 定义一个简单的模型（Schema）
const exampleSchema = new mongoose.Schema({
    name: String,
    age: Number,
    email: String,
});

// 创建模型
const ExampleModel = mongoose.model("Example", exampleSchema);

// 创建一个新文档
const newExample = new ExampleModel({
    name: "John Doe",
    age: 25,
    email: "john@example.com",
});

// 保存文档到数据库
newExample.save((err, savedExample) => {
    if (err) {
        console.error("Error saving example:", err);
    } else {
        console.log("Example saved successfully:", savedExample);
    }

    // 关闭数据库连接
    mongoose.connection.close();
});
