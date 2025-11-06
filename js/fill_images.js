const fs = require('fs');
const path = require('path');

const ROOT = '/Users/qihoo/Documents/study/say.github.io';
const dataJsonPath = path.join(ROOT, 'data/data.json');
const littlePath = path.join(ROOT, 'data/school/english-for-little-ones.json');
const imgDir = path.join(ROOT, 'img');

function normalize(word){
  return (word || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function loadJSON(p){
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function buildWordToImgMap(data){
  const map = new Map();
  Object.values(data).forEach(arr => {
    if(Array.isArray(arr)){
      arr.forEach(item => {
        if(item && item.word && item.img){
          const keys = new Set([
            item.word,
            item.word.toLowerCase(),
            normalize(item.word),
            item.word.replace(/\s+/g, '-')
          ]);
          keys.forEach(k => map.set(k, item.img));
        }
      });
    }
  });
  return map;
}

function findExistingImage(word){
  const candidates = [];
  const baseNames = new Set([
    word,
    word.toLowerCase(),
    normalize(word),
    word.replace(/\s+/g, '-')
  ]);
  const exts = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  baseNames.forEach(base => exts.forEach(ext => candidates.push(path.join(imgDir, `${base}${ext}`))));
  for(const p of candidates){
    if(fs.existsSync(p)){
      return `./img/${path.basename(p)}`;
    }
  }
  return null;
}

function makeSVGPlaceholder(word, trans){
  const W = 512, H = 384;
  const bg = '#f2f3f5';
  const fg = '#34495e';
  const sub = '#7f8c8d';
  const title = (word || '').toLowerCase();
  const subText = Array.isArray(trans) && trans[0] ? trans[0] : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n`+
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n`+
    `  <rect width="100%" height="100%" fill="${bg}" rx="24"/>\n`+
    `  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial" text-anchor="middle">\n`+
    `    <text x="256" y="190" font-size="64" font-weight="700" fill="${fg}">${title}</text>\n`+
    `    <text x="256" y="250" font-size="28" fill="${sub}">${subText}</text>\n`+
    `  </g>\n`+
    `</svg>`;
}

function ensureDir(p){
  if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main(){
  const baseData = loadJSON(dataJsonPath);
  const little = loadJSON(littlePath);
  const map = buildWordToImgMap(baseData);
  ensureDir(imgDir);

  let added = 0, matched = 0;

  Object.keys(little).forEach(lesson => {
    const arr = little[lesson];
    if(!Array.isArray(arr)) return;
    for(const item of arr){
      if(!item || !item.name) continue;
      if(item.img && typeof item.img === 'string') continue; // 已有

      const name = item.name;
      // 1) data.json 映射
      let img = map.get(name) || map.get(name.toLowerCase()) || map.get(normalize(name));
      if(!img){
        // 2) 直接在 img 目录里找现成文件
        img = findExistingImage(name);
      }
      if(!img){
        // 3) 生成 SVG 占位图
        const svg = makeSVGPlaceholder(name, item.trans);
        const svgName = `${normalize(name) || 'placeholder'}.svg`;
        const outPath = path.join(imgDir, svgName);
        fs.writeFileSync(outPath, svg, 'utf8');
        img = `./img/${svgName}`;
        added++;
      } else {
        matched++;
      }
      item.img = img;
    }
  });

  fs.writeFileSync(littlePath, JSON.stringify(little, null, 2), 'utf8');
  console.log(`Images filled. matched=${matched}, generated_svg=${added}`);
}

main();


