/* ===== سياسة الخصوصية (تظهر بكل الصفحات: رابط أزرق يسار الفوتر + نافذة قراءة) ===== */
(function(){
  if(window.__dzPrivacyLoaded) return; window.__dzPrivacyLoaded=true;
  var STORE='ديراز للعطور';
  var st=document.createElement('style');
  st.textContent=
   '.dz-pp-link{color:#0a4fd8!important;text-decoration:underline!important;font-weight:800;cursor:pointer;font-family:inherit;background:none;border:0;padding:0;font-size:inherit}'+
   '.dz-pp-link:hover{color:#06339a!important}'+
   '.dz-pp-link.on-dark{color:#9cc9ff!important}.dz-pp-link.on-dark:hover{color:#c7e0ff!important}'+
   'footer .dz-pp-link.dz-pp-foot{position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:.82rem}'+
   '.dz-pp-fixed{position:fixed;left:12px;bottom:10px;z-index:50;background:rgba(255,255,255,.9);padding:4px 12px;border-radius:20px;font-size:.78rem}'+
   '@media(max-width:700px){footer .dz-pp-link.dz-pp-foot{position:static;transform:none;display:block;margin:6px 0 0 0;text-align:left;font-size:.78rem}}'+
   '#dzPPOverlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;padding:16px;direction:rtl}'+
   '#dzPPOverlay.open{display:flex}'+
   '#dzPPBox{background:#fff;color:#222;border-radius:18px;max-width:560px;width:100%;max-height:86vh;display:flex;flex-direction:column;font-family:"Cairo",sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)}'+
   '#dzPPBox h2{margin:0;padding:18px 20px 10px;font-size:1.2rem;color:#0a4fd8}'+
   '#dzPPBody{padding:0 20px 10px;overflow-y:auto;line-height:1.9;font-size:.92rem;text-align:right}'+
   '#dzPPBody h3{font-size:.98rem;margin:14px 0 2px;color:#111}#dzPPBody p,#dzPPBody li{margin:0;color:#333}#dzPPBody ul{margin:2px 18px 0 0;padding:0}'+
   '#dzPPClose{margin:10px 20px 18px;padding:12px;border:0;border-radius:50px;background:#0a4fd8;color:#fff;font-family:inherit;font-weight:900;font-size:1rem;cursor:pointer}';
  document.head.appendChild(st);

  var ov=document.createElement('div'); ov.id='dzPPOverlay';
  ov.innerHTML='<div id="dzPPBox" role="dialog" aria-modal="true"><h2>🔒 سياسة الخصوصية — '+STORE+'</h2><div id="dzPPBody">'+
   '<p>نحترم خصوصيتك. هذه السياسة توضح شنو البيانات التي نجمعها وكيف نستخدمها.</p>'+
   '<h3>1. البيانات التي نجمعها</h3><ul><li>الاسم الأول ورقم الهاتف عند إنشاء الحساب.</li><li>عنوان التوصيل (المحافظة والمنطقة والعنوان بالتفصيل) عند إتمام الطلب.</li><li>تفاصيل طلباتك (العطور والأحجام والمبالغ) وأكواد الخصم المستخدمة.</li><li>إذا فعّلت الإشعارات: معرّف الجهاز اللازم لإرسال الإشعارات.</li></ul>'+
   '<h3>2. كيف نستخدمها</h3><ul><li>تجهيز طلبك وتوصيله والتواصل معك بخصوصه.</li><li>تطبيق العروض والخصومات والتحقق من أكواد الخصم.</li><li>إرسال إشعارات عن حالة الطلب والعروض (إذا وافقت عليها).</li><li>الرد على رسائلك عبر الدعم.</li></ul>'+
   '<h3>3. المشاركة</h3><p>لا نبيع بياناتك ولا نشاركها مع أي جهة إعلانية. تُشارك فقط الاسم والهاتف والعنوان مع مندوب التوصيل بالقدر اللازم لإيصال الطلب.</p>'+
   '<h3>4. التخزين والحماية</h3><p>تُحفظ بياناتك على خوادم الموقع وعلى جهازك (متصفحك) لتسهيل طلباتك القادمة، ونتخذ إجراءات معقولة لحمايتها.</p>'+
   '<h3>5. حقوقك</h3><p>تكدر تطلب تعديل أو حذف بياناتك بأي وقت عن طريق الدعم داخل الموقع.</p>'+
   '<h3>6. الموافقة</h3><p>بإنشاء حساب أو متابعة الطلب فأنت توافق على هذه السياسة، وقد نحدّثها من وقت لآخر.</p>'+
   '</div><button id="dzPPClose" type="button">فهمت، إغلاق</button></div>';
  function mount(){
    if(!document.body) return;
    document.body.appendChild(ov);
    var close=function(){ov.classList.remove('open');};
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    document.getElementById('dzPPClose').onclick=close;
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    if(!document.querySelector('.dz-pp-foot')){
      var a=document.createElement('button'); a.type='button'; a.className='dz-pp-link dz-pp-foot'; a.textContent='سياسة الخصوصية';
      a.onclick=window.dzOpenPrivacy;
      var f=document.querySelector('footer');
      if(f){ if(getComputedStyle(f).position==='static') f.style.position='relative'; f.appendChild(a); }
      else { a.className='dz-pp-link dz-pp-fixed'; document.body.appendChild(a); }
    }
  }
  window.dzOpenPrivacy=function(e){ if(e&&e.preventDefault) e.preventDefault(); ov.classList.add('open'); var b=document.getElementById('dzPPBody'); if(b) b.scrollTop=0; return false; };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();
})();
