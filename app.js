// ===== Storage =====
const LS_KEY = 'tvtopik_progress_v1';
function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY)) || {starred:{}}; }
  catch(e){ return {starred:{}}; }
}
function saveProgress(p){ localStorage.setItem(LS_KEY, JSON.stringify(p)); }
let progress = loadProgress();

function wordKey(catId, kr){ return catId + '::' + kr; }
function isStarred(catId, kr){ return !!progress.starred[wordKey(catId,kr)]; }
function toggleStar(catId, kr){
  const k = wordKey(catId,kr);
  if(progress.starred[k]) delete progress.starred[k];
  else progress.starred[k] = true;
  saveProgress(progress);
}
function starCountInCat(cat){
  return cat.words.filter(w=>isStarred(cat.id,w.kr)).length;
}

// ===== Build category index =====
const ALL_CATS = [...VOCAB_DATA.place, ...VOCAB_DATA.topic];
function findCat(id){ return ALL_CATS.find(c=>c.id===id); }

// ===== Branches =====
const BRANCHES = [
  { id: 'vocab-topic', kr: '어휘', label: 'Từ vựng theo chủ đề', ready: true },
  { id: 'grammar', kr: '문법', label: 'Ngữ pháp TOPIK', ready: false },
  { id: 'vocab-sentence', kr: '문형', label: 'Từ vựng theo dạng câu', ready: false }
];

// ===== State =====
let state = {
  branch: 'vocab-topic',
  view: 'home',      // home | category | idioms | starred | soon
  catId: null,
  mode: 'list',       // list | flash
  flashIndex: 0,
  flashOrder: [],
  flashFlipped: false,
  search: ''
};

// ===== DOM refs =====
const sidebarEl = document.getElementById('sidebar');
const mainEl = document.getElementById('main');

function icon(name){
  const icons = {
    home: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    idiom: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    search:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>'
  };
  return icons[name]||'';
}

function renderBranchSwitcher(){
  return `<div class="branch-switch">
    ${BRANCHES.map(b=>`
      <button class="branch-btn ${state.branch===b.id?'active':''}" data-branch="${b.id}">
        <span class="bb-kr kr">${b.kr}</span>
        <span class="bb-label">${b.label}</span>
        ${!b.ready ? '<span class="bb-soon">sắp có</span>' : ''}
      </button>
    `).join('')}
  </div>`;
}

function renderSidebar(){
  const q = state.search.trim().toLowerCase();
  const matchCat = c => !q || c.kr.includes(q) || c.vn.toLowerCase().includes(q);

  const navItem = (id, kr, vn, count, starCount, extraClass='') => {
    const active = (state.view==='category' && state.catId===id) ? 'active' : '';
    return `<div class="nav-item ${active} ${extraClass}" data-nav="${id}">
      <div class="label kr">${kr}<span class="vn-sub">${vn}</span></div>
      <div class="stamp">${starCount>0? starCount+'/'+count : count}</div>
    </div>`;
  };

  const brandBlock = `
    <div class="brand">
      <div class="brand-badge"><img src="${LOGO_FLOWER}" alt="Logo Cô Châm"/></div>
      <div class="brand-text">
        <div class="t1">Tiếng Hàn Cô Châm</div>
        <div class="t2">Luyện thi TOPIK</div>
      </div>
    </div>
    ${renderBranchSwitcher()}
  `;

  let bodyHtml = '';
  if(state.branch === 'vocab-topic'){
    let placeHtml = VOCAB_DATA.place.filter(matchCat).map(c=>navItem(c.id,c.kr,c.vn,c.words.length, starCountInCat(c))).join('');
    let topicHtml = VOCAB_DATA.topic.filter(matchCat).map(c=>navItem(c.id,c.kr,c.vn,c.words.length, starCountInCat(c))).join('');
    bodyHtml = `
      <div class="search-box">
        ${icon('search')}
        <input id="searchInput" type="text" placeholder="Tìm chuyên mục..." value="${state.search}"/>
      </div>
      <div class="nav-item ${state.view==='home'?'active':''}" data-nav="home">
        ${icon('home')}<div class="label">Trang chủ</div>
      </div>
      <div class="nav-item ${state.view==='starred'?'active':''}" data-nav="starred">
        ${icon('star')}<div class="label">Từ đã đánh dấu</div>
        <div class="stamp">${Object.keys(progress.starred).length}</div>
      </div>
      <div class="nav-item ${state.view==='idioms'?'active':''}" data-nav="idioms">
        ${icon('idiom')}<div class="label">Thành ngữ (có ví dụ)</div>
        <div class="stamp">${VOCAB_DATA.idioms.length}</div>
      </div>

      ${placeHtml ? `<div class="nav-group-title">Từ vựng theo địa điểm</div>${placeHtml}` : ''}
      ${topicHtml ? `<div class="nav-group-title">Từ vựng theo chủ đề</div>${topicHtml}` : ''}
      ${(!placeHtml && !topicHtml) ? `<div class="nav-empty">Không tìm thấy chuyên mục nào.</div>` : ''}
    `;
  } else {
    const b = BRANCHES.find(x=>x.id===state.branch);
    bodyHtml = `
      <div class="nav-item active" data-nav="soon">
        ${icon('home')}<div class="label">${b.label}</div>
      </div>
      <div class="nav-empty">Nội dung đang được biên soạn.</div>
    `;
  }

  sidebarEl.innerHTML = brandBlock + bodyHtml;

  sidebarEl.querySelectorAll('[data-branch]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.branch = el.dataset.branch;
      state.view = state.branch==='vocab-topic' ? 'home' : 'soon';
      state.catId = null;
      searchFocused = false;
      sidebarEl.classList.remove('open');
      render();
      window.scrollTo(0,0);
    });
  });

  sidebarEl.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const nav = el.dataset.nav;
      if(nav==='home'){ state.view='home'; }
      else if(nav==='starred'){ state.view='starred'; state.mode='list'; }
      else if(nav==='idioms'){ state.view='idioms'; }
      else if(nav==='soon'){ state.view='soon'; }
      else { state.view='category'; state.catId=nav; state.mode='list'; }
      searchFocused = false;
      sidebarEl.classList.remove('open');
      render();
      window.scrollTo(0,0);
    });
  });

  const si = document.getElementById('searchInput');
  if(si){
    si.addEventListener('input', e=>{
      state.search = e.target.value;
      searchFocused = true;
      renderSidebar();
    });
    if(searchFocused){
      si.focus();
      si.selectionStart = si.selectionEnd = si.value.length;
    }
  }
}
let searchFocused = false;

// ===== Views =====
function renderHome(){
  const totalWords = ALL_CATS.reduce((s,c)=>s+c.words.length,0);
  mainEl.innerHTML = `
    <div class="home-hero">
      <img class="hero-logo" src="${LOGO_BANNER}" alt="Tiếng Hàn Cô Châm"/>
      <div class="eyebrow mono">TIẾNG HÀN CÔ CHÂM · 학습 여권</div>
      <h1>Hộ chiếu từ vựng TOPIK</h1>
      <p>Mỗi chuyên mục là một "trạm" trong hành trình học tiếng Hàn — từ sân bay, ngân hàng, bệnh viện đến cảm xúc, xã hội, lịch sử. Ôn từ vựng bằng danh sách hoặc flashcard, đánh dấu ⭐ từ cần ôn lại.</p>
      <div class="home-stats">
        <div><b class="mono">${totalWords}</b><span>Từ vựng</span></div>
        <div><b class="mono">${ALL_CATS.length}</b><span>Chuyên mục</span></div>
        <div><b class="mono">${VOCAB_DATA.idioms.length}</b><span>Thành ngữ có ví dụ</span></div>
      </div>
    </div>

    <div class="section-label">Từ vựng theo địa điểm</div>
    <div class="home-grid">
      ${VOCAB_DATA.place.map(c=>`
        <div class="home-card" data-go="${c.id}">
          <div class="hc-kr kr">${c.kr}</div>
          <div class="hc-vn">${c.vn}</div>
          <div class="hc-count">${c.words.length} từ</div>
        </div>`).join('')}
    </div>

    <div class="section-label">Từ vựng theo chủ đề</div>
    <div class="home-grid">
      ${VOCAB_DATA.topic.map(c=>`
        <div class="home-card" data-go="${c.id}">
          <div class="hc-kr kr">${c.kr}</div>
          <div class="hc-vn">${c.vn}</div>
          <div class="hc-count">${c.words.length} từ</div>
        </div>`).join('')}
    </div>
  `;
  mainEl.querySelectorAll('[data-go]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.view='category'; state.catId=el.dataset.go; state.mode='list';
      render(); window.scrollTo(0,0);
    });
  });
}

function wordListHtml(catId, words){
  if(words.length===0) return `<div class="empty-note">Không có từ nào.</div>`;
  return `<div class="word-grid">
    ${words.map(w=>`
      <div class="word-card">
        <button class="star-btn ${isStarred(catId,w.kr)?'on':''}" data-star="${w.kr}">★</button>
        <div class="w-kr kr">${w.kr}</div>
        <div class="w-vn">${w.vn}</div>
        ${w.ex ? `<div class="w-ex">${w.ex}</div>` : ''}
      </div>
    `).join('')}
  </div>`;
}

function bindStars(catId){
  mainEl.querySelectorAll('[data-star]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      toggleStar(catId, btn.dataset.star);
      btn.classList.toggle('on');
      renderSidebar();
    });
  });
}

function renderCategory(){
  const cat = findCat(state.catId);
  if(!cat){ state.view='home'; return renderHome(); }
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">CHUYÊN MỤC</div>
        <div class="page-title kr">${cat.kr}<span class="vn">${cat.vn}</span></div>
        <div class="page-sub">${cat.words.length} từ vựng · ${starCountInCat(cat)} đã đánh dấu</div>
      </div>
      <div class="mode-tabs">
        <button data-m="list" class="${state.mode==='list'?'active':''}">Danh sách</button>
        <button data-m="flash" class="${state.mode==='flash'?'active':''}">Flashcard</button>
      </div>
    </div>
    <div id="viewBody"></div>
  `;
  mainEl.querySelectorAll('[data-m]').forEach(b=>{
    b.addEventListener('click', ()=>{ state.mode=b.dataset.m; startFlashIfNeeded(cat); renderCategoryBody(cat); });
  });
  startFlashIfNeeded(cat);
  renderCategoryBody(cat);
}

function renderStarred(){
  const words = [];
  ALL_CATS.forEach(c=>{
    c.words.forEach(w=>{ if(isStarred(c.id,w.kr)) words.push({...w, _cat:c}); });
  });
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">ĐÃ ĐÁNH DẤU</div>
        <div class="page-title kr">⭐ Từ cần ôn lại</div>
        <div class="page-sub">${words.length} từ</div>
      </div>
      <div class="mode-tabs">
        <button data-m="list" class="${state.mode==='list'?'active':''}">Danh sách</button>
        <button data-m="flash" class="${state.mode==='flash'?'active':''}">Flashcard</button>
      </div>
    </div>
    <div id="viewBody"></div>
  `;
  const pseudoCat = {id:'__starred__', words};
  mainEl.querySelectorAll('[data-m]').forEach(b=>{
    b.addEventListener('click', ()=>{ state.mode=b.dataset.m; startFlashIfNeeded(pseudoCat); renderStarredBody(words); });
  });
  startFlashIfNeeded(pseudoCat);
  renderStarredBody(words);
}
function renderStarredBody(words){
  const body = document.getElementById('viewBody');
  if(state.mode==='list'){
    if(words.length===0){
      body.innerHTML = `<div class="empty-note">Chưa đánh dấu từ nào. Bấm ★ trên thẻ từ vựng để lưu vào đây.</div>`;
      return;
    }
    body.innerHTML = `<div class="word-grid">${words.map(w=>`
      <div class="word-card">
        <button class="star-btn on" data-star2="${w._cat.id}::${w.kr}">★</button>
        <div class="w-kr kr">${w.kr}</div>
        <div class="w-vn">${w.vn}</div>
        ${w.ex ? `<div class="w-ex">${w.ex}</div>` : ''}
      </div>`).join('')}</div>`;
    body.querySelectorAll('[data-star2]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const [cid, kr] = btn.dataset.star2.split('::');
        toggleStar(cid, kr);
        renderSidebar(); renderStarredBody(ALL_CATS.flatMap(c=>c.words.filter(w=>isStarred(c.id,w.kr)).map(w=>({...w,_cat:c}))));
      });
    });
  } else {
    renderFlashBody({id:'__starred__', words});
  }
}

function renderCategoryBody(cat){
  const body = document.getElementById('viewBody');
  if(state.mode==='list'){
    body.innerHTML = wordListHtml(cat.id, cat.words);
    bindStars(cat.id);
  } else {
    renderFlashBody(cat);
  }
}

function renderIdioms(){
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">관용 표현</div>
        <div class="page-title kr">Thành ngữ tiếng Hàn<span class="vn">có ví dụ minh họa</span></div>
        <div class="page-sub">${VOCAB_DATA.idioms.length} thành ngữ, mỗi thành ngữ kèm câu ví dụ và nghĩa tiếng Việt</div>
      </div>
    </div>
    <div>
      ${VOCAB_DATA.idioms.map(it=>`
        <div class="idiom-card">
          <div class="i-term kr">${it.term}</div>
          <div class="i-ex kr">${it.example_kr}</div>
          <div class="i-vn">${it.meaning_vn}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ===== Flashcard =====
function startFlashIfNeeded(cat){
  if(state.mode!=='flash') return;
  if(state._flashCatId !== cat.id){
    state._flashCatId = cat.id;
    state.flashOrder = cat.words.map((_,i)=>i);
    shuffleArr(state.flashOrder);
    state.flashIndex = 0;
    state.flashFlipped = false;
  }
}
function shuffleArr(a){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
}

function renderFlashBody(cat){
  const body = document.getElementById('viewBody');
  if(cat.words.length===0){
    body.innerHTML = `<div class="empty-note">Chưa có từ nào để ôn.</div>`;
    return;
  }
  const idx = state.flashOrder[state.flashIndex];
  const w = cat.words[idx];
  const realCatId = (cat.id==='__starred__' && w._cat) ? w._cat.id : cat.id;
  const starred = isStarred(realCatId, w.kr);

  body.innerHTML = `
    <div class="flash-wrap">
      <div class="flash-progress mono">${state.flashIndex+1} / ${cat.words.length}</div>
      <div class="flash-stage">
        <div class="flash-card ${state.flashFlipped?'flipped':''}" id="flashCardEl">
          <div class="flash-face front">
            <div class="fc-kr kr">${w.kr}</div>
            <div class="fc-hint mono">Chạm để xem nghĩa</div>
          </div>
          <div class="flash-face back">
            <div class="fc-vn">${w.vn}</div>
            ${w.ex ? `<div class="fc-ex"><span class="lbl">Ví dụ</span>${w.ex}</div>` : `<div class="fc-noex">Ví dụ mẫu sẽ được bổ sung sau</div>`}
          </div>
        </div>
      </div>
      <div class="flash-controls">
        <button class="fc-btn ghost" id="fPrev">‹</button>
        <button class="fc-btn wide ${starred?'gold':''}" id="fStar">${starred?'★ Đã đánh dấu':'☆ Đánh dấu'}</button>
        <button class="fc-btn ghost" id="fShuffle">⟳</button>
        <button class="fc-btn ghost" id="fNext">›</button>
      </div>
    </div>
  `;

  document.getElementById('flashCardEl').addEventListener('click', ()=>{
    state.flashFlipped = !state.flashFlipped;
    document.getElementById('flashCardEl').classList.toggle('flipped');
  });
  document.getElementById('fNext').addEventListener('click', (e)=>{
    e.stopPropagation();
    state.flashIndex = (state.flashIndex+1) % cat.words.length;
    state.flashFlipped = false;
    renderFlashBody(cat);
  });
  document.getElementById('fPrev').addEventListener('click', (e)=>{
    e.stopPropagation();
    state.flashIndex = (state.flashIndex-1+cat.words.length) % cat.words.length;
    state.flashFlipped = false;
    renderFlashBody(cat);
  });
  document.getElementById('fShuffle').addEventListener('click', (e)=>{
    e.stopPropagation();
    shuffleArr(state.flashOrder);
    state.flashIndex = 0; state.flashFlipped=false;
    renderFlashBody(cat);
  });
  document.getElementById('fStar').addEventListener('click', (e)=>{
    e.stopPropagation();
    toggleStar(realCatId, w.kr);
    renderSidebar();
    renderFlashBody(cat);
  });
}

function renderSoon(){
  const b = BRANCHES.find(x=>x.id===state.branch) || BRANCHES[0];
  mainEl.innerHTML = `
    <div class="soon-wrap">
      <div class="soon-badge kr">${b.kr}</div>
      <div class="eyebrow mono">SẮP RA MẮT</div>
      <h2 class="soon-title">${b.label}</h2>
      <p class="soon-text">Phần này đang được Cô Châm biên soạn và sẽ được bổ sung trong thời gian tới. Trong lúc chờ, học viên có thể ôn từ vựng theo chủ đề TOPIK ở nhánh bên cạnh.</p>
      <button class="fc-btn wide gold" id="soonGo">Đến Từ vựng theo chủ đề TOPIK</button>
    </div>
  `;
  const btn = document.getElementById('soonGo');
  if(btn) btn.addEventListener('click', ()=>{
    state.branch = 'vocab-topic'; state.view='home';
    render(); window.scrollTo(0,0);
  });
}

// ===== Router / render =====
function render(){
  if(state.branch !== 'vocab-topic'){ renderSoon(); renderSidebar(); return; }
  if(state.view==='home') renderHome();
  else if(state.view==='category') renderCategory();
  else if(state.view==='starred') renderStarred();
  else if(state.view==='idioms') renderIdioms();
  else renderHome();
  renderSidebar();
}

document.getElementById('menuBtn').addEventListener('click', ()=>{
  sidebarEl.classList.toggle('open');
});

render();
