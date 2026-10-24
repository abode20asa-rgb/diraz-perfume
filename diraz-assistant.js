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
  var GREET = /^(هلا|هلو|مرحبا|مرحبتين|اهلا|اهلين|السلام|سلام|صباح|مساء|هاي|hi|hello|يا هلا|حياك|حياكم|حياج|يسعد (صباحك|صباحكم|مساك|مساكم)|نهارك|تحياتي|الو)(?= |$)/;
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
  /* الكلمة تبدأ بها كلمة بالنص (مع أو بدون ال/و/ب/ل) */
  function inText(full,x){
    if(!x || x.length<3 || !/^[a-z0-9\u0621-\u064A]+$/.test(x)) return false;
    return new RegExp('(^| )(وال|بال|لل|ال|و|ب|ل)?'+x).test(full);
  }
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

  /*SECTION-BLOCK-START*/
  /* ───────── القسم (رجالي / نسائي): يغيّر اللهجة واللون وترشيحات المساعد ───────── */
  var audience=null, selfSwitch=false, pendingRaw=null;
  function audGender(){ return audience==='men'?'رجالي':audience==='women'?'نسائي':null; }
  function secName(s){ return s==='men'?'الرجالي':'النسائي'; }

  /* تحويل الخطاب من المذكر (الأساس) إلى المؤنث عند قسم النسائي */
  var FEM_PAIRS={
    'أختارلك':'أختارلج','أخدمك':'أخدمج','أرشحلك':'أرشحلج','أسألك':'أسألج','أساعدك':'أساعدج','أسمعك':'أسمعج','أعرفك':'أعرفج','أفتحلك':'أفتحلج',
    'اخبارك':'اخبارج','اسمك':'اسمج','بك':'بج','بكلماتك':'بكلماتج','بياناتك':'بياناتج','بيك':'بيج','حالك':'حالج','حياك':'حياج','سلامتك':'سلامتج',
    'سلتك':'سلتج','شخبارك':'شخبارج','شلونك':'شلونج','شونك':'شونج','طلبك':'طلبج','عساك':'عساج','عليك':'عليج','عمرك':'عمرج','عندك':'عندج',
    'عنوانك':'عنوانج','كيفك':'كيفج','لطلبك':'لطلبج','لعمرك':'لعمرج','لك':'لج','ميزانيتك':'ميزانيتج','وياك':'وياج','يسلمك':'يسلمج','يناسبك':'يناسبج',
    'يخليك':'يخليج','يعطيك':'يعطيج','منك':'منج','الك':'الج','إلك':'إلج','اكلك':'اكلج','احبك':'احبج',
    'تحب':'تحبين','تحبها':'تحبينها','تحبه':'تحبينه','تريد':'تريدين','تريده':'تريدينه','تريدها':'تريدينها','تحتاج':'تحتاجين','تختار':'تختارين',
    'تدور':'تدورين','تكمل':'تكملين','تكمّل':'تكملين','تضيف':'تضيفين','تفضل':'تفضلي','تعال':'تعالي','كول':'كولي','تدلل':'تدللي','تغيّر':'تغيّرين',
    'تبي':'تبين','تقدر':'تقدرين','تكتب':'تكتبين','تسلم':'تسلمين','دمت':'دمتي','نورت':'نورتي','انت':'انتي',
    'اكتب':'اكتبي','اكتبلي':'اكتبيلي','اختار':'اختاري','اختر':'اختاري','سجّل':'سجّلي','اضغط':'اضغطي','جرّب':'جرّبي','شوف':'شوفي','دز':'دزي','ادخل':'ادخلي',
    'كمّل':'كمّلي','خلص':'خلصي','حبيبي':'حبيبتي'
  };
  function plainKey(w){ return String(w).replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا'); }
  var FEMN={}; Object.keys(FEM_PAIRS).forEach(function(k){ FEMN[plainKey(k)]=FEM_PAIRS[k]; });
  function femWord(w){
    var k=plainKey(w);
    if(FEMN.hasOwnProperty(k)) return FEMN[k];
    if(k.length>3 && k.charAt(0)==='و' && FEMN.hasOwnProperty(k.slice(1))) return 'و'+FEMN[k.slice(1)];
    return w;
  }
  function gx(html){
    if(audience!=='men' && audience!=='women') return html;
    return String(html).split(/(<[^>]+>)/).map(function(part){
      if(part.charAt(0)==='<') return part;
      if(audience==='men') return part.replace(/🌸|💐|🌷/g,'✨');
      return part.replace(/[\u0621-\u065F\u0670\u0640]+/g,femWord);
    }).join('');
  }

  /* كلمات القسم وأفعال التحويل (بعد التطبيع) */
  var SEC_M=N(['رجالي','رجاليه','رجاليين','رجال','رجل','شباب','اولاد','ولد','ازواج','زوجي','ابوي','اخوي','خطيبي','ابني','صديقي','men','man','male','boys','boy']);
  var SEC_W=N(['نسائي','نسائيه','نسائيات','نساء','نسوان','حريمي','حريم','بنات','بنت','زوجتي','مرتي','امي','اختي','خطيبتي','بنتي','صديقتي','women','woman','female','girls','girl']);
  var SW_WORDS=N(['حول','حولني','حولي','روح','وديني','ودي','افتح','افتحلي','اعرض','اعرضلي','وريني','ورني','دخلني','خذني','انقلني','بدل','غير','قسم','اقسام',
    'ارجع','اشوف','شوف','اكدر','ممكن','اريد','ابي','ابغي','احب','عندكم','عندك','عطور','عطر','متوفر','شكو','شنو','هل','لو','تقدر','فضلك','سمحت',
    'هسه','الحين','اخي','اختي','حبيبي','يا','بس','فقط','كل','عن','على','الى','في','من','هذا','هاي','هذي','خلني','خل','لي','الي','ال','اي','ايش','وين']);
  function hasAny(tk,set){ return tk.some(function(x){ return forms(x).some(function(f){ return set.indexOf(f)>-1; }); }); }
  function detectSection(t){
    var tk=String(t).split(' ').filter(Boolean);
    var m=hasAny(tk,SEC_M), w=hasAny(tk,SEC_W);
    if(m===w) return null;
    var rest=tk.filter(function(x){ return !forms(x).some(function(f){ return SEC_M.indexOf(f)>-1||SEC_W.indexOf(f)>-1||SW_WORDS.indexOf(f)>-1; }); });
    return {sec:m?'men':'women', only:rest.length===0};
  }
  var RX_SECTIONS=/(^| )(اقسام|الاقسام|قسمين|شنو الاقسام|شكو اقسام)( |$)/;

  function sectionClosed(sec){ try{ return typeof sections!=='undefined' && sections[sec]===false; }catch(e){ return false; } }
  function setAudience(sec){
    audience=sec||null;
    state.gender=audGender();
    if(typeof openSection==='undefined') document.body.classList.toggle('sec-men',audience==='men');
  }
  function doSwitch(sec){
    selfSwitch=true;
    setAudience(sec);
    try{ if(typeof openSection==='function') openSection(sec); }catch(e){}
    selfSwitch=false;
  }
  function syncFromPage(){
    try{ if(typeof curSection!=='undefined' && curSection && curSection!==audience) setAudience(curSection); }catch(e){}
  }
  function askSection(){
    say('أكيد 🌸 حتى أجاوبك صح، العطر لقسم الرجالي لو النسائي؟');
    chips(['رجالي','نسائي']);
  }
  function announceSwitch(sec){
    say('تمام 🌸 حولتك لقسم '+secName(sec)+'<br>شنو تحب من الروائح؟ (قوي، منعش، سويت، لسهرة، للدوام...) أو احچيلي الميزانية.');
    chips(BASIC_CHIPS);
  }
  function closedMsg(sec){
    say('قسم '+secName(sec)+' قريباً 🔒 نجهّز لكم أجمل العطور، ترقّبونا.');
    var other=sec==='men'?'women':'men';
    if(!sectionClosed(other)) chips([sec==='men'?'نسائي':'رجالي']);
  }
  function resumePending(){
    var pr=pendingRaw; pendingRaw=null;
    if(pr) setTimeout(function(){ reply(pr,norm(pr),getPerfumes()); },300);
  }
  /*SECTION-BLOCK-END*/


  function parseMessage(raw){
    var t=norm(raw), toks=t.split(' ').filter(Boolean);
    var out={w:{}, free:[], gender:null, budget:null, used:{}, any:false};
    /* ميزانية */
    var m=t.match(/(\d+(?:\s?\d{3})*)\s*(الف|الاف|k)?/);
    var priceCtx = !!m && !!(m[2] || toks.length===1 || /(دينار|ميزانيه|ميزانيتي|سعر|بسعر|لحد|تحت|حدود|اقل من|الف|الاف)/.test(t));
    if(m && priceCtx){
      var n=parseInt(m[1].replace(/\s/g,''),10);
      if(m[2]) n=n*1000;
      if(n>=1000 && n<=1000000){ out.budget=n; out.any=true; }
      else if(n>=5 && n<1000 && /(الف)/.test(t)){ out.budget=n*1000; out.any=true; }
    }
    /* جنس */
    if(/(^| )(و|ل|ب|ال)?(نسائي|نسائيه|حريمي|بنات|بنت|زوجتي|اختي|امي|حبيبتي|خطيبتي|مرتي)( |$)/.test(t)) { out.gender='نسائي'; out.any=true; }
    if(/(^| )(و|ل|ب|ال)?(رجالي|رجاليه|رجال|ولد|زوجي|اخوي|ابوي|شباب|خطيبي)( |$)/.test(t)){ out.gender='رجالي'; out.any=true; }
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
        var minP=Math.min(priceOf(p,'50ml')||1e9,priceOf(p,'30ml')||1e9);
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
        var hit=forms(f).filter(function(x){ return inText(pr.full,x); })[0];
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
      '#dzA_btn{padding:8px 18px 8px 10px;gap:10px}',
      '#dzA_btn .dzA_av{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.85);flex-shrink:0;background:#fff}',
      '#dzA_btn .dzA_av{display:block;overflow:hidden;position:relative}',
      '#dzA_btn .dzA_av svg{display:block;width:100%;height:100%}',
      '#dzA_btn .dzA_hd{transform-box:view-box;transform-origin:50% 95%;animation:dzA_look 8s ease-in-out infinite}',
      '#dzA_btn .dzA_lid{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(.001);animation:dzA_blink 4.6s infinite}',
      '#dzA_btn .dzA_lid.b{animation-delay:.02s}',
      '@keyframes dzA_look{0%,8%{transform:rotate(0) translateX(0) scale(1.1)}22%,36%{transform:rotate(-4deg) translateX(-2px) scale(1.1)}50%,56%{transform:rotate(0) translateX(0) scale(1.1)}70%,84%{transform:rotate(4deg) translateX(2px) scale(1.1)}100%{transform:rotate(0) translateX(0) scale(1.1)}}',
      '@keyframes dzA_blink{0%,86%,100%{transform:scaleY(.001)}89%{transform:scaleY(1)}92%{transform:scaleY(.001)}93.5%{transform:scaleY(.001)}95.5%{transform:scaleY(1)}98%{transform:scaleY(.001)}}',
      '@media(prefers-reduced-motion:reduce){#dzA_btn .dzA_hd,#dzA_btn .dzA_lid{animation:none}}',
      '#dzA_btn .dzA_tx{display:flex;flex-direction:column;align-items:flex-start;line-height:1.25;text-align:right}',
      '#dzA_btn .dzA_t1{font-size:.95rem;font-weight:900}',
      '#dzA_btn .dzA_t2{font-size:.72rem;font-weight:700;opacity:.92}',
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
      '.dzA_sz{display:inline-flex;direction:rtl;align-items:stretch;border-radius:50px;overflow:hidden;background:#c45a7a;color:#fff}',
      '.dzA_sz button{border:none;background:transparent;color:#fff;cursor:pointer;font-family:Cairo,sans-serif;font-weight:800;font-size:.74rem;padding:7px 10px;line-height:1}',
      '.dzA_sz button.pm{font-size:1.05rem;font-weight:900;padding:5px 12px}',
      '.dzA_sz button:active{background:rgba(0,0,0,.15)}',
      '.dzA_sz button[disabled]{opacity:.4;cursor:default}',
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
      'body.sec-men #dzA_btn{background:#1a2456;box-shadow:0 8px 26px rgba(10,16,50,.55)}',
      'body.sec-men #dzA_box{background:rgba(228,232,250,.98);border-color:rgba(255,255,255,.6);box-shadow:0 20px 60px rgba(10,16,50,.5)}',
      'body.sec-men .dzA_head{background:#1a2456}',
      'body.sec-men .dzA_bot{color:#1a2456;box-shadow:0 2px 10px rgba(26,36,86,.15)}',
      'body.sec-men .dzA_me{background:#4a5bb0;color:#fff}',
      'body.sec-men .dzA_chip{border-color:#4a5bb0;color:#1a2456}',
      'body.sec-men .dzA_chip:hover{background:#e3e7fa}',
      'body.sec-men .dzA_card{border-color:#c5cbee;color:#1a2456}',
      'body.sec-men .dzA_card .pr{color:#1a2456}',
      'body.sec-men .dzA_act{background:#e3e7fa;color:#1a2456}',
      'body.sec-men .dzA_act.main,body.sec-men .dzA_sz{background:#1a2456;color:#fff}',
      'body.sec-men .dzA_form{border-top-color:#c5cbee}',
      'body.sec-men .dzA_form input,body.sec-men .dzA_reg input{border-color:#c5cbee;color:#1a2456}',
      'body.sec-men .dzA_form input:focus,body.sec-men .dzA_reg input:focus{border-color:#4a5bb0}',
      'body.sec-men .dzA_form button,body.sec-men .dzA_reg button{background:#1a2456}',
      'body.sec-men .dzA_flash{animation-name:dzAflashM}',
      '@keyframes dzAflashM{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}25%,70%{box-shadow:0 0 0 6px rgba(255,255,255,.95),0 0 30px 8px rgba(26,36,86,.7)}}',
      '.dzA_tabs{display:flex;gap:6px;padding:8px 10px;background:#fff;border-bottom:1px solid #f4c6d6}',
      '.dzA_tab{flex:1;border:1.5px solid #e07898;background:#fff;color:#c45a7a;font-family:Cairo,sans-serif;font-weight:800;font-size:.78rem;padding:7px 6px;border-radius:50px;cursor:pointer}',
      '.dzA_tab.sel{background:#c45a7a;color:#fff}',
      'body.sec-men .dzA_tabs{border-bottom-color:#c5cbee}',
      'body.sec-men .dzA_tab{border-color:#4a5bb0;color:#1a2456}',
      'body.sec-men .dzA_tab.sel{background:#1a2456;color:#fff}',
      '#dzA_msgsF{flex:1;overflow-y:auto;padding:14px 12px;display:none;flex-direction:column;gap:10px}',
      '#dzA_box.full #dzA_msgs{display:none}',
      '#dzA_box.full #dzA_msgsF{display:flex}',
      '#dzA_box.full #dzA_orderbar{display:none!important}',
      '#dzA_box.full{background:rgba(240,235,252,.98)}',
      '#dzA_box.full .dzA_head{background:#4b2e83}',
      '#dzA_box.full .dzA_tabs{border-bottom-color:#d9cdf2}',
      '#dzA_box.full .dzA_tab{border-color:#7a5bc0;color:#4b2e83}',
      '#dzA_box.full .dzA_tab.sel{background:#4b2e83;color:#fff}',
      '#dzA_box.full .dzA_bot{color:#3b2466;box-shadow:0 2px 10px rgba(75,46,131,.15)}',
      '#dzA_box.full .dzA_me{background:#7a5bc0;color:#fff}',
      '#dzA_box.full .dzA_form{border-top-color:#d9cdf2}',
      '#dzA_box.full .dzA_form input{border-color:#d9cdf2}',
      '#dzA_box.full .dzA_form input:focus{border-color:#7a5bc0}',
      '#dzA_box.full .dzA_form button{background:#4b2e83}',
      '.dzA_form input:disabled{background:#f3f3f3;cursor:not-allowed}',
      '.dzA_lock{background:#fff;border:1.5px solid #d9cdf2;border-radius:18px;padding:18px 16px;text-align:center;color:#3b2466;display:flex;flex-direction:column;gap:9px;align-items:stretch}',
      '.dzA_lock .lk{font-size:2rem;line-height:1}',
      '.dzA_lock b{font-size:1rem;font-weight:900}',
      '.dzA_lock p{font-size:.8rem;line-height:1.7;font-weight:600;margin:0;opacity:.85}',
      '.dzA_lock input{border:1.5px solid #d9cdf2;border-radius:50px;padding:10px 14px;font-family:monospace;font-size:1rem;letter-spacing:2px;text-align:center;outline:none;direction:ltr;text-transform:uppercase;color:#3b2466}',
      '.dzA_lock input:focus{border-color:#7a5bc0}',
      '.dzA_lock button{border:none;cursor:pointer;background:#4b2e83;color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:.88rem;padding:11px;border-radius:50px}',
      '.dzA_lock button:disabled{opacity:.6;cursor:default}',
      '.dzA_lock .err{color:#d32f2f;font-size:.78rem;font-weight:700;min-height:1em}',
      '@media(max-width:480px){#dzA_btn{bottom:14px;right:14px;padding:7px 14px 7px 8px}#dzA_box{right:12px;bottom:72px}}'
    ].join('\n');
    document.head.appendChild(css);

    var btn=document.createElement('button');
    btn.id='dzA_btn'; btn.type='button'; btn.innerHTML='<span class="dzA_av"><svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diraz AI">'+'<g class="dzA_hd"><image href="data:image/jpeg;base64,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" width="160" height="160"/>'+'<ellipse class="dzA_lid" cx="68" cy="77" rx="9" ry="6.5" fill=\"#f4cfcb\" stroke=\"#2b1b1d\" stroke-width=\"1.1\"/>'+'<ellipse class="dzA_lid b" cx="34" cy="90" rx="7.5" ry="6" fill=\"#f4cfcb\" stroke=\"#2b1b1d\" stroke-width=\"1.1\"/>'+'</g></svg></span><span class="dzA_tx"><span class="dzA_t1">مساعد</span><span class="dzA_t2">Diraz الشخصي</span></span>';
    btn.onclick=toggle; document.body.appendChild(btn);

    var box=document.createElement('div');
    box.id='dzA_box';
    box.innerHTML='<div class="dzA_head"><div><b id="dzA_ttl">🌸 مساعد ديراز للعطور</b><small id="dzA_sub">أخبرني شنو تحب وأرشح لك الأنسب</small></div><button class="dzA_x" type="button" aria-label="إغلاق">✕</button></div>'+
      '<div class="dzA_tabs"><button type="button" class="dzA_tab sel" data-m="cust">🌸 نسخة الزبون</button><button type="button" class="dzA_tab" data-m="full">🔒 النسخة الكاملة</button></div>'+
      '<div id="dzA_msgs"></div><div id="dzA_msgsF"></div>'+
      '<div class="dzA_form"><input id="dzA_in" type="text" placeholder="مثال: أريد عطر هادئ للدوام..." autocomplete="off"><button type="button" id="dzA_send" aria-label="إرسال">➤</button></div>';
    document.body.appendChild(box);
    box.querySelector('.dzA_x').onclick=toggle;
    box.querySelectorAll('.dzA_tab').forEach(function(b){ b.onclick=function(){ setMode(b.getAttribute('data-m')); }; });
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
    var d=document.createElement('div'); d.className='dzA_m '+(who==='me'?'dzA_me':'dzA_bot'); d.innerHTML=(who==='me'?html:gx(html));
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
      showAccountForm('هلا بيك في ديراز 🌸<br>حتى أخدمك، سجّل اسمك ورقمك بالنافذة اللي انفتحت لك:');
      return;
    }
    syncFromPage();
    if(!audience){
      say('هلا بيك في ديراز 🌸<br>أني مساعد العطور. حتى أجاوبك صح، العطر لقسم الرجالي لو النسائي؟');
      chips(['رجالي','نسائي']);
      return;
    }
    say('هلا بيك في ديراز 🌸<br>أني مساعد العطور، احچيلي شنو تحب (هادئ، سويت، منعش، قوي...) أو للمناسبة أو الميزانية، وأرشحلك أحلى العطور من الموجودة عندنا.');
    chips(BASIC_CHIPS);
  }
  function submit(){
    var i=$('dzA_in'), v=(i.value||'').trim(); if(!v) return;
    i.value='';
    if(fullMode){ fullSubmit(v.slice(0,1500)); return; }
    handle(v.slice(0,300));
  }

  /* ───────── كلام اجتماعي: سلام، شلونك، شكر، وداع ───────── */
  var FILL = N(['هلا','هلو','هلاو','مرحبا','مرحبتين','اهلا','اهلين','وسهلا','سهلا','يا','وغلا','غلا','بيك','بيكم','بك','عليكم','وعليكم','عليك','السلام','سلام','سلامات','ورحمه','رحمه','الله','وبركاته','بركاته','حبيبي','حبيبتي','حبي','اخي','اخوي','خيي','اختي','استاذ','استاذه','عزيزي','صباح','مساء','الخير','النور','هاي','hi','hello','شلونك','شلونكم','شلونج','شخبارك','شخبارج','اخبارك','اخبارج','كيفك','كيف','حالك','الحال','شونك','عساك','طيب','والله','انت','وياك','شنو','شو','ديراز','الورد','الفل','الياسمين','سعيد','نهارك','حياك','حياكم','حياج','يسعد','صباحك','صباحكم','مساك','مساكم','تحياتي','الو']);
  var RX_SALAM=/(^| )(السلام|سلام|سلامات)( |$)/, RX_REPLYSALAM=/^و?عليكم/;
  var RX_HOW=/(شلونك|شلونكم|شلونج|شخبارك|شخباركم|شخبارج|اخبارك|اخباركم|اخبارج|كيفك|كيف حالك|كيف الحال|كيف حالكم|شونك|شلون الحال)/;
  var RX_FINE=/^(تمام|زين|كلش زين|كلش تمام|بخير|الحمد ?لله|والحمد ?لله|احسن|دلال|طيب|منيح|ماشي الحال)/;
  var RX_TIRED=/(تعبان|تعبانه|مو زين|مب زين|مو تمام|زعلان|زعلانه|مضايق|مضايج|ضايج)/;
  var RX_BYE=/^(مع السلامه|باي|bye|الي اللقاء|تصبح على خير|تصبحون على خير|يلا باي|اشوفك|الله معك|فمان الله)/;
  var RX_WHO=/(منو انت|شنو اسمك|شكو اسمك|منو تكون|انت منو|اسمك شنو|شنو تكون|شتسوي|شنو تسوي)/;
  var RX_BOT=/(انت روبوت|انت ذكاء|انت انسان|انت بشر|انت حقيقي|انت بوت|هذا بوت)/;
  var RX_CHAT=/(وين تعيش|من وين انت|جنسيتك|شنو هوايتك|متزوج|عندك عيله|منو صنعك|شلون يومك|كيف يومك)/;
  var RX_REC=/(ارشح|رشح|ترشيح|رشحلي|ارشحلي|انصحني|تنصحني|تنصح|اقترح|اقترحلي|ساعدني|ساعديني)/;
  var RX_NO=/^(لا|كلا|ماكو|ما ?عندي|مو ?عندي|ما ?اريد|بدون|مافي|no|n)( |$)/;
  var RX_YES=/^(نعم|ايه|اي|ايوه|ايوا|اكيد|عندي|yes|y)( |$)/;
  var awaitHow=false;

  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function firstName(){ var c=getCustomer(); if(!c||!c.name) return ''; return String(c.name).trim().split(/\s+/)[0]; }
  function inFill(w){ return FILL.indexOf(w)>-1 || (w.length>3 && /^[وب]/.test(w) && FILL.indexOf(w.slice(1))>-1); }
  function isFillOnly(t){ var tk=t.split(' ').filter(Boolean); return tk.length>0 && tk.length<=8 && tk.every(inFill); }
  function opener(t,nmS){
    if(RX_REPLYSALAM.test(t)) return 'حياك الله'+nmS+' 🌸';
    if(RX_SALAM.test(t)) return 'وعليكم السلام ورحمة الله وبركاته'+nmS+' 🌸';
    if(/^(حياك|حياكم|حياج)/.test(t)) return 'الله يحييك'+nmS+' 🌸';
    if(/^يسعد (صباحك|صباحكم)/.test(t)) return 'يسعدك الله بكل خير'+nmS+' ☀️';
    if(/^يسعد (مساك|مساكم)/.test(t)) return 'يسعدك الله بكل خير'+nmS+' 🌙';
    if(/^نهارك/.test(t)) return 'نهارك أسعد'+nmS+' ☀️';
    if(/^صباح/.test(t)) return 'صباح النور والسرور'+nmS+' ☀️';
    if(/^مساء/.test(t)) return 'مساء النور'+nmS+' 🌙';
    return pick(['هلا والله وغلا','يا هلا ومرحبا بيك','أهلين وسهلين'])+nmS+' 🌸';
  }
  function offerChips(){
    if(hasCustomer()) chips(['أريد ترشيح','هدية'].concat(BASIC_CHIPS.slice(1,4)));
    else chips(['👤 سجّل بياناتي']);
  }
  function askWho(){
    if(audience){
      say('أكيد 🌸 حتى أختارلك الأنسب خلني أسألك: شنو المناسبة؟ (سهرة، دوام، هدية...) وشنو نوع الريحة اللي تحبها؟');
      chips(['هدية','لسهرة','للدوام','للصيف']);
      return;
    }
    say('أكيد 🌸 حتى أختارلك الأنسب خلني أسألك: العطر لمن؟ (نسائي لو رجالي) وشنو المناسبة؟');
    chips(['نسائي','رجالي','هدية','لسهرة','للدوام','للصيف']);
  }
  /* يرجع true إذا الرسالة كلام اجتماعي وانردّ عليها؛ socialOnly = للزبون اللي ما سجّل بعد */
  function smallTalk(raw,t,socialOnly){
    var nm=firstName(), nmS=nm?(' '+esc(nm)):'', tk=t.split(' ').filter(Boolean).length;
    var regHint=hasCustomer()?'':'<br>وإذا تريد أرشحلك وأكمل لك الطلب، سجّل بياناتك بالزر 👇';

    /* جواب الزبون على "شلونك؟" */
    if(awaitHow && tk<=6){
      if(RX_TIRED.test(t)){
        awaitHow=false;
        say('سلامتك'+nmS+' 🌸 الله يفرجها عليك. إذا تحب نسولف شوي، وأكيد ريحة حلوة تحسّن المود 💐'+regHint);
        offerChips(); return true;
      }
      if(RX_FINE.test(t)){
        awaitHow=false;
        say(pick(['الله يديمها نعمة عليك 🌸','دوم الفرحة حبيبي 🌸','الحمد لله، يسعدني 🌸'])+' شنو أخدمك اليوم؟ تحب أرشحلك عطر، لو تدور على شي معيّن؟'+regHint);
        offerChips(); return true;
      }
    }
    /* «اكلك» ← كول */
    if(tk<=3 && /^(اكلك|اكلج|اكلكم|اكولك|اكلك شي)( |$)/.test(t)){
      say(pick(['كول حبيبي، أسمعك 🌸','كول كول، تفضل 💐','تفضل كول، أني كلي آذان صاغية 🌸'])); return true;
    }
    /* «احبك» */
    if(tk<=4 && /(احبك|احبج|احبكم|بحبك)/.test(t)){
      say(pick(['واحنا هم 🌸','واحنا هم، يا هلا بيك دوم 💐','وأني أكثر حبيبي 🌸 نورتنا','الله يخليك، وواحنا هم 💐'])); return true;
    }
    /* وداع */
    if(RX_BYE.test(t)){ say('الله يسلمك'+nmS+' 🌸 نورتنا، وإذا تحتاج شي أني هنا.'); return true; }
    /* شكر */
    if(THANKS.test(t) && tk<=6){ say(pick(['عفواً حبيبي 🌸 إذا تريد ترشيح ثاني أني حاضر.','تدلل 🌸 أي خدمة.','الله يسلمك، نورتنا 🌸'])); return true; }
    /* تعارف */
    if(tk<=8 && RX_BOT.test(t)){ say('أني مساعد ذكي من ديراز 🤖🌸 مو إنسان، بس أحب أسولف وياك وأختارلك أحلى ريحة. شنو نوع الريحة اللي تحبها؟'); chips(BASIC_CHIPS); return true; }
    if(tk<=8 && RX_WHO.test(t)){ say('أني مساعد ديراز للعطور 🌸 أساعدك تختار الريحة المناسبة، أضيفها بالسلة، وأكمل لك الطلب. وانت شنو تحب من الروائح؟'); chips(BASIC_CHIPS); return true; }
    if(tk<=8 && RX_CHAT.test(t)){ say('ههه سؤال حلو 😄 أني مساعد ديراز وشغلتي أختارلك أحلى الروائح 🌸 وانت شنو نوع الريحة اللي تحبها؟'); chips(BASIC_CHIPS); return true; }

    /* سلام / تحية / شلونك */
    var isGreet=RX_SALAM.test(t)||GREET.test(t)||RX_HOW.test(t)||/^(صباح|مساء)/.test(t);
    if(isGreet){
      var pure=isFillOnly(t) || (tk<=3 && !parseMessage(raw).any);
      if(pure){
        var tail=RX_HOW.test(t)?'الحمد لله تمام، دمت بخير 😊 وانت شلونك؟':'شلونك؟ إن شاء الله تمام؟';
        say(opener(t,nmS)+'<br>نورت ديراز 🌸 '+tail+regHint);
        awaitHow=true;
        chips(hasCustomer()?['الحمد لله تمام 😊','أريد ترشيح','🛒 طلب']:['الحمد لله تمام 😊','👤 سجّل بياناتي']);
        return true;
      }
      say(opener(t,nmS));   /* تحية + طلب بنفس الرسالة: نسلّم ونكمل */
      return false;
    }

    /* "رشحلي" بدون تفاصيل: نسأله عن الشخص والمناسبة */
    if(!socialOnly && tk<=5 && RX_REC.test(t)){
      var pm=parseMessage(raw);
      if(!Object.keys(pm.w).length && !pm.gender && !pm.budget && pm.free.every(function(f){ return RX_REC.test(f); })){ askWho(); return true; }
    }
    return false;
  }

  /* ───────── زر «طلب» + سؤال كود الخصم ───────── */
  var orderCtx=null;

  /* ───────── فتح نافذة التوصيل (بدون اختيار نوع دفع) ───────── */
  function proceedDelivery(){
    say('تمام 🌸 هسه أفتحلك نافذة التوصيل، اختار المحافظة والمنطقة واكتب عنوانك وأكّد الطلب.');
    setTimeout(openDeliveryForm,500);
  }

  /* يفتح نافذة التوصيل الحقيقية (المحافظة/المنطقة/العنوان) ويخلي الزبون يعبّيها بنفسه */
  function openDeliveryForm(){
    var box=$('dzA_box'); if(box) box.classList.remove('open');
    try{
      if(typeof openDelivery==='function') openDelivery();
      else if(typeof openCart==='function') openCart();
    }catch(e){}
  }
  function extractCode(raw){
    var m=String(raw).match(/[A-Za-z0-9][A-Za-z0-9_\-]{2,15}/);
    if(m && !/^(yes|no)$/i.test(m[0])) return m[0].toUpperCase();
    var s=String(raw).trim(), n=norm(s);
    if(/^[\u0621-\u064A]{3,16}$/.test(s) && !RX_YES.test(n) && !RX_NO.test(n) && !GREET.test(n) && !THANKS.test(n)) return s;
    return '';
  }
  function startOrder(){
    var c0=cartSummary();
    if(!c0){ orderCtx=null; say('سلتك فاضية 🌸 احچيلي شنو تحب وأضيفه لك، وبعدها نكمل الطلب.'); chips(BASIC_CHIPS); return; }
    if(orderCtx && orderCtx.code){ showFinal('عندك كود الخصم «'+esc(orderCtx.code)+'» مطبق من قبل ✅ (كود واحد فقط لكل طلب)'); return; }
    orderCtx={code:'',discount:0};
    say('تمام 🌸 سلتك فيها:<br>'+c0.lines.join('<br>')+'<br><br>💰 المجموع: '+fmt(c0.total)+' دينار<br><br>عندك كود خصم؟');
    chips(['نعم عندي كود','لا ما عندي']);
    flow={step:'couponAsk'};
  }

  /* أرقام «المجموع» الظاهرة بصفحة الموقع (نستعملها نعرف إذا الخصم انطبق) */
  function siteTotals(){
    var out={};
    try{
      document.querySelectorAll('[id]').forEach(function(el){
        if(!/total/i.test(el.id) || /count|item|qty/i.test(el.id)) return;
        if(el.closest && el.closest('#dzA_box')) return;
        var txt=String(el.textContent||'').replace(/[٠-٩]/g,function(d){return '٠١٢٣٤٥٦٧٨٩'.indexOf(d);});
        var n=parseInt(txt.replace(/[^0-9]/g,''),10);
        if(n>0) out[el.id]=n;
      });
    }catch(e){}
    return out;
  }

  /* يتحقق من الكود عن طريق دالة الموقع applyCoupon ويقرأ النتيجة (رسالة/تنبيه/تغيّر المجموع) */
  function verifyCoupon(code,cb){
    var ci=document.getElementById('couponInput');
    if(typeof applyCoupon!=='function' || !ci){ cb({status:'unknown'}); return; }
    var captured=[], oldAlert=window.alert, obs=null, finished=false;
    function grab(x){ x=String(x||'').replace(/\s+/g,' ').trim(); if(x && x.length<220) captured.push(x); }
    window.alert=function(m){ grab(m); };
    try{
      obs=new MutationObserver(function(ms){
        ms.forEach(function(m){
          if(m.target && m.target.closest && m.target.closest('#dzA_box')) return;
          for(var i=0;i<m.addedNodes.length;i++) grab(m.addedNodes[i].textContent);
          if(m.type==='characterData') grab(m.target.textContent);
        });
      });
      obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    }catch(e){}
    var before=siteTotals();
    function finish(){
      if(finished) return; finished=true;
      window.alert=oldAlert; try{ obs&&obs.disconnect(); }catch(e){}
      var after=siteTotals(), disc=0;
      Object.keys(after).forEach(function(id){
        if(before[id] && after[id]<before[id]) disc=Math.max(disc,before[id]-after[id]);
      });
      var raw=captured.join(' | '), tn=norm(raw);
      var invalid=/(غير صالح|غير صحيح|غير موجود|منتهي|منتهيه|خطا|خاطي|غلط|لا يوجد|مو صحيح|مو موجود|ما موجود|invalid|expired|not found)/.test(tn) || /[❌✖]/.test(raw);
      var valid=/(تم تفعيل|تم تطبيق|تم الخصم|كود صحيح|الكود صحيح|مفعل|مطبق|applied|valid)/.test(tn) || /[✅🎉]/.test(raw);
      if(!disc){
        var pm=raw.match(/(\d{1,3})\s*%/);
        if(pm && valid && !invalid){ var cs=cartSummary(); if(cs) disc=Math.round(cs.total*parseInt(pm[1],10)/100); }
      }
      var status='unknown';
      if(disc>0 && !invalid) status='valid';
      else if(invalid) status='invalid';
      else if(valid) status='valid';
      if(status!=='valid'){ try{ ci.value=''; }catch(e){} }
      cb({status:status,discount:disc,msg:raw});
    }
    ci.value=code;
    var rv=null;
    try{ rv=applyCoupon(); }catch(e){}
    if(rv && typeof rv.then==='function') rv.then(function(){ setTimeout(finish,500); },function(){ setTimeout(finish,300); });
    setTimeout(finish,2200);
  }

  function checkCode(code){
    if(!cartSummary()){ flow=null; orderCtx=null; say('سلتك فاضية 🌸 ضيف عطر للسلة أول وبعدها أطبق الكود.'); chips(BASIC_CHIPS); return; }
    if(!orderCtx) orderCtx={code:'',discount:0};
    if(orderCtx.code){ showFinal('ما يصير أكثر من كود خصم، الكود «'+esc(orderCtx.code)+'» مطبق من قبل ✅'); return; }
    flow={step:'couponWait'};
    var w=say('أتحقق من الكود «'+esc(code)+'» ⏳');
    verifyCoupon(code,function(r){
      if(w && w.remove) w.remove();
      if(r.status==='valid'){
        orderCtx.code=code; orderCtx.discount=r.discount||0;
        showFinal('✅ الكود «'+esc(code)+'» موجود وانطبق'+(r.discount?' — خصم '+fmt(r.discount)+' دينار':'')+' 🎉');
      }else if(r.status==='invalid'){
        flow={step:'coupon'};
        say('❌ الكود «'+esc(code)+'» غير موجود أو غير صالح.<br>جرّب كود ثاني، أو كمّل بدون كود.'+(r.msg?'<br><small style="opacity:.6">رد الموقع: '+esc(String(r.msg).slice(0,120))+'</small>':'<br><small style="opacity:.6">(الموقع ما رجّع أي رسالة)</small>'));
        chips(['بدون كود']);
      }else{
        orderCtx.code=code; orderCtx.discount=0;
        showFinal('سجلت الكود «'+esc(code)+'» 🌸 بس ما كدرت أتأكد منه تلقائياً، إذا انطبق الخصم يظهر بالسلة.');
      }
    });
  }

  /* الملخص النهائي: السلة + السعر ← نسأله يكمّل الطلب لو لا */
  function showFinal(prefix){
    var cs=cartSummary();
    if(!cs){ flow=null; say('سلتك فاضية 🌸'); return; }
    var h=(prefix?prefix+'<br><br>':'')+'🧾 ملخص طلبك:<br>'+cs.lines.join('<br>')+'<br><br>💰 المجموع: '+fmt(cs.total)+' دينار';
    var d=(orderCtx&&orderCtx.discount)||0;
    if(d>0) h+='<br>🎁 الخصم ('+esc(orderCtx.code)+'): -'+fmt(d)+' دينار<br>✅ <b>الصافي: '+fmt(Math.max(0,cs.total-d))+' دينار</b>';
    else if(orderCtx&&orderCtx.code) h+='<br>🎁 كود الخصم: '+esc(orderCtx.code);
    h+='<br><small>(سعر التوصيل يظهر بالنافذة الجاية حسب المحافظة)</small><br><br>تريد تكمّل الطلب؟';
    say(h);
    flow={step:'confirm'};
    chips(['✅ نعم، كمّل الطلب','لا، مو هسه']);
  }
  function refreshOrderBar(){
    var bar=$('dzA_orderbar'); if(!bar) return;
    var cs=cartSummary();
    if(!cs) orderCtx=null;
    bar.style.display=cs?'block':'none';
    var n=$('dzA_ordn'); if(n) n.textContent=cs?('('+cs.count+')'):'';
  }
  function addOrderBar(){
    var box=$('dzA_box'); if(!box) return;
    var st=document.createElement('style');
    st.textContent='#dzA_orderbar{display:none;padding:8px 10px 0;background:#fff}#dzA_orderbtn{width:100%;border:none;cursor:pointer;background:#c45a7a;color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:.88rem;padding:10px;border-radius:50px}#dzA_orderbtn:hover{background:#b04b6b}body.sec-men #dzA_orderbtn{background:#1a2456}body.sec-men #dzA_orderbtn:hover{background:#111a40}';
    document.head.appendChild(st);
    var bar=document.createElement('div'); bar.id='dzA_orderbar';
    bar.innerHTML='<button type="button" id="dzA_orderbtn">🛒 طلب <span id="dzA_ordn"></span></button>';
    box.insertBefore(bar,box.querySelector('.dzA_form'));
    $('dzA_orderbtn').onclick=function(){ flow=null; handle('إتمام الطلب'); };
    refreshOrderBar(); setInterval(refreshOrderBar,1500);
  }

  /* ───────── معالجة الرسالة ───────── */
  /* ───────── الذكاء الاصطناعي (هجين): القائمة أول، وإذا ما لكت جواب يجاوب الذكاء كرد عادي ───────── */
  var AI=null, aiHist=[], aiLoaded=false;
  function aiLoad(tries){
    tries=tries||0;
    if(aiLoaded && AI) return;
    try{
      if(!window.DirazCloud || !DirazCloud.rpc){ if(tries<10) setTimeout(function(){ aiLoad(tries+1); },800); return; }
      aiLoaded=true;
      DirazCloud.rpc('ai_public').then(function(c){ if(c && c.enabled && c.proxy) AI=c; }).catch(function(){ aiLoaded=false; });
    }catch(e){}
  }
  function aiOn(){ return !!(AI && AI.enabled && AI.proxy); }
  function aiCatalog(){
    var out=[], len=0;
    getPerfumes().slice(0,60).forEach(function(p){
      var info=charLine(p);
      if(!info){ info=String(p.description||'').replace(/[\u200B-\u200F]/g,'').replace(/\s+/g,' ').trim(); }
      info=info.slice(0,90);
      var line='- '+(p.name||'')+(p.nameEn?' ('+p.nameEn+')':'')+' | '+(p.type||'')+' | '+fmt(priceOf(p,'50ml'))+' دينار (50مل)'+(info?' | '+info:'')+(p.badge==='soldout'?' | نافذ حالياً':'');
      if(len+line.length<5500){ out.push(line); len+=line.length; }
    });
    return out.join('\n');
  }
  function aiAsk(raw){
    var hist=aiHist.slice(-6);
    var ctrl=('AbortController' in window)?new AbortController():null;
    var to=setTimeout(function(){ try{ctrl&&ctrl.abort();}catch(e){} },25000);
    return fetch(AI.proxy,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl?ctrl.signal:undefined,
      body:JSON.stringify({q:raw,history:hist,catalog:aiCatalog(),section:audGender()||''})})
      .then(function(r){ return r.json().catch(function(){return {};}).then(function(j){ if(!r.ok||!j.text) throw new Error(j.error||('HTTP '+r.status)); return String(j.text); }); })
      .then(function(x){ clearTimeout(to); return x; },function(e){ clearTimeout(to); throw e; });
  }

  /* ───────── كشف العطور المذكورة بالنص (اسم كامل أو كلمة مميزة تخص عطر واحد) ───────── */
  var GENERIC=N(['عطر','عطور','perfume','perfumes','parfum','pour','homme','femme','eau','toilette','intense','for','men','women','man','woman','spray','نسائي','رجالي','للجنسين','اصدار','نسخه','عنبر','عود','مسك','ورد','سويت','كلاسيك']);
  function mentionIdx(text,perfumes){
    var t=' '+text+' ', wset={}, tokMap={}, score={};
    text.split(' ').filter(Boolean).forEach(function(w){ forms(w).forEach(function(f){ wset[f]=1; }); });
    perfumes.forEach(function(p,idx){
      var seen={};
      [p.name,p.nameEn].forEach(function(nm){
        var n=norm(nm);
        if(n.length>=4 && t.indexOf(' '+n+' ')>-1) score[idx]=(score[idx]||0)+10;
        n.split(' ').forEach(function(tk){
          if(tk.length>=4 && GENERIC.indexOf(tk)<0 && !seen[tk]){ seen[tk]=1; (tokMap[tk]=tokMap[tk]||[]).push(idx); }
        });
      });
    });
    Object.keys(tokMap).forEach(function(tk){
      if(tokMap[tk].length===1 && wset[tk]){ var i=tokMap[tk][0]; score[i]=(score[i]||0)+3; }
    });
    return Object.keys(score).map(Number).filter(function(i){ return score[i]>=3; }).sort(function(a,b){ return score[b]-score[a]; });
  }
  /* بطاقة عطر: متوفر/نافذ + مواصفات + زر المعاينة (يودّي للعطر بالصفحة) + السلة */
  function perfumeCard(idx,p){
    var soldout=p.badge==='soldout';
    var desc=String(p.description||'').replace(/[\u200B-\u200F]/g,'').split(/\n+/).map(function(x){ return x.trim().slice(0,160); }).filter(Boolean).slice(0,6).map(esc).join('<br>');
    var c=document.createElement('div'); c.className='dzA_card';
    c.innerHTML='<h4>'+esc(p.name||'')+'</h4>'+(p.nameEn?'<div class="en">'+esc(p.nameEn)+'</div>':'')+
      '<div class="tags">'+(soldout?'❌ نافذ حالياً':'✅ متوفر عندنا')+(p.type?' • '+esc(p.type):'')+'</div>'+
      (desc?'<div class="why">'+desc+'</div>':'')+
      '<div class="pr">💰 50 مل: '+fmt(priceOf(p,'50ml'))+' • 30 مل: '+fmt(priceOf(p,'30ml'))+' '+esc(p.currency||'دينار')+'</div>'+
      '<div class="dzA_acts"><button class="dzA_act main" type="button" data-a="view">👁️ معاينة العطر</button>'+(soldout?'':sizeCtl(idx,'50ml')+sizeCtl(idx,'30ml'))+'</div>';
    c.querySelector('[data-a=view]').onclick=function(){ goTo(idx); };
    wireSizes(c);
    $('dzA_msgs').appendChild(c); scrollEnd();
  }
  /* بعد جواب الذكاء: نعرض بطاقات العطور اللي ذكرها الزبون أو الذكاء (حد أقصى 3) */
  function showMentionCards(raw,txt){
    var perfumes=getPerfumes(), out=[];
    mentionIdx(norm(raw),perfumes).concat(mentionIdx(norm(txt),perfumes)).forEach(function(i){ if(out.indexOf(i)<0) out.push(i); });
    out.slice(0,3).forEach(function(i){ if(perfumes[i]) perfumeCard(i,perfumes[i]); });
  }

  /* plain(): الرد الاحتياطي إذا الذكاء مطفي أو فشل — after(): شنو يظهر بعد الجواب.
     الذكاء يبين للزبون مثل أي رد عادي من المساعد (بدون اسم، بدون صورة، بدون عدّاد) */
  /* ───────── حد الذكاء لكل زبون (نسخة الزبون فقط) ─────────
     بعد AI_LIMIT رسالة للذكاء يتحوّل الزبون للقائمة بدون ما نقله «خلصت»،
     وبعد ساعتين من وصوله للحد يتصفر العدّاد ويرجع الذكاء. غيّر AI_LIMIT إذا تريد رقم ثاني. */
  var AI_LIMIT=10, AI_WINDOW=2*60*60*1000, AI_QKEY='diraz_ai_quota';
  function aiQuota(){
    var q=null; try{ q=JSON.parse(localStorage.getItem(AI_QKEY)||'null'); }catch(e){}
    var now=Date.now();
    if(!q || typeof q.n!=='number') q={n:0,last:now,until:0};
    if(q.until && (now>=q.until || q.until>now+AI_WINDOW)) q={n:0,last:now,until:0};
    else if(!q.until && now-q.last>=AI_WINDOW) q={n:0,last:now,until:0};
    return q;
  }
  function aiQuotaOk(){ return !aiQuota().until; }
  function aiQuotaHit(){
    var q=aiQuota(), now=Date.now(); q.n++; q.last=now;
    if(q.n>=AI_LIMIT) q.until=now+AI_WINDOW;
    try{ localStorage.setItem(AI_QKEY,JSON.stringify(q)); }catch(e){}
  }
  function aiFallback(raw,plain,after){
    if(!aiOn() || !aiQuotaOk()){ plain(); return; }
    var d=document.createElement('div'); d.className='dzA_m dzA_bot';
    d.innerHTML='<span style="opacity:.55">...</span>';
    $('dzA_msgs').appendChild(d); scrollEnd();
    aiAsk(raw).then(function(txt){
      aiQuotaHit();
      aiHist.push({r:'user',t:raw.slice(0,300)}); aiHist.push({r:'bot',t:txt.slice(0,600)});
      if(aiHist.length>12) aiHist=aiHist.slice(-12);
      d.style.whiteSpace='pre-wrap';
      d.innerHTML=esc(txt).replace(/\n/g,'<br>');
      scrollEnd();
      try{ showMentionCards(raw,txt); }catch(e){}
      if(after) after();
    },function(){
      try{ d.remove(); }catch(e){}
      plain();
    });
  }

  /* ───────── الراوتر: القائمة تجاوب فقط إذا السؤال فعلاً عن العطور ───────── */
  var RX_PERF_WORD=/(^| )(عطر|عطور|ريحه|رايحه|روائح|رائحه|بارفان|برفان|perfume|ثبات|فواح|نوتات|نوته|ارشح|رشح|رشحلي|ترشيح|انصحني|تنصحني)( |$)/;
  var RX_MORE_B=/(^| )(غيرهم|غيرها|غيره|ثانيه|ثاني|المزيد|كمل|بعد|زيد|اخرين|اخري)( |$)/;
  var RX_RESET_B=/(^| )(من جديد|ابدا|بلش|امسح|غير الطلب)( |$)/;
  var RX_LISTALL_B=/(شنو عندكم|شكو عندكم|كل العطور|المتوفر|الاصناف)/;
  function listKnows(t,pm,perfumes){
    var tk=t.split(' ').filter(Boolean).length;
    /* أوامر قصيرة تخص المحادثة الجارية */
    if(tk<=5 && ((RX_MORE_B.test(t) && state.lastIdx.length) || RX_RESET_B.test(t) || RX_LISTALL_B.test(t))) return true;
    var hasTrait=Object.keys(pm.w).length>0;
    var freeHit=pm.free.some(function(f){
      return perfumes.some(function(p){ var full=profile(p).full; return forms(f).some(function(x){ return inText(full,x); }); });
    });
    var strong=hasTrait||!!pm.budget||!!pm.gender||freeHit;
    if(!strong) return false;
    /* إشارة وحدة ضعيفة (مثل «شغل» أو «حر») داخل سؤال طويل ما يخص العطور → للذكاء */
    return RX_PERF_WORD.test(t) || RX_REC.test(t) || tk<=9 || state.lastIdx.length>0;
  }
  /* الرد الاحتياطي إذا الذكاء مطفي أو فشل: أكثر العطور طلباً */
  function showPopular(perfumes,msg){
    var sw=state.w, sf=state.free; state.w={}; state.free=[];
    var res=recommend(perfumes); state.w=sw; state.free=sf;
    if(!res.list.length){ say('ما لقيت عطر متوفر هسه 🌸'); return; }
    say(msg||'سؤالك مو من اختصاصي بالضبط 🌸 بس هذي أكثر العطور اللي تنطلب عندنا:');
    state.pending=res.list.slice(3);
    showCards(res.list.slice(0,3),perfumes,true);
  }

  function handle(text){
    say(esc(text),'me');
    var t=norm(text), perfumes=getPerfumes();
    setTimeout(function(){ reply(text,t,perfumes); },250);
  }
  function reply(raw,t,perfumes){
    if(!perfumes.length){ say('ما عندنا عطور معروضة حالياً، تعال بعد شوي 🌸'); return; }

    /* ── 1) المحادثة الطبيعية الجارية (طلب/كود/عنوان) ── */
    if(flow){ handleFlow(raw,t,perfumes); return; }

    /* ── 2) كلام اجتماعي (سلام، شلونك، شكر، وداع…) — قبل أي تحليل ── */
    if(smallTalk(raw,t)) return;

    /* ── 3) التحقق من الاسم والرقم قبل أي خدمة ── */
    if(!hasCustomer()){
      showAccountForm('حتى أخدمك لازم أعرفك أول 🌸 سجّل اسمك ورقمك بالنافذة اللي انفتحت لك:');
      return;
    }

    /* ── القسم: رجالي / نسائي (تحويل الصفحة + اللون + اللهجة) ── */
    if(RX_SECTIONS.test(t) && !detectSection(t)){ askSection(); return; }
    var sh=detectSection(t);
    if(sh){
      if(sectionClosed(sh.sec)){ closedMsg(sh.sec); return; }
      if(sh.sec!==audience){
        doSwitch(sh.sec);
        if(sh.only){ announceSwitch(sh.sec); resumePending(); return; }
      } else if(sh.only){
        say('إنت هسه بقسم '+secName(sh.sec)+' 🌸 احچيلي شنو تحب من الروائح.'); chips(BASIC_CHIPS); return;
      }
    }

    /* سؤال عن سلة الزبون */
    var shortMsg=t.split(' ').filter(Boolean).length<=7;
    if(shortMsg && /(^| )(سله|السله|بسله|مشترياتي|طلباتي|المجموع)( |$)/.test(t)){
      var cs=cartSummary();
      if(!cs){ say('سلة المشتريات فاضية حالياً 🛒 إذا تحب أرشحلك شي، احچيلي شنو تحب.'); chips(BASIC_CHIPS); return; }
      say('سلة المشتريات عندك ('+cs.count+' منتج):<br>'+cs.lines.join('<br>')+'<br><br>💰 المجموع: '+fmt(cs.total)+' دينار');
      chips(['أضف لي عطر','من جديد']);
      return;
    }

    /* ── طلب إكمال الطلب (زر «طلب» أو كلام) ── */
    if(/^طلب$/.test(t) || (shortMsg && /(^| )(اتمام الطلب|اكمل الطلب|كمل الطلب|تاكيد الطلب|كملت|خلصت|ابي اطلب|اريد اطلب|اطلبهم|اطلبهن|اطلب|خلص|كملي|سوي الطلب|ارسل الطلب|اطلب الحين|ابي اطلبهم|ابي اطلبهن)( |$)/.test(t))){
      startOrder();
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
    var hits=mentionIdx(t,perfumes);
    if(!hits.length){ var nb=findByName(raw,perfumes); if(nb>-1) hits=[nb]; }
    if(hits.length){
      var h0=hits[0];
      /* الذكاء يجاوب (متوفر عندنا + وصف) ثم تطلع بطاقة بالمواصفات وزر المعاينة؛ إذا الذكاء مطفي أو فشل: بطاقة التفاصيل العادية */
      aiFallback(raw,function(){ showNamed(h0,perfumes[h0],raw); },null);
      return;
    }

    /* ── الراوتر: إذا السؤال مو عن العطور، الذكاء الاصطناعي يجاوب (بدون سؤال القسم أو العمر) ── */
    var pm=parseMessage(raw);
    if(!listKnows(t,pm,perfumes)){
      aiFallback(raw,function(){
        /* الذكاء مطفي أو فشل: نعرض العطور */
        if(!audience){ pendingRaw=raw; askSection(); return; }
        showPopular(perfumes);
      },function(){ chips(BASIC_CHIPS); });
      return;
    }

    /* ما نعرف القسم بعد: نسأل أول حتى نجاوبه صح */
    if(!audience){ pendingRaw=raw; askSection(); return; }

    /* كلمة واحدة تشبه كود خصم خارج مسار الطلب: ما ننفذ شي، نوجّهه للطلب */
    if(t.split(' ').length===1 && !pm.any && extractCode(raw)){
      var known=perfumes.some(function(p){ return profile(p).full.indexOf(t)>-1; });
      if(!known){
        say('إذا هذا كود خصم 🎁 اضغط «🛒 طلب» وأسألك عنه بوقته، وأتأكد من السلة قبل ما أطبقه 🌸');
        chips(cartSummary()?['🛒 طلب']:BASIC_CHIPS); return;
      }
    }

    /* تحية / شكر */
    if(!pm.any && !pm.free.length){
      if(THANKS.test(t)){ say('عفواً حبيبي 🌸 إذا تريد ترشيح ثاني أني حاضر.'); return; }
      if(GREET.test(t)){ say('هلا والله 🌸 شنو تحب من الروائح؟'); chips(BASIC_CHIPS); return; }
      if(MORE.test(t) && state.lastIdx.length){ showMore(perfumes); return; }
      if(/(شنو عندكم|شكو|كل العطور|عرض|المتوفر|الاصناف)/.test(t)){ listAll(perfumes); return; }
      /* سؤال عام خارج العطور — نسلك له ونحول الموضوع */
      if(/(كيف حالك|شلونك|شخبارك|وين تعيش|عمرك|شكد عمرك|من وين|جنسيتك|انت انسان|انت روبوت|انت ذكاء|شلون اشتغل|كيف تصنع|شلون تسوي|شنو هوايتك|تحب شنو|عندك صديق|متزوج|عندك عيله|شلون اتعلمت|منو صنعك|شنو اسمك الحقيقي|شلون تكدر|شنو رايك ب|شنو الاخبار|شكو جديد|اخبارك|شلون يومك|كيف يومك)/.test(t)){
        aiFallback(raw,function(){
          say('هذا سؤال حلو 🌸 بس أني هنا مخصص للعطور! خليني أرد عليك بسؤال أهم: شنو نوع الريحة اللي تحبها؟ هادية، سويت، منعشة، قوية…؟');
          chips(BASIC_CHIPS);
        },function(){ chips(BASIC_CHIPS); });
        return;
      }
      aiFallback(raw,function(){
        say('أني متخصص بالعطور بس 🌸 احچيلي شنو نوع الريحة اللي تحبها: هادئة، سويت، منعشة، قوية…؟'); chips(BASIC_CHIPS);
      },function(){ chips(BASIC_CHIPS); });
      return;
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
      state.gender=audGender(); chips(['من جديد'].concat(BASIC_CHIPS.slice(0,3))); return;
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
      aiFallback(raw,function(){
        say('ما لقيت شي يطابق طلبك بالضبط، بس هذي أكثر العطور اللي تنطلب عندنا 🌸');
        showCards(res.list.slice(0,3),perfumes,true);
      },function(){
        say('وهذي أكثر العطور اللي تنطلب عندنا 🌸');
        showCards(res.list.slice(0,3),perfumes,true);
      });
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
      // نفتح نافذة "بياناتي" الفعلية بدل ما نطلب الاسم والرقم بالشات
      flow=null;
      say('اضغط زر «👤 بياناتي» اللي طلعلك، أو سجّل اسمك ورقمك بالنافذة 🌸');
      try{
        if(typeof editCustomer==='function'){ editCustomer(); }
        else{
          var pop=document.getElementById('customerPopup');
          if(pop) pop.style.display='flex';
        }
      }catch(e){}
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

    if(step==='couponAsk' || step==='coupon'){
      if(RX_NO.test(t)){ showFinal('تمام، بدون كود 🌸'); return; }
      var code=extractCode(raw);
      if(code){ checkCode(code); return; }
      if(RX_YES.test(t)){ flow={step:'coupon'}; say('حلو 🌸 اكتب كود الخصم اللي عندك:'); chips(['بدون كود']); return; }
      if(step==='couponAsk'){ say('عندك كود خصم؟ اختار نعم أو لا 🌸'); chips(['نعم عندي كود','لا ما عندي']); return; }
      say('اكتبلي كود الخصم 🌸 وإذا ما عندك اضغط «بدون كود».'); chips(['بدون كود']); return;
    }

    if(step==='couponWait'){ say('لحظة، أتحقق من الكود ⏳'); return; }

    if(step==='confirm'){
      if(/(^| )(لا|كلا|الغي|لاحقا|بلاش)( |$)/.test(t) || /^مو هسه/.test(t) || /لا مو/.test(t)){
        flow=null;
        say('تمام، ما صار شي 🌸 سلتك تبقى محفوظة وتكدر تكمل الطلب بأي وقت.');
        chips(['🛒 طلب','أضف لي عطر']); return;
      }
      if(/(نعم|ايه|ايوه|ايوا|اكيد|كمل|اكمل|تاكيد|اطلب|موافق|يلا|تمام|yes)/.test(t) || /^اي( |$)/.test(t)){
        flow=null;
        if(!cartSummary()){ orderCtx=null; say('سلتك صارت فاضية 🌸 ضيف عطر وبعدها نكمل الطلب.'); chips(BASIC_CHIPS); return; }
        proceedDelivery(); return;
      }
      say('تريد تكمّل الطلب؟ اختار نعم أو لا 🌸'); chips(['✅ نعم، كمّل الطلب','لا، مو هسه']); return;
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
        '<div class="pr">💰 50 مل: '+fmt(priceOf(p,'50ml'))+' • 30 مل: '+fmt(priceOf(p,'30ml'))+' '+esc(p.currency||'دينار')+
        ((state.budget && priceOf(p,'50ml')>state.budget)?'<br><small>✅ يناسب ميزانيتك بحجم 30 مل</small>':'')+'</div>'+
        '<div class="dzA_acts"><button class="dzA_act" type="button" data-a="view">👁️ شوف العطر</button>'+
        sizeCtl(x.idx,'50ml')+sizeCtl(x.idx,'30ml')+
        '<button class="dzA_act" type="button" data-a="cart">🛍️ سلة</button></div>';
      c.querySelector('[data-a=view]').onclick=function(){ goTo(x.idx); };
      wireSizes(c);
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
    chips((more?['عطور ثانية']:[]).concat(['أخف','أحلى','أقوى','من جديد']).concat(cartSummary()?['🛒 طلب']:[]));
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
        (d?'<br><br>'+d:'')+'<br><br>💰 50 مل: '+fmt(priceOf(p,'50ml'))+' • 30 مل: '+fmt(priceOf(p,'30ml'))+' '+esc(p.currency||'دينار')+
        (soldout?'<br>❌ هذا العطر نافذ حالياً.':''));
    var w=document.createElement('div'); w.className='dzA_acts';
    w.innerHTML='<button class="dzA_act" type="button">👁️ شوف العطر</button>'+(soldout?'':sizeCtl(idx,'50ml')+sizeCtl(idx,'30ml'));
    w.querySelector('.dzA_act').onclick=function(){ goTo(idx); };
    wireSizes(w);
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
  /* زيادة كمية عطر موجود بالسلة (كل ضغطة = +1، لحد 10) */
  function bumpQty(ex,size){
    var q=(parseInt(ex.qty,10)||1)+1;
    if(q>10) return -1;
    try{ ex.qty=q; }catch(e){}
    try{
      if(typeof cart!=='undefined' && Array.isArray(cart)){
        cart.forEach(function(it){ if(String(it.id)===String(ex.id) && (it.size||'50ml')===(ex.size||size)) it.qty=q; });
      }
    }catch(e){}
    ['saveCart','persistCart','updateCartCount','updateCart','renderCart','updateCartUI','refreshCart','updateCartBadge'].forEach(function(f){
      try{ if(typeof window[f]==='function') window[f](); }catch(e){}
    });
    try{
      var arr=JSON.parse(localStorage.getItem('diraz_cart')||'[]'), ch=false;
      arr.forEach(function(it){
        if(String(it.id)===String(ex.id) && (it.size||'50ml')===(ex.size||size) && (parseInt(it.qty,10)||1)!==q){ it.qty=q; ch=true; }
      });
      if(ch) localStorage.setItem('diraz_cart',JSON.stringify(arr));
    }catch(e){}
    return q;
  }
  /* ───────── أزرار الحجم: + على اليمين ، − على اليسار ───────── */
  function qtyOf(idx,size){
    try{ var ex=(typeof findItem==='function')?findItem(idx,size):null; return ex?(parseInt(ex.qty,10)||1):0; }catch(e){ return 0; }
  }
  function sizeCtl(idx,size){
    var lbl=size.replace('ml',' مل');
    return '<span class="dzA_sz" data-idx="'+idx+'" data-size="'+size+'">'+
      '<button class="pm" type="button" data-op="plus" aria-label="زيادة '+lbl+'">+</button>'+
      '<button class="mid" type="button" data-op="plus">🛒 '+lbl+'</button>'+
      '<button class="pm" type="button" data-op="minus" aria-label="نقصان '+lbl+'">−</button></span>';
  }
  function refreshSizes(){
    document.querySelectorAll('.dzA_sz').forEach(function(w){
      var idx=parseInt(w.getAttribute('data-idx'),10), size=w.getAttribute('data-size'), q=qtyOf(idx,size);
      w.querySelector('.mid').textContent='🛒 '+size.replace('ml',' مل')+(q>0?' ×'+q:'');
      w.querySelector('[data-op=minus]').disabled=(q<1);
    });
  }
  function wireSizes(root){
    root.querySelectorAll('.dzA_sz').forEach(function(w){
      var idx=parseInt(w.getAttribute('data-idx'),10), size=w.getAttribute('data-size');
      w.querySelectorAll('button').forEach(function(b){
        b.onclick=function(){
          if(b.getAttribute('data-op')==='minus') quickRemove(idx,size); else quickAdd(idx,size);
          setTimeout(refreshSizes,50);
        };
      });
    });
    refreshSizes();
  }
  /* نقص واحد من السلة؛ إذا كانت آخر قطعة نشيل العطر من السلة */
  function quickRemove(idx,size){
    try{
      var ex=(typeof findItem==='function')?findItem(idx,size):null;
      var pn=(getPerfumes()[idx]||{}).name||'العطر', lbl=size.replace('ml',' مل');
      if(!ex){ say('«'+esc(pn)+'» ('+lbl+') مو موجود بالسلة 🌸'); return; }
      var q=(parseInt(ex.qty,10)||1)-1, same=function(it){ return String(it.id)===String(ex.id) && (it.size||'50ml')===(ex.size||size); };
      if(q<1){
        try{ if(typeof cart!=='undefined' && Array.isArray(cart)){ for(var i=cart.length-1;i>=0;i--){ if(same(cart[i])) cart.splice(i,1); } } }catch(e){}
      }else{
        try{ ex.qty=q; }catch(e){}
        try{ if(typeof cart!=='undefined' && Array.isArray(cart)) cart.forEach(function(it){ if(same(it)) it.qty=q; }); }catch(e){}
      }
      ['saveCart','persistCart','updateCartCount','updateCart','renderCart','updateCartUI','refreshCart','updateCartBadge'].forEach(function(f){
        try{ if(typeof window[f]==='function') window[f](); }catch(e){}
      });
      try{
        var arr=JSON.parse(localStorage.getItem('diraz_cart')||'[]');
        arr=q<1?arr.filter(function(it){ return !same(it); }):arr.map(function(it){ if(same(it)) it.qty=q; return it; });
        localStorage.setItem('diraz_cart',JSON.stringify(arr));
      }catch(e){}
      if(q<1) say('شلت «'+esc(pn)+'» ('+lbl+') من السلة 🗑️');
      else say('نقصت واحد ✅ صار عندك '+q+' من «'+esc(pn)+'» ('+lbl+') 🛍️');
      refreshOrderBar(); refreshSizes();
    }catch(e){}
  }
  function quickAdd(idx,size){
    try{
      if(typeof selectedSizes==='undefined'||typeof addToCart!=='function'){ goTo(idx); return; }
      var ex=(typeof findItem==='function')?findItem(idx,size):null;
      if(ex){
        var pn=(getPerfumes()[idx]||{}).name||'العطر', nq=bumpQty(ex,size);
        if(nq===-1){ say('وصلت للحد الأعلى (10 قطع) من «'+esc(pn)+'» 🌸'); return; }
        say('زدت واحد ✅ صار عندك '+nq+' من «'+esc(pn)+'» ('+size.replace('ml',' مل')+') 🛍️'); refreshOrderBar(); chips(['🛒 طلب','أضف لي عطر']); return;
      }
      selectedSizes[idx]=size;
      addToCart(idx);
      say('تمت الإضافة للسلة ✅ ('+size.replace('ml',' مل')+') — تحب تكمل الطلب لو تضيف شي ثاني؟'); refreshOrderBar(); chips(['🛒 طلب','أضف لي عطر']);
    }catch(e){ goTo(idx); }
  }
  function resetState(){ state={w:{},gender:audGender(),budget:null,free:[],shown:[],lastIdx:[],pending:[]}; }

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

  /* زر إنشاء حساب: يفتح نافذة "بياناتي" الفعلية بالصفحة (نفس زر 👤 بياناتي) */
  function showAccountForm(intro){
    say(intro);
    // نفتح نافذة بياناتي الفعلية
    try{
      if(typeof editCustomer==='function'){ editCustomer(); }
      else{
        var pop=document.getElementById('customerPopup');
        if(pop) pop.style.display='flex';
      }
    }catch(e){}
    flow=null;
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
      var tt=norm(text);
      setTimeout(function(){
        if(smallTalk(text,tt,true)) return;
        showAccountForm('حتى أخدمك لازم أعرفك أول 🌸 سجّل اسمك ورقمك بالنافذة اللي انفتحت لك:');
      },250);
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
        if(r===true){ say('تمت إضافة «'+esc(p2.name)+'» (50 مل) للسلة ✅ تحب تكمل الطلب؟'); refreshOrderBar(); chips(['🛒 طلب','أضف لي عطر']); }
        else if(r==='exists'){
          var ex2=(typeof findItem==='function')?findItem(named2,'50ml'):null, nq2=ex2?bumpQty(ex2,'50ml'):0;
          if(nq2===-1) say('وصلت للحد الأعلى (10 قطع) من «'+esc(p2.name)+'» 🌸');
          else if(nq2>0){ say('زدت واحد ✅ صار عندك '+nq2+' من «'+esc(p2.name)+'» (50 مل) 🛍️'); refreshOrderBar(); chips(['🛒 طلب','أضف لي عطر']); }
          else say('«'+esc(p2.name)+'» موجود بالسلة من قبل 🛍️');
        }
        else { say('ما قدرت أضيفه تلقائياً، بس هاهو العطر 👇'); goTo(named2); }
        return;
      }
    }
    _handle(text);
  };

  /* للاختبار */
  window.DirazAssistant={_quota:function(){ return aiQuota(); },_quotaReset:function(){ try{ localStorage.removeItem(AI_QKEY); }catch(e){} },_mention:function(q){ return mentionIdx(norm(q),getPerfumes()); },_ai:function(){return AI;},_listKnows:function(q){ var t=norm(q); return listKnows(t,parseMessage(q),getPerfumes()); },_parse:parseMessage,_recommend:function(q){ resetState(); var pm=parseMessage(q); Object.keys(pm.w).forEach(function(k){state.w[k]=pm.w[k];}); state.free=pm.free; if(pm.gender)state.gender=pm.gender; if(pm.budget)state.budget=pm.budget; return recommend(getPerfumes()); },_state:function(){return state;}};

  /* ═════════ النسخة الكاملة: مقفولة بكود لمرة وحدة، وبعدها الزبون يسأل أي شي بحرية ═════════ */
  var FULL_KEY='diraz_ai_full';
  var fullMode=false, fullToken=null, fullHist=[], fullBusy=false, fullWelcomed=false;
  try{ fullToken=localStorage.getItem(FULL_KEY)||null; }catch(e){}

  function fBox(){ return $('dzA_msgsF'); }
  function fScroll(){ var m=fBox(); if(m) m.scrollTop=m.scrollHeight; }
  function fText(text,who){
    var d=document.createElement('div'); d.className='dzA_m '+(who==='me'?'dzA_me':'dzA_bot');
    d.style.whiteSpace='pre-wrap'; d.textContent=text;
    fBox().appendChild(d); fScroll(); return d;
  }
  function fHtml(html){
    var d=document.createElement('div'); d.className='dzA_m dzA_bot'; d.innerHTML=html;
    fBox().appendChild(d); fScroll(); return d;
  }
  function setInputState(){
    var inp=$('dzA_in'); if(!inp) return;
    if(fullMode){
      inp.disabled=!fullToken;
      inp.placeholder=fullToken?'اسأل أي شي تريده...':'أدخل كود الفتح أول 🔒';
    }else{
      inp.disabled=false; inp.placeholder='مثال: أريد عطر هادئ للدوام...';
    }
  }
  function setMode(m){
    var box=$('dzA_box'); if(!box) return;
    fullMode=(m==='full');
    box.classList.toggle('full',fullMode);
    box.querySelectorAll('.dzA_tab').forEach(function(b){ b.classList.toggle('sel',b.getAttribute('data-m')===m); });
    var ttl=$('dzA_ttl'), sub=$('dzA_sub');
    if(fullMode){
      if(ttl) ttl.textContent='✨ مساعد ديراز — النسخة الكاملة';
      if(sub) sub.textContent='اسأل أي شي بحرية';
      fullEnter();
    }else{
      if(ttl) ttl.textContent='🌸 مساعد ديراز للعطور';
      if(sub) sub.textContent='أخبرني شنو تحب وأرشح لك الأنسب';
    }
    setInputState();
    setTimeout(function(){ var i=$('dzA_in'); if(i&&!i.disabled) i.focus(); },50);
  }
  function fullEnter(){
    if(!fullToken){ showLock(); return; }
    if(!fullWelcomed){
      fullWelcomed=true;
      fHtml('أهلاً بيك بالنسخة الكاملة ✨<br>هنا تكدر تسألني عن أي شي براحتك، مو بس العطور.');
    }
    /* نتأكد إن الجلسة ما انطردت */
    try{
      if(window.DirazCloud && DirazCloud.rpc){
        DirazCloud.rpc('ai_full_check',{p_token:fullToken}).then(function(ok){ if(ok===false) lostAccess(); }).catch(function(){});
      }
    }catch(e){}
  }
  function showLock(){
    setInputState();
    if(fBox().querySelector('.dzA_lock')) return;
    var c=document.createElement('div'); c.className='dzA_lock';
    c.innerHTML='<div class="lk">🔒</div><b>النسخة الكاملة مقفولة</b>'+
      '<p>هنا تسأل أي شي بحرية. حتى تفتحها اطلب الكود من الإدارة وادخله هنا (الكود يشتغل مرة وحدة بس).</p>'+
      '<input type="text" class="dzA_code" placeholder="XXXXX-XXXXX" autocomplete="off" maxlength="14">'+
      '<div class="err"></div><button type="button" class="dzA_codebtn">🔓 فتح</button>';
    fBox().appendChild(c);
    var inp=c.querySelector('.dzA_code'), btn=c.querySelector('.dzA_codebtn'), err=c.querySelector('.err');
    function go(){
      var code=String(inp.value||'').trim(); if(!code) return;
      if(!window.DirazCloud || !DirazCloud.rpc){ err.textContent='الخدمة مو جاهزة، جرّب بعد شوي'; return; }
      btn.disabled=true; err.textContent='';
      var cu=getCustomer()||{};
      DirazCloud.rpc('ai_full_redeem',{p_code:code,p_name:String(cu.name||'').slice(0,60),p_phone:String(cu.phone||'').replace(/\D/g,'').slice(0,15)})
        .then(function(tok){
          if(typeof tok==='string' && tok.length>=20){
            fullToken=tok; try{ localStorage.setItem(FULL_KEY,tok); }catch(e){}
            c.remove(); fullWelcomed=false; fullHist=[]; fullEnter(); setInputState();
            setTimeout(function(){ var i=$('dzA_in'); if(i) i.focus(); },50);
          }else{
            err.textContent='❌ الكود غلط أو انستخدم قبل'; btn.disabled=false;
          }
        })
        .catch(function(){ err.textContent='صار خطأ، جرّب مرة ثانية'; btn.disabled=false; });
    }
    btn.onclick=go;
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } });
  }
  /* انطرد من الإدارة (أو التوكن ما عاد صالح): نرجّعه للقفل */
  function lostAccess(){
    fullToken=null; fullWelcomed=false; fullHist=[]; fullBusy=false;
    try{ localStorage.removeItem(FULL_KEY); }catch(e){}
    fBox().innerHTML='';
    fHtml('انسحبت صلاحية النسخة الكاملة من هذا الجهاز 🔒<br>إذا تحتاجها اطلب كود جديد من الإدارة.');
    showLock();
  }
  /* النسخة الكاملة: الكتالوج وبطاقات العطور ننرسلها بس إذا السؤال عن العطور، وإلا يجاوب بحرية بدون ما نشدّه للعطور */
  var FULL_PERF_RX=/عطر|عطور|ريحه|ريحة|رائحه|رائحة|بخاخ|برفان|بيرفيوم|perfume|fragrance|parfum|cologne|ديراز|diraz|نوتات|ثبات|فواح|oud|musk/i;
  function fullWantsCatalog(v){
    try{ if(FULL_PERF_RX.test(v)) return true; return mentionIdx(norm(v),getPerfumes()).length>0; }catch(e){ return false; }
  }
  function fullSubmit(v){
    if(!fullToken){ showLock(); return; }
    if(fullBusy) return;
    if(!aiOn()){ fText('الذكاء الاصطناعي مطفي هسه، جرّب بعد شوي 🌸'); return; }
    fText(v,'me');
    fullBusy=true;
    var d=fText('...','bot'); d.style.opacity='.6';
    var ctrl=('AbortController' in window)?new AbortController():null;
    var to=setTimeout(function(){ try{ctrl&&ctrl.abort();}catch(e){} },40000);
    fetch(AI.proxy,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl?ctrl.signal:undefined,
      body:JSON.stringify({q:v,history:fullHist.slice(-10),catalog:(fullWantsCatalog(v)?aiCatalog():''),section:'',full:true,token:fullToken})})
      .then(function(r){
        return r.json().catch(function(){return {};}).then(function(j){
          if(r.status===403 && j.error==='kicked') throw {kicked:true};
          if(!r.ok||!j.text) throw new Error(j.error||('HTTP '+r.status));
          return String(j.text);
        });
      })
      .then(function(txt){
        d.style.opacity=''; d.textContent=txt;
        fullHist.push({r:'user',t:v.slice(0,1500)}); fullHist.push({r:'bot',t:txt.slice(0,1500)});
        if(fullHist.length>20) fullHist=fullHist.slice(-20);
        try{ if(fullWantsCatalog(v)) showMentionCardsFull(v,txt); }catch(e){}
      },function(e){
        if(e && e.kicked){ try{d.remove();}catch(x){} lostAccess(); return; }
        d.style.opacity=''; d.textContent='ما كدرت أجاوبك هسه 😔 جرّب مرة ثانية.';
      })
      .then(function(){ clearTimeout(to); fullBusy=false; fScroll(); });
  }
  /* بطاقات العطور اللي انذكرت (نفس بطاقات النسخة العادية) تنعرض داخل النسخة الكاملة */
  function showMentionCardsFull(raw,txt){
    var perfumes=getPerfumes(), out=[];
    mentionIdx(norm(raw),perfumes).concat(mentionIdx(norm(txt),perfumes)).forEach(function(i){ if(out.indexOf(i)<0) out.push(i); });
    var real=$('dzA_msgs'), tmp=fBox();
    out.slice(0,2).forEach(function(i){
      if(!perfumes[i]) return;
      perfumeCard(i,perfumes[i]);               /* تنضاف لحاوية الزبون… */
      var last=real.lastElementChild;
      if(last && last.classList.contains('dzA_card')) tmp.appendChild(last);   /* …ونحوّلها لحاوية النسخة الكاملة */
    });
    fScroll();
  }

  function init(){
    if(document.getElementById('dzA_btn')) return;
    syncFromPage(); resetState(); injectUI(); addOrderBar(); aiLoad();
    window.addEventListener('diraz-section',function(e){
      var sec=(e.detail&&e.detail.section)||null, prev=audience;
      setAudience(sec);
      if(!selfSwitch && opened && sec && sec!==prev){
        say('حولتك لقسم '+secName(sec)+' 🌸 شنو تحب من الروائح؟'); chips(BASIC_CHIPS);
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
