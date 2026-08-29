// ===== Storage =====
const LS_KEY = 'tvtopik_progress_v1';
function loadProgress(){
  try{
    const p = JSON.parse(localStorage.getItem(LS_KEY)) || {};
    return {
      starred: p.starred || {},
      learned: p.learned || {},
      gStarred: p.gStarred || {},
      gLearned: p.gLearned || {}
    };
  }
  catch(e){ return {starred:{}, learned:{}, gStarred:{}, gLearned:{}}; }
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
function isLearned(catId, kr){ return !!progress.learned[wordKey(catId,kr)]; }
function toggleLearned(catId, kr){
  const k = wordKey(catId,kr);
  if(progress.learned[k]) delete progress.learned[k];
  else progress.learned[k] = true;
  saveProgress(progress);
}
function starCountInCat(cat){
  return cat.words.filter(w=>isStarred(cat.id,w.kr)).length;
}
function learnedCountInCat(cat){
  return cat.words.filter(w=>isLearned(cat.id,w.kr)).length;
}

// grammar bookmark ("sổ tay") + mastered tracking
function gKey(section, num){ return section + '::' + num; }
function isGStarred(section, num){ return !!progress.gStarred[gKey(section,num)]; }
function toggleGStarred(section, num){
  const k = gKey(section,num);
  if(progress.gStarred[k]) delete progress.gStarred[k];
  else progress.gStarred[k] = true;
  saveProgress(progress);
}
function isGLearned(section, num){ return !!progress.gLearned[gKey(section,num)]; }
function toggleGLearned(section, num){
  const k = gKey(section,num);
  if(progress.gLearned[k]) delete progress.gLearned[k];
  else progress.gLearned[k] = true;
  saveProgress(progress);
}
function gLearnedCountInSection(sectionId){
  return GRAMMAR_SECTIONS[sectionId].filter(g=>isGLearned(sectionId,g.num)).length;
}
function gStarredCountTotal(){
  return Object.keys(progress.gStarred).length;
}

function progressBarHtml(learnedCount, total, extraClass, elId){
  const pct = total>0 ? Math.round(learnedCount/total*100) : 0;
  const idAttr = elId ? ` id="${elId}"` : '';
  return `<div${idAttr} class="pbar ${extraClass||''}"><div class="pbar-fill" style="width:${pct}%"></div></div>`;
}

// ===== Build category index =====
const ALL_TOPIC_CATS = [...VOCAB_DATA.place, ...VOCAB_DATA.topic];
const ALL_DANGDE_CATS = ['3','4','5','6'].flatMap(lv => DANGDE_DATA[lv]);
const ALL_CATS = [...ALL_TOPIC_CATS, ...ALL_DANGDE_CATS];
function findCat(id){ return ALL_CATS.find(c=>c.id===id); }
const DANGDE_LEVELS = [
  { id:'3', label:'Cấp 3' }, { id:'4', label:'Cấp 4' },
  { id:'5', label:'Cấp 5' }, { id:'6', label:'Cấp 6' }
];
function dangdeLevelStats(lv){
  const cats = DANGDE_DATA[lv];
  const totalWords = cats.reduce((s,c)=>s+c.words.length,0);
  const learnedWords = cats.reduce((s,c)=>s+learnedCountInCat(c),0);
  return { catCount: cats.length, totalWords, learnedWords };
}

// ===== Branches (top-level) =====
const BRANCHES = [
  { id: 'vocab', kr: '어휘', label: 'Từ vựng', ready: true },
  { id: 'grammar', kr: '문법', label: 'Ngữ pháp TOPIK', ready: true },
  { id: 'idioms', kr: '관용', label: 'Biểu hiện quán dụng', ready: true }
];

const GRAMMAR_SECTION_META = [
  { id: 'yeongyeol', kr: '연결어미', label: 'Vĩ tố liên kết' },
  { id: 'jongeol', kr: '종결어미', label: 'Vĩ tố kết thúc' },
  { id: 'josa', kr: '조사', label: 'Trợ từ' },
  { id: 'boghap', kr: '복합 표현', label: 'Biểu hiện kết hợp' }
];
function currentGrammarList(){ return GRAMMAR_SECTIONS[state.gSection]; }
function currentGrammarMeta(){ return GRAMMAR_SECTION_META.find(s=>s.id===state.gSection); }

// ===== State =====
let state = {
  branch: 'home',      // home | vocab | grammar | idioms
  vocabSub: 'topic',    // topic | sentence
  view: 'home',         // (vocab-topic) home | category | starred
  catId: null,
  dView: 'levels',      // (vocab-sentence) levels | levelHome | category
  dLevel: null,         // '3' | '4' | '5' | '6'
  dSearch: '',
  mode: 'list',         // list | flash
  flashIndex: 0,
  flashOrder: [],
  flashFlipped: false,
  search: '',
  gView: 'list',        // grammar: list | detail
  gSection: 'yeongyeol', // yeongyeol | jongeol | josa | boghap
  gId: null,
  gSearch: '',
  iSearch: ''           // idiom search
};

// ===== DOM refs =====
const sidebarEl = document.getElementById('sidebar');
const mainEl = document.getElementById('main');

function icon(name){
  const icons = {
    home: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    idiom: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    search:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
    book: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    grammar: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
    quote: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 5-2 5-5V9a2 2 0 0 0-2-2H4v6h3c0 2-1 3-3 3z"/><path d="M14 21c3 0 5-2 5-5V9a2 2 0 0 0-2-2h-2v6h3c0 2-1 3-3 3z"/></svg>'
  };
  return icons[name]||'';
}

// ===== Sidebar =====
function renderBranchSwitcher(){
  return `<div class="branch-switch">
    <button class="branch-btn ${state.branch==='home'?'active':''}" data-tophome="1">
      <span class="bb-kr kr">홈</span>
      <span class="bb-label">Trang chủ</span>
    </button>
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

  if(state.branch === 'vocab'){
    bodyHtml = renderVocabSidebarBody();
  } else if(state.branch === 'grammar'){
    bodyHtml = renderGrammarSidebarBody();
  } else if(state.branch === 'idioms'){
    bodyHtml = renderIdiomsSidebarBody();
  } else {
    bodyHtml = `<div class="nav-empty">Chọn một nhánh học phía trên để bắt đầu.</div>`;
  }

  sidebarEl.innerHTML = brandBlock + bodyHtml;
  bindSidebarEvents();
}

function renderVocabSidebarBody(){
  const q = state.search.trim().toLowerCase();
  const matchCat = c => !q || c.kr.includes(q) || c.vn.toLowerCase().includes(q);
  const navItem = (id, kr, vn, count, starCount, learnedCount) => {
    const active = (state.view==='category' && state.catId===id) ? 'active' : '';
    return `<div class="nav-item nav-item-prog ${active}" data-nav="${id}">
      <div class="nav-item-row">
        <div class="label kr">${kr}<span class="vn-sub">${vn}</span></div>
        <div class="stamp">${starCount>0? starCount+'/'+count : count}</div>
      </div>
      ${progressBarHtml(learnedCount, count)}
    </div>`;
  };

  const subSwitch = `
    <div class="sub-switch">
      <button class="sub-btn ${state.vocabSub==='topic'?'active':''}" data-vsub="topic">Theo chủ đề</button>
      <button class="sub-btn ${state.vocabSub==='sentence'?'active':''}" data-vsub="sentence">Theo cấp độ</button>
    </div>
  `;

  if(state.vocabSub !== 'topic'){
    return subSwitch + renderDangDeSidebarBody();
  }

  let placeHtml = VOCAB_DATA.place.filter(matchCat).map(c=>navItem(c.id,c.kr,c.vn,c.words.length, starCountInCat(c), learnedCountInCat(c))).join('');
  let topicHtml = VOCAB_DATA.topic.filter(matchCat).map(c=>navItem(c.id,c.kr,c.vn,c.words.length, starCountInCat(c), learnedCountInCat(c))).join('');

  return subSwitch + `
    <div class="search-box">
      ${icon('search')}
      <input id="searchInput" type="text" placeholder="Tìm chuyên mục..." value="${state.search}"/>
    </div>
    <div class="nav-item ${state.view==='home'?'active':''}" data-nav="home">
      ${icon('home')}<div class="label">Trang chủ từ vựng</div>
    </div>
    <div class="nav-item ${state.view==='starred'?'active':''}" data-nav="starred">
      ${icon('book')}<div class="label">Sổ tay từ vựng<span class="vn-sub">Từ đã đánh dấu cần ôn</span></div>
      <div class="stamp">${Object.keys(progress.starred).length}</div>
    </div>
    ${placeHtml ? `<div class="nav-group-title">Từ vựng theo địa điểm</div>${placeHtml}` : ''}
    ${topicHtml ? `<div class="nav-group-title">Từ vựng theo chủ đề</div>${topicHtml}` : ''}
    ${(!placeHtml && !topicHtml) ? `<div class="nav-empty">Không tìm thấy chuyên mục nào.</div>` : ''}
  `;
}

function renderDangDeSidebarBody(){
  const dq = state.dSearch.trim().toLowerCase();
  const levelNav = DANGDE_LEVELS.map(lv=>{
    const stats = dangdeLevelStats(lv.id);
    return `
    <div class="nav-item nav-item-prog gsection-item ${state.dLevel===lv.id?'active':''}" data-dlevel="${lv.id}">
      <div class="nav-item-row">
        <div class="label kr">${lv.label}<span class="vn-sub">${stats.catCount} chuyên mục · ${stats.totalWords} từ</span></div>
        <div class="stamp">${stats.totalWords}</div>
      </div>
      ${progressBarHtml(stats.learnedWords, stats.totalWords)}
    </div>`;
  }).join('');

  let catListHtml = '';
  if(state.dLevel){
    const cats = DANGDE_DATA[state.dLevel].filter(c => !dq || c.kr.toLowerCase().includes(dq) || c.vn.toLowerCase().includes(dq));
    catListHtml = `
      <div class="search-box" style="margin-top:14px;">
        ${icon('search')}
        <input id="dSearchInput" type="text" placeholder="Tìm trong Cấp ${state.dLevel}..." value="${state.dSearch}"/>
      </div>
      <div class="nav-item ${state.dView==='levelHome'?'active':''}" data-dnav="levelHome">
        ${icon('home')}<div class="label">Toàn bộ Cấp ${state.dLevel}</div>
      </div>
      <div class="nav-group-title">Chuyên mục — Cấp ${state.dLevel}</div>
      ${cats.map(c=>`
        <div class="nav-item nav-item-prog ${state.dView==='category' && state.catId===c.id?'active':''}" data-dnav="${c.id}">
          <div class="nav-item-row">
            <div class="label kr">${c.kr}<span class="vn-sub">${c.qtype ? c.qtype.skill_vn+' câu '+c.qtype.qnum+' · ' : ''}${c.vn}</span></div>
            <div class="stamp">${c.words.length}</div>
          </div>
          ${progressBarHtml(learnedCountInCat(c), c.words.length)}
        </div>
      `).join('')}
      ${cats.length===0 ? `<div class="nav-empty">Không tìm thấy chuyên mục nào.</div>` : ''}
    `;
  }

  return `
    <div class="nav-group-title">Chọn cấp độ</div>
    ${levelNav}
    ${catListHtml}
  `;
}

function renderGrammarSidebarBody(){
  const gq = state.gSearch.trim().toLowerCase();
  const list = currentGrammarList();
  const meta = currentGrammarMeta();
  const filtered = list.filter(g => !gq || g.term.toLowerCase().includes(gq) || g.meaning.toLowerCase().includes(gq));

  const sectionNav = GRAMMAR_SECTION_META.map(s=>{
    const total = GRAMMAR_SECTIONS[s.id].length;
    const learned = gLearnedCountInSection(s.id);
    return `
    <div class="nav-item nav-item-prog gsection-item ${state.gSection===s.id?'active':''}" data-gsection="${s.id}">
      <div class="nav-item-row">
        <div class="label kr">${s.kr}<span class="vn-sub">${s.label}</span></div>
        <div class="stamp">${total}</div>
      </div>
      ${progressBarHtml(learned, total)}
    </div>
  `;}).join('');

  return `
    <div class="nav-group-title">Chọn mục ngữ pháp</div>
    ${sectionNav}
    <div class="nav-item ${state.gView==='notebook'?'active':''}" data-gnav="notebook">
      ${icon('book')}<div class="label">Sổ tay ngữ pháp<span class="vn-sub">Mục đã đánh dấu</span></div>
      <div class="stamp">${gStarredCountTotal()}</div>
    </div>
    <div class="search-box" style="margin-top:16px;">
      ${icon('search')}
      <input id="gSearchInput" type="text" placeholder="Tìm trong ${meta.kr}..." value="${state.gSearch}"/>
    </div>
    <div class="nav-item ${state.gView==='list'?'active':''}" data-gnav="list">
      ${icon('home')}<div class="label">Toàn bộ ${meta.kr}</div>
      <div class="stamp">${list.length}</div>
    </div>
    <div class="nav-group-title">${meta.kr} (${meta.label})</div>
    ${filtered.map(g=>`
      <div class="nav-item ${state.gView==='detail' && state.gId===g.num ? 'active':''}" data-gnav="${g.num}">
        <div class="label kr">${g.term}<span class="vn-sub">${g.meaning}</span></div>
      </div>
    `).join('')}
    ${filtered.length===0 ? `<div class="nav-empty">Không tìm thấy ngữ pháp nào.</div>` : ''}
  `;
}

function renderIdiomsSidebarBody(){
  return `
    <div class="search-box">
      ${icon('search')}
      <input id="iSearchInput" type="text" placeholder="Tìm biểu hiện..." value="${state.iSearch}"/>
    </div>
    <div class="nav-item active" data-inav="all">
      ${icon('quote')}<div class="label">Toàn bộ biểu hiện</div>
      <div class="stamp">${VOCAB_DATA.idioms.length}</div>
    </div>
  `;
}

function bindSidebarEvents(){
  // top "Trang chủ" (site home)
  sidebarEl.querySelectorAll('[data-tophome]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.branch = 'home';
      searchFocused = false; gSearchFocused = false; iSearchFocused = false;
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });

  // branch switch
  sidebarEl.querySelectorAll('[data-branch]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.branch = el.dataset.branch;
      if(state.branch==='vocab'){ state.vocabSub='topic'; state.view='home'; }
      else if(state.branch==='grammar'){ state.gView='list'; state.gId=null; }
      state.catId = null;
      searchFocused = false; gSearchFocused = false; iSearchFocused = false;
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });

  // vocab sub-switch
  sidebarEl.querySelectorAll('[data-vsub]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.vocabSub = el.dataset.vsub;
      state.view = 'home'; state.catId = null;
      state.dView = 'levels'; state.dLevel = null;
      searchFocused = false; dSearchFocused = false;
      render(); window.scrollTo(0,0);
    });
  });

  // vocab nav
  sidebarEl.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const nav = el.dataset.nav;
      if(nav==='home'){ state.view='home'; }
      else if(nav==='starred'){ state.view='starred'; state.mode='list'; }
      else { state.view='category'; state.catId=nav; state.mode='list'; }
      searchFocused = false;
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });

  // dangde (theo dạng câu) level switch
  sidebarEl.querySelectorAll('[data-dlevel]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.dLevel = el.dataset.dlevel;
      state.dView = 'levelHome'; state.catId = null;
      state.dSearch=''; dSearchFocused=false;
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });
  // dangde category nav
  sidebarEl.querySelectorAll('[data-dnav]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const nav = el.dataset.dnav;
      if(nav==='levelHome'){ state.dView='levelHome'; state.catId=null; }
      else { state.dView='category'; state.catId=nav; state.mode='list'; }
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });

  // grammar section switch (연결어미/종결어미/조사/복합 표현)
  sidebarEl.querySelectorAll('[data-gsection]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.gSection = el.dataset.gsection;
      state.gView = 'list'; state.gId = null;
      state.gSearch = ''; gSearchFocused = false;
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });

  // grammar nav
  sidebarEl.querySelectorAll('[data-gnav]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const nav = el.dataset.gnav;
      if(nav==='list'){ state.gView='list'; state.gId=null; }
      else if(nav==='notebook'){ state.gView='notebook'; state.gId=null; }
      else { state.gView='detail'; state.gId=parseInt(nav,10); }
      gSearchFocused = false;
      sidebarEl.classList.remove('open');
      render(); window.scrollTo(0,0);
    });
  });

  const si = document.getElementById('searchInput');
  if(si){
    si.addEventListener('input', e=>{
      state.search = e.target.value;
      searchFocused = true;
      renderSidebar();
    });
    if(searchFocused){ si.focus(); si.selectionStart = si.selectionEnd = si.value.length; }
  }

  const gsi = document.getElementById('gSearchInput');
  if(gsi){
    gsi.addEventListener('input', e=>{
      state.gSearch = e.target.value;
      gSearchFocused = true;
      renderSidebar();
    });
    if(gSearchFocused){ gsi.focus(); gsi.selectionStart = gsi.selectionEnd = gsi.value.length; }
  }

  const isi = document.getElementById('iSearchInput');
  if(isi){
    isi.addEventListener('input', e=>{
      state.iSearch = e.target.value;
      iSearchFocused = true;
      renderIdiomsPage();
    });
    if(iSearchFocused){ isi.focus(); isi.selectionStart = isi.selectionEnd = isi.value.length; }
  }

  const dsi = document.getElementById('dSearchInput');
  if(dsi){
    dsi.addEventListener('input', e=>{
      state.dSearch = e.target.value;
      dSearchFocused = true;
      renderSidebar();
    });
    if(dSearchFocused){ dsi.focus(); dsi.selectionStart = dsi.selectionEnd = dsi.value.length; }
  }
}

let searchFocused = false;
let gSearchFocused = false;
let iSearchFocused = false;
let dSearchFocused = false;

// ===== Site home (landing overview) =====
function renderSiteHome(){
  const totalWords = ALL_CATS.reduce((s,c)=>s+c.words.length,0);
  mainEl.innerHTML = `
    <div class="home-hero">
      <img class="hero-logo" src="${LOGO_BANNER}" alt="Tiếng Hàn Cô Châm"/>
      <div class="eyebrow mono">TIẾNG HÀN CÔ CHÂM</div>
      <h1>Website hỗ trợ học &amp; luyện thi TOPIK</h1>
      <p>Đây là nơi tổng hợp tài liệu do Tiếng Hàn Cô Châm biên soạn để học viên tự ôn luyện: từ vựng theo chủ đề, ngữ pháp TOPIK có ví dụ và bài luyện tập, cùng các biểu hiện quán dụng thường gặp trong đề thi.</p>
      <div class="home-stats">
        <div><b class="mono">${totalWords}</b><span>Từ vựng</span></div>
        <div><b class="mono">${GRAMMAR_SECTIONS.yeongyeol.length + GRAMMAR_SECTIONS.jongeol.length + GRAMMAR_SECTIONS.josa.length + GRAMMAR_SECTIONS.boghap.length}</b><span>Điểm ngữ pháp</span></div>
        <div><b class="mono">${VOCAB_DATA.idioms.length}</b><span>Biểu hiện quán dụng</span></div>
      </div>
    </div>

    <div class="section-label">Bắt đầu học</div>
    <div class="site-grid">
      <div class="site-card" data-goto="vocab">
        <div class="sc-icon">${icon('book')}</div>
        <div class="sc-kr kr">어휘</div>
        <div class="sc-title">Từ vựng</div>
        <div class="sc-desc">Theo chủ đề (địa điểm, cảm xúc, xã hội...) và theo cấp độ TOPIK. Có danh sách, flashcard và ví dụ mẫu.</div>
      </div>
      <div class="site-card" data-goto="grammar">
        <div class="sc-icon">${icon('grammar')}</div>
        <div class="sc-kr kr">문법</div>
        <div class="sc-title">Ngữ pháp TOPIK</div>
        <div class="sc-desc">Vĩ tố liên kết, vĩ tố kết thúc — mỗi mục có nghĩa, giải thích, ví dụ và bài luyện tập tự chấm.</div>
      </div>
      <div class="site-card" data-goto="idioms">
        <div class="sc-icon">${icon('quote')}</div>
        <div class="sc-kr kr">관용 표현</div>
        <div class="sc-title">Biểu hiện quán dụng</div>
        <div class="sc-desc">Thành ngữ, quán dụng ngữ thường gặp trong đề thi TOPIK, kèm câu ví dụ minh họa.</div>
      </div>
    </div>
  `;
  mainEl.querySelectorAll('[data-goto]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.branch = el.dataset.goto;
      if(state.branch==='vocab'){ state.vocabSub='topic'; state.view='home'; }
      else if(state.branch==='grammar'){ state.gView='list'; state.gId=null; }
      render(); window.scrollTo(0,0);
    });
  });
}

// ===== Vocab: home (topic sub) =====
function renderVocabHome(){
  const cardHtml = c => `
    <div class="home-card" data-go="${c.id}">
      <div class="hc-kr kr">${c.kr}</div>
      <div class="hc-vn">${c.vn}</div>
      <div class="hc-count">${c.words.length} từ · ${learnedCountInCat(c)} đã thuộc</div>
      ${progressBarHtml(learnedCountInCat(c), c.words.length)}
    </div>`;
  mainEl.innerHTML = `
    <div class="section-label">Từ vựng theo địa điểm</div>
    <div class="home-grid">
      ${VOCAB_DATA.place.map(cardHtml).join('')}
    </div>

    <div class="section-label">Từ vựng theo chủ đề</div>
    <div class="home-grid">
      ${VOCAB_DATA.topic.map(cardHtml).join('')}
    </div>
  `;
  mainEl.querySelectorAll('[data-go]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.view='category'; state.catId=el.dataset.go; state.mode='list';
      render(); window.scrollTo(0,0);
    });
  });
}

function qtypeBadgeHtml(qtype){
  if(!qtype) return '';
  return `
    <div class="qtype-badge-wrap">
      <span class="qtype-badge">${qtype.skill_vn} câu ${qtype.qnum}</span>
      <div class="qtype-task">${qtype.task_vn}</div>
    </div>`;
}

function renderDangDeLevels(){
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">문형 · TỪ VỰNG THEO CẤP ĐỘ</div>
        <div class="page-title kr">급별 어휘<span class="vn">Từ vựng theo cấp độ TOPIK</span></div>
        <div class="page-sub">Chọn cấp độ để ôn từ vựng thường gặp trong từng dạng câu hỏi của đề thi — mỗi chuyên mục ghi rõ thuộc câu Nghe/Đọc/Viết nào</div>
      </div>
    </div>
    <div class="site-grid">
      ${DANGDE_LEVELS.map(lv=>{
        const stats = dangdeLevelStats(lv.id);
        return `
        <div class="site-card" data-goto-level="${lv.id}">
          <div class="sc-icon"><span class="mono" style="font-weight:800;">${lv.id}</span></div>
          <div class="sc-kr kr">${lv.label}</div>
          <div class="sc-title">${stats.totalWords} từ vựng</div>
          <div class="sc-desc">${stats.catCount} chuyên mục theo dạng câu hỏi</div>
          ${progressBarHtml(stats.learnedWords, stats.totalWords)}
        </div>`;
      }).join('')}
    </div>
  `;
  mainEl.querySelectorAll('[data-goto-level]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.dLevel = el.dataset.gotoLevel;
      state.dView = 'levelHome'; state.catId = null;
      render(); window.scrollTo(0,0);
    });
  });
}

function renderDangDeLevelHome(){
  const cats = DANGDE_DATA[state.dLevel];
  const lvMeta = DANGDE_LEVELS.find(l=>l.id===state.dLevel);
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">문형 · TỪ VỰNG THEO CẤP ĐỘ</div>
        <div class="page-title kr">${lvMeta.label}<span class="vn">Từ vựng theo cấp độ TOPIK</span></div>
        <div class="page-sub">${cats.length} chuyên mục — ${cats.reduce((s,c)=>s+c.words.length,0)} từ vựng</div>
      </div>
    </div>
    <div class="home-grid">
      ${cats.map(c=>`
        <div class="home-card" data-go="${c.id}">
          ${qtypeBadgeHtml(c.qtype)}
          <div class="hc-kr kr">${c.kr}</div>
          <div class="hc-vn">${c.vn}</div>
          <div class="hc-count">${c.words.length} từ · ${learnedCountInCat(c)} đã thuộc</div>
          ${progressBarHtml(learnedCountInCat(c), c.words.length)}
        </div>`).join('')}
    </div>
  `;
  mainEl.querySelectorAll('[data-go]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.dView='category'; state.catId=el.dataset.go; state.mode='list';
      render(); window.scrollTo(0,0);
    });
  });
}

function wordListHtml(catId, words){
  if(words.length===0) return `<div class="empty-note">Không có từ nào.</div>`;
  return `<div class="word-grid">
    ${words.map(w=>`
      <div class="word-card ${isLearned(catId,w.kr)?'is-learned':''}">
        <div class="wc-actions">
          <button class="star-btn ${isStarred(catId,w.kr)?'on':''}" data-star="${w.kr}" title="Đánh dấu cần ôn">★</button>
          <button class="learn-btn ${isLearned(catId,w.kr)?'on':''}" data-learn="${w.kr}" title="Đánh dấu đã thuộc">✓</button>
        </div>
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
  mainEl.querySelectorAll('[data-learn]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      toggleLearned(catId, btn.dataset.learn);
      btn.classList.toggle('on');
      btn.closest('.word-card').classList.toggle('is-learned');
      renderSidebar();
      const bar = document.getElementById('catProgressBar');
      if(bar){
        const cat = findCat(catId);
        bar.outerHTML = progressBarHtml(learnedCountInCat(cat), cat.words.length, '', 'catProgressBar');
        const lbl = document.getElementById('catProgressLabel');
        if(lbl) lbl.textContent = `${learnedCountInCat(cat)}/${cat.words.length} đã thuộc`;
      }
    });
  });
}

function renderCategory(){
  const cat = findCat(state.catId);
  if(!cat){ state.view='home'; return renderVocabHome(); }
  const learnedCount = learnedCountInCat(cat);
  const eyebrowText = cat.qtype
    ? `문형 · CẤP ${cat.id.match(/^d(\d)_/)[1]} · ${cat.qtype.skill_vn.toUpperCase()} CÂU ${cat.qtype.qnum}`
    : 'CHUYÊN MỤC';
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">${eyebrowText}</div>
        <div class="page-title kr">${cat.kr}<span class="vn">${cat.vn}</span></div>
        ${cat.qtype ? `
          <div class="qtype-detail">
            <span class="qtype-detail-kr kr">${cat.qtype.task_kr}</span>
            <span class="qtype-detail-vn">${cat.qtype.task_vn}</span>
          </div>` : ''}
        <div class="page-sub">${cat.words.length} từ vựng · ${starCountInCat(cat)} đã đánh dấu</div>
        <div class="page-progress">
          <span id="catProgressLabel">${learnedCount}/${cat.words.length} đã thuộc</span>
          ${progressBarHtml(learnedCount, cat.words.length, '', 'catProgressBar')}
        </div>
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
        <div class="eyebrow">SỔ TAY TỪ VỰNG</div>
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

// ===== Idioms (own top-level branch) =====
function renderIdiomsPage(){
  const q = state.iSearch.trim().toLowerCase();
  const filtered = VOCAB_DATA.idioms.filter(it => !q || it.term.toLowerCase().includes(q) || it.meaning_vn.toLowerCase().includes(q));
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">관용 표현</div>
        <div class="page-title kr">Biểu hiện quán dụng<span class="vn">관용 표현</span></div>
        <div class="page-sub">${VOCAB_DATA.idioms.length} biểu hiện, mỗi biểu hiện kèm câu ví dụ và nghĩa tiếng Việt</div>
      </div>
    </div>
    <div id="idiomList">
      ${filtered.length===0 ? `<div class="empty-note">Không tìm thấy biểu hiện nào.</div>` : filtered.map(it=>`
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
  const learned = isLearned(realCatId, w.kr);

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
        <button class="fc-btn wide ${learned?'green':''}" id="fLearn">${learned?'✓ Đã thuộc':'○ Đã thuộc?'}</button>
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
  document.getElementById('fLearn').addEventListener('click', (e)=>{
    e.stopPropagation();
    toggleLearned(realCatId, w.kr);
    renderSidebar();
    renderFlashBody(cat);
  });
}

// ===== Grammar =====
function grammarCardHtml(g, sectionId){
  const starred = isGStarred(sectionId, g.num);
  const learned = isGLearned(sectionId, g.num);
  return `
    <div class="grammar-card ${learned?'is-learned':''}" data-gopen="${g.num}" data-gsec="${sectionId}">
      <div class="gc-actions">
        <button class="star-btn small ${starred?'on':''}" data-gstar="${g.num}" data-gsec2="${sectionId}" title="Đánh dấu vào sổ tay">★</button>
        <button class="learn-btn small ${learned?'on':''}" data-glearn="${g.num}" data-gsec2="${sectionId}" title="Đánh dấu đã thuộc">✓</button>
      </div>
      <div class="gc-num mono">${g.num}</div>
      <div class="gc-term kr">${g.term}</div>
      <div class="gc-meaning">${g.meaning}</div>
    </div>
  `;
}
function bindGrammarCardActions(reRenderFn){
  mainEl.querySelectorAll('[data-gstar]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleGStarred(btn.dataset.gsec2, parseInt(btn.dataset.gstar,10));
      renderSidebar();
      if(reRenderFn) reRenderFn(); else btn.classList.toggle('on');
    });
  });
  mainEl.querySelectorAll('[data-glearn]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleGLearned(btn.dataset.gsec2, parseInt(btn.dataset.glearn,10));
      renderSidebar();
      if(reRenderFn) reRenderFn();
      else { btn.classList.toggle('on'); btn.closest('.grammar-card').classList.toggle('is-learned'); }
    });
  });
}

function renderGrammarList(){
  const list = currentGrammarList();
  const meta = currentGrammarMeta();
  const learnedCount = gLearnedCountInSection(state.gSection);
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">문법 · NGỮ PHÁP TOPIK</div>
        <div class="page-title kr">${meta.kr}<span class="vn">${meta.label}</span></div>
        <div class="page-sub">${list.length} mục ngữ pháp — mỗi mục gồm nghĩa, giải thích, ví dụ và bài luyện tập</div>
        <div class="page-progress">
          <span>${learnedCount}/${list.length} đã thuộc</span>
          ${progressBarHtml(learnedCount, list.length)}
        </div>
      </div>
    </div>
    <div class="grammar-grid">
      ${list.map(g=>grammarCardHtml(g, state.gSection)).join('')}
    </div>
  `;
  mainEl.querySelectorAll('[data-gopen]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.gView='detail'; state.gId=parseInt(el.dataset.gopen,10);
      render(); window.scrollTo(0,0);
    });
  });
  bindGrammarCardActions(()=>renderGrammarList());
}

function renderGrammarBlockHtml(blocks){
  return blocks.map(blk=>{
    if(blk[0]==='p') return `<p class="g-p">${blk[1]}</p>`;
    if(blk[0]==='h4') return `<h4 class="g-h4">${blk[1]}</h4>`;
    if(blk[0]==='bq') return `<div class="g-bq">${blk[1].map(l=>`<div>${l}</div>`).join('')}</div>`;
    if(blk[0]==='table'){
      const rows = blk[1];
      const headerIdx = blk[2];
      const rowsHtml = rows.map((r,ri)=>{
        const tag = (headerIdx!=null && ri===headerIdx) ? 'th' : 'td';
        return `<tr>${r.map(c=>`<${tag}>${c}</${tag}>`).join('')}</tr>`;
      }).join('');
      return `<div class="g-table-wrap"><table class="g-table">${rowsHtml}</table></div>`;
    }
    if(blk[0]==='ex') return `
      <div class="g-ex">
        <div class="g-ex-kr kr">${blk[1]}</div>
        <div class="g-ex-vn">${blk[2]}</div>
      </div>`;
    return '';
  }).join('');
}

function renderGrammarDetail(){
  const list = currentGrammarList();
  const g = list.find(x=>x.num===state.gId);
  if(!g){ state.gView='list'; return renderGrammarList(); }
  const idx = list.findIndex(x=>x.num===g.num);
  const prev = list[idx-1];
  const next = list[idx+1];

  const starred = isGStarred(state.gSection, g.num);
  const learned = isGLearned(state.gSection, g.num);

  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">문법 ${g.num}/${list.length}</div>
        <div class="page-title kr">${g.term}<span class="vn">${g.meaning}</span></div>
      </div>
      <div class="mode-tabs">
        <button class="fc-btn wide ghost ${starred?'gold':''}" id="gDetailStar">${starred?'★ Trong sổ tay':'☆ Thêm vào sổ tay'}</button>
        <button class="fc-btn wide ghost ${learned?'green':''}" id="gDetailLearn">${learned?'✓ Đã thuộc':'○ Đã thuộc?'}</button>
      </div>
    </div>
    <div class="page-head" style="margin-top:-10px;">
      <div></div>
      <div class="mode-tabs">
        <button class="fc-btn ghost" id="gPrevBtn" ${!prev?'disabled style="opacity:.35;cursor:default;"':''}>‹ Trước</button>
        <button class="fc-btn ghost" id="gListBtn">Danh sách</button>
        <button class="fc-btn ghost" id="gNextBtn" ${!next?'disabled style="opacity:.35;cursor:default;"':''}>Sau ›</button>
      </div>
    </div>

    <div class="grammar-detail">
      <div class="g-section-label">Giải thích ngữ pháp &amp; Ví dụ</div>
      <div class="g-explain-box">
        ${renderGrammarBlockHtml(g.blocks)}
      </div>

      <div class="g-section-label">Luyện tập</div>
      <div class="practice-list">
        ${g.practice.map((p,i)=>`
          <div class="practice-item">
            <div class="practice-num mono">Câu ${i+1}</div>
            <div class="practice-vn-prompt">${p.vn}</div>
            <div class="practice-hint"><span class="hint-label">Gợi ý</span> <span class="kr">${p.hint}</span></div>
            <div class="practice-answer-row">
              <input type="text" class="practice-input kr" placeholder="Nhập câu trả lời bằng tiếng Hàn..." data-idx="${i}"/>
              <button class="fc-btn wide ghost practice-check" data-idx="${i}">Xem đáp án</button>
            </div>
            <div class="practice-answer kr" id="pAns${i}" style="display:none;">Đáp án: <b>${p.answer}</b></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('gListBtn').addEventListener('click', ()=>{
    state.gView='list'; render(); window.scrollTo(0,0);
  });
  if(prev) document.getElementById('gPrevBtn').addEventListener('click', ()=>{
    state.gId=prev.num; render(); window.scrollTo(0,0);
  });
  if(next) document.getElementById('gNextBtn').addEventListener('click', ()=>{
    state.gId=next.num; render(); window.scrollTo(0,0);
  });
  document.getElementById('gDetailStar').addEventListener('click', ()=>{
    toggleGStarred(state.gSection, g.num);
    renderSidebar();
    renderGrammarDetail();
  });
  document.getElementById('gDetailLearn').addEventListener('click', ()=>{
    toggleGLearned(state.gSection, g.num);
    renderSidebar();
    renderGrammarDetail();
  });
  mainEl.querySelectorAll('.practice-check').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = btn.dataset.idx;
      const el = document.getElementById('pAns'+i);
      el.style.display = el.style.display==='none' ? 'block' : 'none';
    });
  });
}

function renderGrammarNotebook(){
  const items = [];
  GRAMMAR_SECTION_META.forEach(s=>{
    GRAMMAR_SECTIONS[s.id].forEach(g=>{
      if(isGStarred(s.id, g.num)) items.push({...g, _section: s.id, _sectionMeta: s});
    });
  });
  mainEl.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">SỔ TAY NGỮ PHÁP</div>
        <div class="page-title kr">★ Mục đã đánh dấu</div>
        <div class="page-sub">${items.length} mục ngữ pháp cần ôn lại</div>
      </div>
    </div>
    ${items.length===0 ? `<div class="empty-note">Chưa đánh dấu mục ngữ pháp nào. Bấm ★ trên thẻ ngữ pháp để lưu vào đây.</div>` : `
      <div class="grammar-grid">
        ${items.map(g=>`
          <div class="grammar-card ${isGLearned(g._section,g.num)?'is-learned':''}" data-gopen2="${g.num}" data-gsec2b="${g._section}">
            <div class="gc-actions">
              <button class="star-btn small on" data-gstar="${g.num}" data-gsec2="${g._section}" title="Bỏ khỏi sổ tay">★</button>
              <button class="learn-btn small ${isGLearned(g._section,g.num)?'on':''}" data-glearn="${g.num}" data-gsec2="${g._section}" title="Đánh dấu đã thuộc">✓</button>
            </div>
            <div class="gc-num mono">${g._sectionMeta.kr}</div>
            <div class="gc-term kr">${g.term}</div>
            <div class="gc-meaning">${g.meaning}</div>
          </div>
        `).join('')}
      </div>
    `}
  `;
  mainEl.querySelectorAll('[data-gopen2]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.gSection = el.dataset.gsec2b;
      state.gView='detail'; state.gId=parseInt(el.dataset.gopen2,10);
      render(); window.scrollTo(0,0);
    });
  });
  bindGrammarCardActions(()=>renderGrammarNotebook());
}

// ===== Router / render =====
function render(){
  if(state.branch === 'home'){
    renderSiteHome();
    renderSidebar();
    return;
  }
  if(state.branch === 'grammar'){
    if(state.gView==='detail' && state.gId!=null) renderGrammarDetail();
    else if(state.gView==='notebook') renderGrammarNotebook();
    else renderGrammarList();
    renderSidebar();
    return;
  }
  if(state.branch === 'idioms'){
    renderIdiomsPage();
    renderSidebar();
    return;
  }
  // vocab branch
  if(state.vocabSub !== 'topic'){
    if(state.dView==='category' && state.catId){ renderCategory(); }
    else if(state.dView==='levelHome' && state.dLevel){ renderDangDeLevelHome(); }
    else { renderDangDeLevels(); }
    renderSidebar();
    return;
  }
  if(state.view==='home') renderVocabHome();
  else if(state.view==='category') renderCategory();
  else if(state.view==='starred') renderStarred();
  else renderVocabHome();
  renderSidebar();
}

document.getElementById('menuBtn').addEventListener('click', ()=>{
  sidebarEl.classList.toggle('open');
});

render();
