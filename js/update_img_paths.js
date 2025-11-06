const fs = require('fs');
const path = '/Users/qihoo/Documents/study/say.github.io/data/school/english-for-little-ones.json';

function run(){
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  let updated = 0;
  for(const lesson of Object.keys(data)){
    const arr = data[lesson];
    if(!Array.isArray(arr)) continue;
    for(const item of arr){
      if(item && typeof item === 'object'){
        const target = './img/' + item.name + '.png';
        if(item.img !== target){
          item.img = target;
          updated++;
        }
      }
    }
  }
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  console.log('img fields set:', updated);
}

run();


