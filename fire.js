// A flowing noise field gives the fire a continuous, irregular silhouette.
function createLogoFire(canvas) {
  const gl = canvas.getContext('webgl', {alpha:true, antialias:false, premultipliedAlpha:false, powerPreference:'low-power'});
  if (!gl) return () => {};
  canvas.width = canvas.height = innerWidth < 760 ? 480 : 640;
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision mediump float;
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
        float light=(1.-smoothstep(.0006,.0028,length(p-spark)))*(1.-life);
        color+=vec3(1.,.55,.08)*light;alpha+=light;
      }
      gl_FragColor=vec4(color,clamp(alpha,0.,1.));
    }`;
  function compile(type, source) {
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;
  }
  const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
  if(!vs || !fs) return () => {};
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return () => {};
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const time=gl.getUniformLocation(program,'time');gl.viewport(0,0,canvas.width,canvas.height);
  canvas.classList.add('fire-ready');
  canvas.parentElement.classList.add('live-fire');
  let frame, last=0, stopped=false;
  const started=performance.now();
  function draw(now){
    if(stopped)return;
    if(!document.hidden && now-last>32){last=now;gl.uniform1f(time,(now-started)/1000);gl.drawArrays(gl.TRIANGLES,0,6);}
    frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  canvas.addEventListener('webglcontextlost',()=>{stopped=true;cancelAnimationFrame(frame);},{once:true});
  return ()=>{stopped=true;cancelAnimationFrame(frame);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
}
