(() => {
  const cfg = window.BANRAI_CONFIG || {};
  const hasConfig = cfg.supabaseUrl && cfg.supabaseAnonKey;
  let sb = null, channel = null, myId = null, joined = false, lastSent = 0;
  const remotePlayers = new Map();
  const shell = document.querySelector('.canvas-shell');
  const canvas = document.getElementById('game');
  const status = document.getElementById('connection-status');
  const count = document.getElementById('online-count');
  const hint = document.getElementById('connection-hint');
  const roomInput = document.getElementById('room-code');
  const nameInput = document.getElementById('player-name');

  function setStatus(text, cls=''){ if(status){status.textContent=text;status.className='connection-status '+cls;} }
  function updateCount(){ if(count) count.innerHTML=`👥 ผู้เล่นในหมู่บ้าน: <b>${remotePlayers.size + (joined ? 1 : 0)}</b>`; }
  function renderRemote(p){
    let el=remotePlayers.get(p.id);
    if(!el){
      el=document.createElement('div'); el.className='remote-player';
      el.innerHTML='<span class="remote-avatar"></span><span class="remote-name"></span>';
      shell.appendChild(el); remotePlayers.set(p.id,el);
    }
    const sx=shell.clientWidth/canvas.width, sy=canvas.clientHeight/canvas.height;
    el.style.left=(p.x*sx)+'px'; el.style.top=(p.y*sy)+'px';
    el.querySelector('.remote-avatar').textContent=p.avatar||'🧑‍🌾';
    el.querySelector('.remote-name').textContent=p.name||'ผู้เล่น';
  }
  function removeRemote(id){const el=remotePlayers.get(id);if(el)el.remove();remotePlayers.delete(id);updateCount();}

  function init(){
    if(!hasConfig){setStatus('⚪ Offline','offline');if(hint)hint.textContent='ยังไม่ได้ตั้งค่า Supabase';return;}
    try{sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);setStatus('🟡 พร้อมเชื่อมต่อ','connecting');}
    catch(e){setStatus('🔴 Config error','error');}
  }

  async function join(){
    if(!sb||joined)return;
    myId=crypto.randomUUID();
    const room=(roomInput.value.trim()||'BANRAI-01').toUpperCase();
    const name=nameInput.value.trim();
    const avatar=document.querySelector('.avatar-option.selected')?.textContent||'🧑‍🌾';
    const {error}=await sb.from('players').upsert({id:myId,room_code:room,name,avatar,x:state.x,y:state.y,level:state.level,xp:state.xp,coins:state.coins,updated_at:new Date().toISOString()});
    if(error){console.error(error);setStatus('🔴 ฐานข้อมูลยังไม่พร้อม','error');if(hint)hint.textContent='ให้รัน supabase-schema.sql ใน SQL Editor ก่อน';return;}

    channel=sb.channel('village:'+room,{config:{broadcast:{ack:true}}});
    channel.on('broadcast',{event:'player_move'},({payload})=>{if(payload?.id&&payload.id!==myId)renderRemote(payload);});
    channel.on('broadcast',{event:'player_leave'},({payload})=>{if(payload?.id)removeRemote(payload.id);});
    await channel.subscribe(async s=>{
      if(s==='SUBSCRIBED'){
        joined=true;setStatus('🟢 Online','online');if(hint)hint.textContent='เข้าหมู่บ้านแล้ว • ทุกคนในรหัสเดียวกันจะเห็นกัน';
        const {data}=await sb.from('players').select('id,name,avatar,x,y').eq('room_code',room).neq('id',myId);
        (data||[]).forEach(renderRemote);updateCount();broadcastMove(true);
      }
    });
    window.addEventListener('beforeunload',leave);
  }

  function broadcastMove(force=false){
    if(!joined||!channel)return;
    const now=Date.now();if(!force&&now-lastSent<70)return;lastSent=now;
    const payload={id:myId,name:state.name,avatar:state.avatar,x:state.x,y:state.y};
    channel.send({type:'broadcast',event:'player_move',payload});
    sb.from('players').update({x:state.x,y:state.y,level:state.level,xp:state.xp,coins:state.coins,updated_at:new Date().toISOString()}).eq('id',myId).then(()=>{});
  }
  function leave(){if(channel&&myId)channel.send({type:'broadcast',event:'player_leave',payload:{id:myId}});if(sb&&myId)sb.from('players').delete().eq('id',myId).then(()=>{});}

  // Observe the existing game loop's state instead of creating a second movement loop.
  setInterval(()=>{if(joined)broadcastMove();},80);
  setInterval(()=>{if(joined){const cutoff=new Date(Date.now()-15000).toISOString();sb.from('players').select('id,name,avatar,x,y').eq('room_code',(roomInput.value.trim()||'BANRAI-01').toUpperCase()).gt('updated_at',cutoff).neq('id',myId).then(({data})=>(data||[]).forEach(renderRemote));}},5000);

  const oldStart=document.getElementById('start-btn');
  oldStart.addEventListener('click',()=>setTimeout(join,350));
  window.addEventListener('resize',()=>remotePlayers.forEach((el,id)=>{const p=el.dataset.player?JSON.parse(el.dataset.player):null;if(p)renderRemote(p);}));
  init();
})();
