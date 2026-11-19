/** CPU-only YIN-style fundamental estimator for monophonic ukulele notes.
 * No microphone, network or browser APIs are used by this module.
 * Output is advisory: harmonics and noisy rooms still require instrument checks.
 */
export function estimateFundamental(samples,sampleRate,{minHz=70,maxHz=1100,threshold=0.15}={}){
 const n=samples?.length??0;
 if(n<1024||!Number.isFinite(sampleRate)||sampleRate<8000||minHz<=0||maxHz<=minHz) return null;
 let mean=0;for(let i=0;i<n;i++)mean+=samples[i];mean/=n;
 let energy=0;for(let i=0;i<n;i++){const s=samples[i]-mean;energy+=s*s}
 const rms=Math.sqrt(energy/n);if(!Number.isFinite(rms)||rms<0.012)return null;
 const minLag=Math.max(2,Math.floor(sampleRate/maxHz));
 const maxLag=Math.min(Math.floor(sampleRate/minHz),Math.floor(n/2)-1);
 if(maxLag<=minLag)return null;
 const window=n-maxLag;const diff=new Float64Array(maxLag+1);
 for(let lag=1;lag<=maxLag;lag++){
  let sum=0;for(let i=0;i<window;i+=2){const v=samples[i]-samples[i+lag];sum+=v*v}
  diff[lag]=sum;
 }
 let running=0;const cmnd=new Float64Array(maxLag+1);cmnd[0]=1;
 for(let lag=1;lag<=maxLag;lag++){running+=diff[lag];cmnd[lag]=running>0?diff[lag]*lag/running:1}
 let lag=-1;
 for(let i=minLag;i<maxLag;i++){
  if(cmnd[i]<threshold){while(i+1<=maxLag&&cmnd[i+1]<cmnd[i])i++;lag=i;break}
 }
 if(lag<0){let best=1;for(let i=minLag;i<=maxLag;i++)if(cmnd[i]<best){best=cmnd[i];lag=i}if(lag<0||best>0.25)return null}
 const a=cmnd[lag-1]??cmnd[lag],b=cmnd[lag],c=cmnd[lag+1]??cmnd[lag];
 const den=a-2*b+c;
 const delta=Math.abs(den)>1e-10?Math.max(-0.5,Math.min(0.5,(a-c)/(2*den))):0;
 const hz=sampleRate/(lag+delta),confidence=Math.max(0,Math.min(1,1-b));
 return hz>=minHz&&hz<=maxHz&&confidence>=0.75?{hz,confidence,rms}:null;
}
