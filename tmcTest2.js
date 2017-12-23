var TmcClient = require('../index.js').TmcClient;

var tmcClient = new TmcClient('xx','xx','default');

var redis = require("redis");
var client = redis.createClient(6377,"192.168.199.140");
var channel="taobao_list";

//链接mysql
var mysql = require('mysql');
var connection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'tb_yrorder',
});
connection.connect();


tmcClient.connect('ws://mc.api.taobao.com/',
    function (message) {
      var aa={
        send_msg:JSON.stringify(message),
        return_msg:000000,
      }
                    connection.query("INSERT into tb_yr_log SET ?",aa,function(err,res){
                    if(err){
                        console.log("[INSERT ERROR]"+err);
                    }else{
                      // console.log(response.trade,"====================");
                    }
                  });
        console.log(message);
        var content = message.content;
        var content_deal = JSON.parse(content);

        if("type" in content_deal){
          content = content.replace(/"tid":/,'"tid":"');
          content = content.replace(/,"type":/,'","type":');
        }else{
          content = content.replace(/"tid":/,'"tid":"');
          content = content.replace(/}/,'"}');
        }

        console.log(content);
        message.content=content;
        console.log(message);
		    client.lpush(channel,JSON.stringify(message));

    });
