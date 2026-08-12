(() => {
  const cfg = window.BANRAI_CONFIG || {};
  const hasConfig = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('YOUR-PROJECT') && !cfg.supabaseAnonKey.includes('YOUR_PUBLIC');
  let sb = null, channel = null, myId = null, joined = false;
  const remotePlayers = new Map();
  const shell = document.querySelector('.canvas-shell');
  const canvas = document.getElementById('game');
  const status = document.getElementById('connection-status');
  const count = document.getElementById('online-count');
  const hint = document.getElementById('connection-hint');
  const roomInput = document.getElementById('room-code');
  const nameInput = document.getElementById('player-name');
  let my = {x:470,y:430,name:'',avatar:'🧑‍🌾',room:'BANRAI-01'};
  let lastSent = 0;

  function setStatus(text, cls=''){ if(status){status.textContent=text; status.className='connection-status '+cls;} }
  function updateCount(){ if(count) count.innerHTML=`👥 ผู้เล่นในหมู่บ้าน: <b>${remotePlayers.size + (joined?1:0)}</b>`; }
  function posStyle(x,y){
    const sx=shell.clientWidth/canvas.width, sy=canvas.clientHeight/canvas.height;
    return `left:${x*sx}px;top:${y*sy}px;`;
  }
  function renderRemote(p){
    let el=remotePlayers.get(p.id);
    if(!el){
      el=document.createElement('div'); el.className='remote-player';
      el.innerHTML='<span class="remote-avatar"></span><span class="remote-name"></span>';
      shell.appendChild(el); remotePlayers.set(p.id,el);
    }
    el.style.cssText=posStyle(p.x,p.y);
    el.querySelector('.remote-avatar').textContent=p.avatar||'🧑‍🌾';
    el.querySelector('.remote-name').textContent=p.name||'ผู้เล่น';
  }
  function removeRemote(id){const el=remotePlayers.get(id); if(el) el.remove(); remotePlayers.delete(id); updateCount();}
  function init(){
    if(!hasConfig){
      setStatus('⚪ Offline','offline');
      if(hint) hint.textContent='รุ่นนี้พร้อม Multiplayer แล้ว — ต้องใส่ค่า Supabase ก่อนใช้งานออนไลน์';
      return;
    }
    try { sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey); }
    catch(e){ setStatus('🔴 Config error','error'); return; }
    setStatus('🟡 พร้อมเชื่อมต่อ','connecting');
  }
  async function join(){
    if(!sb || joined) return;
    myId=crypto.randomUUID(); my.name=nameInput.value.trim(); my.avatar=document.querySelector('.avatar-option.selected')?.textContent||'🧑‍🌾'; my.room=(roomInput.value.trim()||'BANRAI-01').toUpperCase();
    const {error}=await sb.from('players').upsert({id:myId,room_code:my.room,name:my.name,avatar:my.avatar,x:my.x,y:my.y,level:1,xp:0,coins:100,updated_at:new Date().toISOString()});
    if(error){setStatus('🔴 เชื่อมต่อไม่ได้','error'); if(hint) hint.textContent='ตรวจสอบ Supabase URL/Key และ SQL schema'; return;}
    channel=sb.channel('village:'+my.room,{config:{broadcast:{ack:true}}});
    channel.on('broadcast',{event:'player_move'},({payload})=>{if(payload.id!==myId){renderRemote(payload);updateCount();}});
    channel.on('broadcast',{event:'player_leave'},({payload})=>{if(payload.id!==myId)removeRemote(payload.id);});
    await channel.subscribe(async s=>{
      if(s==='SUBSCRIBED'){
        joined=true; setStatus('🟢 Online','online'); if(hint) hint.textContent='เชื่อมต่อหมู่บ้านแล้ว • เพื่อนจะปรากฏแบบ Real-time';
        const {data}=await sb.from('players').select('id,name,avatar,x,y').eq('room_code',my.room).neq('id',myId);
        (data||[]).forEach(renderRemote); updateCount(); broadcastMove(true);
      }
    });
    window.addEventListener('beforeunload',leave);
  }
  async function broadcastMove(force=false){
    if(!joined||!channel)return; const now=Date.now(); if(!force&&now-lastSent<60)return; lastSent=now;
    const payload={id:myId,name:my.name,avatar:my.avatar,x:my.x,y:my.y};
    channel.send({type:'broadcast',event:'player_move',payload});
    sb.from('players').update({x:my.x,y:my.y,updated_at:new Date().toISOString()}).eq('id',myId).then(()=>{});
  }
  function leave(){ if(channel&&myId) channel.send({type:'broadcast',event:'player_leave',payload:{id:myId}}); if(sb&&myId) sb.from('players').delete().eq('id',myId).then(()=>{}); }
  function trackMovement(){
    if(!joined)return;
    let dx=0,dy=0;
    if(window.__banraiKeys?.ArrowLeft||window.__banraiKeys?.a)dx--;
    if(window.__banraiKeys?.ArrowRight||window.__banraiKeys?.d)dx++;
    if(window.__banraiKeys?.ArrowUp||window.__banraiKeys?.w)dy--;
    if(window.__banraiKeys?.ArrowDown||window.__banraiKeys?.s)dy++;
    if(dx||dy){const l=Math.hypot(dx,dy);my.x=Math.max(25,Math.min(780,my.x+dx/l*3.2));my.y=Math.max(70,Math.min(560,my.y+dy/l*3.2));broadcastMove();}
    requestAnimationFrame(trackMovement);
  }
  window.addEventListener('keydown',e=>{window.__banraiKeys=window.__banraiKeys||{};window.__banraiKeys[e.key]=true;});
  window.addEventListener('keyup',e=>{if(window.__banraiKeys)window.__banraiKeys[e.key]=false;});
  window.addEventListener('resize',()=>remotePlayers.forEach((_,id)=>{}));
  const oldStart=document.getElementById('start-btn');
  oldStart.addEventListener('click',()=>setTimeout(()=>{my.name=nameInput.value.trim();my.avatar=document.querySelector('.avatar-option.selected')?.textContent||'🧑‍🌾';join();requestAnimationFrame(trackMovement)},300));
  init();
})();
