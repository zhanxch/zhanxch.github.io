(() => {
  'use strict';
  const surface = document.querySelector('.futures');
  if (!surface) return;
  const stage = surface.querySelector('.futures-stage');
  const canvas = surface.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const buttons = [...surface.querySelectorAll('.future-choice')];
  const pause = surface.querySelector('.futures-pause');
  const status = surface.querySelector('.futures-status');
  const hint = surface.querySelector('.futures-hint');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const pointer = { active: false, x: 0, y: 0 };
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const ease = t => t * t * (3 - 2 * t);
  let width = 0, height = 0, scale = 1, time = 0, intro = 0, last = 0, frame = 0;
  let visible = false, paused = false, active = -1, focus = -1, generation = 0;
  let canopy = [], memories = [], transition = null, deflection = 0;
  let hitPaths = [];
  const moving = () => visible && !document.hidden && !paused && !reduced.matches;

  function curve(a, b, c, d) {
    return Array.from({ length: 33 }, (_, i) => {
      const t = i / 32, u = 1 - t;
      return { x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x,
        y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y };
    });
  }
  const trunk = curve({x:0,y:278},{x:-11,y:244},{x:13,y:206},{x:1,y:161});
  const roots = [];
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 38, y = 311 + Math.cos(i * 1.2) * 12;
    const main = curve({x:0,y:278},{x:x*.2,y:289},{x:x*.65,y:y-10},{x,y});
    roots.push({points:main,depth:0});
    const from = main[20];
    roots.push({points:curve(from,{x:from.x+Math.sign(x)*12,y:from.y+8},
      {x:x*.83+13,y:y+9},{x:x*.9+19,y:y+16}),depth:1});
  }
  const twigTips = [{x:-119,y:139},{x:-68,y:98},{x:5,y:75},{x:73,y:102},{x:126,y:146}];
  const origins = [13,22,32,24,15];

  function createCanopy(seed) {
    return twigTips.map((tip, group) => {
      const from = trunk[origins[group]];
      const end = {x:tip.x + Math.sin(seed * .7 + group) * 5, y:tip.y + Math.sin(seed + group) * 4};
      const limb = curve(from, {x:from.x + (end.x-from.x)*.18,y:from.y-30},
        {x:end.x-(end.x-from.x)*.27,y:end.y+13}, end);
      const segments = [{points:limb,depth:0}];
      const angle = Math.atan2(end.y-from.y,end.x-from.x);
      function fork(start, direction, length, depth, phase) {
        if (depth > 3) return;
        for (const side of [-1, 1]) {
          let turn = direction + side * (.38 + Math.sin(phase + seed*.8)*.08);
          // Fine tips gradually turn toward the light, making a crown rather than a fan.
          turn = mix(turn, -Math.PI/2, depth*.035);
          const reach = length * (1 + Math.sin(phase*1.7+side+seed*.4)*.12);
          const finish = {x:start.x+Math.cos(turn)*reach,y:start.y+Math.sin(turn)*reach};
          const bend = side * 3;
          const points = curve(start,
            {x:start.x+Math.cos(direction)*reach*.38,y:start.y+Math.sin(direction)*reach*.38},
            {x:finish.x-Math.cos(turn)*reach*.25+bend,y:finish.y-Math.sin(turn)*reach*.25},finish);
          segments.push({points,depth});
          fork(finish,turn,length*.64,depth+1,phase*1.31+side+2);
        }
      }
      fork(end,angle,group===2?30:35,1,group+1.7);
      // A side shoot partway along each older limb breaks strict binary symmetry.
      const side = group < 2 ? -1 : 1;
      const start = limb[19];
      const sideTip = {x:start.x+side*28,y:start.y-27};
      segments.push({points:curve(start,{x:start.x+side*9,y:start.y-4},
        {x:sideTip.x-side*8,y:sideTip.y+4},sideTip),depth:2});
      return {segments,anchor:end};
    });
  }
  canopy = createCanopy(0);

  function project(point) {
    const heightFactor = clamp((278-point.y)/240);
    const wind = reduced.matches ? 0 : Math.sin(time*.4+point.y*.014)*1.7*heightFactor;
    return {x:width/2+(point.x+wind+deflection*8*heightFactor*heightFactor)*scale,
      y:(height-340*scale)/2+point.y*scale};
  }
  function line(points, color, thickness, progress = 1) {
    const count = clamp(progress)*(points.length-1);
    if (count <= 0) return;
    ctx.beginPath();
    points.forEach((point,i) => {
      if (i > Math.floor(count)) return;
      const p = project(point);
      if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    if (count < points.length-1) {
      const i = Math.floor(count), fraction = count-i;
      const p = project({x:mix(points[i].x,points[i+1].x,fraction),y:mix(points[i].y,points[i+1].y,fraction)});
      ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  function dot(point,radius,color) {
    const p=project(point);ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  }
  function groupDrawing(group,index,opacity,growth,selected=false) {
    group.segments.forEach(segment => {
      const progress=clamp(growth*4-segment.depth);
      const alpha=opacity*(segment.depth===0?.73:segment.depth===1?.59:segment.depth===2?.43:.3);
      line(segment.points,selected?`rgba(142,52,64,${alpha})`:`rgba(84,75,65,${alpha})`,
        (selected?1.16:1)-segment.depth*.17,progress);
      if (segment.depth===3 && progress===1) dot(segment.points[32],.7,`rgba(142,52,64,${opacity*.23})`);
    });
  }
  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0,0,width,height);
    const growth=reduced.matches?1:ease(clamp(intro/2.5));
    roots.forEach(root => line(root.points,root.depth?'rgba(105,91,77,.23)':'rgba(88,76,64,.41)',root.depth?.58:.8,clamp(growth*3)));
    line(trunk,'rgba(52,46,41,.78)',1.5,clamp(growth*2.7-.12));
    for (const memory of memories) {
      memory.forEach((segment,index)=>line(segment.points,index?'rgba(71,57,48,.42)':'rgba(58,49,42,.57)',index?.65:.94,1));
    }
    if (transition) {
      const fade=1-ease(clamp(transition.elapsed/1.25));
      transition.old.forEach((group,index)=> {
        if(index!==transition.choice)groupDrawing(group,index,fade*.65,1);
      });
      const chosen=transition.old[transition.choice];
      chosen.segments.filter(s=>s.depth<2).forEach(segment=>line(segment.points,
        `rgba(142,52,64,${.82*(1-clamp((transition.elapsed-1.1)/.8))})`,1.15-segment.depth*.25,
        clamp(transition.elapsed*2-segment.depth*.45)));
    }
    const nextGrowth=transition?clamp((transition.elapsed-.65)/1.6):clamp(growth*1.8-.8);
    hitPaths=[];
    canopy.forEach((group,index)=> {
      const selected=active===index;
      groupDrawing(group,index,selected?1:active<0?1:.58,nextGrowth,selected);
      hitPaths.push(group.segments.map(segment=>segment.points.map(project)));
      const point=project(group.anchor);
      buttons[index].style.left=`${point.x}px`;buttons[index].style.top=`${point.y}px`;
      if(nextGrowth>.95) {
        if(selected) {
          dot(group.anchor,6,'rgba(142,52,64,.07)');
          dot(group.anchor,2.1,'rgba(142,52,64,.85)');
        } else dot(group.anchor,1.1,'rgba(104,81,67,.38)');
      }
    });
    dot(trunk[18],2,'#8e3440');
  }
  function nearest(x,y) {
    let choice=-1,distance=Infinity;
    hitPaths.forEach((group,index)=>group.forEach(path=> {
      for(let i=9;i<path.length;i+=3) {
        const d=Math.hypot(path[i].x-x,path[i].y-y);
        if(d<distance){distance=d;choice=index;}
      }
    }));
    return distance<35?choice:-1;
  }
  function choose(choice) {
    if(choice<0||transition||paused)return;
    const old=canopy;
    memories.push(old[choice].segments.filter(s=>s.depth<2));
    if(memories.length>7)memories.shift();
    generation++;
    canopy=createCanopy(generation);
    transition=reduced.matches?null:{choice,elapsed:0,old};
    intro=2.5;active=-1;pointer.active=false;
    status.textContent=`Branch ${choice+1} has grown into the tree. New branches are ready. Growth ${generation}.`;
    surface.dataset.choices=String(generation);
    draw();
  }
  function animate(timestamp) {
    frame=0;if(!moving())return;
    const dt=last?Math.min((timestamp-last)/1000,.05):1/60;
    last=timestamp;time+=dt;intro+=dt;
    deflection+=((pointer.active?(pointer.x/width-.5)*2:0)-deflection)*(1-Math.exp(-dt*4));
    if(transition){transition.elapsed+=dt;if(transition.elapsed>=2.3)transition=null;}
    active=transition?-1:focus>=0?focus:pointer.active?nearest(pointer.x,pointer.y):-1;
    stage.classList.toggle('can-choose',active>=0&&!paused);
    draw();frame=requestAnimationFrame(animate);
  }
  function activity() {
    pause.hidden=reduced.matches;
    pause.setAttribute('aria-pressed',String(paused));
    pause.setAttribute('aria-label',paused?'Resume animation':'Pause animation');
    pause.querySelector('.pause-label').textContent=paused?'Play':'Pause';
    surface.classList.toggle('is-paused',paused);
    buttons.forEach(button=>button.disabled=paused);
    if(moving()){if(!frame){last=0;frame=requestAnimationFrame(animate);}}
    else{cancelAnimationFrame(frame);frame=0;pointer.active=false;}
  }
  function resize() {
    width=stage.clientWidth;height=stage.clientHeight;
    scale=Math.min((width-10)/460,(height-8)/340);
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw();activity();
  }
  function position(event){const box=stage.getBoundingClientRect();return{x:event.clientX-box.left,y:event.clientY-box.top};}
  stage.addEventListener('pointermove',event=>{
    if(paused||event.pointerType==='touch')return;
    Object.assign(pointer,position(event),{active:true});
    if(reduced.matches){active=nearest(pointer.x,pointer.y);draw();}
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{pointer.active=false;if(reduced.matches){active=focus;draw();}});
  stage.addEventListener('click',event=>{if(event.target.closest('button'))return;const p=position(event);choose(nearest(p.x,p.y));});
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>choose(index));
    button.addEventListener('focus',()=>{focus=active=index;if(!paused)draw();});
    button.addEventListener('blur',()=>{focus=-1;if(reduced.matches){active=-1;draw();}});
    button.addEventListener('keydown',event=>{
      if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){
        event.preventDefault();buttons[(index+(['ArrowDown','ArrowRight'].includes(event.key)?1:4))%5].focus();
      }
    });
  });
  pause.addEventListener('click',()=>{paused=!paused;activity();});
  document.addEventListener('visibilitychange',activity);
  window.addEventListener('blur',()=>{pointer.active=false;});
  reduced.addEventListener('change',()=>{
    if(reduced.matches){paused=false;intro=2.5;}
    transition=null;deflection=0;active=-1;draw();activity();
  });
  function updateHint(){hint.textContent=coarse.matches?'Touch a branch. Let it grow.':'Explore a branch. Click to grow.';}
  coarse.addEventListener('change',updateHint);updateHint();
  surface.classList.add('is-ready');surface.querySelector('.future-choices').hidden=hint.hidden=false;
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;activity();}).observe(surface);
  else visible=true;
  resize();
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
})();
