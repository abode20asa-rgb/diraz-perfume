/* ديراز — إشعار الزبون بحالة رأيه (نُشر / رُفض مع السبب)
   يحتاج supabase-config.js (DirazCloud) قبله. ضعه بأي صفحة يدخلها الزبون. */
(function(){
  var KEY = 'diraz_rv_tokens';
  function tokens(){ try{ var a = JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(a) ? a.filter(function(t){ return typeof t==='string' && t.length>=16; }) : []; }catch(e){ return []; } }
  function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  var css = '#dzRvNote{position:fixed;inset:0;z-index:10300;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(60,15,40,.6);direction:rtl;font-family:"Cairo",sans-serif}'+
    '#dzRvNote.on{display:flex}'+
    '#dzRvNote .nb{background:#fff;color:#333;width:min(380px,100%);border-radius:22px;padding:26px 22px 20px;text-align:center;box-shadow:0 18px 60px rgba(120,30,70,.4);animation:dzRvPop .25s ease-out}'+
    '@keyframes dzRvPop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}'+
    '#dzRvNote .big{font-size:2.8rem;line-height:1}'+
    '#dzRvNote h3{font-size:1.15rem;font-weight:900;margin:10px 0 6px;color:#c45a7a}'+
    '#dzRvNote.rej h3{color:#d32f2f}'+
    '#dzRvNote p{font-weight:700;line-height:1.9;margin:6px 0;color:#444;font-size:.92rem}'+
    '#dzRvNote .q{background:#f8f1f4;border-radius:12px;padding:8px 12px;font-size:.82rem;color:#777;font-weight:600;word-break:break-word;margin:10px 0}'+
    '#dzRvNote .why{background:#fdecec;border:1.5px solid #f5c2c2;border-radius:12px;padding:10px 12px;color:#b71c1c;font-weight:800;font-size:.9rem;word-break:break-word;margin:10px 0}'+
    '#dzRvNote button{margin-top:12px;width:100%;padding:11px;border:0;border-radius:50px;background:#c45a7a;color:#fff;font-family:inherit;font-weight:800;font-size:.95rem;cursor:pointer}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div'); box.id = 'dzRvNote'; box.setAttribute('role','dialog');
  box.innerHTML = '<div class="nb"></div>';
  var queue = [];

  function markSeen(){
    var t = tokens(); if(!t.length || !window.DirazCloud) return;
    DirazCloud.rpc('my_review_seen',{p_tokens:t}).catch(function(){});
  }
  function show(){
    var u = queue.shift();
    if(!u){ box.classList.remove('on'); markSeen(); return; }
    var rej = u.status === 'rejected';
    var q = u.body ? '<div class="q">«'+esc(String(u.body).slice(0,120))+(String(u.body).length>120?'…':'')+'»</div>' : '';
    box.classList.toggle('rej', rej);
    box.firstChild.innerHTML = rej
      ? '<div class="big">❌</div><h3>تم رفض رأيك</h3>'+q+'<p>عذراً، رأيك الخاص بك لم يُنشر.</p><div class="why">السبب: '+esc(u.reason||'غير محدد')+'</div><button type="button">حسناً</button>'
      : '<div class="big">🎉</div><h3>تم نشر رأيك</h3>'+q+'<p>رأيك الخاص بك انشر بالموقع، شكراً لك 🌸</p><button type="button">تم</button>';
    box.firstChild.querySelector('button').onclick = show;
    box.classList.add('on');
  }
  function check(){
    var t = tokens();
    if(!t.length || !window.DirazCloud) return;
    DirazCloud.rpc('my_review_updates',{p_tokens:t}).then(function(rows){
      if(!Array.isArray(rows) || !rows.length) return;
      document.body.appendChild(box);
      queue = rows.slice();
      show();
    }).catch(function(){});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(check,600); });
  else setTimeout(check,600);
})();
