

var redis = require("redis");
var client = redis.createClient(6397, "192.168.199.140");

var client2 = redis.createClient(6377, "192.168.199.140");

ApiClient = require('../index.js').ApiClient;

const client_yr = new ApiClient({
      'appkey':'xxx',
      'appsecret':'xxx',
      'url':'http://xxx/xpi/api.php'
  });

  var client_tb = new ApiClient({
      'appkey': 'xxx',
      'appsecret': 'xxxx',
      'REST_URL': 'https://xxx/router/rest'
  });


function getRedisData() {
    //客户端连接redis成功后执行回调
    client.on("ready", function () {
        //订阅消息
        client.subscribe("taobao");
        console.log("订阅成功。。。");
    });

    client.on("error", function (error) {
        console.log("Redis Error " + error);
    });

    //监听订阅成功事件
    client.on("subscribe", function (channel, count) {
        console.log("client subscribed to " + channel + "," + count + "total subscriptions");

    });

    //收到消息后执行回调，message是redis发布的消息
    client.on("message", function (channel, message) {
        //应当是循环取值，并且是规定时间和数据量
        //先获取队列长度
        client2.llen(channel+"_list",function(err,len){
          console.log("llen:"+len);

        });


        console.log("get msg:" + message);
        //从队列中取值
        client2.rpop(channel+"_list",function(err,reply){
          // console.log("reply:"+reply);
        if(!err){
            var res = JSON.parse(reply);
            console.log("res:"+res);
            console.log("content:"+res.content);
            var aaa = JSON.parse(res.content);
            console.log(aaa.tid);
            //访问淘宝，获取数据
            client_tb.execute('taobao.trade.fullinfo.get', {
                'fields':'tid,type,status,payment,orders',
                'tid':aaa.tid,
                'session':'6101a137b31663420e93f17553701a26dce47422516ae8469362816',
            }, function(error, response) {
                if (!error){
                  //访问云锐，获取数据
                    console.log("response",response);
                    client_yr.execute('Order.upload',
                        {
                            'trades':response,
                        },
                        function (error,response) {
                            if(!error)
                                console.log("response:"+response);
                            else
                                console.log(error);
                        }
                    );
                }
                else{
                  console.log(error);
                }
            });

          }else{

            console.log(err);
          }


        });

    });

    //监听取消订阅事件
    client.on("unsubscribe", function (channel, count) {
        console.log("client unsubscribed from" + channel + ", " + count + " total subscriptions")
    });
}

getRedisData();
