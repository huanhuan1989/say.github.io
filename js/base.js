let voices = [];
let isPlaying = false;

function soundCallBack(callBack) {
  // 等待语音加载完成
  speechSynthesis.addEventListener('voiceschanged', () => {
    voices = speechSynthesis.getVoices();
    callBack && voices.length && callBack(voices);
  });
}

function playSpeech(content, langType, speaker, waveGroup) {
  if (isPlaying) return;
  const msg = new SpeechSynthesisUtterance(content);
  // 筛选女性声音
  const femaleVoices = voices.filter(voice => {
    const name = voice.name.toLowerCase();
    return (name.includes('female') || 
      name.includes('woman') || 
      name.includes('zira') || 
      name.includes('karen') ||
      name.includes('samantha') ||
      name.includes('victoria') ||
      name.includes('monica') ||
      name.includes('alice')) && 
      voice.lang.startsWith('en');
  });

  // 优先选择匹配语言的女性声音
  const targetVoice = femaleVoices.find(voice => voice.lang === langType) || femaleVoices.find(voice => voice.lang.startsWith('en')) || voices[0];
  
  if (targetVoice) {
    msg.voice = targetVoice;
    console.log('使用声音:', targetVoice.name);
  }

  msg.lang = langType;
  msg.rate = 1;  // 稍慢的语速
  msg.pitch = 1.5; // 较高的音调（女性特征）
  msg.volume = 1;

  const waveCount = getWaveCount(content, msg.rate, waveGroup);
  let startTime = 0;
  msg.onstart = () => {
    if (!speaker) return;
    startTime = performance.now();
    isPlaying = true;
    setWaveCount(waveCount, waveGroup); // 默认两条波纹
    speaker.classList.add('playing');
  };

  msg.onend = () => {
    if (!speaker) return;
    const duration = (performance.now() - startTime) / 1000;
    console.log(`✅ 播放完毕，耗时 ${duration.toFixed(2)}s`);
    stopWaves(waveGroup);
  };
  
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}
// sound svg
/** ✅ 动态生成波纹并调整 viewBox */
function setWaveCount(count, waveGroup) {
  waveGroup.innerHTML = '';
  const spacing = 8;
  const baseRight = 46 + spacing * (count - 1) + 12; // 额外留白
  speaker.setAttribute('viewBox', `0 0 ${baseRight} 64`);

  for (let i = 0; i < count; i++) {
    const offset = spacing * i;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'wave');
    path.setAttribute('d', `M${44 + offset} ${24 - offset/2} Q${54 + offset} 32 ${44 + offset} ${40 + offset/2}`);
    path.style.animationDelay = `${0.3 * i}s`;
    waveGroup.appendChild(path);
  }
}

/** ✅ 根据内容长度和语速决定波纹数量 */
function getWaveCount(content, rate, waveGroup) {
  const len = content.length;
  let base = Math.ceil(len / 6);
  if (rate > 1.3) base -= 1;
  return Math.max(2, Math.min(base, 5));
}

/** ✅ 停止播放后清理波纹 */
function stopWaves(waveGroup) {
  speaker.classList.remove('playing');
  waveGroup.innerHTML = '';
  isPlaying = false;
}


/** ✅ 播放 */
function speakFemale(content, langType, speaker, waveGroup) {
  if ('speechSynthesis' in window) {
    if (!voices.length) {
      return soundCallBack(playSpeech(content, langType, speaker, waveGroup));
    }
    playSpeech(content, langType, speaker, waveGroup);
  } else {
    alert('您的浏览器不支持语音合成功能，请使用Chrome或Edge浏览器。');
  }
}
