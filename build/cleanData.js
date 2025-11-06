/**
 * 清空内容使用
 * name: night
 * usphone: ""
 * ukphone: ""
 * trans: []
 */
const fs=require('fs');
const pathKet='/Users/qihoo/Documents/study/say.github.io/data/school/beijing.json';
const data=JSON.parse(fs.readFileSync(pathKet,'utf8'));
let count=0;

function clearFields(obj){
  if(Array.isArray(obj)){
    obj.forEach(item=>clearFields(item));
  }else if(obj && typeof obj==='object'){
    if(obj.usphone!==undefined){
      obj.usphone='';
      count++;
    }
    if(obj.ukphone!==undefined){
      obj.ukphone='';
      count++;
    }
    if(obj.trans!==undefined){
      obj.trans=[];
      count++;
    }
    // 递归处理所有属性
    Object.values(obj).forEach(val=>{
      if(val && typeof val==='object'){
        clearFields(val);
      }
    });
  }
}

// 处理数据
Object.values(data).forEach(arr=>{
  if(Array.isArray(arr)){
    clearFields(arr);
  }else{
    clearFields(arr);
  }
});

// 备份原文件
fs.writeFileSync(pathKet+'.bak_clear', fs.readFileSync(pathKet));
// 保存处理后的文件
fs.writeFileSync(pathKet, JSON.stringify(data,null,2));
console.log('已清空 ' + count + ' 个字段');