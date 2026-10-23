/* Procedural vapor: no video, image sequence, shader download or animation library. */
window.SchoolSmoke = (() => {
  function texture(seed) {
    const size = 128, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const data = ctx.createImageData(size, size);
    const hash = (x,y) => {
      let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed,1442695041))|0;
      n=Math.imul(n^(n>>>13),1274126177);
      return ((n^(n>>>16))>>>0)/4294967295;
    };
    function noise(x,y) {
      const i=Math.floor(x), j=Math.floor(y), fx=x-i, fy=y-j;
      const u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
      return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)
        +(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
    }
    function cloud(x,y) {
      let value=0, amplitude=.55;
      for(let octave=0;octave<4;octave++) {
        value+=amplitude*noise(x,y);x=x*2.03+7.1;y=y*2.03+3.7;amplitude*=.5;
      }
      return value;
    }
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const nx=(x/size-.5)*2, ny=(y/size-.5)*2;
      const radius=Math.hypot(nx,ny);
      const warp=noise(nx*3+seed,ny*3)*1.6;
      const density=cloud(nx*4+warp,ny*5-warp);
      const edge=Math.max(0,1-radius);
      const alpha=Math.pow(Math.max(0,density-.23),1.45)*Math.pow(edge,.8)*210;
      const index=(y*size+x)*4;
      data.data[index]=174;data.data[index+1]=180;data.data[index+2]=183;
      data.data[index+3]=Math.min(155,alpha);
    }
    ctx.putImageData(data,0,0);
    return canvas;
  }
  function start(canvas,stage) {
    let ctx;
    try {ctx=canvas?.getContext('2d',{alpha:true});} catch {}
    if(!ctx) return {stop(){}};
    const sprites=[texture(2),texture(13),texture(29)].filter(Boolean);
    if(!sprites.length) return {stop(){}};
    let width,height,ratio,raf=0,stopped=false,last=0,frames=0;
    const compact=innerWidth<761, count=compact?20:28;
    function resize() {
      width=innerWidth;height=innerHeight;
      const limit=compact?720:960;
      ratio=Math.min(devicePixelRatio||1,1.25,limit/width,limit/height);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      ctx.setTransform(ratio,0,0,ratio,0,0);
    }
    resize();
    const start=performance.now();
    canvas.dataset.running='true';
    function draw(now) {
      if(stopped)return;
      raf=requestAnimationFrame(draw);
      if(now-last<40)return;
      last=now;
      const elapsed=(now-start)/1000, rect=stage.getBoundingClientRect();
      const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,unit=rect.width;
      ctx.clearRect(0,0,width,height);
      ctx.globalCompositeOperation='screen';
      for(let i=0;i<count;i++) {
        const side=i%2?1:-1, seed=i*2.39996;
        const progress=(i/count+elapsed*(.11+(i%4)*.009))%1;
        const wing=i%3===0;
        const spread=wing?Math.min(unit*.58,width*.41):unit*.30;
        const size=unit*(wing?.48+progress*.30:.35+progress*.36+(i%3)*.035);
        const x=cx+side*(spread+Math.sin(seed+progress*4.2)*unit*(wing?.13:.10))
          +Math.sin(elapsed*.55+seed)*unit*.055;
        const y=cy+unit*(wing?.50:.62)-progress*unit*(wing?1.1:1.28);
        const fade=Math.sin(progress*Math.PI);
        ctx.globalAlpha=fade*(wing?.65:(compact?.72:.70));
        ctx.save();ctx.translate(x,y);ctx.rotate(seed+progress*.65);
        ctx.drawImage(sprites[i%sprites.length],-size/2,-size/2,size,size);
        ctx.restore();
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      canvas.dataset.frames=String(++frames);
    }
    draw(start+34);
    addEventListener('resize',resize,{passive:true});
    return {stop(){
      stopped=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);
      ctx.clearRect(0,0,width,height);canvas.dataset.running='false';
    }};
  }
  return {start};
})();
