// 替换 翻译内容
const fs=require('fs');
const https=require('https');
const pathKet='/Users/qihoo/Documents/study/say.github.io/data/school/a.json';
const ket=JSON.parse(fs.readFileSync(pathKet,'utf8'));

function normalizeWord(name){
  let w=(name||'')
    .replace(/\([^)]*\)/g,'')
    .replace(/[^A-Za-z\-\s']/g,'')
    .trim()
    .toLowerCase();
  return w;
}

function wrapBracket(s){
  if(!s) return '';
  const t=String(s).trim();
  if(!t) return '';
  return /^\[.*\]$/.test(t)?t:`${t}`;
}

// 从带方括号的音标中提取纯音标文本
function unwrapBracket(s){
  if(!s) return '';
  const t=String(s).trim();
  if(!t) return '';
  // 去掉方括号
  return t.replace(/^\[|\]$/g, '');
}

// 切分单词：按空格、/ 和中横线 - 分隔
function splitWords(name){
  if(!name) return [];
  // 按空格、/ 和中横线 - 切分
  return name.split(/[\s\/\-]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

function getJson(url){
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{headers:{'User-Agent':'Mozilla/5.0'}}, (res)=>{
      let data='';
      res.on('data',chunk=>data+=chunk);
      res.on('end',()=>{
        try{ resolve(JSON.parse(data)); }catch(e){ reject(e); }
      });
    });
    req.on('error',reject);
    req.setTimeout(5000,()=>{req.destroy(); reject(new Error('timeout'));});
  });
}

// 从 ec.word[].trs 中提取翻译数组
function extractTrans(ecWord){
  if(!ecWord || !ecWord.trs || !Array.isArray(ecWord.trs)) return [];
  
  const trans=[];
  for(const trItem of ecWord.trs){
    if(trItem.tr && Array.isArray(trItem.tr)){
      for(const tr of trItem.tr){
        if(tr.l && tr.l.i && Array.isArray(tr.l.i)){
          // 将每个翻译项添加到数组中
          for(const item of tr.l.i){
            if(item && typeof item === 'string' && item.trim()){
              trans.push(item.trim());
            }
          }
        }
      }
    }
  }
  return trans;
}

// 修复有道接口 - 使用正确的参数
// https://api.dictionaryapi.dev/api/v2/entries/en/electric
async function fetchYoudao(q){
  // 使用 json=true 参数
  const url=`https://dict.youdao.com/jsonapi?json=true&q=${encodeURIComponent(q)}`;
  try{
    const j=await getJson(url);
    // 检查是否有错误
    if(j.code && j.code !== 0) return null;
    
    // 尝试从不同字段获取音标
    let us=null, uk=null;
    let trans=[];

    
    // 优先从 simple.word[0] 获取（最常见）
    if(j.simple && j.simple.word && Array.isArray(j.simple.word) && j.simple.word[0]){
      const word=j.simple.word[0];
      us=word.usphone || word.usPhonetic;
      uk=word.ukphone || word.ukPhonetic;
    }
    
    // 从 ec.word[0] 获取音标和翻译
    if(j.ec && j.ec.word && Array.isArray(j.ec.word) && j.ec.word[0]){
      const word=j.ec.word[0];
      us=us || word.usphone || word.usPhonetic;
      uk=uk || word.ukphone || word.ukPhonetic;
      // 提取翻译
      trans=extractTrans(word);
    }
    
    // 从 basic 字段获取（新格式）
    if((!us || !uk) && j.basic){
      us=us || j.basic['us-phonetic'] || j.basic['usPhonetic'] || j.basic.phonetic;
      uk=uk || j.basic['uk-phonetic'] || j.basic['ukPhonetic'] || j.basic.phonetic;
    }
    
    const result={};
    if(us || uk){
      result.us=wrapBracket(us);
      result.uk=wrapBracket(uk);
    }
    if(trans.length > 0){
      result.trans=trans;
    }
    
    if(Object.keys(result).length > 0){
      return result;
    }
  }catch(e){
    // 静默失败，尝试下一个源
  }
  return null;}

// 查询单个单词的音标
async function getSingleWordPhones(word){
  const normalized=normalizeWord(word);
  if(!normalized) return null;
  
  // 尝试查询原词和规范化后的词
  const tries=[word, normalized];
  for(const q of tries){
    const r=await fetchYoudao(q);
    if(r && (r.us || r.uk)) return r;
  }
  return null;
}

// 查询单词音标（支持多词拼接）
async function getPhones(name){
  // 检查是否包含空格、/ 或中横线 -
  const words=splitWords(name);
  
  // 如果只有一个词，按原逻辑处理
  if(words.length === 1){
    const r=await getSingleWordPhones(words[0]);
    return r;
  }
  
  // 多个词：分别查询后拼接
  if(words.length > 1){
    const usParts=[];
    const ukParts=[];
    let trans=null;
    
    for(let i=0; i<words.length; i++){
      const word=words[i];
      const r=await getSingleWordPhones(word);
      if(r){
        // 提取纯音标文本（去掉方括号）
        const usText=unwrapBracket(r.us);
        const ukText=unwrapBracket(r.uk);
        if(usText) usParts.push(usText);
        if(ukText) ukParts.push(ukText);
        // 从第一个单词获取 trans（通常是主词）
        if(i === 0 && r.trans && Array.isArray(r.trans) && r.trans.length > 0){
          trans=r.trans;
        }
      }
      // 每个单词之间稍微延迟，避免请求过快（最后一个单词不需要延迟）
      if(i < words.length - 1){
        await sleep(100);
      }
    }
    
    // 拼接结果
    const result={};
    if(usParts.length > 0 || ukParts.length > 0){
      result.us=usParts.length > 0 ? `${usParts.join(' ')}` : '';
      result.uk=ukParts.length > 0 ? `${ukParts.join(' ')}` : '';
    }
    if(trans){
      result.trans=trans;
    }
    if(Object.keys(result).length > 0){
      return result;
    }
  }
  
  return null;
}

(async()=>{
  const missing=new Map();
  for(const [cat, arr] of Object.entries(ket)){
    if(Array.isArray(arr)){
      for(const item of arr){
        if(!item||!item.name) continue;
        const needPhone = !(item.usphone&&String(item.usphone).trim()) || !(item.ukphone&&String(item.ukphone).trim());
        const needTrans = !item.trans || !Array.isArray(item.trans) || item.trans.length === 0;
        // 如果缺少音标或翻译，则需要处理
        if(needPhone || needTrans){
          const key=item.name.trim();
          if(!missing.has(key)) missing.set(key,item);
        }
      }
    }
  }
  const names=[...missing.keys()];
  console.log(`找到 ${names.length} 个需要补充音标或翻译的单词`);
  
  let fetched=0;
  let success=0;
  const pool=3; // 降低并发，避免被封
  let idx=0;
  const results=new Map();
  
  async function worker(){
    while(idx<names.length){
      const i=idx++;
      const name=names[i];
      if(i % 10 === 0) console.log(`处理进度: ${i}/${names.length} (${name})`);
      const r=await getPhones(name);
      results.set(name,r);
      fetched++;
      if(r && (r.us || r.uk || (r.trans && r.trans.length > 0))) success++;
      await sleep(300); // 增加延迟，避免请求过快
    }
  }
  
  await Promise.all(Array.from({length:pool}, worker));
  
  let updated=0;
  let transUpdated=0;
  for(const [cat, arr] of Object.entries(ket)){
    if(Array.isArray(arr)){
      for(const item of arr){
        if(!item||!item.name) continue;
        const r=results.get(item.name.trim());
        if(r){
          if(r.us || r.uk){
            if(!item.usphone || !item.usphone.trim()) item.usphone=r.us || '';
            if(!item.ukphone || !item.ukphone.trim()) item.ukphone=r.uk || '';
            if((r.us || r.uk) && (item.usphone || item.ukphone)) updated++;
          }
          // 更新 trans 字段（如果原来没有或为空）
          if(r.trans && Array.isArray(r.trans) && r.trans.length > 0){
            const needTrans = !item.trans || !Array.isArray(item.trans) || item.trans.length === 0;
            if(needTrans){
              item.trans=r.trans;
              transUpdated++;
            }
          }
        }
        if(item.usphone===undefined) item.usphone='';
        if(item.ukphone===undefined) item.ukphone='';
      }
    }
  }
  
  fs.writeFileSync(pathKet+'.bak_online', fs.readFileSync(pathKet));
  fs.writeFileSync(pathKet, JSON.stringify(ket,null,2));
  console.log(JSON.stringify({
    total: names.length,
    fetched,
    success,
    updated: updated,
    transUpdated: transUpdated
  },null,2));
})();
