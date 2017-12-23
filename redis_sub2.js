//设置redis
var redis = require("redis");
var client = redis.createClient(6377, "192.168.199.140");
var Async = require('async');
//处理时间格式
var sd = require("silly-datetime");
//md5
var md5=require("md5");

var time=sd.format(new Date(),'YYYY-MM-DD HH:mm:ss');
console.log(time);
//链接mysql
var mysql = require('mysql');
var connection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'tb_yrorder',
});
connection.connect();

//链接api（yr和tb）
ApiClient = require('../index.js').ApiClient;

const client_yr = new ApiClient({
      'appkey':'xxx',
      'appsecret':'xxx',
      'url':'http://xxx/xpi/api.php'
  });

  const client_tb = new ApiClient({
      'appkey': 'xxx',
      'appsecret': 'xxx',
      'REST_URL': 'https://xxx/router/rest'
  });
//定义常量，之后使用
var channel="taobao_list";
var expire = "taobao_expire";
var maxlength=15;

(async function send_to_erp(){

      var len =await llen(channel);//先查长度
      var msg = [];//msg为发送到erp的数据
      if(len>maxlength){
        var length=maxlength;
      }else{
        var length = len;
        console.log("少于15条");
      }
      var get_msgs;
      var tids = [];//插入数据库的tid们
      for(var i=0;i<length;i++){
        get_msgs = await get_msg(channel)
        msg.push(get_msgs);
        tids.push(get_msgs.trade.tid);
      }
      console.log(msg,111111111111111);
      // 推送到erp
      client_yr.execute('Order.upload',{'trades':msg},function (error,response) {

        var send_msgs={
          send_msg:JSON.stringify({'trades':JSON.stringify(msg)}),
          time:sd.format(new Date(),'YYYY-MM-DD HH:mm:ss'),
          tid:tids.join(),
        };
          if(!error){
            send_msgs.return_msg=JSON.stringify(response);
            send_msgs.is_success=1;
          }else{
            //发生错误
            send_msgs.return_msg=JSON.stringify(error);
            send_msgs.is_success=0;

         }
         connection.query("INSERT INTO tb_yr_log SET ?",send_msgs,function(err,result){
           if(err){
               console.log("[INSERT ERROR]"+err);
           }

         });

      });

    //再延迟两秒递归
    setTimeout(function(){
      send_to_erp();
      console.log(sd.format(new Date(),'YYYY-MM-DD HH:mm:ss'));
    },2000);

})()

//获取队列长度
function llen(channel){
  return new Promise((resolve,reject)=>{
    client.llen(channel,(err,len)=>{
      resolve(len);
    });
  });
}

function hexists(key){

  var only_key = md5(key);
  //唯一键值对=>包含命令的时间(时间戳)和剩余次数
  var hmsg={
    res:"5",
    time:Date.now(),
    is_success:0
  };
    //查找这个键存不存在
    client.hexists("msg:"+only_key,'res',function(err,res){
      if(!err){
        //问题：不存在的时候返回err还是res
          if(res==1){//说明存在
              client.hget("msg"+only_key,'res',function(err,res){
                  if(res==0){//说明已经五次了，这个就不处理了//不是0的话还要重新放入队列中

                  }else{
                    client.hmset("msg:"+only_key,hmsg,function(err,res){
                        if(err){
                          console.log(err);
                        }else{
                          console.log(res);
                        }
                    });
                  }
              })
          }else{
            //不存在的时候要进行设置
            //每个对应的数据都有一个对应的hash但是成功之后会删除，过期时间也是
            client.hmset("msg:"+only_key,hmsg,function(err,res){
                if(err){
                  console.log(err);
                }else{
                  console.log(res);
                }
            });
            //设置一天的过期时间
            client.expire("msg"+only_key,86400,function(err,res){
                if(err){
                  console.log(err);
                }else{
                  console.log(res);
                }
            });

          }

      }else{
        console.log(err);
      }
    });



}


//处理两个动作，
//1.从redis中取出数据并且插入数据库
//2.通过淘宝api获取数据
//3.这些数据会在deal_res中组装并且往erp推送
function get_msg(channel){
  return new Promise((resolve,reject)=>{

    client.brpop(channel,10,(err,reply)=>{
        //第一个reply返回的是list的名称
        if(!err){

            var res = JSON.parse(reply[1]);
            var aaa = JSON.parse(res.content);

            // //访问淘宝，获取数据
            // client_tb.execute('taobao.trade.fullinfo.get', {
            //     'fields':'tid,status,seller_nick,buyer_nick,created,modified',
            //     'tid':aaa.tid,
            //     'session':'6101a137b31663420e93f17553701a26dce47422516ae8469362816',
            // }, function(error, response) {
            //     if (!error){
            //         //获取数据之后插入数据库
            //         //先查有没有数据
            //         connection.query("SELECT * FROM tb_msg_log WHERE tid='"+aaa.tid+"'",function(err,result){
            //           if(Object.keys(result).length!=0){
            //             //说明有这条记录
            //             delete(response.trade.tid_str);
            //             delete(response.trade.tid);
            //             response.trade.data = JSON.stringify(response);
            //             response.trade.update_time = sd.format(new Date(),'YYYY-MM-DD HH:mm:ss');
            //             connection.query("UPDATE tb_msg_log SET ? where tid='"+aaa.tid+"'",response.trade,function(err,res){
            //               if(err){
            //                   console.log("[UPDATE ERROR]"+err);
            //               }else{
            //                   // console.log("=============",response.trade,"====================");
            //               }
            //             });
            //
            //             // console.log(response.trade,"222222222222222");
            //           }else{
            //             //说明没有这条记录
            //             delete(response.trade.tid_str);
            //             response.trade.data = JSON.stringify(response);
            //             response.trade.time = sd.format(new Date(),'YYYY-MM-DD HH:mm:ss');
            //             connection.query("INSERT into tb_msg_log SET ?",response.trade,function(err,res){
            //               if(err){
            //                   console.log("[INSERT ERROR]"+err);
            //               }else{
            //                 // console.log(response.trade,"====================");
            //               }
            //             });
            //           }
            //         });
            //         //将数据返回上一层
            //         resolve(response);
            //     }
            //     else{
            //       reject(error);
            //       console.log("获取淘宝数据出错"+JSON.stringify(error));
            //     }
            // });

        }else{
          console.log("pop出现问题");
          console.log(err);
        }
    });

  });

}
