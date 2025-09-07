export function sigmoid(z:number){return 1/(1+Math.exp(-z));}
export function dot(a:number[],b:number[]){let s=0;for(let i=0;i<a.length;i++)s+=(a[i]||0)*(b[i]||0);return s;}
export function sub(a:number[],b:number[]){const o:number[]=[];const L=Math.max(a.length,b.length);for(let i=0;i<L;i++)o.push((a[i]||0)-(b[i]||0));return o;}
export function l2(a:number[]){return Math.sqrt(dot(a,a));}
export function mmrSelect<T>(items:T[],k:number,sim:(a:T,b:T)=>number,score:(x:T)=>number){
  const chosen:T[]=[];const remaining=items.slice().sort((x,y)=>score(y)-score(x));
  while(chosen.length<k&&remaining.length){let best:T|null=null,bv=-Infinity;
    for(const c of remaining){const rel=score(c);let div=0;if(chosen.length){div=Math.max(...chosen.map(x=>sim(x,c)));}const v=0.7*rel-0.3*div;if(v>bv){bv=v;best=c;}}
    if(!best)break;chosen.push(best);remaining.splice(remaining.indexOf(best),1);} return chosen;}