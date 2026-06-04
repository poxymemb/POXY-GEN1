/* POXY HUD — procedural hover SFX (no external assets) */
window.PoxyHudAudio=(function(){
  const LS_KEY='poxy_hud_sound_v1';
  let enabled=localStorage.getItem(LS_KEY)!=='0';
  let ctx=null;
  let mythicOsc=null;
  let mythicGain=null;

  function getCtx(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      ctx=new AC();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return ctx;
  }

  function setEnabled(on){
    enabled=!!on;
    localStorage.setItem(LS_KEY,enabled?'1':'0');
    if(!enabled)stopMythicHum();
    const el=document.getElementById('poxyHudSoundToggle');
    if(el)el.checked=enabled;
  }

  function isEnabled(){return enabled;}

  function playClick(){
    if(!enabled)return;
    const c=getCtx();if(!c)return;
    const t=c.currentTime;
    const osc=c.createOscillator();
    const gain=c.createGain();
    const filt=c.createBiquadFilter();
    osc.type='square';
    osc.frequency.setValueAtTime(2400,t);
    osc.frequency.exponentialRampToValueAtTime(900,t+0.018);
    filt.type='highpass';
    filt.frequency.value=800;
    gain.gain.setValueAtTime(0.0001,t);
    gain.gain.exponentialRampToValueAtTime(0.22,t+0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001,t+0.045);
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t+0.05);
  }

  function startMythicHum(){
    if(!enabled)return;
    const c=getCtx();if(!c)return;
    stopMythicHum();
    const t=c.currentTime;
    mythicOsc=c.createOscillator();
    mythicGain=c.createGain();
    const lfo=c.createOscillator();
    const lfoGain=c.createGain();
    mythicOsc.type='sine';
    mythicOsc.frequency.value=58;
    lfo.type='sine';
    lfo.frequency.value=0.35;
    lfoGain.gain.value=18;
    lfo.connect(lfoGain);
    lfoGain.connect(mythicOsc.frequency);
    mythicGain.gain.setValueAtTime(0.0001,t);
    mythicGain.gain.exponentialRampToValueAtTime(0.12,t+0.35);
    mythicOsc.connect(mythicGain);
    mythicGain.connect(c.destination);
    mythicOsc.start();
    lfo.start();
    mythicOsc._lfo=lfo;
  }

  function stopMythicHum(){
    if(!mythicOsc)return;
    try{
      const c=ctx;
      const t=c?c.currentTime:0;
      if(mythicGain&&c){
        mythicGain.gain.cancelScheduledValues(t);
        mythicGain.gain.setValueAtTime(mythicGain.gain.value,t);
        mythicGain.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
      }
      setTimeout(()=>{
        try{mythicOsc._lfo?.stop();}catch(e){}
        try{mythicOsc.stop();}catch(e){}
        mythicOsc=null;
        mythicGain=null;
      },220);
    }catch(e){mythicOsc=null;mythicGain=null;}
  }

  function tierHoverKind(tierId){
    if(!tierId)return'common';
    if(tierId==='mythic'||tierId==='secret')return'premium';
    return'common';
  }

  function bindCard(card){
    if(!card||card._poxyHudBound)return;
    card._poxyHudBound=true;
    const tier=card.dataset.tier||'';
    card.addEventListener('mouseenter',()=>{
      if(tierHoverKind(tier)==='premium')startMythicHum();
      else playClick();
    });
    card.addEventListener('mouseleave',()=>{
      if(tierHoverKind(tier)==='premium')stopMythicHum();
    });
  }

  function bindCollectionGrid(root){
    if(!root)return;
    root.querySelectorAll('.col-inv-card[data-tier]').forEach(bindCard);
  }

  function syncToggleUi(){
    const el=document.getElementById('poxyHudSoundToggle');
    if(el)el.checked=enabled;
  }

  return{setEnabled,isEnabled,playClick,startMythicHum,stopMythicHum,bindCard,bindCollectionGrid,syncToggleUi};
})();
