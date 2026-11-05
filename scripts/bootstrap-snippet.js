// Bootstrap snippet — ব্যবহারকারী এই কোড একবার ব্রাউজার কনসোলে পেস্ট করবে
// এটি Z.ai সার্ভার থেকে নতুন app.html কোড লোড করে পেজ রিপ্লেস করবে
//
// নির্দেশনা:
// ১. https://assetsys.space-z.ai/app.html খুলুন
// ২. F12 চাপুন (Developer Tools)
// ৩. Console ট্যাবে যান
// ৪. নিচের সম্পূর্ণ কোডটি পেস্ট করে Enter চাপুন
// ৫. পেজ রিফ্রেশ হবে এবং নতুন কোড লোড হবে

const bootstrapCode = `// === ASSET MANAGEMENT SYSTEM BOOTSTRAP UPDATER ===
// এই কোড একবার পেস্ট করলে নতুন কোড লোড হবে এবং ডেটা সরাসরি Turso-তে সেভ হবে
(function(){
  console.log('Bootstrap: fetching latest app.html from DB...');
  fetch('/api/db?id=main').then(function(r){return r.json();}).then(function(res){
    if(!res.ok || !res.data || !res.data._latestAppHtml){
      alert('ত্রুটি: সার্ভারে নতুন কোড পাওয়া যায়নি। আবার চেষ্টা করুন।');
      return;
    }
    var newHtml = res.data._latestAppHtml;
    if(newHtml.indexOf('saveToTursoDirect') === -1){
      alert('ত্রুটি: নতুন কোডে saveToTursoDirect নেই।');
      return;
    }
    console.log('Bootstrap: replacing page with latest app.html (' + (newHtml.length/1024).toFixed(1) + ' KB)');
    document.open();
    document.write(newHtml);
    document.close();
  }).catch(function(e){
    console.error('Bootstrap failed:', e);
    alert('বুটস্ট্র্যাপ ব্যর্থ: ' + e.message);
  });
})();`;

console.log(bootstrapCode);
console.log('');
console.log('=== ব্যবহারবিধি ===');
console.log('১. https://assetsys.space-z.ai/app.html খুলুন');
console.log('২. F12 চাপুন (Developer Tools)');
console.log('৩. Console ট্যাবে যান');
console.log('৪. উপরের কোডটি পেস্ট করে Enter চাপুন');
console.log('৫. পেজ নতুন কোড দিয়ে লোড হবে');
console.log('৬. এরপর থেকে সব ডেটা সরাসরি Turso-তে সেভ হবে');
