/* Browser-only diagnostic. This file is not loaded by the public gallery.
   The CI build injects it into a temporary copy of index.html. */
(() => {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const c=document.getElementById('seasonCanvas');
      const stage=document.getElementById('momentStage');
      const button=document.getElementById('momentReplay');
      const style=c?getComputedStyle(c):null;
      const visible=!!(c&&style&&style.display!=='none'&&style.visibility!=='hidden'
        &&Number(style.opacity)>.05&&c.width>0&&c.height>0);
      let pixels=0;
      if(c)try{
        const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        for(let i=3;i<d.length;i+=128){if(d[i])pixels++;}
      }catch(error){pixels=-1;}
      const cards=document.querySelectorAll('#photoWall .photo-card').length;
      const momentReady=stage?.dataset.animationReady==='true';
      let played=false;
      if(momentReady && button && !button.disabled){
        button.click();
        played=stage.classList.contains('is-playing');
      }
      const result=document.createElement('output');
      result.id='gallery-visual-probe';
      result.textContent='gallery-probe:visible='+visible+
        ';pixels='+pixels+';cards='+cards+';moment='+momentReady+';played='+played;
      document.body.appendChild(result);
    },1000);
  },{once:true});
})();
