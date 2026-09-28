(() => {
  'use strict';
  const surface = document.querySelector('.futures');
  if (!surface) return;
  const stage = surface.querySelector('.futures-stage');
  const canvas = surface.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const fruits = [...surface.querySelectorAll('.research-fruit')];
  const pause = surface.querySelector('.futures-pause');
  const tooltip = surface.querySelector('.fruit-tooltip');
  const panel = surface.querySelector('.fruit-detail');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const papers = [
    { selector: '.paper-dewo', point: {x:99,y:112} },
    { selector: '.paper-rot', point: {x:-115,y:142} },
    { selector: '.earlier-paper', point: {x:55,y:207} }
  ].map(item => ({...item, article: document.querySelector(item.selector)}));
  const pointer = {active:false,x:0};
  const clamp = (value,lo=0,hi=1) => Math.max(lo,Math.min(hi,value));
  const mix = (a,b,t) => a+(b-a)*t;
  let width=0,height=0,scale=1,time=0,intro=0,last=0,frame=0;
  let visible=false,paused=false,selected=-1,hovered=-1,deflection=0,tipIndex=-1;
  const moving = () => ctx && visible && !document.hidden && !paused && !reduced.matches;

  function curve(a,b,c,d) {
    return Array.from({length:33},(_,i)=>{
      const t=i/32,u=1-t;
      return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,
        y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
    });
  }
  const trunk=curve({x:0,y:289},{x:-12,y:249},{x:12,y:194},{x:0,y:150});
  const limbs=[], leaves=[];
  const tips=[{x:-143,y:151},{x:-93,y:97},{x:-20,y:67},{x:72,y:81},{x:142,y:138}];
  const greens=['#73896a','#8c9e7c','#b4bea0','#647d65','#a0b08e'];
  function addLeaf(point,angle,length,index) {
    // Keep the fruit and its label clear of foliage.
    if(papers.some(p=>Math.hypot(point.x-p.point.x,(point.y-p.point.y-8)*.85)<27))return;
    leaves.push({point,angle,length,color:greens[index%greens.length],phase:index*.81});
  }
  function sprout(start,angle,length,depth,seed,group) {
    for(const side of [-1,1]) {
      const turn=mix(angle+side*(.43+Math.sin(seed)*.07),-Math.PI/2,.09);
      const reach=length*(1+Math.sin(seed+side)*.1);
      const end={x:start.x+Math.cos(turn)*reach,y:start.y+Math.sin(turn)*reach};
      const path=curve(start,{x:start.x+Math.cos(angle)*reach*.34,y:start.y+Math.sin(angle)*reach*.34},
        {x:end.x-Math.cos(turn)*reach*.3,y:end.y-Math.sin(turn)*reach*.3},end);
      limbs.push({path,depth,group});
      const id=leaves.length+group*7;
      for(const [sample,direction] of [[12,-1],[21,1],[30,-1]]) {
        addLeaf(path[sample],turn+direction*.66,12+Math.sin(id+sample)*3,id+sample);
      }
      addLeaf(end,turn,16+Math.sin(seed)*3,id+9);
      if(depth<2)sprout(end,turn,length*.67,depth+1,seed*1.31+side+2,group);
    }
  }
  tips.forEach((end,index)=>{
    const from=trunk[[12,21,30,24,15][index]];
    const path=curve(from,{x:from.x+(end.x-from.x)*.2,y:from.y-32},
      {x:end.x-(end.x-from.x)*.22,y:end.y+13},end);
    limbs.push({path,depth:0,group:index});
    const angle=Math.atan2(end.y-from.y,end.x-from.x);
    sprout(end,angle,32,1,index+1.7,index);
    for(const sample of [19,25,31])addLeaf(path[sample],angle+(sample%2?-.85:.85),17,index*12+sample);
  });
  const fruitStems=papers.map((paper,index)=>{
    const p=paper.point;
    const start=index===2?{x:24,y:190}:tips[index===0?3:1];
    return curve(start,{x:mix(start.x,p.x,.5),y:start.y+9},{x:p.x,y:p.y-18},{x:p.x,y:p.y-8});
  });
  // Connect the lower fruit back to the trunk.
  limbs.push({path:curve(trunk[19],{x:21,y:192},{x:26,y:189},{x:24,y:190}),depth:1,group:3});

  function project(point) {
    const reach=clamp((289-point.y)/240);
    const sway=reduced.matches?0:Math.sin(time*.55+point.y*.011)*1.3*reach;
    return {x:width/2+(point.x+sway+deflection*5*reach*reach)*scale,y:(height-325*scale)/2+point.y*scale};
  }
  function stroke(path,color,thickness,progress=1) {
    if(progress<=0)return;
    const lastPoint=clamp(progress)*32;
    ctx.beginPath();
    for(let i=0;i<=Math.floor(lastPoint);i++){
      const p=project(path[i]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    if(lastPoint<32){const i=Math.floor(lastPoint),t=lastPoint-i;const p=project({x:mix(path[i].x,path[i+1].x,t),y:mix(path[i].y,path[i+1].y,t)});ctx.lineTo(p.x,p.y);}
    ctx.lineWidth=thickness;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  function leaf(item,growth) {
    const amount=clamp(growth-item.phase%1*.1);
    if(amount<=0)return;
    const p=project(item.point);
    const angle=item.angle+(reduced.matches?0:Math.sin(time*.8+item.phase)*.022);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.scale(scale*amount,scale*amount);
    const len=item.length,w=len*.38;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(len*.22,-w,len*.75,-w*.75,len,0);
    ctx.bezierCurveTo(len*.72,w*.7,len*.22,w*.9,0,0);
    ctx.fillStyle=item.color;ctx.globalAlpha=.83;ctx.fill();
    ctx.beginPath();ctx.moveTo(1,0);ctx.quadraticCurveTo(len*.5,-.6,len*.88,0);
    ctx.strokeStyle='rgba(255,255,240,.36)';ctx.lineWidth=.45;ctx.stroke();ctx.restore();
  }
  function draw() {
    if(!width||!height)return;
    const grown=reduced.matches?1:clamp(intro/1.6);
    if(ctx){
      ctx.clearRect(0,0,width,height);
      const ground=project({x:0,y:293});
      ctx.beginPath();ctx.ellipse(ground.x,ground.y,58*scale,3.5*scale,0,0,Math.PI*2);ctx.fillStyle='rgba(97,108,80,.055)';ctx.fill();
      for(const side of [-1,0,1])stroke(curve({x:0,y:288},{x:side*8,y:296},{x:side*37,y:295},{x:side*58,y:299}),'rgba(100,94,74,.22)',.7,clamp(grown*3));
      stroke(trunk,'#837a63',3*scale,clamp(grown*2));
      limbs.forEach(limb=>stroke(limb.path,limb.depth?'rgba(113,119,89,.55)':'#81836b',Math.max(.55,(1.55-limb.depth*.38)*scale),clamp(grown*3-.45-limb.depth*.48)));
      leaves.forEach(item=>leaf(item,clamp(grown*2.1-1.1)));
      fruitStems.forEach(path=>stroke(path,'#6d8060',1*scale,clamp(grown*2.3-1.3)));
    }
    fruits.forEach((fruit,index)=>{
      const p=project(papers[index].point);
      fruit.style.left=`${p.x}px`;fruit.style.top=`${p.y}px`;
      // Paper buttons stay usable throughout the introductory drawing.
      fruit.style.setProperty('--fruit-emerge',String(reduced.matches?1:Math.max(.72,clamp(grown*2.5-1.5))));
    });
    if(tipIndex>=0)placeTooltip(tipIndex);
  }
  function placeTooltip(index) {
    const p=project(papers[index].point);
    const tw=tooltip.offsetWidth,th=tooltip.offsetHeight;
    tooltip.style.left=`${clamp(p.x-tw/2,8,Math.max(8,width-tw-8))}px`;
    tooltip.style.top=`${Math.max(4,p.y-th-30)}px`;
  }
  function showTooltip(index) {
    if(selected===index)return;
    tipIndex=index;tooltip.textContent=papers[index].article.querySelector('h3').textContent;
    tooltip.hidden=false;fruits[index].setAttribute('aria-describedby','fruit-tooltip');placeTooltip(index);
  }
  function hideTooltip(){tipIndex=-1;tooltip.hidden=true;fruits.forEach(fruit=>fruit.removeAttribute('aria-describedby'));}
  function closePanel(restoreFocus=false) {
    const old=selected;selected=-1;panel.hidden=true;fruits.forEach(fruit=>fruit.setAttribute('aria-expanded','false'));
    hideTooltip();if(restoreFocus&&old>=0){fruits[old].focus();hideTooltip();}
  }
  function choose(index) {
    if(selected===index){closePanel();return;}
    selected=index;hideTooltip();
    const article=papers[index].article;
    panel.querySelector('h3').textContent=article.querySelector('h3').textContent;
    panel.querySelector('.fruit-detail-venue').textContent=article.querySelector('.paper-venue').textContent.replace(/\s+/g,' ').trim();
    const authors=panel.querySelector('.fruit-detail-authors');
    authors.replaceChildren(...[...article.querySelector('.authors').childNodes].map(node=>node.cloneNode(true)));
    panel.querySelector('.fruit-detail-summary').textContent=article.querySelector('.paper-summary')?.textContent||'Automated visualization and measurement of dental plaque from 3D intraoral scans.';
    panel.querySelector('.fruit-detail-link').href='#'+article.querySelector('h3').id;
    panel.hidden=false;fruits.forEach((fruit,i)=>fruit.setAttribute('aria-expanded',String(i===index)));
  }
  function animate(timestamp) {
    frame=0;if(!moving())return;
    const dt=last?Math.min((timestamp-last)/1000,.05):1/60;last=timestamp;time+=dt;intro+=dt;
    deflection+=((pointer.active?(pointer.x/width-.5)*2:0)-deflection)*(1-Math.exp(-dt*3));
    draw();frame=requestAnimationFrame(animate);
  }
  function activity() {
    pause.hidden=!ctx||reduced.matches;
    pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Resume animation':'Pause animation');
    pause.querySelector('.pause-label').textContent=paused?'Play':'Pause';surface.classList.toggle('is-paused',paused);
    if(moving()){if(!frame){last=0;frame=requestAnimationFrame(animate);}}
    else{cancelAnimationFrame(frame);frame=0;pointer.active=false;}
  }
  function resize() {
    width=stage.clientWidth;height=stage.clientHeight;scale=Math.min((width-12)/470,(height-8)/325);
    if(ctx){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
    draw();activity();
  }
  stage.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const rect=stage.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.active=true;},{passive:true});
  stage.addEventListener('pointerleave',()=>{pointer.active=false;hovered=-1;hideTooltip();});
  fruits.forEach((fruit,index)=>{
    fruit.addEventListener('click',()=>choose(index));
    fruit.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=index;showTooltip(index);}});
    fruit.addEventListener('pointerleave',()=>{hovered=-1;hideTooltip();});
    fruit.addEventListener('focus',()=>{if(matchMedia('(pointer:fine)').matches)showTooltip(index);});
    fruit.addEventListener('blur',()=>{if(hovered!==index)hideTooltip();});
    fruit.addEventListener('keydown',event=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
        event.preventDefault();fruits[(index+(['ArrowLeft','ArrowUp'].includes(event.key)?2:1))%3].focus();
      }
    });
  });
  panel.querySelector('.fruit-detail-close').addEventListener('click',()=>closePanel(true));
  surface.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closePanel(true);hideTooltip();}});
  document.addEventListener('pointerdown',event=>{if(!stage.contains(event.target))hideTooltip();},{passive:true});
  pause.addEventListener('click',()=>{paused=!paused;activity();});
  document.addEventListener('visibilitychange',()=>{hideTooltip();activity();});
  reduced.addEventListener('change',()=>{if(reduced.matches){paused=false;intro=1.6;}deflection=0;draw();activity();});
  window.addEventListener('blur',()=>{pointer.active=false;hideTooltip();});
  surface.classList.add('is-ready');surface.querySelector('.research-fruits').hidden=false;surface.querySelector('.futures-hint').hidden=false;
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;activity();}).observe(surface);else visible=true;
  resize();if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
})();
