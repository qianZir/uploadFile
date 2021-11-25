const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const multiparty = require('multiparty')
const fse = require("fs-extra");
const { Buffer } = require('buffer');
const fs = require('fs');
const EventEmitter = require('events');

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
  const myEmitter = new EventEmitter();

  const formData = {
    filename: undefined,
    hash: undefined,
    chunk: undefined,
  }

  let isFieldOk = false, isFileOk = false;

  multipart.parse(req, function (err, fields, files) {
    formData.filename = fields['filename'][0];
    formData.hash = fields['hash'][0];

    isFieldOk = true;
    myEmitter.emit('start');
  });

  multipart.on('file', function (name, file) {
    formData.chunk = file;
    isFileOk = true;
    myEmitter.emit('start');
  });

  myEmitter.on('start', async () => {
    if (isFieldOk && isFileOk) {
      const { filename, hash, chunk } = formData;
      const dir = `${UPLOAD_DIR}/${filename}`;

      try {
        // 合成目录不存在，创建合成目录
        if (!fse.existsSync(dir)) {
          await fse.mkdirs(dir);
        }
        // if (!fs.existsSync(dir)) fs.mkdirSync(dir);

        const buffer = fs.readFileSync(chunk.path);
        const ws = fs.createWriteStream(`${dir}/${hash}`);
        ws.write(buffer);
        ws.close();

        res.send(`${filename}-${hash} 切片上传成功`)
      } catch (error) {
        console.error(error);
      }

      isFieldOk = false;
      isFileOk = false;

    }
  });
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
    const ws = fs.createWriteStream(`${STATIC_FILES}/${fileName}`);

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
