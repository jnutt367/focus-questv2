const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),TILE=48;
const E={tier:by('hudTier'),level:by('hudLevel'),energy:by('hudEnergy'),stars:by('hudStars'),tool:by('hudTool'),dialogue:by('dialogue'),dialogueText:by('dialogueText'),dialogueActions:by('dialogueActions'),progress:by('progress'),sideTitle:by('sideTitle'),sideGoal:by('sideGoal'),questTitle:by('questTitle'),questText:by('questText'),tools:by('tools'),foxRewards:by('foxRewards'),teachBox:by('teachBox'),tierGrid:by('tierGrid'),lesson:by('lesson'),lessonTitle:by('lessonTitle'),lessonIntro:by('lessonIntro'),lessonList:by('lessonList'),celebrate:by('celebrate'),celebrateTitle:by('celebrateTitle'),celebrateText:by('celebrateText'),badgeRow:by('badgeRow'),confetti:by('confettiLayer'),discovery:by('discovery'),discoveryIcon:by('discoveryIcon'),discoveryTitle:by('discoveryTitle'),discoveryText:by('discoveryText'),discoveryFox:by('discoveryFox')};
function by(id){return document.getElementById(id)}
// --- Audio layer: WebAudio synth, no external files needed. Browser-safe: starts only after a click/tap. ---
const AudioGame=(()=>{
  let ctx=null, master=null, musicGain=null, sfxGain=null, musicOn=false, timer=null, step=0;
  const melody=[
    ['C4',0.35],['E4',0.35],['G4',0.35],['B4',0.55],['A4',0.35],['G4',0.35],['E4',0.55],
    ['D4',0.35],['F4',0.35],['A4',0.35],['C5',0.55],['B4',0.35],['G4',0.35],['E4',0.70],
    ['C4',0.35],['G4',0.35],['E4',0.35],['A4',0.55],['G4',0.35],['D4',0.35],['C4',0.80]
  ];
  const noteFreq={C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,G5:783.99};
  function setup(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=0.34; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=0.22; musicGain.connect(master);
    sfxGain=ctx.createGain(); sfxGain.gain.value=0.55; sfxGain.connect(master);
  }
  async function unlock(){ setup(); if(ctx.state==='suspended') await ctx.resume(); }
  function tone(freq,dur=0.18,type='sine',gain=0.15,dest=sfxGain,when=0){
    if(!ctx) return;
    const t=ctx.currentTime+when, o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.03);
  }
  function chord(rootFreq,when=0){ tone(rootFreq,0.65,'triangle',0.06,musicGain,when); tone(rootFreq*1.25,0.65,'triangle',0.035,musicGain,when); tone(rootFreq*1.5,0.65,'triangle',0.035,musicGain,when); }
  function tick(){
    if(!musicOn||!ctx) return;
    const [n,d]=melody[step%melody.length];
    tone(noteFreq[n],d,'triangle',0.10,musicGain,0);
    if(step%4===0) chord([130.81,146.83,164.81,196][Math.floor(step/4)%4],0);
    if(step%2===0) tone(98,0.08,'sine',0.035,musicGain,0.02);
    step++;
    timer=setTimeout(tick, Math.max(220,d*520));
  }
  async function toggle(){
    await unlock();
    musicOn=!musicOn;
    const btn=document.getElementById('musicBtn'), status=document.getElementById('audioStatus');
    if(musicOn){ step=0; btn.textContent='🔊 Music On'; status.textContent='Music is playing. Sound effects are active.'; tick(); sfx('start'); }
    else { clearTimeout(timer); btn.textContent='🔇 Start Music'; status.textContent='Music off. Click Start Music to resume.'; }
  }
  async function test(){ await unlock(); sfx('success'); document.getElementById('audioStatus').textContent='If you heard a chime, audio is working.'; }
  function sfx(name){
    if(!ctx) return;
    const patterns={
      start:[[392,.12],[523,.16,.08],[659,.18,.18]],
      chest:[[523,.09],[659,.09,.08],[784,.16,.16]],
      success:[[659,.10],[784,.12,.10],[1046,.22,.22]],
      error:[[220,.16],[185,.20,.12]],
      fanfare:[[523,.12],[659,.12,.12],[784,.12,.24],[1046,.35,.38]],
      star:[[784,.08],[988,.11,.07],[1318,.18,.17]],
      jump:[[330,.06],[440,.08,.05],[660,.10,.11]],
      splash:[[392,.05],[330,.06,.04],[262,.08,.09]],
      sparkle:[[1046,.06],[1318,.08,.06]],
      click:[[440,.05]]
    }[name]||[[440,.08]];
    patterns.forEach(([f,d,w=0])=>tone(f,d,'square',0.12,sfxGain,w));
  }
  return {toggle,test,sfx,unlock};
})();

const toolInfo={
'Pause Power':['🫧','Pause Power','Breathe before reacting.'],
'Tiny Step Torch':['🔦','Tiny Step Torch','Shrink a big task into one tiny action.'],
'Return Bell':['🔔','Return Bell','Notice distraction, then gently return.'],
'Plan Map':['🗺️','Plan Map','Choose a next step before starting.'],
'Time Gem':['⏳','Time Gem','Use short timers and breaks.'],
'Body Boost':['⚡','Body Boost','Move your body to reset energy.'],
'Kind Words':['💬','Kind Words','Speak to yourself like a helper.'],
'Environment Shield':['🛡️','Environment Shield','Change the space, not your worth.'],
'Priority Compass':['🧭','Priority Compass','Pick what matters most right now.'],
'Recovery Cape':['🪽','Recovery Cape','Restart after a hard moment.']
};
const tiers=['Beginner','Intermediate','Tertiary','Advanced'];
const baseMaps=[
[
'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
'TGGGGGGGTTTTTTGGGGTTTTTTTTTTGT',
'TGGGPGGPPGGGGGGGGGGGTGGGWWWGGT',
'TGGGPGGGTGGGGGGPGGGGTGGGWWWGGT',
'TGGGPGGPPPPPPPPPGGGGTTTTTTTGGT',
'TGTTPTTGTGGGGGGPGGGGGGGGGGGGGT',
'TGGGPGGGTGGGGGGPGGGGGGGGGGGGGT',
'TGGGPGGGGGGGGGGPGGGGGGGGGGGGGT',
'TGGPPPPPPPPPPPPPPPPPGGGGTGGGGT',
'TGGGGGGGGGGGGGGPGGGGGGGGTGGGGT',
'TGGGGGGGGGGGGGGPPGGGGGGGTGGGGT',
'TGTTTTTGGGGGGGGPGGGGGGGGTGGGGT',
'TGGGGGGGGGWWWWGPGGGGGGGGTGGGGT',
'TGGGGGGGGGWWWWGPGGHHHHGGTGGGGT',
'TGPGGGGGGGWWWWGPGGHHHHGGTGGGGT',
'TGGGGGGGGGGGGGGPGGHHHHGGGGGGGT',
'TGGGGGGGGGGGGGGGGGGGGGGGGGGGGT',
'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
],
['TTTTTTTTTTTTTTTTTTTT','TGGGGGGGGGMMMMGGGGGT','TGGPPPPPGGGGGGGGNGGT','TGGPGGGPGGWWWGGGGGGT','TGGPGCGPPPPPPPPPGGGT','TGGPGGGPGGWWWGGPGGGT','TGGPPPPPGGGGGGGPGGGT','TGGGGGGGGMMMMGGPGGGT','TGGGHHGGGGGGGGGPGGGT','TGGGHHGGGGGFGGGRPGGT','TGGGGGGGGGGGGGGGPGGT','TGGGGGGGGGGGGGGGGGGT','TTTTTTTTTTTTTTTTTTTT'],
['TTTTTTTTTTTTTTTTTTTT','TGGGGGGGGGGGGGGGGGGT','TGGMMMMMPPPPPMMMMGGT','TGGGGGGPGGGGPGGGGGGT','TGGWGGGPGCGGPGGGWGT','TGGWGGGPGGGGPGGGWGT','TGGWGGGPPPPPPGGGWGT','TGGGGGGGGFGGGGGGGGT','TGPPPPMMMMMMMMPPGGT','TGPGGGGGNGGGGGPGGGT','TGPGGGGHHHHGGGPRGGT','TGGGGGGHHHHGGGGGGGT','TTTTTTTTTTTTTTTTTTTT']
];
const levelThemes=[
{title:'Calm Grove',goal:'Practice pausing before reacting.',tool:'Pause Power',npc:'Sage Fern',lesson:['ADHD is not laziness. It is a different way your attention and energy work.','A pause gives your brain space to choose instead of explode.','Use B for Pause Power when energy feels too high.'],challenge:'breath',teach:'Pause, breathe, choose.'},
{title:'Task Temple',goal:'Break big tasks into tiny steps.',tool:'Tiny Step Torch',npc:'Captain Checklist',lesson:['Big tasks can feel like a mountain.','Tiny steps lower the starting pressure.','A tiny first step could be two minutes, three items, or one corner.'],challenge:'tiny',teach:'Make the task smaller.'},
{title:'Distraction Woods',goal:'Practice noticing and returning.',tool:'Return Bell',npc:'Ranger Return',lesson:['Getting distracted does not mean you failed.','The skill is noticing and coming back gently.','Kind returning builds confidence over time.'],challenge:'return',teach:'Notice. Name it. Return.'},
{title:'Planning Peaks',goal:'Plan before rushing in.',tool:'Plan Map',npc:'Mira the Mapper',lesson:['Planning gives your future self a trail to follow.','Choose the first step, the next step, and the finish point.','Plans should be simple enough to actually use.'],challenge:'plan',teach:'Plan the path before the quest.'},
{title:'Timer Caverns',goal:'Use timers and breaks.',tool:'Time Gem',npc:'Tick Tock Toby',lesson:['ADHD brains often need visible time.','Short sprints can make starting easier.','Breaks are fuel, not failure.'],challenge:'timer',teach:'Try a short sprint and reset.'},
{title:'Energy Rapids',goal:'Use movement to reset focus.',tool:'Body Boost',npc:'Coach Spark',lesson:['Movement can help your brain regulate energy.','A quick stretch, walk, or wall push can change the moment.','Restless energy can become useful energy.'],challenge:'body',teach:'Move to reset.'},
{title:'Kindness Castle',goal:'Use helpful self-talk.',tool:'Kind Words',npc:'Lady Mercy',lesson:['Shame makes focus harder.','Kind words help your brain feel safe enough to try again.','Talk to yourself like you would talk to a child you love.'],challenge:'kind',teach:'Encouragement beats shame.'},
{title:'Signal Sanctuary',goal:'Adjust the environment.',tool:'Environment Shield',npc:'Shieldsmith Sola',lesson:['Sometimes the room needs fixing, not you.','Reduce friction: clear space, silence alerts, prepare tools.','Environment design is an ADHD superpower.'],challenge:'env',teach:'Change the space.'},
{title:'Priority Palace',goal:'Choose what matters most.',tool:'Priority Compass',npc:'King Priority',lesson:['Not every urgent thing is important.','Pick one main quest before chasing side quests.','Priorities protect your attention.'],challenge:'priority',teach:'Choose the main quest.'},
{title:'Restart Summit',goal:'Recover and begin again.',tool:'Recovery Cape',npc:'Elder Restart',lesson:['Bad moments do not cancel your progress.','A restart is a skill.','You can begin again with one breath and one step.'],challenge:'restart',teach:'Begin again.'}
];
function makeLevels(){let arr=[];tiers.forEach((tier,ti)=>{for(let i=0;i<3;i++){const th=levelThemes[(ti*3+i)%levelThemes.length];arr.push({...th,tier,tierIndex:ti,difficulty:ti+1,index:arr.length,map:baseMaps[(ti+i)%baseMaps.length],bg:['#69b96b','#5fa9d8','#9b7bd7','#d86f5f'][ti],start:(ti===0&&i===0?[2,14]:[2+i,9-i]),badge:`${tier} Badge ${i+1}`})}});return arr}
const levels=makeLevels();
let state={started:false,level:0,keys:{},step:0,energy:5,stars:0,tools:[],met:false,chest:false,challenge:false,ready:false,message:false,hardMode:0,completed:false,foxUnlocks:[],forestSecrets:{grove:false,crystal:false,path:false}};
let player={x:120,y:430,w:34,h:42,spd:3,color:'#2f80ed',z:0,vz:0,jumping:false,dir:'down',moving:false,walkFrame:0,walkDust:0,landingSquash:0,jumpCooldown:0};
let camera={x:0,y:0};
let fox={x:80,y:450,w:34,h:24,bubbleTimer:0,tip:'I’m Fidget Fox. I’ll help you remember the skill.',mood:'ready'};
const foxTips={start:['I’ll follow along. When you feel stuck, press F or tap 🦊.','First quest: meet the helper, practice, open the chest, then use the gate.'],npc:['Nice! A real-life ADHD tool is stronger when you practice it right away.','Tools are not magic fixes. They are tiny helpers you can actually use.'],challenge:['Great choice! Your brain just practiced a new path.','That’s the skill: pause, choose, and try again.'],miss:['No shame. Mistakes are practice too. Let’s return gently.','That one was tricky. ADHD progress grows through kind restarts.'],chest:['Treasure found! Stars remind your brain that effort matters.','You earned that reward by practicing the skill.'],gate:['The gate is ready. You completed the learning loop!','You did it: learn, practice, reward, review.'],jump:['Good hop! Movement can help reset ADHD energy.'],lowEnergy:['Energy is low. Try Pause Power with B, or take one tiny step.'],idle:['Still with you. Look for a helper, board, chest, or gate.','Little steps count. Pick the next visible thing.']};

const foxRewardMilestones=[
  {stars:5,key:'bandana',name:'Red Bandana',icon:'❤️',desc:'Fidget Fox wears a brave red bandana.'},
  {stars:10,key:'backpack',name:'Explorer Backpack',icon:'🎒',desc:'Fox carries your ADHD tools with pride.'},
  {stars:20,key:'lantern',name:'Lantern',icon:'🏮',desc:'Fox glows with a calming helper light.'},
  {stars:50,key:'radar',name:'Treasure Radar',icon:'📡',desc:'Fox can sense hidden shiny things nearby.'},
  {stars:100,key:'golden',name:'Golden Fox',icon:'✨',desc:'Fox becomes a golden mastery companion.'}
];
function foxHas(key){return state.foxUnlocks.some(s=>foxRewardMilestones.find(r=>r.stars===s)?.key===key)}
function nextFoxReward(){return foxRewardMilestones.find(r=>state.stars<r.stars)}
function checkFoxRewardUnlock(){
  const newly=[];
  foxRewardMilestones.forEach(r=>{
    if(state.stars>=r.stars&&!state.foxUnlocks.includes(r.stars)){
      state.foxUnlocks.push(r.stars);
      newly.push(r);
    }
  });
  if(newly.length){
    const r=newly[newly.length-1];
    fox.tip=`New upgrade unlocked: ${r.name}!`;
    fox.bubbleTimer=320;
    spawnParticles(fox.x+18,fox.y+8,'star',34);
    AudioGame.sfx('fanfare');
    return r;
  }
  return null;
}
function earnStar(label='Focus Star'){
  state.stars++;
  spawnStarReward(label);
  return checkFoxRewardUnlock();
}
function foxRewardMessage(r){
  return r?`<br><br><strong>⭐ New Fidget Fox Upgrade:</strong> ${r.icon} ${r.name}<br>${r.desc}`:'';
}

let particles=[];
let flyingStars=[];
function lvl(){return levels[state.level]}
function startGame(){document.body.classList.add('game-active');AudioGame.unlock();AudioGame.sfx('start');by('start').style.display='none';state.started=true;resetLevel();foxSpeak('start');showMessage('Inner Coach',`Welcome to ${lvl().title}. Talk to ${lvl().npc}, complete the practice challenge, open the chest, then reach the gate.`)}
function resetLevel(){let [sx,sy]=lvl().start;[sx,sy]=findSafeStart(sx,sy);player.x=sx*TILE;player.y=sy*TILE;state.step=0;state.met=false;state.chest=false;state.challenge=false;state.ready=false;state.energy=Math.max(2,5-state.hardMode);player.z=0;player.vz=0;player.jumping=false;player.moving=false;player.walkFrame=0;player.walkDust=0;player.landingSquash=0;player.jumpCooldown=0;fox.x=player.x-42;fox.y=player.y+12;fox.bubbleTimer=0;particles=[];flyingStars=[];}
function updateCamera(){
  const L=lvl();
  const mapW=L.map[0].length*TILE, mapH=L.map.length*TILE;
  camera.x=Math.max(0,Math.min(mapW-canvas.width,player.x+player.w/2-canvas.width/2));
  camera.y=Math.max(0,Math.min(mapH-canvas.height,player.y+player.h/2-canvas.height/2));
}
function draw(){const L=lvl();updateCamera();drawSky(L);ctx.save();ctx.translate(-camera.x,-camera.y);for(let y=0;y<L.map.length;y++)for(let x=0;x<L.map[y].length;x++)drawTile(L.map[y][x],x*TILE,y*TILE,x,y,L);drawScenery(L);drawForestExpansionDecor();drawCharacter(15*TILE,5*TILE,'#06d6a0',L.npc);drawChest(16*TILE,8*TILE);drawBoard(4*TILE,4*TILE);drawGate(16*TILE,10*TILE);drawFidgetFox();drawPlayer();drawParticles();ctx.restore();drawFlyingStars();drawVignette()}
function drawSky(L){ctx.fillStyle=L.bg;ctx.fillRect(0,0,960,600);ctx.fillStyle='rgba(255,255,255,.12)';for(let i=0;i<18;i++){ctx.beginPath();ctx.arc((i*91+Date.now()/80)%980,40+(i%4)*28,16+i%3*4,0,Math.PI*2);ctx.fill()}}
function drawTile(t,x,y,gx,gy,L){let c=t==='T'?'#21452f':t==='P'?'#d9b46f':t==='W'?'#3fa9f5':t==='M'?'#4b5563':t==='H'?'#8b5e34':'#7fc96d';ctx.fillStyle=c;ctx.fillRect(x,y,TILE,TILE);ctx.strokeStyle='rgba(0,0,0,.06)';ctx.strokeRect(x,y,TILE,TILE);if(t==='G'){ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x+8,y+8,5,5);ctx.fillRect(x+30,y+27,4,4);if((gx+gy)%5===0){drawTinyFlower(x+33,y+10,'#fff6bf')}if((gx*2+gy)%7===0){drawTinyFlower(x+11,y+33,'#ef476f')}}if(t==='P'){ctx.fillStyle='rgba(90,54,22,.18)';ctx.beginPath();ctx.arc(x+10,y+12,3,0,Math.PI*2);ctx.arc(x+31,y+31,2,0,Math.PI*2);ctx.fill()}if(t==='W'){let wave=(Date.now()/120+gx*8)%28;ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(x+4+wave,y+14,16,4);ctx.fillRect(x+2+((wave+12)%30),y+32,12,3);ctx.fillStyle='rgba(0,82,140,.18)';ctx.fillRect(x,y+TILE-8,TILE,8)}if(t==='T'){ctx.fillStyle='#2e6b3f';ctx.beginPath();ctx.arc(x+24+Math.sin(Date.now()/900+gx)*2,y+20,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b371d';ctx.fillRect(x+20,y+26,8,18);ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(x+17,y+13,5,0,Math.PI*2);ctx.fill()}if(t==='H'){ctx.fillStyle='rgba(255,225,140,.18)';ctx.fillRect(x+6,y+7,34,8);ctx.fillRect(x+8,y+25,32,7)}}
function drawTinyFlower(x,y,color){ctx.fillStyle=color;for(let a=0;a<Math.PI*2;a+=Math.PI/2){ctx.beginPath();ctx.arc(x+Math.cos(a)*3,y+Math.sin(a)*3,2,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#f7c948';ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill()}
function drawScenery(L){ctx.fillStyle='rgba(255,247,204,.25)';ctx.beginPath();ctx.arc(120,90,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(0,0,960,8)}
function drawForestExpansionDecor(){
  if(state.level!==0) return;
  // Secret Grove: decorative clearing in the expanded Focus Forest.
  ctx.save();
  const pulse=.75+Math.sin(Date.now()/360)*.25;
  ctx.fillStyle='rgba(255,246,191,.18)';ctx.beginPath();ctx.arc(4*TILE+24,2*TILE+24,72,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(247,201,72,.45)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(4*TILE+24,2*TILE+24,48+pulse*4,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<8;i++){let a=i*Math.PI/4+Date.now()/1400;drawStarShape(4*TILE+24+Math.cos(a)*42,2*TILE+24+Math.sin(a)*30,4,'#fff6bf','#f7c948')}
  // Crystal Tree Clearing marker.
  const cx=7*TILE+24, cy=2*TILE+24;
  ctx.fillStyle='rgba(123,97,255,.35)';ctx.beginPath();ctx.arc(cx,cy,26+pulse*5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7b61ff';ctx.beginPath();ctx.moveTo(cx,cy-30);ctx.lineTo(cx+18,cy);ctx.lineTo(cx,cy+32);ctx.lineTo(cx-18,cy);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#fff6bf';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.7)';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText('Secret Grove',4*TILE+24,1*TILE+8);
  ctx.restore();
}

function drawBoard(x,y){ctx.fillStyle='#7a4e2a';ctx.fillRect(x+8,y+14,32,26);ctx.fillStyle='#f5deb3';ctx.fillRect(x+4,y+4,40,24);ctx.fillStyle='#17202a';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('TRY',x+24,y+20)}
function drawChest(x,y){if(!state.chest){ctx.save();ctx.globalAlpha=.35+Math.sin(Date.now()/180)*.12;ctx.fillStyle='#fff6bf';ctx.beginPath();ctx.arc(x+24,y+26,32,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.fillStyle=state.chest?'#a16207':'#f7c948';round(x+8,y+16,32,24,6);ctx.fill();ctx.fillStyle='#704214';ctx.fillRect(x+8,y+26,32,4);ctx.fillStyle=state.chest?'#fff6bf':'#17202a';ctx.fillRect(x+21,y+25,6,8);if(!state.chest)drawStarShape(x+24,y+7,8,'#fff6bf','#f7c948')}
function drawGate(x,y){ctx.save();ctx.globalAlpha=state.ready?.95:.45;ctx.fillStyle=state.ready?'#f7c948':'#7b61ff';ctx.beginPath();ctx.arc(x+24,y+24,35+Math.sin(Date.now()/250)*5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17202a';round(x+10,y+4,28,42,14);ctx.fill();ctx.fillStyle='white';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('GATE',x+24,y+58);ctx.restore()}
function drawCharacter(x,y,color,name){ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();ctx.ellipse(x+24,y+42,18,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;round(x+9,y+14,30,30,9);ctx.fill();ctx.fillStyle='#ffd8a8';ctx.beginPath();ctx.arc(x+24,y+13,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17202a';ctx.fillRect(x+18,y+12,4,4);ctx.fillRect(x+27,y+12,4,4);ctx.fillStyle='rgba(7,11,24,.75)';round(x-24,y-16,96,17,8);ctx.fill();ctx.fillStyle='white';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(name,x+24,y-4)}

function drawFidgetFoxFallback(){
  if(!state.started) return;
  const bob=Math.sin(Date.now()/260)*2;
  const x=fox.x, y=fox.y+bob;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x+17,y+28,18,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=foxHas('golden')?'#f7c948':'#f97316';ctx.beginPath();ctx.ellipse(x-4,y+13,18,8,-0.55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff6df';ctx.beginPath();ctx.ellipse(x-15,y+7,7,4,-0.55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=foxHas('golden')?'#ffe066':'#fb923c';round(x+4,y+10,28,20,8);ctx.fill();
  ctx.fillStyle=foxHas('golden')?'#f7c948':'#f97316';ctx.beginPath();ctx.arc(x+20,y+8,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f97316';ctx.beginPath();ctx.moveTo(x+10,y+1);ctx.lineTo(x+15,y-13);ctx.lineTo(x+20,y+2);ctx.fill();ctx.beginPath();ctx.moveTo(x+25,y+1);ctx.lineTo(x+31,y-12);ctx.lineTo(x+33,y+6);ctx.fill();
  ctx.fillStyle='#fff6df';ctx.beginPath();ctx.moveTo(x+13,y);ctx.lineTo(x+15,y-7);ctx.lineTo(x+18,y+1);ctx.fill();
  ctx.fillStyle='#fff6df';ctx.beginPath();ctx.ellipse(x+21,y+12,11,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#17202a';ctx.fillRect(x+15,y+7,3,3);ctx.fillRect(x+25,y+7,3,3);ctx.beginPath();ctx.arc(x+22,y+13,2.8,0,Math.PI*2);ctx.fill();
  if(foxHas('bandana')){ctx.fillStyle='#ef476f';ctx.beginPath();ctx.moveTo(x+10,y+18);ctx.lineTo(x+31,y+18);ctx.lineTo(x+22,y+26);ctx.fill();}
  if(foxHas('backpack')){ctx.fillStyle='#7b4f2a';round(x+4,y+17,11,14,3);ctx.fill();ctx.strokeStyle='#f7c948';ctx.lineWidth=1.5;ctx.stroke();}
  if(foxHas('lantern')){ctx.save();ctx.globalAlpha=.45+.2*Math.sin(Date.now()/220);ctx.fillStyle='#fff6bf';ctx.beginPath();ctx.arc(x+35,y+28,24,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#f7c948';round(x+31,y+20,8,11,3);ctx.fill();ctx.strokeStyle='#17202a';ctx.stroke();}
  if(foxHas('radar')){ctx.save();ctx.globalAlpha=.28+.15*Math.sin(Date.now()/180);ctx.strokeStyle='#06d6a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+20,y+8,22+Math.sin(Date.now()/180)*4,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(foxHas('golden')){ctx.save();ctx.globalAlpha=.9;drawStarShape(x+38,y-6,5,'#fff6bf','#f7c948');drawStarShape(x+2,y-4,4,'#fff6bf','#f7c948');ctx.restore();}
  drawStarShape(x+20,y+28,5,'#f7c948','#17202a');
  if(fox.bubbleTimer>0){
    const bx=Math.min(Math.max(x-24,110),760), by=Math.max(42,y-58);
    ctx.globalAlpha=Math.min(1,fox.bubbleTimer/25);
    ctx.fillStyle='rgba(255,255,255,.96)';round(bx,by,190,42,12);ctx.fill();
    ctx.strokeStyle='rgba(23,32,42,.35)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#17202a';ctx.font='900 11px system-ui';ctx.textAlign='left';wrapText(fox.tip,bx+10,by+16,170,13);
  }
  ctx.restore();
}
function wrapText(text,x,y,maxWidth,lineHeight){
  const words=text.split(' ');let line='';
  for(let n=0;n<words.length;n++){
    const test=line+words[n]+' ';
    if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line,x,y);line=words[n]+' ';y+=lineHeight;}
    else line=test;
  }
  ctx.fillText(line,x,y);
}
function updateFox(){
  if(!state.started) return;
  const targetX=player.x-44+(player.dir==='left'?70:0);
  const foxBounce=(player.moving?Math.sin(player.walkFrame*.35)*3:0) - player.z*.18;
  const targetY=player.y+12+foxBounce;
  fox.x+=(targetX-fox.x)*0.08;fox.y+=(targetY-fox.y)*0.08;
  if(fox.bubbleTimer>0) fox.bubbleTimer--;
}
function foxSpeak(kind='idle',dialogue=false){
  const list=foxTips[kind]||foxTips.idle;
  fox.tip=list[Math.floor(Math.random()*list.length)];
  fox.bubbleTimer=260;
  spawnParticles(fox.x+18,fox.y+8,'sparkle',10);
  if(dialogue) showMessage('Fidget Fox', fox.tip);
}
function askFox(){
  AudioGame.unlock();AudioGame.sfx('click');
  if(!state.started) return;
  if(state.message){hideMessage();return}
  const kind=state.energy<=2?'lowEnergy':state.ready?'gate':!state.met?'start':!state.challenge?'npc':!state.chest?'challenge':'idle';
  foxSpeak(kind,true);
}
function foxSay(text,dialogue=false){
  fox.tip=text;
  fox.bubbleTimer=260;
  spawnParticles(fox.x+18,fox.y+8,'sparkle',8);
  if(dialogue) showMessage('Fidget Fox', text);
}
function drawPlayerFallback(){
  let x=player.x,y=player.y-player.z;
  const bob=player.moving&&!player.jumping?Math.sin(player.walkFrame*.42)*2.2:0;
  const step=player.moving?Math.sin(player.walkFrame*.42):0;
  const squash=player.landingSquash>0?player.landingSquash/10:0;
  const bodyW=32+Math.min(4,squash*3), bodyH=28-Math.min(4,squash*3);
  ctx.fillStyle='rgba(0,0,0,.25)';
  ctx.beginPath();ctx.ellipse(player.x+17,player.y+38,Math.max(9,18-player.z*.16+Math.abs(step)),Math.max(3,7-player.z*.06),0,0,Math.PI*2);ctx.fill();
  if(player.jumping){
    ctx.strokeStyle='rgba(255,246,191,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+17,y+26,25+Math.sin(Date.now()/90)*3,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(x+17,y+42,4+Math.sin(Date.now()/70)*2,0,Math.PI*2);ctx.fill();
  }
  // legs behind the body
  ctx.strokeStyle='#173b82';ctx.lineWidth=5;ctx.lineCap='round';
  const legSwing=step*5;
  ctx.beginPath();ctx.moveTo(x+11,y+35+bob);ctx.lineTo(x+9-legSwing*.35,y+45+bob+Math.abs(step)*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+24,y+35+bob);ctx.lineTo(x+26+legSwing*.35,y+45+bob+Math.abs(step)*2);ctx.stroke();
  // body
  ctx.fillStyle=player.color;round(x+1-squash*1.5,y+13+bob+squash,bodyW,bodyH,9);ctx.fill();
  // arms swing subtly while walking
  ctx.strokeStyle='#ffd8a8';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(x+4,y+24+bob);ctx.lineTo(x+1-legSwing*.35,y+31+bob);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+30,y+24+bob);ctx.lineTo(x+34+legSwing*.35,y+31+bob);ctx.stroke();
  // head direction offset
  let hx=x+17, hy=y+12+bob;
  if(player.dir==='left') hx-=2; if(player.dir==='right') hx+=2; if(player.dir==='up') hy-=1; if(player.dir==='down') hy+=1;
  ctx.fillStyle='#ffd8a8';ctx.beginPath();ctx.arc(hx,hy,12,0,Math.PI*2);ctx.fill();
  // Direction-specific face/hair rendering. When facing up, hide the eyes and show a clean hair cap
  // so the north-walk frame does not leave a black mark on the top of the head.
  ctx.fillStyle='#5b371d';
  if(player.dir==='up'){
    ctx.beginPath();
    ctx.arc(hx,hy-5,10.5,Math.PI,Math.PI*2);
    ctx.fill();
    ctx.fillRect(hx-8,hy-7,16,5);
    ctx.fillStyle='rgba(255,216,168,.35)';
    ctx.beginPath();ctx.arc(hx,hy+2,7,0,Math.PI*2);ctx.fill();
  } else {
    // small hair cap for the visible front/side frames
    ctx.beginPath();ctx.arc(hx,hy-8,8.5,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#17202a';
    const eyeY=hy-1;
    if(player.dir==='left'){
      ctx.fillRect(hx-6,eyeY,4,4);ctx.fillRect(hx+2,eyeY,4,4);
    } else if(player.dir==='right'){
      ctx.fillRect(hx-3,eyeY,4,4);ctx.fillRect(hx+5,eyeY,4,4);
    } else {
      ctx.fillRect(hx-7,eyeY,4,4);ctx.fillRect(hx+3,eyeY,4,4);
    }
  }
  // gold smile/focus ring
  ctx.strokeStyle='#f7c948';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+17,y+27+bob,19,Math.PI*.15,Math.PI*.85);ctx.stroke();
  if(player.moving&&!player.jumping&&Math.abs(step)>.92){
    ctx.fillStyle='rgba(255,246,191,.35)';ctx.beginPath();ctx.arc(x+(step>0?9:25),y+43,3,0,Math.PI*2);ctx.fill();
  }
}
function spawnParticles(x,y,type='sparkle',count=18){const colors=type==='star'?['#fff6bf','#f7c948','#ffea00','#ffffff']:type==='jump'?['#d9b46f','#fff6bf','#ffffff']:type==='water'?['#bdefff','#67d5ff','#ffffff','#3fa9f5']:['#06d6a0','#7b61ff','#f7c948','#ffffff'];for(let i=0;i<count;i++){particles.push({x,y,vx:(Math.random()-.5)*(type==='star'?6:4),vy:(Math.random()-.75)*(type==='star'?7:4),life:55+Math.random()*25,size:type==='star'?8+Math.random()*8:3+Math.random()*5,color:colors[i%colors.length],type})}}
function getHudStarTarget(){
  // The HUD is a DOM overlay, but the star flies inside the canvas.
  // These coordinates aim at the compact left-side Stars pill on desktop and mobile.
  const isMobile=window.matchMedia('(max-width:930px)').matches;
  return {x:isMobile?43:52,y:isMobile?76:86};
}
function triggerHudStarPop(){
  E.stars.classList.remove('star-pop');
  void E.stars.offsetWidth;
  E.stars.classList.add('star-pop');
  setTimeout(()=>E.stars.classList.remove('star-pop'),650);
}
function spawnFlyingStar(x,y,label='Focus Star'){
  const target=getHudStarTarget();
  flyingStars.push({x,y,sx:x,sy:y,tx:target.x,ty:target.y,life:0,duration:66,label,size:15,spin:0});
  spawnParticles(x,y,'star',22);
  floatText(x,y-22,`⭐ ${label}`);
  AudioGame.sfx('star');
}
function spawnStarReward(label='Focus Star'){
  spawnFlyingStar(player.x+17-camera.x,player.y-8-camera.y,label);
}
function drawFlyingStars(){
  for(let i=flyingStars.length-1;i>=0;i--){
    const f=flyingStars[i];
    f.life++;
    const t=Math.min(1,f.life/f.duration);
    const ease=1-Math.pow(1-t,3);
    const arc=-92*Math.sin(Math.PI*t);
    f.x=f.sx+(f.tx-f.sx)*ease;
    f.y=f.sy+(f.ty-f.sy)*ease+arc;
    f.spin+=0.22;
    ctx.save();
    ctx.translate(f.x,f.y);
    ctx.rotate(f.spin);
    ctx.globalAlpha=1-t*.12;
    drawStarShape(0,0,f.size*(1+.25*Math.sin(t*Math.PI)),'#fff6bf','#f7c948');
    ctx.restore();
    if(f.life%5===0) spawnParticles(f.x,f.y,'sparkle',2);
    if(t>=1){
      spawnParticles(f.tx,f.ty,'star',18);
      triggerHudStarPop();
      flyingStars.splice(i,1);
    }
  }
}
function floatText(x,y,text){particles.push({x,y,vx:0,vy:-.8,life:70,size:18,color:'#fff6bf',type:'text',text})}
function drawParticles(){for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=p.type==='text'?0:.10;p.life--;ctx.save();ctx.globalAlpha=Math.max(0,p.life/70);if(p.type==='star'){drawStarShape(p.x,p.y,p.size*.55,p.color,'rgba(23,32,42,.35)')}else if(p.type==='text'){ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(23,32,42,.75)';ctx.strokeText(p.text,p.x,p.y);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y)}else{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.restore();if(p.life<=0)particles.splice(i,1)}}
function drawVignette(){const g=ctx.createRadialGradient(480,300,150,480,300,520);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.22)');ctx.fillStyle=g;ctx.fillRect(0,0,960,600)}
function drawStarShape(cx,cy,r,fill='#f7c948',stroke='#17202a'){ctx.save();ctx.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5;let rr=i%2===0?r:r*.45;ctx.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();ctx.restore()}
function round(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function update(){
  updateFox();
  if(player.jumpCooldown>0) player.jumpCooldown--;
  if(player.landingSquash>0) player.landingSquash--;
  if(player.jumping){
    player.z+=player.vz;
    player.vz-=.82; // smoother arc than the earlier snap-hop
    if(player.z<=0){
      const landedOnWater=onWater();
      player.z=0;player.vz=0;player.jumping=false;player.landingSquash=10;
      spawnParticles(player.x+17,player.y+38,landedOnWater?'water':'jump',landedOnWater?18:12);
      if(landedOnWater) AudioGame.sfx('splash');
    }
  }
  if(!state.started||state.message){player.moving=false;return}
  let dx=0,dy=0;
  if(state.keys.ArrowUp||state.keys.w)dy-=1;
  if(state.keys.ArrowDown||state.keys.s)dy+=1;
  if(state.keys.ArrowLeft||state.keys.a)dx-=1;
  if(state.keys.ArrowRight||state.keys.d)dx+=1;
  player.moving=!!(dx||dy);
  if(dx||dy){
    if(Math.abs(dx)>Math.abs(dy)) player.dir=dx<0?'left':'right'; else player.dir=dy<0?'up':'down';
    let len=Math.hypot(dx,dy);
    const beforeX=player.x,beforeY=player.y;
    const mobileBoost = state.mobileMoving ? 1.12 : 1;
    move(dx/len*player.spd*mobileBoost,dy/len*player.spd*mobileBoost);
    if(beforeX!==player.x||beforeY!==player.y){
      player.walkFrame+=onWater()?0.16:0.28;
      player.walkDust++;
      if(!player.jumping&&player.walkDust%18===0){
        spawnParticles(player.x+17,player.y+40,onWater()?'water':'jump',onWater()?3:2);
      }
    }
  }
  checkFocusForestDiscovery();
}
function jump(){
  AudioGame.unlock();
  if(!state.started||state.message||player.jumping||player.jumpCooldown>0)return;
  const wasWater=onWater();
  player.jumping=true;
  player.jumpCooldown=20;
  player.vz=wasWater?15.8:14.2;
  player.landingSquash=0;
  spawnParticles(player.x+17,player.y+38,wasWater?'water':'jump',wasWater?24:16);
  AudioGame.sfx('jump');
  if(wasWater)foxSay('Water slows you down, but a jump can help you hop out!');
  else if(Math.random()<.45)foxSpeak('jump');
}
function tileAtPixel(px,py){
  const gx=Math.floor(px/TILE), gy=Math.floor(py/TILE);
  return lvl().map[gy]?.[gx] || 'T';
}
function playerTiles(x=player.x,y=player.y){
  return [[x+4,y+8],[x+player.w-4,y+8],[x+4,y+player.h-2],[x+player.w-4,y+player.h-2]].map(([px,py])=>tileAtPixel(px,py));
}
function onWater(x=player.x,y=player.y){
  return playerTiles(x,y).some(t=>t==='W');
}
function move(dx,dy){
  // Water is now wadeable instead of a hard blocker. It slows movement,
  // and jumping gives a brief full-speed escape so players never get trapped.
  const wading = onWater();
  const waterSlow = player.jumping ? 1 : (wading ? .42 : 1);
  dx *= waterSlow; dy *= waterSlow;
  let nx=player.x+dx, ny=player.y+dy;
  if(!blocked(nx,player.y)) player.x=nx;
  if(!blocked(player.x,ny)) player.y=ny;
  if(wading && Math.random()<.09) spawnParticles(player.x+17,player.y+36,'water',3);
}
function blocked(x,y){
  const tiles = playerTiles(x,y);
  // T = trees/borders, M = mountains/rocks. W = water, but it is walkable now.
  return tiles.some(t=>['T','M'].includes(t));
}
function findSafeStart(sx,sy){
  const L=lvl();
  for(let r=0;r<6;r++){
    for(let yy=sy-r;yy<=sy+r;yy++){
      for(let xx=sx-r;xx<=sx+r;xx++){
        const t=L.map[yy]?.[xx];
        if(t && !['T','M'].includes(t)) return [xx,yy];
      }
    }
  }
  return [sx,sy];
}
function near(x,y,dist=72){return Math.hypot(player.x+17-(x*TILE+24),player.y+22-(y*TILE+24))<dist}
function showDiscovery(icon,title,text,foxLine){
  AudioGame.sfx('success');
  E.discoveryIcon.textContent=icon;
  E.discoveryTitle.textContent=title;
  E.discoveryText.textContent=text;
  E.discoveryFox.textContent='🦊 '+foxLine;
  E.discovery.style.display='grid';
  state.message=true;
  spawnParticles(player.x+17,player.y+24,'star',36);
  ui();
}
function closeDiscovery(){
  E.discovery.style.display='none';
  state.message=false;
  ui();
}

function checkFocusForestDiscovery(){
  if(state.level!==0||state.message) return;
  const tx=Math.floor((player.x+17)/TILE), ty=Math.floor((player.y+22)/TILE);
  if(!state.forestSecrets.path && tx<=6 && ty>=5 && ty<=8){
    state.forestSecrets.path=true;
    foxSay('This path was hiding in plain sight. Nice exploring!');
    showDiscovery('🌿','Hidden Path Found!','You discovered a quiet path away from the main trail. Exploration is part of the adventure.','This path was hiding in plain sight. Nice exploring!');
  }
  if(!state.forestSecrets.grove && tx>=2 && tx<=6 && ty>=1 && ty<=4){
    state.forestSecrets.grove=true;
    foxSay('Secret Grove found! Exploration is a focus skill too.');
    showDiscovery('🌲','Secret Grove Found!','You discovered a hidden place in Focus Forest. Secret areas may hold wisdom, rewards, and future treasures.','Wow! You found something special. Let’s look around.');
  }
  if(!state.forestSecrets.crystal && tx>=6 && tx<=8 && ty>=1 && ty<=3){
    state.forestSecrets.crystal=true;
    foxSay('Crystal Clearing discovered. This will be a perfect hidden treasure spot soon!');
    showDiscovery('✨','Crystal Clearing Discovered!','You found a glowing clearing deep in the forest. This is a perfect place for hidden treasure in the next build.','I smell something shiny nearby!');
  }
}
function interact(){AudioGame.unlock();AudioGame.sfx('click');if(E.discovery && E.discovery.style.display==='grid'){closeDiscovery();return}if(state.message){hideMessage();return}if(near(15,5))talkNpc();else if(near(4,4))challenge();else if(near(16,8))chest();else if(near(16,10))gate();else showMessage('Inner Coach','Move closer to a helper, practice board, chest, or gate.')}
function talkNpc(){state.met=true;addTool(lvl().tool);state.step=Math.max(state.step,1);foxSpeak('npc');showMessage(lvl().npc,dialogueFor(lvl())+`<br><br><strong>New tool:</strong> ${lvl().tool}`);checkReady()}
function dialogueFor(L){return `This is ${L.title}. Today we learn: <strong>${L.teach}</strong> The challenge gets harder as the tiers rise.`}
function challenge(){const c=lvl().challenge;const choices={breath:['Take 3 slow breaths','Run in circles and yell'],tiny:['Pick one 2-minute step','Demand perfect focus all day'],return:['I noticed. I return.','I got distracted, so I quit.'],plan:['First, next, finish','Start with no plan'],timer:['10 minute sprint + break','Work forever without stopping'],body:['Stretch, walk, reset','Ignore body signals'],kind:['This is hard, and I can try','I am terrible at everything'],env:['Silence alerts and clear desk','Keep every distraction open'],priority:['Choose one main quest','Do all quests at once'],restart:['Begin again with one step','The day is ruined']};let [good,bad]=choices[c]||choices.breath;E.dialogueText.innerHTML=`<strong>Practice Board:</strong><br>${hardText()} Choose the ADHD-friendly response.`;E.dialogueActions.innerHTML=`<button class="good" onclick="answerChallenge(true)">${good}</button><button class="warn" onclick="answerChallenge(false)">${bad}</button>`;E.dialogue.style.display='block';state.message=true}
function hardText(){return state.hardMode?`Hard Mode ${state.hardMode}: less energy, harder choices, same wisdom.`:'Practice Round:'}
function answerChallenge(good){if(good){AudioGame.sfx('success');state.challenge=true;state.step=Math.max(state.step,2);const reward=earnStar('Focus Star');foxSpeak('challenge');showMessage('Practice Board','Great choice. You practiced the skill instead of just hearing about it.'+foxRewardMessage(reward))}else{AudioGame.sfx('error');state.energy=Math.max(1,state.energy-1);foxSpeak('miss');showMessage('Practice Board','Try again with kindness. The ADHD-friendly answer usually lowers pressure, adds structure, or helps you return.')}checkReady()}
function chest(){if(state.chest){showMessage('Treasure Chest','Already opened. The reward is still yours.');return}AudioGame.sfx('chest');state.chest=true;const reward=earnStar('Treasure Star');foxSpeak('chest');state.step=Math.max(state.step,3);showMessage('Treasure Chest',`You found a Focus Star and strengthened your ${lvl().tool}.`+foxRewardMessage(reward));checkReady()}
function gate(){if(!state.ready){foxSpeak('idle');showMessage('Level Gate','The gate needs three things: meet the helper, complete the practice board, and open the chest.');return}completeLevel()}
function checkReady(){if(state.met&&state.challenge&&state.chest){state.ready=true;state.step=4}ui()}
function addTool(t){if(!state.tools.includes(t))state.tools.push(t)}
function openBreathing(){if(!state.started)return;by('breathing').style.display='grid';state.message=true;state.energy=Math.min(6,state.energy+1);addTool('Pause Power');ui()}
function closeBreathing(){by('breathing').style.display='none';state.message=false;ui()}
function showMessage(s,h){E.dialogueText.innerHTML=`<strong>${s}:</strong><br>${h}`;E.dialogueActions.innerHTML='<button onclick="hideMessage()">Continue</button>';E.dialogue.style.display='block';state.message=true;ui()}
function hideMessage(){E.dialogue.style.display='none';state.message=false;ui()}
function completeLevel(){AudioGame.sfx('fanfare');foxSpeak('gate');spawnParticles(player.x+17,player.y+15,'star',40);celebrate(`Level Complete!`,`${lvl().tier}: ${lvl().title} cleared.`,[lvl().badge,`⭐ Stars: ${state.stars}`,`🧠 ${lvl().tool}`])}
function celebrate(title,text,badges){E.celebrateTitle.textContent=title;E.celebrateText.textContent=text;E.badgeRow.innerHTML=badges.map(b=>`<div class="badge">${b}</div>`).join('');E.confetti.innerHTML='';for(let i=0;i<80;i++){let c=document.createElement('div');c.className='confetti';c.style.left=Math.random()*100+'%';c.style.background=['#f7c948','#06d6a0','#ef476f','#7b61ff','#118ab2'][i%5];c.style.animationDelay=Math.random()*2+'s';E.confetti.appendChild(c)}for(let i=0;i<16;i++){let s=document.createElement('div');s.className='sparkle';s.style.left=6+Math.random()*88+'%';s.style.top=8+Math.random()*84+'%';s.style.animationDelay=Math.random()+'s';E.confetti.appendChild(s)}E.celebrate.style.display='grid';state.message=true}
function showLesson(){E.celebrate.style.display='none';E.lessonTitle.textContent=`Stopping Point: ${lvl().title}`;E.lessonIntro.textContent='Pause and review before moving on:';E.lessonList.innerHTML=lvl().lesson.map(x=>`<li>${x}</li>`).join('');E.lesson.style.display='grid'}
function continueFromLesson(){E.lesson.style.display='none';state.message=false;if(state.level<levels.length-1){state.level++;resetLevel();showMessage('New Tier Path',`Welcome to ${lvl().tier} — ${lvl().title}.`)}else{finishRun()}ui()}
function finishRun(){state.hardMode++;state.level=0;resetLevel();celebrate('Advanced Complete!','You finished the full adventure. Start over on a more advanced setting and replay the same concepts with harder challenges.',[`Hard Mode ${state.hardMode} Unlocked`,'🔁 Start Over','🏆 ADHD Toolkit Complete']);E.badgeRow.innerHTML+=`<button class="good" onclick="restartHard()">Start Over: Hard Mode ${state.hardMode}</button>`}
function restartHard(){E.celebrate.style.display='none';state.message=false;showMessage('Hard Mode','Same ADHD skills. Less starting energy. More practice. Let’s begin again.')}
function ui(){const L=lvl();E.tier.textContent=L.tier+(state.hardMode?` · Hard ${state.hardMode}`:'');E.level.textContent=`Level ${state.level+1}: ${L.title}`;E.energy.textContent=`Energy ${state.energy}`;E.stars.textContent=`Stars ${state.stars}`;E.tool.textContent=`Tool: ${state.tools.at(-1)||'none'}`;E.sideTitle.textContent=`${L.tier} Level ${state.level%3+1}: ${L.title}`;E.sideGoal.textContent=L.goal;E.progress.style.width=(state.ready?100:state.step*25)+'%';const quests=['Meet the helper','Complete the practice board','Open the chest','Reach the gate','Gate is ready'];E.questTitle.textContent=state.ready?'Quest: Reach the Gate':`Quest: ${quests[state.step]||quests[0]}`;E.questText.textContent=state.ready?'Walk to the glowing gate and press Space/E.':`${L.goal} Current objective: ${quests[state.step]||quests[0]}.`;E.teachBox.textContent=L.teach;E.tierGrid.innerHTML=tiers.map((t,i)=>`<div class="tier-chip ${i===L.tierIndex?'active':''}">${i+1}. ${t}</div>`).join('');E.tools.innerHTML=state.tools.length?'':'<div class="small">No tools yet. Talk to the first helper.</div>';state.tools.forEach(t=>{let [ic,ttl,desc]=toolInfo[t];E.tools.innerHTML+=`<div class="tool-card"><div class="tool-icon">${ic}</div><div><strong>${ttl}</strong><div class="small">${desc}</div></div></div>`});
const next=nextFoxReward();
E.foxRewards.innerHTML=`<div><strong>🦊 Fox Friendship:</strong> ${state.stars} Stars</div><div class="small">${next?`Next: ${next.icon} ${next.name} at ${next.stars} stars (${Math.max(0,next.stars-state.stars)} to go).`:'All fox upgrades unlocked!'}</div><div class="fox-reward-list">`+foxRewardMilestones.map(r=>`<div class="fox-reward-row ${state.stars>=r.stars?'unlocked':''}"><div class="fox-reward-icon">${state.stars>=r.stars?r.icon:'🔒'}</div><div><strong>${r.stars}⭐ ${r.name}</strong><span>${state.stars>=r.stars?'Unlocked':r.desc}</span></div></div>`).join('')+`</div>`;
}
function loop(){update();draw();ui();requestAnimationFrame(loop)}
window.addEventListener('keydown',e=>{state.keys[e.key]=true;state.keys[e.key.toLowerCase()]=true;if([' ','e','E'].includes(e.key)){e.preventDefault();interact()}if(['j','J','Shift'].includes(e.key)){e.preventDefault();jump()}if(['f','F'].includes(e.key)){e.preventDefault();askFox()}if(['b','B'].includes(e.key))openBreathing()});window.addEventListener('keyup',e=>{state.keys[e.key]=false;state.keys[e.key.toLowerCase()]=false});const mobileDirs={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};let activeMobileKeys=new Set();function setMobileKey(k,on,btn){state.mobileMoving=on||activeMobileKeys.size>0;if(on){activeMobileKeys.add(k);state.keys[k]=true;btn&&btn.classList.add('active')}else{activeMobileKeys.delete(k);state.keys[k]=false;btn&&btn.classList.remove('active')}state.mobileMoving=activeMobileKeys.size>0}function clearMobileKeys(){document.querySelectorAll('[data-dir]').forEach(btn=>btn.classList.remove('active'));activeMobileKeys.forEach(k=>state.keys[k]=false);activeMobileKeys.clear();state.mobileMoving=false}document.querySelectorAll('[data-dir]').forEach(b=>{const k=mobileDirs[b.dataset.dir];b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);setMobileKey(k,true,b)});b.addEventListener('pointerup',e=>{e.preventDefault();setMobileKey(k,false,b)});b.addEventListener('pointercancel',e=>{e.preventDefault();setMobileKey(k,false,b)});});window.addEventListener('pointerup',e=>{if(!e.target.closest('.mobile-pad')) clearMobileKeys()});window.addEventListener('blur',clearMobileKeys);document.querySelector('[data-action="interact"]').addEventListener('click',interact);const jumpBtn=document.querySelector('[data-action="jump"]');jumpBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();jump()});jumpBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});document.querySelector('[data-action="fox"]').addEventListener('click',askFox);document.querySelector('[data-action="breathe"]').addEventListener('click',openBreathing);const audioBar=document.getElementById('audioBar'),audioToggle=document.getElementById('audioToggle');let audioCollapseTimer=null;function openAudioPanel(){audioBar.classList.remove('collapsed');audioToggle.textContent='✕';clearTimeout(audioCollapseTimer);audioCollapseTimer=setTimeout(()=>{audioBar.classList.add('collapsed');audioToggle.textContent='🎵'},4500)}function closeAudioPanel(){audioBar.classList.add('collapsed');audioToggle.textContent='🎵';clearTimeout(audioCollapseTimer)}audioToggle.addEventListener('click',()=>audioBar.classList.contains('collapsed')?openAudioPanel():closeAudioPanel());document.getElementById('musicBtn').addEventListener('click',()=>{openAudioPanel();AudioGame.toggle()});document.getElementById('sfxBtn').addEventListener('click',()=>{openAudioPanel();AudioGame.test()});

// --- Sprite Sheet Integration v1 ---
// Uses a cleaned transparent atlas generated from the concept sheet. If the image is not ready,
// the original canvas-drawn characters remain as a fallback.
const originalDrawPlayer = drawPlayerFallback;
const originalDrawFidgetFox = drawFidgetFoxFallback;
const SpriteAtlas = {
  img: new Image(),
  ready: false,
  frames: {
    // PLAYER ROW 0
    player_down_idle: { x: 0, y: 0, w: 96, h: 96 },
    player_down1: { x: 96, y: 0, w: 96, h: 96 },
    player_down2: { x: 192, y: 0, w: 96, h: 96 },
    player_up1: { x: 288, y: 0, w: 96, h: 96 },
    player_up2: { x: 384, y: 0, w: 96, h: 96 },
    player_left1: { x: 480, y: 0, w: 96, h: 96 },
    player_left2: { x: 576, y: 0, w: 96, h: 96 },
    player_right1: { x: 672, y: 0, w: 96, h: 96 },
  
    // PLAYER ROW 1
    player_right2: { x: 0, y: 96, w: 96, h: 96 },
    player_jump: { x: 96, y: 96, w: 96, h: 96 },
    player_land: { x: 192, y: 96, w: 96, h: 96 },
    player_celebrate: { x: 288, y: 96, w: 96, h: 96 },
    player_think: { x: 384, y: 96, w: 96, h: 96 },
    player_sit: { x: 480, y: 96, w: 96, h: 96 },
  
    // FOX ROW 2
    fox_idle1: { x: 0, y: 192, w: 96, h: 96 },
    fox_idle2: { x: 96, y: 192, w: 96, h: 96 },
    fox_walk1: { x: 192, y: 192, w: 96, h: 96 },
    fox_walk2: { x: 288, y: 192, w: 96, h: 96 },
    fox_happy: { x: 384, y: 192, w: 96, h: 96 },
    fox_thinking: { x: 480, y: 192, w: 96, h: 96 },
    fox_celebrate: { x: 576, y: 192, w: 96, h: 96 },
    fox_talk: { x: 672, y: 192, w: 96, h: 96 },
  
    // FOX ROW 3
    fox_sit1: { x: 0, y: 288, w: 96, h: 96 },
    fox_sit2: { x: 96, y: 288, w: 96, h: 96 },
    fox_sleep1: { x: 192, y: 288, w: 96, h: 96 },
    fox_sleep2: { x: 288, y: 288, w: 96, h: 96 },
    fox_sleep3: { x: 384, y: 288, w: 96, h: 96 },
    fox_idea: { x: 480, y: 288, w: 96, h: 96 },
    fox_nap: { x: 576, y: 288, w: 96, h: 96 },
    fox_excited: { x: 672, y: 288, w: 96, h: 96 }
  }
};
SpriteAtlas.img.onload = () => { SpriteAtlas.ready = true; console.log('Focus Quest sprite atlas loaded:', SpriteAtlas.img.naturalWidth + 'x' + SpriteAtlas.img.naturalHeight); };
SpriteAtlas.img.onerror = () => { console.error('Focus Quest sprite atlas failed to load. Check assets/sprites/focus_quest_sprite_atlas_v1.png'); };
SpriteAtlas.img.src = './assets/sprites/focus_quest_production_sprite_atlas_v6_clean_aligned.png';

function drawAtlasFrame(name, dx, dy, dw, dh, flip=false){
  const f = SpriteAtlas.frames[name];
  if(!SpriteAtlas.ready || !f) return false;
  ctx.save();
  if(flip){
    ctx.translate(dx+dw, dy);
    ctx.scale(-1,1);
    ctx.drawImage(SpriteAtlas.img, f.x, f.y, f.w, f.h, 0, 0, dw, dh);
  } else {
    ctx.drawImage(SpriteAtlas.img, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
  }
  ctx.restore();
  return true;
}

function currentPlayerSpriteFrame(){
  if(player.jumping) return 'player_jump';
  const alt = Math.floor(player.walkFrame/10)%2===0;
  if(player.moving){
    if(player.dir==='up') return alt?'player_up1':'player_up2';
    if(player.dir==='left') return alt?'player_left1':'player_left2';
    if(player.dir==='right') return alt?'player_right1':'player_right2';
    return alt?'player_down1':'player_down2';
  }
  if(player.dir==='up') return 'player_up1';
  if(player.dir==='left') return 'player_left1';
  if(player.dir==='right') return 'player_right1';
  return 'player_down_idle';
}

function drawPlayer(){
  if(!SpriteAtlas.ready) return originalDrawPlayer();
  const x = player.x;
  const y = player.y - player.z;
  const squash = player.landingSquash>0 ? player.landingSquash/10 : 0;
  const sw = 48 + squash*3;
  const sh = 58 - squash*2;
  const bob = player.moving && !player.jumping ? Math.sin(player.walkFrame*.42)*1.5 : 0;
  ctx.fillStyle='rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(player.x+17, player.y+39, Math.max(10,18-player.z*.15), Math.max(3,7-player.z*.06), 0, 0, Math.PI*2);
  ctx.fill();
  if(player.jumping){
    ctx.strokeStyle='rgba(255,246,191,.65)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(x+17,y+26,25+Math.sin(Date.now()/90)*3,0,Math.PI*2);
    ctx.stroke();
  }
  drawAtlasFrame(currentPlayerSpriteFrame(), x-7-(sw-48)/2, y-12+bob+squash, sw, sh);
}

function currentFoxSpriteFrame(){
  if(fox.bubbleTimer>0) return Math.floor(Date.now()/300)%2===0?'fox_talk':'fox_idle1';
  if(player.moving) return Math.floor(Date.now()/180)%2===0?'fox_walk1':'fox_walk2';
  return Math.floor(Date.now()/650)%2===0?'fox_idle1':'fox_idle2';
}

function drawFidgetFox(){
  if(!state.started) return;
  if(!SpriteAtlas.ready) return originalDrawFidgetFox();
  const bob=Math.sin(Date.now()/260)*2;
  const x=fox.x, y=fox.y+bob;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath();ctx.ellipse(x+18,y+31,18,6,0,0,Math.PI*2);ctx.fill();
  drawAtlasFrame(currentFoxSpriteFrame(), x-15, y-18, 64, 56);
  // Keep reward accessories as overlay layers so the star reward system still matters.
  if(foxHas('bandana')){ctx.fillStyle='#ef476f';ctx.beginPath();ctx.moveTo(x+10,y+17);ctx.lineTo(x+32,y+17);ctx.lineTo(x+22,y+25);ctx.fill();}
  if(foxHas('backpack')){ctx.fillStyle='#7b4f2a';round(x+2,y+16,12,14,3);ctx.fill();ctx.strokeStyle='#f7c948';ctx.lineWidth=1.5;ctx.stroke();}
  if(foxHas('lantern')){ctx.save();ctx.globalAlpha=.45+.2*Math.sin(Date.now()/220);ctx.fillStyle='#fff6bf';ctx.beginPath();ctx.arc(x+38,y+28,25,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#f7c948';round(x+34,y+19,8,12,3);ctx.fill();ctx.strokeStyle='#17202a';ctx.stroke();}
  if(foxHas('radar')){ctx.save();ctx.globalAlpha=.28+.15*Math.sin(Date.now()/180);ctx.strokeStyle='#06d6a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+20,y+8,24+Math.sin(Date.now()/180)*4,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(foxHas('golden')){ctx.save();ctx.globalAlpha=.95;ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(247,201,72,.18)';ctx.beginPath();ctx.arc(x+20,y+8,38,0,Math.PI*2);ctx.fill();ctx.restore();drawStarShape(x+40,y-7,5,'#fff6bf','#f7c948');drawStarShape(x+1,y-4,4,'#fff6bf','#f7c948');}
  if(fox.bubbleTimer>0){
    const bx=Math.min(Math.max(x-24,110),760), by=Math.max(42,y-58);
    ctx.globalAlpha=Math.min(1,fox.bubbleTimer/25);
    ctx.fillStyle='rgba(255,255,255,.96)';round(bx,by,190,42,12);ctx.fill();
    ctx.strokeStyle='rgba(23,32,42,.3)';ctx.stroke();
    ctx.fillStyle='#17202a';ctx.font='900 11px system-ui';ctx.textAlign='left';wrapText(fox.tip,bx+10,by+16,170,13);
  }
  ctx.restore();
}

ui();loop();
