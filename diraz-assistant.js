/* ديراز — مساعد العطور (يشتغل داخل المتصفح، بدون API وبدون حدود استخدام)
   يقرأ العطور من نفس مصدر الصفحة (loadPerfumes) فأي عطر جديد يظهر له تلقائياً. */
(function(){
  'use strict';

  /* ───────── تطبيع النص العربي ───────── */
  function norm(t){
    return String(t==null?'':t).toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640\u200B-\u200F\u202A-\u202E]/g,'')
      .replace(/[٠-٩]/g,function(d){return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d));})
      .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
      .replace(/ڤ/g,'ف').replace(/گ/g,'ك').replace(/چ/g,'ج').replace(/پ/g,'ب')
      .replace(/[^a-z0-9\u0621-\u064A]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function N(arr){ return arr.map(norm); }
  /* كل الاحتمالات للكلمة بعد حذف السوابق العربية (ال، لل، و، ب، ل، ف، ك) */
  function forms(tok){
    var out=[tok], m=tok, re=/^(وال|بال|كال|فال|لل|ال|و|ب|ل|ف|ك)/, i=0;
    while(i<2 && re.test(m) && m.replace(re,'').length>=3){ m=m.replace(re,''); out.push(m); i++; }
    if(/^لل/.test(tok) && tok.length>4){ out.push('ال'+tok.slice(2)); out.push(tok.slice(2)); }
    return out;
  }

  /* ───────── عائلات الروائح ───────── */
  var TRAITS = {
    sweet:   {label:'سويت وحلو',     p:N(['سويت','سكر','حلوي','عسل','كراميل','فانيلا','مارشملو','غزل البنات','علكه','توفي','حلو'])},
    fresh:   {label:'منعش وخفيف',    p:N(['فرش','حمضيات','حمضي','منعش','ليمون','برغموت','نعناع','مائي','اخضر','زاهي','خفيف','خيار','جريب فروت','يوسفي','برتقال'])},
    floral:  {label:'زهري',          p:N(['زهري','زهري','زهور','زهره','ورد','ياسمين','سوسن','فاوانيا','زنبق','غاردينيا','روز','جوري','ليلك','توليب','زهر'])},
    fruity:  {label:'فاكهي',         p:N(['فاكهي','تفاح','كرز','كشمش','توت','كمثري','خوخ','مشمش','فراوله','مانجو','اناناس','فواكه','برقوق'])},
    warm:    {label:'دافئ وشرقي',    p:N(['دافئ','شرقي','عنبر','توابل','توابلي','قرفه','هيل','زنجبيل','فلفل','عود','لبان','بخور','اوبيوم'])},
    woody:   {label:'خشبي',          p:N(['خشب','خشبي','صندل','ارز','باتشولي','فيتيفر','كشمير'])},
    musky:   {label:'مسكي وناعم',    p:N(['مسك','مسكي','بودري','ناعم','رقيق','ابيض','زهور بيضاء','كشمير'])},
    strong:  {label:'قوي وفواح',     p:N(['قوي','فواح','مغري','جريء','ثابت','عنبر','عود','عسلي','اوبيوم'])},
    gourmand:{label:'قهوة وكاكاو ولوز',p:N(['قهوه','كاكاو','لوز','جوز هند','شوكولاته','تونكا','فستق'])},
    elegant: {label:'أنيق وراقي',    p:N(['انيق','فاخر','كلاسيكي','راقي','ارستقراطي'])}
  };

  /* ───────── كلمات الزبون ← أوزان ───────── */
  var RULES = [
    {w:['سويت','حلو','حلوه','سكر','كراميل','حلويات','حلوي'], v:{sweet:2}},
    {w:['فانيلا','فانيله'], v:{sweet:1,vanilla:0}, free:'فانيلا'},
    {w:['منعش','انتعاش','فرش','خفيف','خفيفه','بارد','نظيف','رايق','حمضيات','حمضي'], v:{fresh:2}},
    {w:['زهري','زهور','ورد','ورود','ياسمين','زهره'], v:{floral:2}},
    {w:['فاكهي','فواكه','فاكهه'], v:{fruity:2}},
    {w:['دافئ','دافيه','شرقي','توابل','عنبر','ثقيل'], v:{warm:2}},
    {w:['خشب','خشبي','صندل','عود'], v:{woody:2}},
    {w:['مسك','مسكي','بودري','بودره','ناعم','ناعمه','رقيق','لطيف'], v:{musky:2}},
    {w:['هادي','هادئ','هادىء','هاديه','مريح','مريحه','هدوء','هادى'], v:{musky:1.5,floral:0.6,fresh:0.6,strong:-1.2}},
    {w:['قوي','قويه','فواح','فوحان','ثابت','ثبات','يلفت','ملفت','جريء','يفوح','نفاذ'], v:{strong:2,warm:0.6}},
    {w:['قهوه','كاكاو','لوز','شوكولاته','شوكلاته','جوز هند'], v:{gourmand:2}},
    {w:['انيق','انيقه','فاخر','راقي','كلاسيك','كلاسيكي','رسمي'], v:{elegant:2}},
    /* مناسبات */
    {w:['صيف','صيفي','حر','حار','حرارة'], v:{fresh:2,fruity:0.6,warm:-1.2,strong:-0.5}},
    {w:['شتاء','شتوي','برد','بارد جدا'], v:{warm:2,sweet:0.6,woody:0.6,fresh:-1}},
    {w:['سهره','عرس','حفله','مناسبه','ليل','ليلي','عشاء','خروجه'], v:{warm:1,sweet:0.8,strong:1}},
    {w:['دوام','شغل','عمل','جامعه','دراسه','يومي','نهار','صباح'], v:{fresh:0.9,musky:0.9,elegant:0.6,strong:-0.6}},
    {w:['هديه','هدايا','اهدي'], v:{elegant:0.6,sweet:0.6,floral:0.6}},
    {w:['رومانسي','موعد','حب','عشاق','خطوبه'], v:{sweet:1,floral:0.6,warm:0.6}},
    {w:['جذاب','مغري','يجذب','اغراء','لافت'], v:{warm:1,sweet:0.9,strong:0.6}},
    {w:['ربيع','ربيعي','خريف'], v:{floral:1,fresh:0.8}}
  ];
  RULES.forEach(function(r){ r.w=r.w.map(norm); });
  var NEG = N(['مو','مب','مش','ما','بدون','لا','ماحب','مااحب','مابي','ماريد','اكره']);
  var STOP = N(['اريد','ابي','ابغي','احب','احبه','عطر','عطور','شي','شيء','عندكم','عندك','يعني','هل','ايش','شنو','شلون','كيف','لو','سمحت','بس','كلش','مره','جدا','حلوه','ممكن','تنصحني','انصحني','رشح','رشحلي','اقترح','اقترحلي','نسائي','رجالي','يعجبني','يناسب','يناسبني','وياي','عليه','لي','لك','من','في','على','مع','الي','هذا','هذي','هاي','اني','انا','انت','ممكن','اطلب','ابغى','فيه','فيها','بها','ذات','تحت','حدود','اقل','لحد','فوق','يكون','تكون','دينار','سعر','بسعر','اخر','وين','اي','ايش','وياها','لزوجتي','لزوجي','لامي','لاختي','هديه','هدايا']);
  var MORE = /(غيرهم|غيرها|غيره|ثانيه|ثاني|المزيد|كمل|بعد|زيد|اخرين|اخري)/;
  var GREET = /^(هلا|هلو|مرحبا|اهلا|السلام|سلام|صباح|مساء|هاي|hi|hello|يا هلا)/;
  var THANKS = /(شكرا|مشكور|يعطيك|تسلم|ممنون|عاشت|thanks)/;

  /* ───────── بيانات العطور ───────── */
  function getPerfumes(){
    try{ return (typeof loadPerfumes==='function') ? (loadPerfumes()||[]) : (window.DIRAZ_DEFAULT_PERFUMES||[]); }
    catch(e){ return window.DIRAZ_DEFAULT_PERFUMES||[]; }
  }

  /* ───────── قراءة سلة الزبون ───────── */
  function getCart(){
    try{
      var raw=localStorage.getItem('diraz_cart');
      if(!raw) return [];
      var arr=JSON.parse(raw);
      if(!Array.isArray(arr)) return [];
      return arr;
    }catch(e){ return []; }
  }
  function cartSummary(){
    var cart=getCart();
    if(!cart.length) return null;
    var lines=cart.map(function(it){
      var p=null;
      try{ p=getPerfumes().find(function(x){ return String(x.id)===String(it.id); }); }catch(e){}
      var name=p?p.name:('عطر #'+it.id);
      var size=it.size||'50ml';
      var qty=it.qty||1;
      return '• '+name+' ('+size.replace('ml',' مل')+') ×'+qty;
    });
    var total=cart.reduce(function(s,it){
      var p=null;
      try{ p=getPerfumes().find(function(x){ return String(x.id)===String(it.id); }); }catch(e){}
      var pr=p?priceOf(p,it.size||'50ml'):0;
      return s+pr*(it.qty||1);
    },0);
    return {lines:lines,total:total,count:cart.length};
  }
  function addToCartDirect(idx,size){
    try{
      if(typeof selectedSizes==='undefined'||typeof addToCart!=='function') return false;
      var ex=(typeof findItem==='function')?findItem(idx,size):null;
      if(ex) return 'exists';
      selectedSizes[idx]=size;
      addToCart(idx);
      return true;
    }catch(e){ return false; }
  }
  function charLine(p){
    var m=String(p.description||'').match(/الطابع العطري\s*[:：]\s*([^\n\r]*)/);
    return m? m[1].replace(/[\u200B-\u200F]/g,'').trim() : '';
  }
  function priceOf(p,size){
    try{ if(typeof sizePrices==='function') return parseInt(String(sizePrices(p,size).price||'0').replace(/[^0-9]/g,''))||0; }catch(e){}
    return parseInt(String(p.price||'0').replace(/[^0-9]/g,''))||0;
  }
  function fmt(n){ return (Number(n)||0).toLocaleString('en-US'); }
  function profile(p){
    var cl=norm(charLine(p));
    var full=norm([p.name,p.nameEn,p.description].join(' '));
    var prof={};
    Object.keys(TRAITS).forEach(function(k){
      var h=0;
      TRAITS[k].p.forEach(function(w){
        if(!w) return;
        if(cl.indexOf(w)>-1) h+=2;
        else if(full.indexOf(w)>-1) h+=1;
      });
      prof[k]=Math.min(1.5,h/3);
    });
    return {prof:prof, full:full};
  }

  /* ───────── فهم الرسالة ───────── */
  var state = {w:{}, gender:null, budget:null, free:[], shown:[], lastIdx:[]};

  function parseMessage(raw){
    var t=norm(raw), toks=t.split(' ').filter(Boolean);
    var out={w:{}, free:[], gender:null, budget:null, used:{}, any:false};
    /* ميزانية */
    var m=t.match(/(\d+(?:\s?\d{3})*)\s*(الف|الاف|k)?/);
    if(m){
      var n=parseInt(m[1].replace(/\s/g,''),10);
      if(m[2]) n=n*1000;
      if(n>=1000 && n<=1000000){ out.budget=n; out.any=true; }
      else if(n>=5 && n<1000 && /(الف)/.test(t)){ out.budget=n*1000; out.any=true; }
    }
    /* جنس */
    if(/(نسائي|نسائيه|حريمي|بنات|بنت|زوجتي|اختي|امي|حبيبتي|خطيبتي|مرتي|لمرتي)/.test(t)) { out.gender='نسائي'; out.any=true; }
    if(/(رجالي|رجاليه|رجال|ولد|زوجي|اخوي|ابوي|شباب|خطيبي)/.test(t)){ out.gender='رجالي'; out.any=true; }
    if(/(للجنسين|يونيسكس|unisex)/.test(t)){ out.gender='للجنسين'; out.any=true; }
    /* قواعد الصفات مع النفي */
    var i,j;
    for(i=0;i<toks.length;i++){
      RULES.forEach(function(r){
        var fs=forms(toks[i]);
        var hit=r.w.some(function(w){
          if(w.indexOf(' ')>-1) return t.indexOf(w)>-1 && toks[i]===w.split(' ')[0];
          return fs.some(function(f){ return f===w || (w.length>3 && f.indexOf(w)===0); });
        });
        if(!hit) return;
        var neg=false;
        for(j=Math.max(0,i-2);j<i;j++){ if(NEG.indexOf(toks[j])>-1) neg=true; }
        Object.keys(r.v).forEach(function(k){ out.w[k]=(out.w[k]||0)+(neg?-1:1)*r.v[k]; });
        out.used[toks[i]]=1; out.any=true;
        if(r.free && !neg) out.free.push(norm(r.free));
      });
    }
    /* كلمات حرة (نوتات محددة مثل كرز، برتقال، لافندر…) */
    toks.forEach(function(w){
      if(w.length<3 || out.used[w] || /^\d+$/.test(w) || NEG.indexOf(w)>-1) return;
      var fs=forms(w);
      if(fs.some(function(f){ return STOP.indexOf(f)>-1; })) return;
      if(/^(الف|الاف)$/.test(w)) return;
      out.free.push(w);
    });
    return out;
  }

  /* ───────── البحث بالاسم ───────── */
  function findByName(raw,perfumes){
    var t=norm(raw), best=-1, bs=0;
    perfumes.forEach(function(p,idx){
      var names=[norm(p.name),norm(p.nameEn)].filter(Boolean), s=0;
      names.forEach(function(n){
        if(n.length>=4 && t.indexOf(n)>-1) s=Math.max(s,10+n.length);
        else{
          var parts=n.split(' ').filter(function(x){return x.length>=4;});
          var hit=parts.filter(function(x){return t.split(' ').indexOf(x)>-1;}).length;
          if(parts.length && hit===parts.length) s=Math.max(s,6+hit);
          else if(hit>=2) s=Math.max(s,3+hit);
        }
      });
      if(s>bs){bs=s;best=idx;}
    });
    return bs>=6?best:-1;
  }

  /* ───────── الترشيح ───────── */
  function recommend(perfumes){
    var pool=[], soldOutCount=0;
    perfumes.forEach(function(p,idx){
      if(p.badge==='soldout'){ soldOutCount++; return; }
      if(state.gender && p.type){
        var ty=norm(p.type), g=norm(state.gender);
        if(ty.indexOf(g)===-1 && ty.indexOf('للجنسين')===-1) return;
      }
      if(state.budget){
        var minP=Math.min(priceOf(p,'50ml')||1e9,priceOf(p,'35ml')||1e9);
        if(minP>state.budget) return;
      }
      pool.push(idx);
    });
    var scored=pool.map(function(idx){
      var p=perfumes[idx], pr=profile(p), s=0, why=[];
      Object.keys(state.w).forEach(function(k){
        if(!TRAITS[k]) return;
        var c=state.w[k]*pr.prof[k]; s+=c;
        if(c>0.35) why.push({k:k,c:c});
      });
      var freeHits=[];
      state.free.forEach(function(f){
        var hit=forms(f).filter(function(x){ return x.length>=3 && (' '+pr.full+' ').indexOf(x)>-1; })[0];
        if(hit){ s+=1.4; freeHits.push(f); }
      });
      if(p.badge==='bestseller') s+=0.25;
      return {idx:idx,score:s,why:why.sort(function(a,b){return b.c-a.c;}),freeHits:freeHits};
    });
    scored.sort(function(a,b){ return b.score-a.score; });
    return {list:scored,soldOutCount:soldOutCount,poolSize:pool.length};
  }

  /* ───────── واجهة المحادثة ───────── */
  var $=function(id){return document.getElementById(id);};
  function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function injectUI(){
    var css=document.createElement('style');
    css.textContent=[
      '#dzA_btn{position:fixed;bottom:22px;right:22px;z-index:900;display:flex;align-items:center;gap:8px;border:none;cursor:pointer;background:#c45a7a;color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:.9rem;padding:13px 18px;border-radius:50px;box-shadow:0 8px 26px rgba(196,90,122,.45);transition:transform .2s}',
      '#dzA_btn:hover{transform:translateY(-3px)}',
      '#dzA_box{position:fixed;bottom:84px;right:22px;z-index:900;width:min(390px,calc(100vw - 24px));height:min(580px,calc(100vh - 110px));display:none;flex-direction:column;background:rgba(255,240,246,.97);border:1.5px solid rgba(255,255,255,.8);border-radius:24px;box-shadow:0 20px 60px rgba(120,30,70,.35);overflow:hidden;font-family:Cairo,sans-serif;direction:rtl}',
      '#dzA_box.open{display:flex}',
      '.dzA_head{background:#c45a7a;color:#fff;padding:13px 16px;display:flex;align-items:center;justify-content:space-between}',
      '.dzA_head b{font-size:.98rem}.dzA_head small{display:block;opacity:.85;font-size:.72rem;font-weight:600}',
      '.dzA_x{background:rgba(255,255,255,.25);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem}',
      '#dzA_msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px}',
      '.dzA_m{max-width:88%;padding:10px 14px;border-radius:18px;font-size:.88rem;line-height:1.7;font-weight:600;word-wrap:break-word}',
      '.dzA_bot{background:#fff;color:#7a2d4a;align-self:flex-start;border-bottom-right-radius:6px;box-shadow:0 2px 10px rgba(196,90,122,.12)}',
      '.dzA_me{background:#f4a7be;color:#fff;align-self:flex-end;border-bottom-left-radius:6px}',
      '.dzA_chips{display:flex;flex-wrap:wrap;gap:7px;align-self:flex-start;max-width:96%}',
      '.dzA_chip{border:1.5px solid #e07898;background:#fff;color:#c45a7a;font-family:Cairo,sans-serif;font-weight:700;font-size:.78rem;padding:6px 12px;border-radius:50px;cursor:pointer}',
      '.dzA_chip:hover{background:#fce4ef}',
      '.dzA_card{background:#fff;border:1.5px solid #f4c6d6;border-radius:16px;padding:11px 13px;align-self:stretch;color:#7a2d4a}',
      '.dzA_card h4{font-size:.95rem;font-weight:900;margin-bottom:1px}',
      '.dzA_card .en{font-size:.74rem;opacity:.65;font-family:"Playfair Display",serif;font-style:italic;margin-bottom:5px;direction:ltr;text-align:right}',
      '.dzA_card .why{font-size:.8rem;line-height:1.6;margin:5px 0;font-weight:600}',
      '.dzA_card .tags{font-size:.74rem;opacity:.75;margin-bottom:6px}',
      '.dzA_card .pr{font-size:.8rem;font-weight:800;color:#c45a7a;margin-bottom:8px}',
      '.dzA_acts{display:flex;gap:6px;flex-wrap:wrap}',
      '.dzA_act{border:none;cursor:pointer;font-family:Cairo,sans-serif;font-weight:800;font-size:.74rem;padding:7px 12px;border-radius:50px;background:#fce4ef;color:#c45a7a}',
      '.dzA_act.main{background:#c45a7a;color:#fff}',
      '.dzA_form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #f4c6d6}',
      '.dzA_form input{flex:1;border:1.5px solid #f4c6d6;border-radius:50px;padding:10px 15px;font-family:Cairo,sans-serif;font-size:.88rem;outline:none;direction:rtl}',
      '.dzA_form input:focus{border-color:#e07898}',
      '.dzA_form button{border:none;background:#c45a7a;color:#fff;width:42px;height:42px;border-radius:50%;cursor:pointer;font-size:1.05rem}',
      '.dzA_reg{display:flex;flex-direction:column;gap:8px;min-width:220px}',
      '.dzA_reg input{border:1.5px solid #f4c6d6;border-radius:50px;padding:10px 14px;font-family:Cairo,sans-serif;font-size:.86rem;outline:none;direction:rtl;background:#fff;color:#7a2d4a}',
      '.dzA_reg input:focus{border-color:#e07898}',
      '.dzA_reg button{border:none;cursor:pointer;background:#c45a7a;color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:.88rem;padding:11px;border-radius:50px}',
      '.dzA_reg button:disabled{opacity:.6;cursor:default}',
      '.dzA_reg .dzA_err{color:#d32f2f;font-size:.75rem;font-weight:700;display:none}',
      '.dzA_flash{animation:dzAflash 1.8s ease}',
      '@keyframes dzAflash{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}25%,70%{box-shadow:0 0 0 6px rgba(255,255,255,.95),0 0 30px 8px rgba(196,90,122,.7)}}',
      '@media(max-width:480px){#dzA_btn{bottom:14px;right:14px;padding:12px 15px}#dzA_box{right:12px;bottom:72px}}'
    ].join('\n');
    document.head.appendChild(css);

    var btn=document.createElement('button');
    btn.id='dzA_btn'; btn.type='button'; btn.innerHTML='🌸 مساعد العطور';
    btn.onclick=toggle; document.body.appendChild(btn);

    var box=document.createElement('div');
    box.id='dzA_box';
    box.innerHTML='<div class="dzA_head"><div><b>🌸 مساعد ديراز للعطور</b><small>أخبرني شنو تحب وأرشح لك الأنسب</small></div><button class="dzA_x" type="button" aria-label="إغلاق">✕</button></div>'+
      '<div id="dzA_msgs"></div>'+
      '<div class="dzA_form"><input id="dzA_in" type="text" placeholder="مثال: أريد عطر هادئ للدوام..." autocomplete="off"><button type="button" id="dzA_send" aria-label="إرسال">➤</button></div>';
    document.body.appendChild(box);
    box.querySelector('.dzA_x').onclick=toggle;
    $('dzA_send').onclick=submit;
    $('dzA_in').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); submit(); } });
  }

  var opened=false;
  function toggle(){
    var box=$('dzA_box'); box.classList.toggle('open');
    if(box.classList.contains('open')){
      if(!opened){ opened=true; welcome(); }
      setTimeout(function(){ var i=$('dzA_in'); if(i) i.focus(); },50);
    }
  }
  function scrollEnd(){ var m=$('dzA_msgs'); m.scrollTop=m.scrollHeight; }
  function say(html,who){
    var d=document.createElement('div'); d.className='dzA_m '+(who==='me'?'dzA_me':'dzA_bot'); d.innerHTML=html;
    $('dzA_msgs').appendChild(d); scrollEnd(); return d;
  }
  function chips(list){
    var w=document.createElement('div'); w.className='dzA_chips';
    list.forEach(function(t){
      var b=document.createElement('button'); b.type='button'; b.className='dzA_chip'; b.textContent=t;
      b.onclick=function(){ w.remove(); handle(t); };
      w.appendChild(b);
    });
    $('dzA_msgs').appendChild(w); scrollEnd();
  }
  var BASIC_CHIPS=['هادئ ومريح','سويت وحلو','منعش للصيف','دافئ للشتاء','قوي وفواح','لسهرة','للدوام','هدية'];

  function welcome(){
    if(!hasCustomer()){
      showAccountForm('هلا بيك في ديراز 🌸<br>حتى أخدمك، سجّل حسابك بثواني بالضغط على الزر:');
      return;
    }
    say('هلا بيك في ديراز 🌸<br>أني مساعد العطور، احچيلي شنو تحب (هادئ، سويت، منعش، قوي...) أو للمناسبة أو الميزانية، وأرشحلك أحلى العطور من الموجودة عندنا.');
    chips(BASIC_CHIPS);
  }
  function submit(){
    var i=$('dzA_in'), v=(i.value||'').trim(); if(!v) return;
    i.value=''; handle(v.slice(0,300));
  }

  /* ───────── معالجة الرسالة ───────── */
  function handle(text){
    say(esc(text),'me');
    var t=norm(text), perfumes=getPerfumes();
    setTimeout(function(){ reply(text,t,perfumes); },250);
  }
  function reply(raw,t,perfumes){
    if(!perfumes.length){ say('ما عندنا عطور معروضة حالياً، تعال بعد شوي 🌸'); return; }

    /* ── 1) المحادثة الطبيعية الجارية (طلب/كود/عنوان) ── */
    if(flow){ handleFlow(raw,t,perfumes); return; }

    /* ── 2) تحية / شكر / أسئلة عامة — قبل أي تحليل ── */
    if(THANKS.test(t)){ say('عفواً حبيبي 🌸 إذا تريد ترشيح ثاني أني حاضر.'); return; }
    if(GREET.test(t)){
      if(!hasCustomer()){
        showAccountForm('هلا والله 🌸 حتى أخدمك، سجّل حسابك بثواني بالضغط على الزر:');
        return;
      }
      say('هلا والله 🌸 شنو تحب من الروائح؟ أو إذا تريد أرشحلك، احچيلي نوع العطر اللي تريده وشكد عمرك حتى أختارلك الأنسب.');
      chips(BASIC_CHIPS);
      return;
    }

    /* ── 3) التحقق من الاسم والرقم قبل أي خدمة ── */
    if(!hasCustomer()){
      showAccountForm('حتى أخدمك لازم أعرفك أول 🌸 اضغط الزر وسجّل حسابك:');
      return;
    }

    /* سؤال عن سلة الزبون */
    if(/(سله|السله|سلة|السلة|شنو بسله|شو بسله|بسله|بسلة|مشترياتي|طلباتي|شكد بسله|المجموع)/.test(t)){
      var cs=cartSummary();
      if(!cs){ say('سلة المشتريات فاضية حالياً 🛒 إذا تحب أرشحلك شي، احچيلي شنو تحب.'); chips(BASIC_CHIPS); return; }
      say('سلة المشتريات عندك ('+cs.count+' منتج):<br>'+cs.lines.join('<br>')+'<br><br>💰 المجموع: '+fmt(cs.total)+' دينار');
      chips(['أضف لي عطر','من جديد']);
      return;
    }

    /* ── طلب إكمال الطلب (كملت اريد اطلبهم) ── */
    if(/(كملت|خلصت|ابي اطلب|اريد اطلب|اطلبهم|اطلبهن|اطلب|خلص|كملي|سوي الطلب|ارسل الطلب|اطلب الحين|ابي اطلبهم|ابي اطلبهن)/.test(t)){
      var c0=cartSummary();
      if(!c0){ say('سلتك فاضية 🌸 احچيلي شنو تحب وأضيفه لك، وبعدها نكمل الطلب.'); chips(BASIC_CHIPS); return; }
      say('تمام 🌸 سلتك فيها:<br>'+c0.lines.join('<br>')+'<br><br>💰 المجموع: '+fmt(c0.total)+' دينار<br><br>عندك كود خصم؟ إذا عندك اكتبه، وإذا ما عندك اكتب «ما عندي» أو «لا».');
      flow={step:'coupon'};
      return;
    }

    /* ── كشف العمر (سؤال مباشر عن العمر) ── */
    var ageM=t.match(/(?:عمري|عمرك|عمر)\s*(\d{1,3})/);
    if(ageM){
      var age=parseInt(ageM[1],10);
      if(age>=5 && age<=100){
        saveCustomerField('age',age);
        say('حلو، عمرك '+age+' سنة 🌸 سجلته عندي. شنو نوع العطر اللي تريده؟ (هادئ، سويت، منعش، قوي...) أو احچيلي المناسبة.');
        chips(BASIC_CHIPS);
        return;
      }
    }
    // إذا سأل عن العمر (بدون رقم) — نطلب منه يكتبه
    if(/(شكد عمرك|شكد عمري|كم عمرك|عمرك|عمري)/.test(t) && !ageM){
      say('اكتبلي عمرك بالرقم 🌸 (مثل: عمري 25) حتى أختارلك العطر الأنسب لعمرك.');
      flow={step:'age'};
      return;
    }

    /* سؤال عن عطر معيّن */
    var named=findByName(raw,perfumes);
    if(named>-1){ showNamed(named,perfumes[named],raw); return; }

    var pm=parseMessage(raw);

    /* تحية / شكر */
    if(!pm.any && !pm.free.length){
      if(THANKS.test(t)){ say('عفواً حبيبي 🌸 إذا تريد ترشيح ثاني أني حاضر.'); return; }
      if(GREET.test(t)){ say('هلا والله 🌸 شنو تحب من الروائح؟'); chips(BASIC_CHIPS); return; }
      if(MORE.test(t) && state.lastIdx.length){ showMore(perfumes); return; }
      if(/(شنو عندكم|شكو|كل العطور|عرض|المتوفر|الاصناف)/.test(t)){ listAll(perfumes); return; }
      /* سؤال عام خارج العطور — نسلك له ونحول الموضوع */
      if(/(كيف حالك|شلونك|شخبارك|وين تعيش|عمرك|شكد عمرك|من وين|جنسيتك|انت انسان|انت روبوت|انت ذكاء|شلون اشتغل|كيف تصنع|شلون تسوي|شنو هوايتك|تحب شنو|عندك صديق|متزوج|عندك عيله|شلون اتعلمت|منو صنعك|شنو اسمك الحقيقي|شلون تكدر|شنو رايك ب|شنو الاخبار|شكو جديد|اخبارك|شلون يومك|كيف يومك)/.test(t)){
        say('هذا سؤال حلو 🌸 بس أني هنا مخصص للعطور! خليني أرد عليك بسؤال أهم: شنو نوع الريحة اللي تحبها؟ هادية، سويت، منعشة، قوية…؟');
        chips(BASIC_CHIPS);
        return;
      }
      say('أني متخصص بالعطور بس 🌸 احچيلي شنو نوع الريحة اللي تحبها: هادئة، سويت، منعشة، قوية…؟'); chips(BASIC_CHIPS); return;
    }

    /* ── التعمق بالتفاصيل: نسأل عن العمر مرة وحدة إذا ما نعرفه ── */
    var cust0=getCustomer();
    if((pm.any||pm.free.length) && cust0 && !cust0.age && !state.askedAge){
      state.askedAge=true;
      state.pendingQuery=raw;
      say('حلو 🌸 وبسؤال صغير: شكد عمرك؟ (اكتبه بالرقم) حتى أختارلك العطر الأنسب لعمرك — وإذا ما تحب اكتب «تخطي».');
      flow={step:'ageThenRecommend'};
      return;
    }

    /* "غيرهم" مع كلمات جديدة = دمج؛ بدون جديد = المزيد */
    var newTraits=Object.keys(pm.w).length>0, hasNew=newTraits||pm.free.length>0||pm.gender||pm.budget;
    if(MORE.test(t) && !hasNew && state.lastIdx.length){ showMore(perfumes); return; }

    /* هل الطلب يغيّر التفضيلات أم يكمّلها؟ */
    if(/(من جديد|ابدا|ابدأ|بلش|غير الطلب|امسح)/.test(t)) resetState();
    Object.keys(pm.w).forEach(function(k){ state.w[k]=(state.w[k]||0)*0.6+pm.w[k]; });
    if(pm.gender) state.gender=pm.gender;
    if(pm.budget) state.budget=pm.budget;
    state.free=pm.free.length?pm.free.slice(0,6):state.free;
    state.shown=[];

    var res=recommend(perfumes);
    if(!res.poolSize){
      var why=[]; if(state.gender) why.push('النوع «'+state.gender+'»'); if(state.budget) why.push('ميزانية '+fmt(state.budget)+' دينار');
      var hasType=perfumes.some(function(p){ return p.type && norm(p.type).indexOf(norm(state.gender||'-'))>-1; });
      if(state.gender && !hasType) say('حالياً ما عندنا عطور «'+state.gender+'» معروضة 😔 بس إذا تريد أرشحلك من العطور الموجودة، احچيلي شنو تحب.');
      else say('ما لقيت عطر متوفر بهالشروط ('+why.join(' + ')+') 😔 جرّب تغيّر الميزانية أو النوع.');
      state.gender=null; chips(['من جديد'].concat(BASIC_CHIPS.slice(0,3))); return;
    }
    var top=res.list.filter(function(x){return x.score>0.3;});
    var noTaste=!Object.keys(state.w).length && !state.free.length;
    if(!top.length && noTaste){
      say(buildIntro());
      state.pending=res.list.slice(3);
      showCards(res.list.slice(0,3),perfumes,true);
      return;
    }
    if(!top.length){
      say('ما لقيت شي يطابق طلبك بالضبط، بس هذي أكثر العطور اللي تنطلب عندنا 🌸');
      showCards(res.list.slice(0,3),perfumes,true);
      return;
    }
    var intro=buildIntro();
    say(intro);
    showCards(top.slice(0,3),perfumes,false);
    state.pending=top.slice(3);
    if(res.soldOutCount) setTimeout(function(){},0);
  }

  /* ───────── معالجة المحادثة الطبيعية (اسم → عمر → كود → عنوان) ───────── */
  function handleFlow(raw,t,perfumes){
    var step=flow.step;

    /* إلغاء المحادثة الجارية (ما عدا خطوة الاسم — إلزامية) */
    if(step!=='name' && /(من جديد|الغاء|كنسل)/.test(t)){
      flow=null; resetState();
      say('تمام، رجعنا للبداية 🌸 شنو تحب؟'); chips(BASIC_CHIPS);
      return;
    }

    if(step==='name'){
      // استخراج الاسم والرقم من النص
      var phoneM=raw.match(/(07\d{9})/);
      var phone=phoneM?phoneM[1]:'';
      var name=raw.replace(/(07\d{9})/,'').replace(/[^\u0621-\u064Aa-zA-Z\s]/g,'').trim().split(/\s+/)[0]||'';
      if(!name || !phone){
        say('أحتاج الاسم الأول ورقم الهاتف معاً 🌸 اكتبهم هكذا: «علي 07701234567»');
        return;
      }
      // حفظ الاسم والرقم
      try{
        var c=getCustomer()||{};
        c.name=name; c.phone=phone;
        localStorage.setItem('diraz_customer',JSON.stringify(c));
        var list=[]; try{ list=JSON.parse(localStorage.getItem('diraz_customers')||'[]'); }catch(e){ list=[]; }
        if(!Array.isArray(list)) list=[];
        var key=phone;
        var i=list.findIndex(function(x){ return (x.phone||'').replace(/\D/g,'')===key; });
        if(i>=0) list[i]=c; else list.unshift(c);
        localStorage.setItem('diraz_customers',JSON.stringify(list));
        syncCustomerCloud(c);
      }catch(e){}
      flow=null;
      say('أهلاً '+name+' 🌸 سجلتك. شنو نوع العطر اللي تريده؟ أو احچيلي شكد عمرك حتى أرشحلك الأنسب.');
      chips(BASIC_CHIPS);
      return;
    }

    if(step==='age'){
      var am=t.match(/(\d{1,3})/);
      if(am){
        var age=parseInt(am[1],10);
        if(age>=5 && age<=100){
          saveCustomerField('age',age);
          flow=null;
          say('حلو، عمرك '+age+' سنة 🌸 سجلته. شنو نوع العطر اللي تريده؟ (هادئ، سويت، منعش، قوي...)');
          chips(BASIC_CHIPS);
          return;
        }
      }
      say('اكتب عمرك بالرقم بس 🌸 (مثل: 25)');
      return;
    }

    if(step==='coupon'){
      var no=/(ما عندي|ما عندي كود|ماكو|لا|بدون|ماعندي|ما عندي شي|لا ما عندي|ما عندي خصم|لا كود|بدون كود)/.test(t);
      if(no){
        flow={step:'address'};
        say('تمام، بدون كود 🌸 هسه أحتاج عنوانك: شنو المحافظة والمنطقة والعنوان بالتفصيل؟ (مثل: بغداد، الكرادة، شارع 62)');
        return;
      }
      if(GREET.test(t)||THANKS.test(t)){ say('إذا عندك كود خصم اكتبه هني 🌸 وإذا ما عندك اكتب «ما عندي».'); return; }
      // عنده كود — نكتبه بالسلة ونطبقه
      var code=raw.replace(/[^\w\u0621-\u064A]/g,'').toUpperCase().trim();
      if(code && code.length>=2 && code.length<=16){
        // نحاول تطبيق الكود عبر دالة الصفحة
        var applied=false;
        try{
          if(typeof applyCoupon==='function'){
            var ci=document.getElementById('couponInput');
            if(ci){ ci.value=code; applyCoupon(); applied=true; }
          }
        }catch(e){}
        flow={step:'address'};
        say((applied?'دخلت الكود «'+code+'» بالسلة وجاري التحقق 🌸 شوف النتيجة بفتح السلة. ':'سجلت الكود «'+code+'» 🌸 ')+'هسه أحتاج عنوانك: شنو المحافظة والمنطقة والعنوان بالتفصيل؟');
        return;
      }
      say('اكتبلي كود الخصم 🌸 وإذا ما عندك اكتب «ما عندي».');
      return;
    }

    if(step==='address'){
      var addr=raw.trim();
      if(addr.length<5){
        say('أحتاج عنوان أوضح 🌸 اكتب المحافظة والمنطقة والعنوان بالتفصيل.');
        return;
      }
      // حفظ العنوان
      saveCustomerField('address',addr);
      flow=null;
      say('تمام، سجلت عنوانك 🌸 هسه افتحلك نافذة التوصيل حتى تكمل الطلب.');
      // فتح نافذة التوصيل مع تعبئة العنوان
      try{
        var da=document.getElementById('deliveryAddress');
        if(da) da.value=addr;
        if(typeof openDelivery==='function'){ openDelivery(); }
        else if(typeof openCart==='function'){ openCart(); }
      }catch(e){}
      return;
    }

    if(step==='ageThenRecommend'){
      if(/(تخطي|skip|ما اريد|مو مهم|بلا)/.test(t)){
        flow=null;
        var pq0=state.pendingQuery||''; state.pendingQuery=null;
        say('تمام، بدون عمر 🌸 هنيه ترشيحاتي:');
        if(pq0) setTimeout(function(){ reply(pq0,norm(pq0),getPerfumes()); },250);
        return;
      }
      var am2=t.match(/(\d{1,3})/);
      if(am2){
        var age2=parseInt(am2[1],10);
        if(age2>=5&&age2<=100){
          saveCustomerField('age',age2);
          flow=null;
          say('حلو، عمرك '+age2+' سنة 🌸 سجلته بقائمة الزبائن. هنيه ترشيحاتي على حساب عمرك:');
          var pq=state.pendingQuery||''; state.pendingQuery=null;
          if(pq) setTimeout(function(){ reply(pq,norm(pq),getPerfumes()); },250);
          return;
        }
      }
      say('اكتب عمرك بالرقم 🌸 (مثل: 25) أو اكتب «تخطي».');
      return;
    }

    // خطوة غير معروفة — نرجع للوضع الطبيعي
    flow=null;
    reply(raw,t,perfumes);
  }

  function buildIntro(){
    var parts=[];
    Object.keys(state.w).filter(function(k){return TRAITS[k]&&state.w[k]>0.9;}).sort(function(a,b){return state.w[b]-state.w[a];}).slice(0,3)
      .forEach(function(k){ parts.push(TRAITS[k].label); });
    var s='حسب طلبك';
    if(parts.length) s+=' ('+parts.join('، ')+')';
    if(state.gender) s+=' — '+state.gender;
    if(state.budget) s+=' — لحد '+fmt(state.budget)+' دينار';
    return s+'، هذي أفضل ترشيحاتي 🌸';
  }

  function showCards(items,perfumes,generic){
    state.lastIdx=state.lastIdx.filter(function(i){return true;});
    items.forEach(function(x){
      var p=perfumes[x.idx]; if(!p) return;
      state.shown.push(x.idx);
      var why='';
      if(!generic){
        var labels=x.why.slice(0,3).map(function(w){return TRAITS[w.k].label;});
        if(x.freeHits&&x.freeHits.length) labels.push('فيه '+x.freeHits.slice(0,2).join(' و'));
        if(labels.length) why='<div class="why">✨ يناسبك لأنه: '+esc(labels.join('، '))+'</div>';
      }
      var cl=charLine(p);
      var c=document.createElement('div'); c.className='dzA_card';
      c.innerHTML='<h4>'+esc(p.name||'')+'</h4>'+(p.nameEn?'<div class="en">'+esc(p.nameEn)+'</div>':'')+
        (cl?'<div class="tags">🌿 '+esc(cl.split(/[،,]/).slice(0,4).join('، '))+'</div>':'')+why+
        '<div class="pr">💰 50 مل: '+fmt(priceOf(p,'50ml'))+' • 35 مل: '+fmt(priceOf(p,'35ml'))+' '+esc(p.currency||'دينار')+
        ((state.budget && priceOf(p,'50ml')>state.budget)?'<br><small>✅ يناسب ميزانيتك بحجم 35 مل</small>':'')+'</div>'+
        '<div class="dzA_acts"><button class="dzA_act" type="button" data-a="view">👁️ شوف العطر</button>'+
        '<button class="dzA_act main" type="button" data-a="add50">🛒 50 مل</button>'+
        '<button class="dzA_act main" type="button" data-a="add35">🛒 35 مل</button>'+
        '<button class="dzA_act" type="button" data-a="cart">🛍️ سلة</button></div>';
      c.querySelector('[data-a=view]').onclick=function(){ goTo(x.idx); };
      c.querySelector('[data-a=add50]').onclick=function(){ quickAdd(x.idx,'50ml'); };
      c.querySelector('[data-a=add35]').onclick=function(){ quickAdd(x.idx,'35ml'); };
      c.querySelector('[data-a=cart]').onclick=function(){
        var cs=cartSummary();
        if(!cs){ say('سلة المشتريات فاضية حالياً 🛒'); return; }
        say('سلة المشتريات عندك ('+cs.count+' منتج):<br>'+cs.lines.join('<br>')+'<br><br>💰 المجموع: '+fmt(cs.total)+' دينار');
      };
      $('dzA_msgs').appendChild(c);
    });
    state.lastIdx=state.shown.slice();
    scrollEnd();
    var more=(state.pending||[]).length>0;
    chips((more?['عطور ثانية']:[]).concat(['أخف','أحلى','أقوى','من جديد']));
  }

  function showMore(perfumes){
    var res=recommend(perfumes);
    var rest=res.list.filter(function(x){ return state.shown.indexOf(x.idx)===-1 && (x.score>0.3 || !Object.keys(state.w).length); });
    if(!rest.length){ say('هاي كل الترشيحات المناسبة لطلبك 🌸 تحب نغيّر الطلب؟'); chips(['من جديد'].concat(BASIC_CHIPS.slice(0,3))); return; }
    say('تفضل، خيارات ثانية 🌸');
    state.pending=rest.slice(3);
    showCards(rest.slice(0,3),perfumes,false);
  }

  function listAll(perfumes){
    var names=perfumes.filter(function(p){return p.badge!=='soldout';}).map(function(p){return '• '+esc(p.name);});
    say('الموجود عندنا حالياً ('+names.length+' عطر):<br>'+names.join('<br>')+'<br><br>احچيلي شنو تحب وأرشحلك الأنسب 🌸');
  }

  function showNamed(idx,p,raw){
    var t=norm(raw);
    var d=String(p.description||'').replace(/[\u200B-\u200F]/g,'').split(/\n+/).filter(Boolean).map(esc).join('<br>');
    var soldout=p.badge==='soldout';
    say('<b>'+esc(p.name)+'</b>'+(p.nameEn?' <small style="opacity:.7">('+esc(p.nameEn)+')</small>':'')+(p.type?'<br>النوع: '+esc(p.type):'')+
        (d?'<br><br>'+d:'')+'<br><br>💰 50 مل: '+fmt(priceOf(p,'50ml'))+' • 35 مل: '+fmt(priceOf(p,'35ml'))+' '+esc(p.currency||'دينار')+
        (soldout?'<br>❌ هذا العطر نافذ حالياً.':''));
    var w=document.createElement('div'); w.className='dzA_acts';
    w.innerHTML='<button class="dzA_act" type="button">👁️ شوف العطر</button>'+(soldout?'':'<button class="dzA_act main" type="button" data-s="50ml">🛒 50 مل</button><button class="dzA_act main" type="button" data-s="35ml">🛒 35 مل</button>');
    w.querySelector('.dzA_act').onclick=function(){ goTo(idx); };
    w.querySelectorAll('[data-s]').forEach(function(b){ b.onclick=function(){ quickAdd(idx,b.dataset.s); }; });
    $('dzA_msgs').appendChild(w); scrollEnd();
  }

  /* ───────── أزرار الإجراءات ───────── */
  function goTo(idx){
    var el=document.getElementById('perfumeCard_'+idx);
    if(!el){
      // البطاقات ما عندها id — ناخذها من الـ grid حسب الترتيب
      var grid=document.getElementById('perfumesGrid');
      if(grid){ var cards=grid.querySelectorAll('.card'); if(cards[idx]) el=cards[idx]; }
    }
    if(!el){ say('ما قدرت أحدد مكان العطر بالصفحة 😅'); return; }
    $('dzA_box').classList.remove('open');
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.remove('dzA_flash'); void el.offsetWidth; el.classList.add('dzA_flash');
  }
  function quickAdd(idx,size){
    try{
      if(typeof selectedSizes==='undefined'||typeof addToCart!=='function'){ goTo(idx); return; }
      var ex=(typeof findItem==='function')?findItem(idx,size):null;
      if(ex){ say('هذا العطر بحجم '+size.replace('ml',' مل')+' موجود بالسلة من قبل 🛍️'); return; }
      selectedSizes[idx]=size;
      addToCart(idx);
      say('تمت الإضافة للسلة ✅ ('+size.replace('ml',' مل')+')');
    }catch(e){ goTo(idx); }
  }
  function resetState(){ state={w:{},gender:null,budget:null,free:[],shown:[],lastIdx:[],pending:[]}; }

  /* ───────── بيانات الزبون (اسم + رقم + عمر) ───────── */
  function getCustomer(){
    try{ return JSON.parse(localStorage.getItem('diraz_customer')||'null'); }catch(e){ return null; }
  }
  function saveCustomerField(field,value){
    try{
      var c=getCustomer()||{};
      c[field]=value;
      localStorage.setItem('diraz_customer',JSON.stringify(c));
      // حدّث قائمة الزبائن أيضاً
      var list=[]; try{ list=JSON.parse(localStorage.getItem('diraz_customers')||'[]'); }catch(e){ list=[]; }
      if(!Array.isArray(list)) list=[];
      var key=(c.phone||'').replace(/\D/g,'');
      var i=list.findIndex(function(x){ return (x.phone||'').replace(/\D/g,'')===key; });
      if(i>=0) list[i]=c; else list.unshift(c);
      localStorage.setItem('diraz_customers',JSON.stringify(list));
      syncCustomerCloud(c);
      return true;
    }catch(e){ return false; }
  }
  function hasCustomer(){
    var c=getCustomer();
    return !!(c && c.name && c.phone);
  }

  /* إرسال بيانات الزبون إلى Supabase حتى تظهر بلوحة الأدمن (نفس دالة موقع العطور) */
  function syncCustomerCloud(c){
    try{
      var phone=String((c&&c.phone)||'').replace(/\D/g,'');
      if(!window.DirazCloud || !/^07[0-9]{9}$/.test(phone)) return Promise.resolve(false);
      var send=function(){ return window.DirazCloud.rpc('save_customer',{p_phone:phone,p_data:c}); };
      return send().then(function(){return true;}).catch(function(){
        return new Promise(function(r){ setTimeout(r,1500); }).then(send).then(function(){return true;}).catch(function(){return false;});
      });
    }catch(e){ return Promise.resolve(false); }
  }

  /* زر + نموذج إنشاء حساب داخل المحادثة (بدون ما يطلع الزبون من الصفحة) */
  function showAccountForm(intro){
    var old=document.querySelectorAll('.dzA_reg'); for(var k=0;k<old.length;k++){ var p=old[k].parentNode; if(p) p.remove(); }
    var d=say(intro+'<div class="dzA_reg">'+
      '<button type="button" class="dzA_regOpen">👤 إنشاء حساب</button>'+
      '<div class="dzA_regBox" style="display:none;flex-direction:column;gap:8px">'+
        '<input type="text" class="dzA_rn" placeholder="الاسم الأول *" autocomplete="given-name">'+
        '<input type="tel" class="dzA_rp" placeholder="رقم الهاتف (07xxxxxxxxx) *" maxlength="11" inputmode="numeric">'+
        '<div class="dzA_err"></div>'+
        '<button type="button" class="dzA_regGo">إنشاء الحساب والمتابعة ←</button>'+
      '</div></div>');
    var openB=d.querySelector('.dzA_regOpen'), box=d.querySelector('.dzA_regBox'),
        n=d.querySelector('.dzA_rn'), ph=d.querySelector('.dzA_rp'),
        err=d.querySelector('.dzA_err'), go=d.querySelector('.dzA_regGo');
    openB.onclick=function(){ openB.style.display='none'; box.style.display='flex'; scrollEnd(); setTimeout(function(){ n.focus(); },50); };
    ph.addEventListener('input',function(){ ph.value=ph.value.replace(/\D/g,'').slice(0,11); });
    function fail(m){ err.textContent=m; err.style.display='block'; scrollEnd(); }
    go.onclick=function(){
      var name=(n.value||'').trim().split(/\s+/)[0]||'';
      var phone=(ph.value||'').replace(/\D/g,'');
      if(!name){ fail('❗ اكتب اسمك الأول'); return; }
      if(!/^07[0-9]{9}$/.test(phone)){ fail('❗ رقم الهاتف لازم يبدأ بـ 07 ويكون 11 رقم'); return; }
      err.style.display='none'; go.disabled=true; go.textContent='جاري التسجيل...';
      var c=getCustomer()||{}; c.name=name; c.phone=phone;
      try{
        localStorage.setItem('diraz_customer',JSON.stringify(c));
        var list=[]; try{ list=JSON.parse(localStorage.getItem('diraz_customers')||'[]'); }catch(e){ list=[]; }
        if(!Array.isArray(list)) list=[];
        var i=list.findIndex(function(x){ return (x.phone||'').replace(/\D/g,'')===phone; });
        if(i>=0) list[i]=c; else list.unshift(c);
        localStorage.setItem('diraz_customers',JSON.stringify(list));
        var del=[]; try{ del=JSON.parse(localStorage.getItem('diraz_deleted_customers')||'[]'); }catch(e){ del=[]; }
        localStorage.setItem('diraz_deleted_customers',JSON.stringify((del||[]).filter(function(x){ return x!==phone; })));
      }catch(e){}
      syncCustomerCloud(c).then(function(){
        var reg=d.querySelector('.dzA_reg'); if(reg) reg.innerHTML='<div style="font-weight:800;color:#2e7d32">✅ تم إنشاء حسابك</div>';
        flow=null;
        say('أهلاً '+esc(name)+' 🌸 تم تسجيلك. شنو نوع العطر اللي تريده؟ أو احچيلي شكد عمرك حتى أرشحلك الأنسب.');
        chips(BASIC_CHIPS);
      });
    };
    flow={step:'name'};
  }

  /* ───────── حالة المحادثة الطبيعية (طلب/كود/عنوان) ───────── */
  var flow=null; // {step:'...', ...}
  function resetFlow(){ flow=null; }

  /* أزرار التعديل السريع */
  var ADJ={'أخف':{fresh:1.2,strong:-1,warm:-0.6},'أحلى':{sweet:1.5},'أقوى':{strong:1.5,warm:0.8}};
  var _handle=handle;
  handle=function(text){
    if(flow){ _handle(text); return; }
    if(!hasCustomer()){
      say(esc(text),'me');
      showAccountForm('حتى أخدمك لازم أعرفك أول 🌸 اضغط الزر وسجّل حسابك:');
      return;
    }
    if(ADJ[text]){
      say(esc(text),'me');
      Object.keys(ADJ[text]).forEach(function(k){ state.w[k]=(state.w[k]||0)+ADJ[text][k]; });
      state.shown=[];
      var perfumes=getPerfumes(), res=recommend(perfumes);
      var top=res.list.filter(function(x){return x.score>0.3;});
      setTimeout(function(){
        if(!top.length){ say('جرّب توصفلي شنو تحب بكلماتك 🌸'); chips(BASIC_CHIPS); return; }
        say('تمام، عدّلت الترشيحات 🌸'); state.pending=top.slice(3); showCards(top.slice(0,3),perfumes,false);
      },250);
      return;
    }
    if(text==='من جديد'){ say(esc(text),'me'); resetState(); setTimeout(function(){ say('ابدأنا من جديد 🌸 شنو تحب؟'); chips(BASIC_CHIPS); },250); return; }
    if(text==='عطور ثانية'){ say(esc(text),'me'); setTimeout(function(){ showMore(getPerfumes()); },250); return; }
    if(text==='أضف لي عطر'){ say(esc(text),'me'); setTimeout(function(){ say('تمام 🌸 احچيلي شنو تحب وأضيفه لك بالسلة مباشرة. مثلاً: «أضف لي عطر سويت» أو «أضف لي عطر منعش»'); chips(['سويت وحلو','منعش للصيف','دافئ للشتاء','قوي وفواح']); },250); return; }
    /* طلب إضافة عطر معيّن للسلة */
    var addM=text.match(/اضف|ضيف|حط|زود|زيد/);
    if(addM){
      var named2=findByName(text,getPerfumes());
      if(named2>-1){
        var p2=getPerfumes()[named2];
        var r=addToCartDirect(named2,'50ml');
        if(r===true){ say('تمت إضافة «'+esc(p2.name)+'» (50 مل) للسلة ✅'); }
        else if(r==='exists'){ say('«'+esc(p2.name)+'» موجود بالسلة من قبل 🛍️'); }
        else { say('ما قدرت أضيفه تلقائياً، بس هاهو العطر 👇'); goTo(named2); }
        return;
      }
    }
    _handle(text);
  };

  /* للاختبار */
  window.DirazAssistant={_parse:parseMessage,_recommend:function(q){ resetState(); var pm=parseMessage(q); Object.keys(pm.w).forEach(function(k){state.w[k]=pm.w[k];}); state.free=pm.free; if(pm.gender)state.gender=pm.gender; if(pm.budget)state.budget=pm.budget; return recommend(getPerfumes()); },_state:function(){return state;}};

  function init(){ if(document.getElementById('dzA_btn')) return; resetState(); injectUI(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
