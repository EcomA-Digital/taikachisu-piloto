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
    vec4 flameSurface(float d,float top,float turbulence,float detail){
      float edge=.014+(.034+.15*top)*pow(turbulence,1.8);
      float outer=1.-smoothstep(edge*.25,edge+detail*.012,d);
      float inner=smoothstep(-.007,.003,d);
      float body=outer*inner*(.65+.35*detail);
      float heat=clamp((1.-max(d,0.)/max(edge,.001))*.8+detail*.28,0.,1.);
      vec3 color=mix(vec3(.7,.075,.008),vec3(1.,.42,.025),smoothstep(.15,.65,heat));
      color=mix(color,vec3(1.,.83,.32),smoothstep(.72,1.,heat));
      float glow=exp(-abs(d)*52.)*.12;
      color+=vec3(.65,.18,.015)*glow;
      return vec4(color,body*(.45+detail*.5)+glow);
    }
    void main(){
      vec2 p=uv-.5;float r=length(p);float radius=.222;
      vec2 flow=p*vec2(24.,13.)-vec2(time*.12,time*1.15);
      float turbulence=fbm(flow+vec2(fbm(flow*.6+time*.12)*2.,0.));
      float detail=fbm(p*34.-vec2(time*.16,time*1.7));
      vec4 rim=flameSurface(r-radius,.5+.5*p.y/max(r,.001),turbulence,detail);
      vec3 color=rim.rgb;float alpha=rim.a;
      // Sparse embers drift upward with their own lifetimes.
      for(int i=0;i<12;i++){
        float seed=float(i);float life=fract(time*.14+seed*.0833);
        float angle=seed*2.399;
        vec2 spark=vec2(cos(angle),sin(angle))*radius;
        spark+=vec2(sin(seed+life*5.)*.016,life*.13);
        float light=(1.-smoothstep(.06,.28,length((p-spark)*100.)))*(1.-life);
        color+=vec3(1.,.55,.08)*light;alpha+=light;
      }
      // Extend the exact rim material across the seal, without a new flame style.
      float veil=ignition*(1.-smoothstep(radius-.005,radius+.018,r));
      // Fold the same rising noise field into irregular internal flame edges.
      // No cones, geometric stripes, or independent central color palette.
      for(int j=0;j<2;j++){
        float field=j==0?1.-turbulence:turbulence;
        float internalEdge=abs(field-.58)*(j==0?.16:.22);
        vec4 layer=flameSurface(internalEdge,1.,field,detail);
        float layerAlpha=clamp(layer.a*veil*1.65,0.,1.);
        float combined=alpha*(1.-layerAlpha)+layerAlpha;
        color=(color*alpha*(1.-layerAlpha)+layer.rgb*layerAlpha)/max(combined,.001);
        alpha=combined;
      }
      gl_FragColor=vec4(color,clamp(alpha,0.,1.));
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
  const fade=Math.max(0,Math.min(1,(seconds-.75)/.8));
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
  const particles=Array.from({length:count},(_,i)=>({angle:i/count*Math.PI*2,phase:Math.random(),speed:.55+Math.random()*.5}));
  // Same brush, upward drift and lifetime as the rim, distributed over its disk.
  const veil=Array.from({length:options.ignite?240:0},(_,i)=>({
    angle:i*2.399963,spread:radius*Math.sqrt((i+.5)/240),phase:Math.random(),speed:.55+Math.random()*.5
  }));
  let frame, stopped=false, last=0, frames=0;
  canvas.dataset.running='true';
  const start=performance.now();
  function draw(now) {
    if(stopped)return;
    if(!document.hidden && now-last>(options.fps?1000/options.fps:32)){
      last=now;const time=(now-start)/1000;
      ctx.clearRect(0,0,size,size);ctx.globalCompositeOperation='lighter';
      const ignition=fireIgnition(time,options.ignite);
      for(const particle of veil){
        if(ignition<=0)break;
        const life=(time*particle.speed+particle.phase)%1,angle=particle.angle;
        const rise=life*(18+18*(.5+.5*Math.sin(angle)))*unit;
        const x=center+Math.cos(angle)*particle.spread+Math.sin(time*2+angle*5)*life*5*unit;
        const y=center+Math.sin(angle)*particle.spread-rise;
        const width=(26+life*22)*unit,height=width*(1+life*.7);
        ctx.globalAlpha=Math.sin(life*Math.PI)*.9*ignition;
        ctx.drawImage(sprite,x-width/2,y-height/2,width,height);
      }
      for(const particle of particles){
        const life=(time*particle.speed+particle.phase)%1, angle=particle.angle;
        const rise=life*(18+18*(.5+.5*Math.sin(angle)))*unit;
        const x=center+Math.cos(angle)*(radius+life*7*unit)+Math.sin(time*2+angle*5)*life*5*unit;
        const y=center+Math.sin(angle)*radius-rise;
        const width=(11+life*13)*unit, height=width*(1+life*.7);
        ctx.globalAlpha=Math.sin(life*Math.PI)*.6;
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
