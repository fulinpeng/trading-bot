### 1. 连接到数据库
连接到数据库：
```js
mongosh "mongodb://localhost:27017"
# 或者
mongosh
```
查看所有数据库：
```js
show dbs
```
查看当前连接的数据库：
```js
db
```
如果返回的是 `test`，说明你已经连接到了 `test` 数据库。

切换到其他数据库：

```js
use otherDbName
```
查看当前数据库中有哪些集合（相当于 SQL 中的表）：
```js
show collections
```

### 2. 增加数据（Create）

在 MongoDB 中，我们通常使用 `insertOne()` 或 `insertMany()` 来插入单条或多条数据。

#### 插入一条数据：
```js
db.users.insertOne({
  name: "Alice",
  age: 28,
  email: "alice@example.com"
});
```
此命令将在 `users` 集合中插入一条数据。如果 `users` 集合不存在，MongoDB 会自动创建它。

#### 插入多条数据：
```js
db.users.insertMany([
  { name: "Bob", age: 25, email: "bob@example.com" },
  { name: "Charlie", age: 30, email: "charlie@example.com" }
]);
```

### 3. 查询数据（Read）

你可以使用 `find()` 来查询 MongoDB 集合中的数据。以下是一些常见的查询操作。

#### 查询所有数据：
```js
db.users.find();
```
这将返回 `users` 集合中的所有文档。查询结果会比较大，所以你可以使用 `pretty()` 方法来格式化输出，使其更易读：
```js
db.users.find().pretty();
db["trade-data"].find();
db.getCollection("trade-data").find();
```
可以限制显示数量，例如只显示前 20 条：
```js
db.users.find().limit(20)
```

#### 查询单个文档（带条件）：
```js
db.users.findOne({ name: "Alice" });
```
这个命令会返回第一个匹配条件的文档。

#### 查询符合条件的多个文档：
```js
db.users.find({ age: { $gte: 30 } }).pretty();
```
此命令会查询 `age` 大于或等于 30 的所有文档。

### 4. 更新数据（Update）

更新数据时，我们通常使用 `updateOne()`、`updateMany()` 或 `replaceOne()`。

#### 更新单条数据：
```js
db.users.updateOne(
  { name: "Alice" },  // 查询条件
  { $set: { age: 29 } }  // 更新操作
);
```
此命令会更新 `name` 为 `"Alice"` 的文档，将 `age` 字段更新为 29。

#### 更新多条数据：
```js
db.users.updateMany(
  { age: { $lt: 30 } },  // 查询条件
  { $set: { status: "young" } }  // 更新操作
);
```
此命令会将 `age` 小于 30 的所有文档的 `status` 字段设置为 `"young"`。

### 5. 删除数据（Delete）

删除数据时，我们可以使用 `deleteOne()` 或 `deleteMany()`。

#### 删除单条数据：
```js
db.users.deleteOne({ name: "Bob" });
```
此命令会删除 `name` 为 `"Bob"` 的第一条匹配文档。

#### 删除多条数据：
```js
db.users.deleteMany({ age: { $lt: 30 } });
```
此命令会删除 `age` 小于 30 的所有文档。

### 6. 创建索引

为了提高查询效率，可以为某些字段创建索引。例如，如果你经常根据 `email` 查询用户，可以为 `email` 字段创建索引：

```js
db.users.createIndex({ email: 1 });
```
`1` 表示升序索引，`-1` 表示降序索引。

### 7. 查看数据结构

#### 查看当前数据库中的所有集合：
```js
show collections;
```

#### 查看某个集合的详细信息：
```js
db.users.stats();
```
这将显示有关 `users` 集合的统计信息，例如文档数量、索引信息等。

---

### 总结

以下是 MongoDB 中的基本 CRUD 操作总结：

- **增（Create）**: 使用 `insertOne()` 或 `insertMany()` 来插入数据。
- **查（Read）**: 使用 `find()` 或 `findOne()` 来查询数据。
- **改（Update）**: 使用 `updateOne()` 或 `updateMany()` 来更新数据。
- **删（Delete）**: 使用 `deleteOne()` 或 `deleteMany()` 来删除数据。