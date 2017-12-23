// var Async = require('async');
var redis = require("redis");
var client = redis.createClient(6377, "192.168.199.140");

// function test(){
//   return new Promise((resolve,reject)=>{
//       client.rpop("my_list",(err,len)=>{
//         resolve(len);
//       });
//   });
//
// }
//
// async function ccc(){
//   var a=[];
//   for(var i=0;i<10;i++){
//     a.push(await test());
//   }
//   console.log(a);
// }
//
// ccc();


function key_exists(key){
 return new Promise((resolve,reject)=>{
  var only_key = md5(key);
  var max = 5;
  var expire_time = 86400;//过期时间

  console.log(only_key,"==========");
  //唯一键值对=>包含命令的时间(时间戳)和剩余次数
  client.exists("msg:"+only_key,function(err,reply){
      if(!err){
            if(reply==1){
              //说明存在

            }else{
              //说明不存在
              client.set("msg:"+only_key,max,function(err,reply){
                    if(reply=="OK"){
                        //说明设置成功
                        console.log(reply)''
                    }
              });
              client.expire("msg:"+only_key,expire_time,function(err,reply){

              })
            }
      }
  });



});


}
