// A flowing noise field gives the fire a continuous, irregular silhouette.
function createLogoFire(canvas) {
  const gl = canvas.getContext('webgl', {alpha:true, antialias:false, premultipliedAlpha:false, powerPreference:'low-power'});
  // Half precision erases the noise fractions and underflows small spark distances.
  const precision = gl?.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!gl || !precision || precision.precision < 16) return createSoftLogoFire(canvas);
  canvas.width = canvas.height = innerWidth < 760 ? 480 : 640;
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform float time;
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
      gl_FragColor=vec4(color,clamp(alpha,0.,1.));
    }`;
  function compile(type, source) {
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;
  }
  const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
  if(!vs || !fs) return createSoftLogoFire(canvas);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return createSoftLogoFire(canvas);
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const time=gl.getUniformLocation(program,'time');gl.viewport(0,0,canvas.width,canvas.height);
  canvas.classList.add('fire-ready');
  canvas.parentElement.classList.add('live-fire');
  canvas.dataset.renderer = 'webgl-highp';
  let frame, last=0, stopped=false;
  const started=performance.now();
  function draw(now){
    if(stopped)return;
    if(!document.hidden && now-last>32){last=now;gl.uniform1f(time,(now-started)/1000);gl.drawArrays(gl.TRIANGLES,0,6);}
    frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  let fallbackStop = () => {};
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    if(stopped)return;
    stopped=true;cancelAnimationFrame(frame);fallbackStop=createSoftLogoFire(canvas);
  },{once:true});
  return ()=>{stopped=true;cancelAnimationFrame(frame);fallbackStop();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
}

// A CPU renderer keeps the effect animated when a phone cannot provide highp.
function createSoftLogoFire(original) {
  const canvas = original.cloneNode(false);
  original.replaceWith(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const size = 480, center = size/2, radius = size*.222;
  canvas.width=canvas.height=size;
  canvas.classList.add('fire-ready');canvas.dataset.renderer='canvas-2d';
  canvas.parentElement.classList.add('live-fire');
  const sprite=document.createElement('canvas');sprite.width=sprite.height=64;
  const brush=sprite.getContext('2d');
  const glow=brush.createRadialGradient(32,32,0,32,32,32);
  glow.addColorStop(0,'rgba(255,221,115,.9)');glow.addColorStop(.22,'rgba(255,135,25,.65)');
  glow.addColorStop(.55,'rgba(220,45,3,.3)');glow.addColorStop(1,'rgba(120,14,0,0)');
  brush.fillStyle=glow;brush.fillRect(0,0,64,64);
  const particles=Array.from({length:96},(_,i)=>({angle:i/96*Math.PI*2,phase:Math.random(),speed:.55+Math.random()*.5}));
  let frame, stopped=false, last=0;
  const start=performance.now();
  function draw(now) {
    if(stopped)return;
    if(!document.hidden && now-last>32){
      last=now;const time=(now-start)/1000;
      ctx.clearRect(0,0,size,size);ctx.globalCompositeOperation='lighter';
      for(const particle of particles){
        const life=(time*particle.speed+particle.phase)%1, angle=particle.angle;
        const rise=life*(18+18*(.5+.5*Math.sin(angle)));
        const x=center+Math.cos(angle)*(radius+life*7)+Math.sin(time*2+angle*5)*life*5;
        const y=center+Math.sin(angle)*radius-rise;
        const width=11+life*13, height=width*(1+life*.7);
        ctx.globalAlpha=Math.sin(life*Math.PI)*.6;
        ctx.drawImage(sprite,x-width/2,y-height/2,width,height);
      }
      ctx.globalAlpha=1;
    }
    frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  return ()=>{stopped=true;cancelAnimationFrame(frame);};
}
