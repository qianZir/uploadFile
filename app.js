const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const fse = require("fs-extra");
const { Buffer } = require('buffer');
const fs = require('fs');

const app = express()
const port = 3033


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')))

app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  next()
})

const UPLOAD_DIR = path.resolve(__dirname, './static')
const STATIC_FILES = path.resolve(__dirname, './static/files');

app.post('/upload', function (req, res) {

  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      return;
    }
    const [chunk] = files.file;
    const [hash] = fields.hash;
    const [filename] = fields.filename;
    const chunkDir = path.resolve(UPLOAD_DIR, filename);

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }
    await fse.move(chunk.path, `${chunkDir}/${hash}`);
    res.json({ code: 0, data: '', msg: '切片成功' });
  })
})





app.post('/merge', async (req, res) => {
  const { fileName } = req.body;

  try {
    let len = 0;
    const bufferList = fs.readdirSync(`${UPLOAD_DIR}/${fileName}`).map(hash => {
      const buffer = fs.readFileSync(`${UPLOAD_DIR}/${fileName}/${hash}`);

      len += buffer.length;
      return buffer;
    });


    const buffer = Buffer.concat(bufferList, len);
    // 合成目录不存在，创建合成目录
    if (!fse.existsSync(`${STATIC_FILES}/${fileName}`)) {
      await fse.mkdirs(`${STATIC_FILES}/${fileName}`);
    }
    const ws = fs.createWriteStream(`${STATIC_FILES}/${fileName}/${fileName}.mp4`);

    ws.write(buffer);
    ws.close();

    res.send(`切片合并完成`);
  } catch (error) {
    console.error(error);
  }

})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
