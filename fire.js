// A flowing noise field gives the fire a continuous, irregular silhouette.
function createLogoFire(canvas, options={}) {
  const gl = canvas.getContext('webgl', {alpha:true, antialias:false, premultipliedAlpha:false, powerPreference:'low-power'});
  // Half precision erases the noise fractions and underflows small spark distances.
  const precision = gl?.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!gl || !precision || precision.precision < 16) return createSoftLogoFire(canvas, options);
  canvas.width = canvas.height = options.size || (innerWidth < 760 ? 480 : 640);
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform float time; uniform float ignition;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return v;}
    void main(){
      vec2 p=uv-.5;float r=length(p);float radius=.222;
      // Upward flow is shared by the ring, flame tongues and smoke.
      vec2 flow=p*vec2(24.,13.)-vec2(time*.12,time*1.15);
      float turbulence=fbm(flow+vec2(fbm(flow*.6+time*.12)*2.,0.));
      float detail=fbm(p*34.-vec2(time*.16,time*1.7));
      float top=.5+.5*p.y/max(r,.001);
      float edge=.014+(.034+.15*top)*pow(turbulence,1.8);
      float d=r-radius;
      float outer=1.-smoothstep(edge*.25,edge+detail*.012,d);
      float inner=smoothstep(-.007,.003,d);
      float body=outer*inner*(.65+.35*detail);
      float heat=clamp((1.-max(d,0.)/max(edge,.001))*.8+detail*.28,0.,1.);
      vec3 color=mix(vec3(.7,.075,.008),vec3(1.,.42,.025),smoothstep(.15,.65,heat));
      color=mix(color,vec3(1.,.83,.32),smoothstep(.72,1.,heat));
      float glow=exp(-abs(d)*52.)*.12;
      float alpha=body*(.45+detail*.5)+glow;
      color+=vec3(.65,.18,.015)*glow;
      // Sparse embers drift upward with their own lifetimes.
      for(int i=0;i<12;i++){
        float seed=float(i);float life=fract(time*.14+seed*.0833);
        float angle=seed*2.399;
        vec2 spark=vec2(cos(angle),sin(angle))*radius;
        spark+=vec2(sin(seed+life*5.)*.016,life*.13);
        float light=(1.-smoothstep(.06,.28,length((p-spark)*100.)))*(1.-life);
        color+=vec3(1.,.55,.08)*light;alpha+=light;
      }
      // Separate tapered plumes rise and curl; there is no circular core fill.
      vec2 q=p/radius;
      float striations=fbm(vec2(q.x*19.+turbulence,q.y*4.-time*6.));
      float density=0.,coreHeat=0.;
      for(int j=0;j<7;j++){
        float seed=float(j),baseX=(seed-3.)*.27+.05*sin(seed*4.7);
        float height=1.45+.5*sin(time*4.7+seed*2.37)+.2*sin(time*6.+seed*4.)+.4*exp(-baseX*baseX*4.);
        float along=max(0.,(q.y+.85)/height);
        float sway=.16*sin(along*6.-time*5.+seed*2.)*along+.05*sin(along*15.-time*9.+seed)*along*along;
        float width=.42*pow(max(1.-along,0.),.9)+.018;
        float edgeX=abs(q.x-baseX-sway+(striations-.5)*.06)/width;
        float tongue=(1.-smoothstep(.3,1.1,edgeX))*(1.-smoothstep(.86,1.04,along))*smoothstep(-1.+.1*sin(seed*3.1),-.66+.1*sin(seed*3.1),q.y);
        float thermal=clamp(.95-.5*edgeX-.35*along+(striations-.5)*.45,0.,1.);
        density=max(density,tongue);
        coreHeat=max(coreHeat,tongue*thermal);
      }
      vec3 coreColor=mix(vec3(.65,.018,.001),vec3(1.,.24,.005),smoothstep(0.,.35,coreHeat));
      coreColor=mix(coreColor,vec3(1.,.82,.13),smoothstep(.35,.72,coreHeat));
      coreColor=mix(coreColor,vec3(1.,.97,.75),smoothstep(.76,.98,coreHeat));
      float coreAlpha=ignition*density*(.7+.3*coreHeat);
      alpha*=1.-ignition;
      float combined=alpha*(1.-coreAlpha)+coreAlpha;
      color=(color*alpha*(1.-coreAlpha)+coreColor*coreAlpha)/max(combined,.001);
      gl_FragColor=vec4(color,clamp(combined,0.,1.));
    }`;
  function compile(type, source) {
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;
  }
  const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
  if(!vs || !fs) return createSoftLogoFire(canvas, options);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return createSoftLogoFire(canvas, options);
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const time=gl.getUniformLocation(program,'time'), ignition=gl.getUniformLocation(program,'ignition');gl.viewport(0,0,canvas.width,canvas.height);
  canvas.classList.add('fire-ready');
  canvas.parentElement.classList.add('live-fire');
  canvas.dataset.renderer = 'webgl-highp';canvas.dataset.running='true';
  let frame, last=0, stopped=false, frames=0;
  const started=performance.now();
  function draw(now){
    if(stopped)return;
    if(!document.hidden && now-last>(options.fps?1000/options.fps:32)){last=now;const elapsed=(now-started)/1000;gl.uniform1f(time,elapsed);gl.uniform1f(ignition,fireIgnition(elapsed,options.ignite));gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.frames=String(++frames);}
    frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  let fallbackStop = () => {};
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    if(stopped)return;
    stopped=true;cancelAnimationFrame(frame);fallbackStop=createSoftLogoFire(canvas, options);
  },{once:true});
  return ()=>{stopped=true;canvas.dataset.running='false';cancelAnimationFrame(frame);fallbackStop();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
}

// The central flame holds briefly, then uncovers the seal without extending entry.
function fireIgnition(seconds, enabled) {
  if (!enabled) return 0;
  const fade=Math.max(0,Math.min(1,(seconds-.55)/.8));
  return 1-fade*fade*(3-2*fade);
}

// A CPU renderer keeps the effect animated when a phone cannot provide highp.
function createSoftLogoFire(original, options={}) {
  // Replacing a WebGL canvas must not restart its CSS scene at frame zero.
  const scene=(original.getAnimations?.()||[]).map(a=>({name:a.animationName,time:a.currentTime}));
  const canvas = original.cloneNode(false);
  original.replaceWith(canvas);
  for(const animation of canvas.getAnimations?.()||[]){
    const previous=scene.find(a=>a.name===animation.animationName);
    if(previous && previous.time!==null)animation.currentTime=previous.time;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const size = options.size||480, count=options.particles||96, unit=size/480, center = size/2, radius = size*.222;
  canvas.width=canvas.height=size;
  canvas.classList.add('fire-ready');canvas.dataset.renderer='canvas-2d';
  canvas.parentElement.classList.add('live-fire');
  const sprite=document.createElement('canvas');sprite.width=sprite.height=64;
  const brush=sprite.getContext('2d');
  const glow=brush.createRadialGradient(32,32,0,32,32,32);
  glow.addColorStop(0,'rgba(255,221,115,.9)');glow.addColorStop(.22,'rgba(255,135,25,.65)');
  glow.addColorStop(.55,'rgba(220,45,3,.3)');glow.addColorStop(1,'rgba(120,14,0,0)');
  brush.fillStyle=glow;brush.fillRect(0,0,64,64);
  const flame=options.ignite?ctx.createLinearGradient(0,center+radius,0,center-radius*1.4):null;
  const hot=options.ignite?ctx.createLinearGradient(0,center+radius,0,center-radius):null;
  if(flame){
    flame.addColorStop(0,'rgba(255,218,94,.95)');flame.addColorStop(.35,'rgba(255,180,22,.95)');
    flame.addColorStop(.65,'rgba(255,81,5,.85)');flame.addColorStop(1,'rgba(155,19,0,0)');
    hot.addColorStop(0,'rgba(255,255,216,.95)');hot.addColorStop(.45,'rgba(255,232,104,.9)');hot.addColorStop(1,'rgba(255,122,8,0)');
  }
  function tongue(x,y,width,height,sway){
    ctx.beginPath();ctx.moveTo(x-width,y);
    ctx.bezierCurveTo(x-width*1.1,y-height*.28,x+sway-width*.35,y-height*.72,x+sway,y-height);
    ctx.bezierCurveTo(x+sway-width*.45,y-height*.75,x+width*1.2,y-height*.3,x+width,y);
    ctx.quadraticCurveTo(x,y+height*.15,x-width,y);ctx.closePath();ctx.fill();
  }
  const particles=Array.from({length:count},(_,i)=>({angle:i/count*Math.PI*2,phase:Math.random(),speed:.55+Math.random()*.5}));
  let frame, stopped=false, last=0, frames=0;
  canvas.dataset.running='true';
  const start=performance.now();
  function draw(now) {
    if(stopped)return;
    if(!document.hidden && now-last>(options.fps?1000/options.fps:32)){
      last=now;const time=(now-start)/1000;
      ctx.clearRect(0,0,size,size);ctx.globalCompositeOperation='lighter';
      const ignition=fireIgnition(time,options.ignite);
      if(ignition>0){
        ctx.filter=`blur(${1.8*unit}px)`;ctx.globalCompositeOperation='screen';
        for(let i=0;i<7;i++){
          const baseX=(i-3)*.27+.05*Math.sin(i*4.7);
          const x=center+baseX*radius,y=center+radius*(.85+.08*Math.sin(i*3.1));
          let height=radius*(1.45+.5*Math.sin(time*4.7+i*2.37)+.2*Math.sin(time*6+i*4)+.4*Math.exp(-baseX*baseX*4));
          let sway=radius*.2*Math.sin(time*5+i*2);
          if(i===3){height=Math.max(height,radius*1.65);sway*=.35;}
          ctx.globalAlpha=ignition*.75;ctx.fillStyle=flame;
          tongue(x,y,radius*.42,height,sway);
          ctx.globalAlpha=ignition*.5;ctx.fillStyle=hot;
          tongue(x,y,radius*.1,height*.65,sway*.6);
        }
      }
      ctx.filter='none';ctx.globalCompositeOperation='lighter';
      for(const particle of particles){
        const life=(time*particle.speed+particle.phase)%1, angle=particle.angle;
        const rise=life*(18+18*(.5+.5*Math.sin(angle)))*unit;
        const x=center+Math.cos(angle)*(radius+life*7*unit)+Math.sin(time*2+angle*5)*life*5*unit;
        const y=center+Math.sin(angle)*radius-rise;
        const width=(11+life*13)*unit, height=width*(1+life*.7);
        ctx.globalAlpha=Math.sin(life*Math.PI)*.6*(1-ignition);
        ctx.drawImage(sprite,x-width/2,y-height/2,width,height);
      }
      ctx.globalAlpha=1;
      canvas.dataset.frames=String(++frames);
    }
    frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  return ()=>{stopped=true;cancelAnimationFrame(frame);canvas.dataset.running='false';};
}
