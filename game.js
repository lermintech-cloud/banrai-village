const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const avatars=['🧑‍🌾','👩‍🌾','🧑‍🔧','🧑‍🍳','🧙','🧑‍🚀','👨‍🌾','👩‍🔬'];
const questions=[
 {q:'ก่อนปลูกพืชควรทำสิ่งใดเป็นอันดับแรก?',a:['เก็บเกี่ยว','เตรียมดิน','ขายผลผลิต','ถอนต้นกล้า'],c:1},
 {q:'สิ่งใดจำเป็นต่อการเจริญเติบโตของพืช?',a:['น้ำและแสงแดด','น้ำอัดลม','ของเล่น','โทรศัพท์'],c:0},
 {q:'ข้อใดเป็นการใช้ทรัพยากรอย่างคุ้มค่า?',a:['เปิดน้ำทิ้งไว้','ใช้ของแล้วทิ้งทันที','นำวัสดุเหลือใช้มาประดิษฐ์','ซื้อของใหม่ทุกครั้ง'],c:2},
 {q:'การทำงานร่วมกันที่ดีควรเป็นอย่างไร?',a:['ทำคนเดียวทั้งหมด','แบ่งหน้าที่และช่วยกัน','ไม่ฟังใคร','โยนงานให้เพื่อน'],c:1},
 {q:'ก่อนประกอบอาหารควรทำสิ่งใด?',a:['ล้างมือและเตรียมวัตถุดิบ','เล่นเกม','วางของบนพื้น','เปิดน้ำทิ้ง'],c:0},
 {q:'การวางแผนก่อนทำงานช่วยเรื่องใดมากที่สุด?',a:['ทำงานช้าลง','ทำงานเป็นขั้นตอน','ทำให้ลืมงาน','เพิ่มความสับสน'],c:1}
];
const crops=[{name:'ผักบุ้ง',emoji:'🥬',price:10,grow:7,sell:28},{name:'แครอท',emoji:'🥕',price:15,grow:9,sell:40},{name:'มะเขือเทศ',emoji:'🍅',price:20,grow:11,sell:55},{name:'ข้าวโพด',emoji:'🌽',price:25,grow:13,sell:70}];

let state={name:'',avatar:avatars[0],x:470,y:430,speed:3.2,xp:0,coins:100,level:1,selectedCrop:null,inventory:{},plots:[null,null,null],questionIndex:0,missionCorrect:0,plantsHarvested:0};
let keys={}; let activeModal=null; let toastTimer=null;
const npc={x:220,y:225,w:58,h:72,emoji:'👩‍🏫',name:'ครูใจดี'};
const shop={x:750,y:185,w:75,h:70};
const plots=[{x:405,y:415},{x:475,y:415},{x:545,y:415}];

function $(id){return document.getElementById(id)}
function showToast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800)}
function xpNeed(){return 100+(state.level-1)*70}
function addXP(n){state.xp+=n;while(state.xp>=xpNeed()){state.xp-=xpNeed();state.level++;state.coins+=25;showToast(`🎉 เลเวลอัป! ตอนนี้ Lv.${state.level}`)};updateUI()}
function updateUI(){ $('level').textContent=state.level;$('xp').textContent=state.xp;$('xp-next').textContent=xpNeed();$('coins').textContent=state.coins;$('player-name-label').textContent=state.name;$('player-avatar').textContent=state.avatar;renderMissions();renderLeaderboard() }
function renderMissions(){const done=state.missionCorrect;const harvest=state.plantsHarvested;$('mission-list').innerHTML=`<div class="mission-row"><span>📚 ตอบถูก 3 ข้อ</span><b class="check">${Math.min(done,3)}/3</b></div><div class="mission-row"><span>🌾 เก็บเกี่ยว 3 ครั้ง</span><b class="check">${Math.min(harvest,3)}/3</b></div><div class="mission-row"><span>⭐ ถึง Lv.5</span><b class="check">${Math.min(state.level,5)}/5</b></div>`}
function renderLeaderboard(){const me=state.xp+state.level*100;const fake=[['น้องฟ้า',760],['น้องต้น',690],['น้องน้ำ',620],['น้องบอล',540],['น้องแก้ม',480]];fake.push([state.name||'ผู้เล่น',me]);fake.sort((a,b)=>b[1]-a[1]);$('leaderboard').innerHTML=fake.slice(0,6).map((r,i)=>`<div class="leader-row"><span>${['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][i]} ${r[0]}</span><strong>${r[1]} XP</strong></div>`).join('')}

function startGame(){const name=$('player-name').value.trim();if(!name){showToast('กรุณาใส่ชื่อก่อนครับ');return}state.name=name;document.getElementById('login-screen').classList.remove('active');document.getElementById('game-screen').classList.add('active');updateUI();showToast('🌾 ยินดีต้อนรับสู่ Ban Rai Village!');requestAnimationFrame(loop)}
function openModal(id){activeModal=id;$(id).classList.remove('hidden')}
function closeModal(id){$(id).classList.add('hidden');activeModal=null}
function openQuestion(){if(activeModal)return;const q=questions[state.questionIndex%questions.length];$('question-text').textContent=q.q;$('question-category').textContent='📚 ภารกิจการงานอาชีพ';$('question-result').textContent='';$('answers').innerHTML=q.a.map((x,i)=>`<button class="answer" data-i="${i}">${String.fromCharCode(65+i)}. ${x}</button>`).join('');document.querySelectorAll('.answer').forEach(b=>b.addEventListener('click',()=>answerQuestion(+b.dataset.i)));openModal('question-modal')}
function answerQuestion(i){const q=questions[state.questionIndex%questions.length];document.querySelectorAll('.answer').forEach(b=>b.disabled=true);const btn=document.querySelector(`.answer[data-i="${i}"]`);if(i===q.c){btn.classList.add('correct');$('question-result').textContent='🎉 ถูกต้อง! +20 XP +10 เหรียญ';state.coins+=10;state.missionCorrect++;addXP(20)}else{btn.classList.add('wrong');document.querySelector(`.answer[data-i="${q.c}"]`).classList.add('correct');$('question-result').textContent='💡 ยังไม่ถูก ลองสังเกตคำตอบที่ถูกต้องนะ';}state.questionIndex++;setTimeout(()=>closeModal('question-modal'),1000);updateUI()}
function openShop(){if(activeModal)return;const items=$('shop-items');items.innerHTML=crops.map((c,i)=>`<div class="shop-item"><div style="font-size:30px">${c.emoji}</div><b>${c.name}</b><div>ซื้อ ${c.price} 🪙 • ขาย ${c.sell} 🪙</div><button data-crop="${i}">ซื้อเมล็ด</button></div>`).join('');items.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>buyCrop(+b.dataset.crop)));openModal('shop-modal')}
function buyCrop(i){const c=crops[i];if(state.coins<c.price){showToast('🪙 เหรียญไม่พอครับ');return}state.coins-=c.price;state.selectedCrop=i;state.inventory[i]=(state.inventory[i]||0)+1;showToast(`🌱 ได้เมล็ด${c.name} 1 ชุด`);updateUI()}
function interact(){if(activeModal)return;const near=(a,b,d=80)=>Math.hypot(a.x-b.x,a.y-b.y)<d;if(near(state,npc,85)){openQuestion();return}if(near(state,shop,95)){openShop();return}for(let i=0;i<plots.length;i++){if(Math.hypot(state.x-plots[i].x,state.y-plots[i].y)<55){usePlot(i);return}}}
function usePlot(i){const p=state.plots[i];if(!p){const available=Object.keys(state.inventory).find(k=>state.inventory[k]>0);if(available===undefined){showToast('🌱 ไปซื้อเมล็ดพันธุ์ที่ร้านก่อน');return}state.inventory[available]--;state.plots[i]={crop:+available,planted:Date.now(),watered:false};showToast(`🌱 ปลูก${crops[available].name}แล้ว!`)}else if(!p.watered){p.watered=true;showToast('💧 รดน้ำเรียบร้อย!')}else if(Date.now()-p.planted>crops[p.crop].grow*1000){const c=crops[p.crop];state.coins+=c.sell;state.plantsHarvested++;state.plots[i]=null;addXP(15);showToast(`🌾 收穫 ${c.name} +${c.sell} 🪙`)}else{const left=Math.ceil((crops[p.crop].grow*1000-(Date.now()-p.planted))/1000);showToast(`🌱 ยังโตไม่เต็มที่ เหลือ ${left} วินาที`)}updateUI()}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function draw(){
 const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
 // grass
 ctx.fillStyle='#78bd5d';ctx.fillRect(0,0,W,H);
 // checker texture
 for(let y=0;y<H;y+=32)for(let x=0;x<W;x+=32){ctx.fillStyle=((x+y)/32)%2?'rgba(255,255,255,.035)':'rgba(30,90,40,.035)';ctx.fillRect(x,y,32,32)}
 // paths
 ctx.fillStyle='#d6b579';ctx.fillRect(0,295,W,80);ctx.fillRect(440,0,80,H);ctx.fillStyle='#e6c88e';ctx.fillRect(0,318,W,34);ctx.fillRect(463,0,34,H);
 // river
 ctx.fillStyle='#4da6d8';ctx.fillRect(805,0,155,600);for(let y=15;y<600;y+=30){ctx.strokeStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.arc(850,y,12,0,Math.PI);ctx.stroke()}
 // houses/buildings
 drawBuilding(90,90,180,120,'🏫','ศูนย์การเรียนรู้');drawBuilding(690,90,120,95,'🏪','ร้านค้า');drawBuilding(75,420,150,110,'🏡','บ้านของฉัน');
 // trees
 [[35,45],[350,65],[590,55],[610,450],[320,500],[870,520],[35,530]].forEach(t=>drawTree(t[0],t[1]));
 // plots
 plots.forEach((p,i)=>drawPlot(p,i));
 // npc
 drawCharacter(npc.x,npc.y,npc.emoji,npc.name,'npc');
 // player
 drawCharacter(state.x,state.y,state.avatar,state.name,'player');
 // sign
 ctx.fillStyle='rgba(15,25,36,.85)';ctx.fillRect(20,20,235,42);ctx.fillStyle='#fff';ctx.font='600 18px Kanit';ctx.fillText('🌾 หมู่บ้านบ้านไร่ • ป.5',32,47);
}
function drawBuilding(x,y,w,h,emoji,label){ctx.fillStyle='#d66d5f';ctx.fillRect(x,y,w,h);ctx.fillStyle='#a84e49';ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+w/2,y-48);ctx.lineTo(x+w+10,y);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe0a3';ctx.fillRect(x+w*.4,y+h*.52,32,55);ctx.fillStyle='#9ad7e8';ctx.fillRect(x+22,y+38,38,35);ctx.fillRect(x+w-60,y+38,38,35);ctx.font='600 15px Kanit';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h+23);ctx.textAlign='left';ctx.font='30px serif';ctx.fillText(emoji,x+w/2-15,y+35)}
function drawTree(x,y){ctx.fillStyle='#744b32';ctx.fillRect(x-7,y+22,14,35);ctx.fillStyle='#2e8c4b';ctx.beginPath();ctx.arc(x,y+8,28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#46a95b';ctx.beginPath();ctx.arc(x-18,y-2,20,0,Math.PI*2);ctx.arc(x+18,y-2,20,0,Math.PI*2);ctx.fill()}
function drawPlot(p,i){ctx.fillStyle='#8b5a3c';ctx.fillRect(p.x-27,p.y-22,54,44);ctx.strokeStyle='#c98a55';ctx.strokeRect(p.x-27,p.y-22,54,44);const crop=state.plots[i];if(crop){const c=crops[crop.crop];ctx.font='30px serif';ctx.textAlign='center';ctx.fillText(crop.watered?c.emoji:'🌱',p.x,p.y+10);if(Date.now()-crop.planted>c.grow*1000&&crop.watered){ctx.fillStyle='#ffd166';ctx.font='12px Kanit';ctx.fillText('เก็บเกี่ยว!',p.x,p.y+35)}ctx.textAlign='left'}else{ctx.fillStyle='#e0c097';ctx.font='12px Kanit';ctx.textAlign='center';ctx.fillText('แปลงผัก',p.x,p.y+5);ctx.textAlign='left'}}
function drawCharacter(x,y,emoji,name,type){ctx.save();ctx.textAlign='center';ctx.font=type==='npc'?'38px serif':'34px serif';ctx.fillText(emoji,x,y);ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(x,y+16,20,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='600 13px Kanit';ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=4;ctx.strokeText(name,x,y-25);ctx.fillText(name,x,y-25);ctx.restore()}
function move(){let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;if(dx||dy){const len=Math.hypot(dx,dy);state.x=clamp(state.x+dx/len*state.speed,25,780);state.y=clamp(state.y+dy/len*state.speed,70,560)}}
function loop(){move();draw();requestAnimationFrame(loop)}

avatars.forEach((a,i)=>{const b=document.createElement('button');b.className='avatar-option'+(i===0?' selected':'');b.textContent=a;b.addEventListener('click',()=>{document.querySelectorAll('.avatar-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.avatar=a});$('avatar-picker').appendChild(b)});
$('start-btn').addEventListener('click',startGame);$('player-name').addEventListener('keydown',e=>{if(e.key==='Enter')startGame()});
window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.code==='Space')interact()});window.addEventListener('keyup',e=>keys[e.key]=false);
$('close-question').addEventListener('click',()=>closeModal('question-modal'));$('close-shop').addEventListener('click',()=>closeModal('shop-modal'));$('help-btn').addEventListener('click',()=>openModal('help-modal'));$('close-help').addEventListener('click',()=>closeModal('help-modal'));
