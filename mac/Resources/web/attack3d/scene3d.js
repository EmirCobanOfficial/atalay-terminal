(()=>{var Lp=Object.defineProperty;var Dp=(i,e)=>{for(var t in e)Lp(i,t,{get:e[t],enumerable:!0})};(function(i){"use strict";function e(v){return function(){v|=0,v=v+1831565813|0;let S=Math.imul(v^v>>>15,1|v);return S=S+Math.imul(S^S>>>7,61|S)^S,((S^S>>>14)>>>0)/4294967296}}let t=(v,S,T)=>Math.min(T,Math.max(S,v)),s=v=>(v=t(v,0,1),v*v*(3-2*v)),r=(v,S,T)=>v+(S-v)*T,a=Math.PI*2,o=v=>{for(;v>Math.PI;)v-=a;for(;v<-Math.PI;)v+=a;return v};function c(v){let S=/^#?([0-9a-f]{6})$/i.exec(v||""),T=S?parseInt(S[1],16):16747050;return[T>>16&255,T>>8&255,T&255]}function l(v,S){let T=document.createElement("canvas");return T.width=Math.max(1,v),T.height=Math.max(1,S),T}let h=120;function u(){return new Map}function f(v,S,T,x,C){let P=Math.floor(Math.min(S,x)/h),U=Math.floor(Math.max(S,x)/h),L=Math.floor(Math.min(T,C)/h),F=Math.floor(Math.max(T,C)/h);for(let N=P;N<=U;N++)for(let D=L;D<=F;D++){let V=N*100003+D,q=v.get(V);q||v.set(V,q=[]),q.push(S,T,x,C)}}function d(v,S,T,x,C){let P=Math.floor(Math.min(S,x)/h),U=Math.floor(Math.max(S,x)/h),L=Math.floor(Math.min(T,C)/h),F=Math.floor(Math.max(T,C)/h),N=-1,D=x-S,V=C-T;for(let q=P;q<=U;q++)for(let ee=L;ee<=F;ee++){let G=v.get(q*100003+ee);if(G)for(let te=0;te<G.length;te+=4){let ce=G[te+2]-G[te],Le=G[te+3]-G[te+1],Ce=D*Le-V*ce;if(Math.abs(Ce)<1e-9)continue;let Ne=((G[te]-S)*Le-(G[te+1]-T)*ce)/Ce,ze=((G[te]-S)*V-(G[te+1]-T)*D)/Ce;Ne>.02&&Ne<=1&&ze>=0&&ze<=1&&(N<0||Ne<N)&&(N=Ne)}}return N}function _(v,S,T,x,C,P,U,L){let F={rays:[],bridges:[],rings:[],shards:[],micro:[],glints:[],cells:[],coreR:0,cx:S,cy:T,maxR:0},N=Math.hypot(x,C),D=P*(30+46*U);F.coreR=D;let V=6*P,q=(ve,ue)=>ve>-V&&ue>-V&&ve<x+V&&ue<C+V,ee=.5;function G(ve,ue,me,B,W,le,A){let b=[{x:ve,y:ue,w:W}],w=0,I=(v()-.5)*.03,z=0;for(;w<B&&z++<260;){let X=P*(12+v()*12)*(1+w/(520*P));I=I*.9+(v()-.5)*.04,me+=I+(v()+v()-1)*.07,v()<.13&&(me+=(v()<.5?-1:1)*(.14+v()*.34));let ie=Math.atan2(ue-T,ve-S);me=ie+t(o(me-ie),-1,1);let O=ve+Math.cos(me)*X,K=ue+Math.sin(me)*X,Y=!1,fe=d(L,ve,ue,O,K);if(fe>0&&!(U>.8&&le<2&&v()<ee)&&(O=ve+(O-ve)*fe,K=ue+(K-ue)*fe,Y=!0),!q(O,K)){let ne=O<0?(0-ve)/(O-ve):O>x?(x-ve)/(O-ve):1,Q=K<0?(0-ue)/(K-ue):K>C?(C-ue)/(K-ue):1,pe=Math.min(ne,Q);O=ve+(O-ve)*pe,K=ue+(K-ue)*pe,Y=!0}if(w+=Math.hypot(O-ve,K-ue),ve=O,ue=K,b.push({x:ve,y:ue,w:Math.max(.8*P,W*Math.exp(-w/A))}),Y)break;if(le<3&&w>50*P&&w<B*.8&&v()<(le===0?.1:.07)){let ne=v()<.5?-1:1,Q=(B-w)*(.25+v()*.4);Q>40*P&&G(ve,ue,me+ne*(.35+v()*.5),Q,W*(.6-le*.12),le+1,A*.6)}}b.length>1&&F.rays.push({pts:b,depth:le,w0:W})}let te=Math.round(9+U*8),ce=U>.8?1:.35+t((U-.55)/.05,0,1)*.15,Le=v()*a,Ce=a/te,Ne=N*ce,ze=[];for(let ve=0;ve<te;ve++){let ue=Le+ve*Ce+(v()-.5)*Ce*1.2,me=v(),B=Ne*(me<.34?.22+.14*v():me<.67?.55+.15*v():.9+.2*v()),W=D*(.3+v()*.4),le=F.rays.length;G(S+Math.cos(ue)*W,T+Math.sin(ue)*W,ue,B,P*(3.6+v()*1.8)*(.65+.45*U),0,P*900*(.5+U));for(let A=F.rays.length-1;A>=le;A--)if(F.rays[A].depth===0){ze.push({r:F.rays[A],a:ue});break}}U>.8&&[[0,0],[x,0],[0,C],[x,C],[x*.5,0],[x*.5,C],[0,C*.5],[x,C*.5],[x*.2,0],[x*.8,C],[x*.85,0],[x*.15,C],[0,C*.2],[x,C*.8]].forEach(ue=>{let me=Math.atan2(ue[1]-T,ue[0]-S)+(v()-.5)*.12,B=Math.hypot(ue[0]-S,ue[1]-T),W=D*(.5+v()*.5);ee=.92,G(S+Math.cos(me)*W,T+Math.sin(me)*W,me,B*1.1,P*(3.2+v()),1,P*1400),ee=.5});let tt=Math.round(8+U*12);for(let ve=0;ve<tt;ve++){let ue=v()*a,me=D*(.8+v()*1.4);G(S+Math.cos(ue)*me,T+Math.sin(ue)*me,ue+(v()-.5)*.4,P*(70+v()*260)*(.6+U),P*(1.6+v()*1.2),1,P*200)}ze.sort((ve,ue)=>ve.a-ue.a);function Z(ve,ue){let me=ve.pts;for(let B=1;B<me.length;B++){let W=Math.hypot(me[B-1].x-S,me[B-1].y-T),le=Math.hypot(me[B].x-S,me[B].y-T);if(le>=ue&&le>W){let A=(ue-W)/(le-W||1);return{x:r(me[B-1].x,me[B].x,A),y:r(me[B-1].y,me[B].y,A),w:r(me[B-1].w,me[B].w,A)}}}return null}let ae=[],he=D*1.7;for(;he<N;)ae.push(he),he*=1.22+v()*.22;for(let ve=0;ve<ze.length;ve++){let ue=ze[ve].r,me=ze[(ve+1)%ze.length].r,B=null,W=null;for(let le=0;le<ae.length;le++){let A=Z(ue,ae[le]),b=Z(me,ae[le]*(.9+v()*.2));if(A&&b&&B&&W&&v()<.5&&F.cells.push({p:[B,A,b,W],a:.012+v()*.035,tone:v()}),A&&b&&le<7&&v()<Math.max(.38,.8*Math.exp(-le/(3+3*U)))){let w=Math.hypot(b.x-A.x,b.y-A.y);if(w<900*P&&w>8*P){let I=1+Math.floor(w/(140*P)),z=[{x:A.x,y:A.y,w:0}],X=-(b.y-A.y)/w,ie=(b.x-A.x)/w,O=(A.w+b.w)*.42+.6*P,K=Math.min(Math.hypot(A.x-S,A.y-T),Math.hypot(b.x-S,b.y-T));for(let fe=1;fe<=I;fe++){let ne=fe/(I+1),Q=(v()-.5)*w*.05,pe=r(A.x,b.x,ne)+X*Q,we=r(A.y,b.y,ne)+ie*Q,Ie=Math.hypot(pe-S,we-T);Ie<K&&(pe=S+(pe-S)*K/Ie,we=T+(we-T)*K/Ie),z.push({x:pe,y:we,w:O})}z.push({x:b.x,y:b.y,w:0});let Y=[z[0]];for(let fe=1;fe<z.length;fe++){let ne=d(L,Y[Y.length-1].x,Y[Y.length-1].y,z[fe].x,z[fe].y);if(ne>0){let Q=Y[Y.length-1];Y.push({x:Q.x+(z[fe].x-Q.x)*ne,y:Q.y+(z[fe].y-Q.y)*ne,w:0});break}Y.push(z[fe])}Y.forEach((fe,ne)=>{ne>0&&ne<Y.length-1&&(fe.w=O)}),Y.length>1&&F.bridges.push({pts:Y,w0:O})}}B=A,W=b}}[1.5,2,2.5].forEach(ve=>{let ue=D*ve,me=.35*a*ue,B=0;for(let W=0;W<ze.length&&B<me;W++){if(v()<.5)continue;let le=ze[W].r,A=ze[(W+1)%ze.length].r,b=Z(le,ue*(1+(v()-.5)*.3)),w=Z(A,ue*(1+(v()-.5)*.3));if(!b||!w)continue;let I=Math.hypot(w.x-b.x,w.y-b.y);I<40*P||B+I>me||(B+=I,F.rings.push({pts:[{x:b.x,y:b.y,w:P*.9},{x:w.x,y:w.y,w:P*.9}],w0:P}))}});let Pe=Math.round(150+U*400);for(let ve=0;ve<Pe;ve++){let ue=D*1.35*Math.pow(v(),.75),me=v()*a,B=P*(2+v()*7)*(.5+.7*(1-ue/(D*1.4))),W=S+Math.cos(me)*ue,le=T+Math.sin(me)*ue,A=v()*a,b=[];for(let w=0;w<3;w++){let I=A+w*(a/3)+(v()-.5),z=B*(.6+v()*.8);b.push([W+Math.cos(I)*z,le+Math.sin(I)*z])}F.shards.push({p:b,tone:v(),a:.12+v()*.4})}for(let ve=0,ue=Math.round(30+U*50);ve<ue;ve++){let me=v()*a,B=D*(.5+v()*1.1),W=S,le=T,A=me,b=0,w=[{x:W,y:le,w:P*.9}];for(;b<B;){let I=P*(2+v()*3);A+=(v()-.5)*.7,W+=Math.cos(A)*I,le+=Math.sin(A)*I,b+=I,w.push({x:W,y:le,w:Math.max(.3*P,P*.9*(1-b/B))})}F.micro.push({pts:w,w0:P})}let Ae=F.rays.concat(F.bridges),De=Math.round(16+U*36);for(let ve=0;ve<De&&Ae.length;ve++){let ue=Ae[Math.floor(v()*Ae.length)],me=ue.pts[Math.floor(v()*ue.pts.length)];F.glints.push({x:me.x+(v()-.5)*P*3,y:me.y+(v()-.5)*P*3,s:P*(2+v()*4)*(v()<.12?2:1),ph:v()*a,f:.004+v()*.007})}let Je=ve=>{let ue=ve.pts,me=0,B=[ue[0]],W=Math.sin(4.2*Math.PI/180);for(;me<ue.length-1;){let le=me+1;for(;le<ue.length-1&&Math.hypot(ue[le].x-ue[me].x,ue[le].y-ue[me].y)<60*P;)le++;let A=ue[le].x-ue[me].x,b=ue[le].y-ue[me].y,w=Math.hypot(A,b)||1;if(w>=60*P&&(Math.abs(b/w)<W||Math.abs(A/w)<W)){let I=w*.16*(v()<.5?-1:1);B.push({x:(ue[me].x+ue[le].x)/2-b/w*I,y:(ue[me].y+ue[le].y)/2+A/w*I,w:(ue[me].w+ue[le].w)/2})}else for(let I=me+1;I<le;I++)B.push(ue[I]);B.push(ue[le]),me=le}ve.pts=B};F.rays.forEach(Je),F.bridges.forEach(Je),F.rings.forEach(Je);let de=1e9,ge=1e9,xe=-1e9,_e=-1e9;function Me(ve){for(let ue=0;ue<ve.length;ue++){let me=ve[ue];de=Math.min(de,me.x),ge=Math.min(ge,me.y),xe=Math.max(xe,me.x),_e=Math.max(_e,me.y),F.maxR=Math.max(F.maxR,Math.hypot(me.x-S,me.y-T))}}F.rays.forEach(ve=>Me(ve.pts)),F.bridges.forEach(ve=>Me(ve.pts)),F.rings.forEach(ve=>Me(ve.pts)),de=Math.min(de,S-D*2.5),ge=Math.min(ge,T-D*2.5),xe=Math.max(xe,S+D*2.5),_e=Math.max(_e,T+D*2.5);let Ue=10*P;return F.box={x:Math.max(0,Math.floor(de-Ue)),y:Math.max(0,Math.floor(ge-Ue))},F.box.w=Math.min(x,Math.ceil(xe+Ue))-F.box.x,F.box.h=Math.min(C,Math.ceil(_e+Ue))-F.box.y,[F.rays,F.bridges,F.rings].forEach(ve=>ve.forEach(ue=>{for(let me=0;me<ue.pts.length-1;me++)f(L,ue.pts[me].x,ue.pts[me].y,ue.pts[me+1].x,ue.pts[me+1].y)})),F}function y(v){let S=[];for(let T=0;T<v.length;T++){let x=v[Math.max(0,T-1)],C=v[Math.min(v.length-1,T+1)],P=C.x-x.x,U=C.y-x.y,L=Math.hypot(P,U)||1;S.push([-U/L,P/L])}return S}function g(v,S,T,x,C,P,U,L,F,N){v.fillStyle=F,v.beginPath();let D=V=>N?N[V]:1;for(let V=x;V<=C;V++){let q=Math.max(U*D(V),S[V].w*L*D(V))*.5,ee=S[V].x+T[V][0]*(P+q),G=S[V].y+T[V][1]*(P+q);V===x?v.moveTo(ee,G):v.lineTo(ee,G)}for(let V=C;V>=x;V--){let q=Math.max(U*D(V),S[V].w*L*D(V))*.5,ee=S[V].x+T[V][0]*(P-q),G=S[V].y+T[V][1]*(P-q);v.lineTo(ee,G)}v.closePath(),v.fill()}function p(v,S,T,x,C,P){let U=y(v),L=S?.92+.08*P():.7+.3*P(),F=P()*a,N=5,D=[],V=[0];for(let G=1;G<v.length;G++)V.push(V[G-1]+Math.hypot(v[G].x-v[G-1].x,v[G].y-v[G-1].y));for(let G=0,te=0;G<v.length-1;G+=N-1,te++){let ce=Math.min(v.length-1,G+N-1),Le=Math.min(v.length-1,G+2),Ce=U[Le][0],Ne=U[Le][1],ze=Ce*C[0]+Ne*C[1];D.push({i0:G,i1:ce,m:T*L*(.8+.2*Math.sin(F+te*.85)),ds:ze>=0?-1:1,w0:Math.max(.5*x,v[Le].w)})}let q=V[V.length-1],ee=V.map(G=>Math.min(t(.2+G/(14*x),.2,1),t(.3+(q-G)/(10*x),.3,1)));return{pts:v,n:U,chunks:D,cum:V,len:q,prim:S,u:x,fw:ee}}function E(v,S,T){let x=S.pts,C=S.n,P=S.fw,U=S.u;if(T<1){let F=T*S.len;if(F<=.5)return;let N=1;for(;N<S.cum.length-1&&S.cum[N]<F;)N++;let D=S.pts[N-1],V=S.pts[N],q=t((F-S.cum[N-1])/(S.cum[N]-S.cum[N-1]||1),0,1);x=S.pts.slice(0,N).concat([{x:D.x+(V.x-D.x)*q,y:D.y+(V.y-D.y)*q,w:r(D.w,V.w,q)*.5}]),C=S.n.slice(0,N).concat([S.n[N]]),P=S.fw.slice(0,N).concat([.4])}let L=x.length-1;for(let F of S.chunks){if(F.i0>=L)break;let N=Math.min(F.i1,L),D=F.m,V=F.ds,q=F.w0;if(S.prim){let ee=Math.max(3.4*U,q*.75);g(v,x,C,F.i0,N,0,3.4*U,.75,"rgba(2,4,10,"+t(.82*D,0,.85)+")",P),g(v,x,C,F.i0,N,-V*(ee*.5+.6*U),1.4*U,0,"rgba(228,235,248,"+t(.56*D,0,.58)+")",P),g(v,x,C,F.i0,N,V*(ee*.5+.5*U),.8*U,0,"rgba(0,2,10,"+t(.16*D,0,.2)+")",P)}else g(v,x,C,F.i0,N,0,1.7*U,.65,"rgba(3,5,12,"+t(.8*D,0,.85)+")",P),g(v,x,C,F.i0,N,-V*(q*.55+.6*U),.7*U,.2,"rgba(226,233,246,"+t(.4*D,0,.48)+")",P),g(v,x,C,F.i0,N,V*(q*.45+.5*U),.55*U,.14,"rgba(0,2,10,"+t(.16*D,0,.2)+")",P)}}function m(v,S,T,x){let C=v.box,P=C.x,U=C.y,L=l(C.w,C.h),F=l(C.w,C.h),N=l(Math.ceil(C.w/2),Math.ceil(C.h/2)),D=L.getContext("2d"),V=F.getContext("2d"),q=N.getContext("2d");[D,V].forEach(Z=>{Z.translate(-P,-U),Z.lineCap="round",Z.lineJoin="round"}),q.setTransform(.5,0,0,.5,-P/2,-U/2),q.lineCap="round",q.lineJoin="round";let ee=v.cx,G=v.cy,te=v.coreR,ce;v.cells.forEach(Z=>{let ae=(Z.p[0].x+Z.p[2].x)/2-ee,he=(Z.p[0].y+Z.p[2].y)/2-G,Pe=Math.hypot(ae,he)||1,Ae=ae/Pe*x[0]+he/Pe*x[1]+(Z.tone-.5)*1.3;D.fillStyle=Ae>0?"rgba(235,240,250,"+Z.a*.45+")":"rgba(0,0,10,"+Z.a*.2+")",D.beginPath(),D.moveTo(Z.p[0].x,Z.p[0].y);for(let De=1;De<4;De++)D.lineTo(Z.p[De].x,Z.p[De].y);D.closePath(),D.fill()});let Le=(Z,ae)=>{D.beginPath();for(let he=0;he<48;he++){let Pe=he/48*a,Ae=Z*(1+.16*Math.sin(2*Pe+Ce[0])+.11*Math.sin(3*Pe+Ce[1])+.07*Math.sin(5*Pe+Ce[2])+.04*Math.sin(9*Pe+Ce[3]))*ae,De=ee+Math.cos(Pe)*Ae,Je=G+Math.sin(Pe)*Ae;he?D.lineTo(De,Je):D.moveTo(De,Je)}D.closePath()},Ce=[T()*a,T()*a,T()*a,T()*a];for(let Z=0;Z<9;Z++){let ae=T()*a,he=te*(Z?.95*Math.sqrt(T()):0),Pe=ee+Math.cos(ae)*he,Ae=G+Math.sin(ae)*he,De=te*(Z?.8+.7*T():1.5)*(.7+.6*T()),Je=D.createRadialGradient(Pe,Ae,0,Pe,Ae,De);Je.addColorStop(0,"rgba(206,213,226,"+(Z?.028:.035)+")"),Je.addColorStop(.55,"rgba(206,213,226,"+(Z?.02:.025)+")"),Je.addColorStop(1,"rgba(206,213,226,0)"),D.fillStyle=Je,D.beginPath(),D.arc(Pe,Ae,De,0,a),D.fill()}ce=D.createRadialGradient(ee,G,0,ee,G,te*.7),ce.addColorStop(0,"rgba(6,8,14,0.30)"),ce.addColorStop(1,"rgba(6,8,14,0)"),D.fillStyle=ce,D.beginPath(),D.arc(ee,G,te*.7,0,a),D.fill(),D.lineCap="butt",D.lineWidth=Math.max(.6,.7*S);for(let Z=0;Z<170;Z++){let ae=T()*a,he=te*1.5*Math.sqrt(T())*(1+.1*Math.sin(3*ae+Ce[1])),Pe=ee+Math.cos(ae)*he,Ae=G+Math.sin(ae)*he,De=T()*a,Je=S*(3+T()*8);D.strokeStyle=T()<.5?"rgba(236,240,248,0.075)":"rgba(8,12,22,0.085)",D.beginPath(),D.moveTo(Pe,Ae),D.lineTo(Pe+Math.cos(De)*Je,Ae+Math.sin(De)*Je),D.stroke()}D.lineCap="round";let Ne=l(C.w,C.h);Ne.getContext("2d").drawImage(L,0,0);let ze=[],tt=(Z,ae,he)=>Z.forEach(Pe=>{let Ae=p(Pe.pts,ae&&Pe.depth<=1,he,S,x,T);ze.push(Ae)});return tt(v.micro,!1,.5),tt(v.rings,!1,.8),tt(v.bridges,!1,.75),v.rays.slice().sort((Z,ae)=>Z.w0-ae.w0).forEach(Z=>{let ae=p(Z.pts,Z.depth<=1,Z.depth===0?1:.8,S,x,T);ze.push(ae)}),ze.forEach(Z=>E(D,Z,1)),{base:L,base0:Ne,lines:ze,warm:N,ox:P,oy:U}}function M(v,S){S=S||{};let T=document.createElement("canvas");T.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block",v.appendChild(T);let x=T.getContext("2d"),C=S.dpr||i.devicePixelRatio||1,P=S.reduced!=null?!!S.reduced:!!(i.matchMedia&&i.matchMedia("(prefers-reduced-motion: reduce)").matches),U=S.maxWidth||3200,L=0,F=0,N=null,D=null,V=null,q=null,ee="",G=[];function te(){let W=(v.clientWidth||i.innerWidth)*C,le=(v.clientHeight||i.innerHeight)*C,A=Math.min(1,U/W),b=Math.max(1,Math.round(W*A)),w=Math.max(1,Math.round(le*A));(b!==L||w!==F)&&(L=T.width=b,F=T.height=w,q=null,ee="",Ae())}function ce(W,le){let A=L/1920,b=e(W.seed);W.u=A,W.cx=W.x*L,W.cy=W.y*F,W.geo=_(b,W.cx,W.cy,L,F,A,W.strength,le),W.layers=m(W.geo,A,e(W.seed^2654435769),[-.62,-.78]),W.maxR=W.geo.maxR,W.prop=36+14*W.strength,W.warmKey="",W.warmCv=null;let w=e(W.seed^1374496523);W.ph=[w()*a,w()*a,w()*a],W.vents=null,W.frost=null,W.dust=null,V&&V.frost&&(W.frost=ze(W))}let Le=W=>(W=t(W,0,1),W*W*W*(10-15*W+6*W*W)),Ce=W=>(W=t(W,0,1),W*W*(3-2*W)),Ne=()=>D?[D.from,D.to]:[11400,13800];function ze(W){let le=W.layers,A=l(le.base.width,le.base.height),b=A.getContext("2d"),w=W.u,I=e(W.seed^2135587861);b.translate(-le.ox,-le.oy),b.lineCap="round",b.lineJoin="round";let z=W.geo.rays.filter(X=>X.depth<=2).concat(W.geo.bridges);for(let X of[[1,.1],[.6,.12],[.3,.14]]){b.strokeStyle="rgba(228,240,255,"+X[1]+")";for(let ie of z)for(let O=1;O<ie.pts.length;O++){let K=ie.pts[O-1],Y=ie.pts[O];b.lineWidth=(5+3*Y.w/w)*w*X[0],b.beginPath(),b.moveTo(K.x,K.y),b.lineTo(Y.x,Y.y),b.stroke()}}b.strokeStyle="rgba(240,248,255,0.22)",b.lineWidth=Math.max(.8,w);for(let X of z){let ie=0,O=(7+I()*5)*w;for(let K=1;K<X.pts.length;K++){let Y=X.pts[K-1],fe=X.pts[K],ne=fe.x-Y.x,Q=fe.y-Y.y,pe=Math.hypot(ne,Q)||1,we=-Q/pe,Ie=ne/pe;for(;ie+pe>=O;){let H=(O-ie)/pe,ye=Y.x+ne*H,se=Y.y+Q*H,Se=I()<.5?-1:1,Te=(I()-.5)*1.05,be=(2+I()*5)*w*(1+fe.w/(4*w)),Be=we*Se*Math.cos(Te)+ne/pe*Math.sin(Te),ke=Ie*Se*Math.cos(Te)+Q/pe*Math.sin(Te);b.beginPath(),b.moveTo(ye,se),b.lineTo(ye+Be*be,se+ke*be),b.stroke(),O+=(7+I()*5)*w}ie+=pe}}return A}function tt(W){let le=0,A=1;for(let b=0;b<24;b++){let w=(le+A)/2;Ce(w)<W?le=w:A=w}return(le+A)/2}function Z(W){let le=W.u,A=e(700+W.idx),b=W.cx,w=W.cy,I=W.maxR,[z,X]=Ne(),ie=[],O=0,K=Q=>{for(let pe=1;pe<Q.pts.length;pe++){let we=Q.pts[pe-1],Ie=Q.pts[pe],H=Math.hypot(Ie.x-we.x,Ie.y-we.y),ye=(we.x+Ie.x)/2,se=(we.y+Ie.y)/2,Se=Math.hypot(ye-b,se-w),Te=H*Ie.w*Math.exp(-Se/(.45*I));O+=Te,ie.push({a:we,b:Ie,wt:Te,cum:O,w:Ie.w})}};W.geo.rays.filter(Q=>Q.depth<=1).forEach(K),W.geo.bridges.forEach(K);let Y=Math.round(10+16*W.strength),fe=[],ne=(Q,pe,we,Ie)=>{let H=Math.hypot(Q-b,pe-w),ye=H>1?[(Q-b)/H,(pe-w)/H]:[0,0],se=Math.min(1,H/(1.2*I)),Se=1-Math.pow(1-se,1/2.2),Te=W.at+W.prop*Se,be=Be=>z+tt(t(1-Be/(1.2*I),0,1))*(X-z);fe.push({x:Q/L,y:pe/F,dx:ye[0],dy:ye[1],str:we,openAt:Te,sealAt:be(H+.12*I),closeAt:Ie?X:be(H),core:!!Ie})};ne(b,w,2.5,!0);for(let Q=0;Q<Y&&ie.length;Q++){let pe=A()*O,we=0;for(;we<ie.length-1&&ie[we].cum<pe;)we++;let Ie=ie[we],H=A();ne(Ie.a.x+(Ie.b.x-Ie.a.x)*H,Ie.a.y+(Ie.b.y-Ie.a.y)*H,t(Ie.w/(3.5*le),0,1),!1)}return fe}function ae(){return G.map(W=>(W.vents||(W.vents=Z(W)),{idx:W.idx,at:W.at,strength:W.strength,maxR:W.maxR/L,pts:W.vents}))}function he(W){V=Object.assign({frost:!0,dust:!0,alarm:!0},W||{}),G.forEach(le=>{le.frost=V.frost?ze(le):null})}function Pe(W,le){let A=V;x.lineCap="round";for(let b=0;b<G.length;b++){let w=G[b],I=le[b],z=I.age;if(z<0||I.heal>=1)continue;let X=w.u,ie=w.layers,O=I.heal,K=Ce(O);if(A.frost&&w.frost){let Y=P?1:Le((z-100)/1600),fe=.85*(P?1:Le((z-100)/1400))*(1-Math.pow(O,3));fe>.01&&(x.save(),!P&&Y<1?Me(w,w.maxR*1.2*Y):O>0&&!P&&Me(w,w.maxR*1.2*(1-K)),x.globalAlpha=fe,x.drawImage(w.frost,ie.ox,ie.oy),x.restore())}if(!P){{let Y=.14*w.strength*Math.exp(-z/260);if(Y>.004){let fe=w.geo.coreR*(3+5*w.strength)*(1+z/350),ne=x.createRadialGradient(w.cx,w.cy,0,w.cx,w.cy,fe);ne.addColorStop(0,"rgba(236,242,250,"+Y+")"),ne.addColorStop(1,"rgba(236,242,250,0)"),x.fillStyle=ne,x.beginPath(),x.arc(w.cx,w.cy,fe,0,a),x.fill()}}if(O>0&&O<1){let Y=w.maxR*1.2*(1-K),fe=46*X;x.globalCompositeOperation="lighter";for(let ne of w.geo.rays.filter(Q=>Q.depth<=2).concat(w.geo.bridges))for(let Q=1;Q<ne.pts.length;Q++){let pe=ne.pts[Q-1],we=ne.pts[Q],Ie=Math.hypot(we.x-w.cx,we.y-w.cy),H=Y-Ie;if(H<0||H>fe)continue;let ye=1-H/fe;x.strokeStyle="rgba(255,236,200,"+.85*ye*ye+")",x.lineWidth=Math.max(1.2,(3+7*ye)*X*.5),x.beginPath(),x.moveTo(pe.x,pe.y),x.lineTo(we.x,we.y),x.stroke()}x.globalCompositeOperation="source-over"}if(A.dust){if(w.vents||(w.vents=Z(w)),!w.dust){let Y=e(w.seed^53335),fe=Math.round(10+14*w.strength);w.dust=[];for(let ne=0;ne<fe;ne++){let Q=Y()*a,pe=w.geo.coreR*(3+Y()*5),we=w.cx+Math.cos(Q)*pe,Ie=w.cy+Math.sin(Q)*pe,H=null,ye=1e18;for(let se of w.vents){let Se=Math.hypot(se.x*L-we,se.y*F-Ie);Se<ye&&(ye=Se,H=se)}w.dust.push({x:we,y:Ie,tx:H.x*L,ty:H.y*F,d:ye,delay:30+Y()*220,a:(1800+Y()*2200)*X})}}x.strokeStyle="rgba(215,215,222,0.55)",x.lineWidth=Math.max(1,1.2*X);for(let Y of w.dust){let fe=(z-Y.delay)/1e3;if(fe<=0)continue;let ne=.5*Y.a*fe*fe;if(ne>=Y.d)continue;let Q=(Y.tx-Y.x)/Y.d,pe=(Y.ty-Y.y)/Y.d,we=Y.x+Q*ne,Ie=Y.y+pe*ne,H=Y.a*fe*.012;x.beginPath(),x.moveTo(we-Q*H,Ie-pe*H),x.lineTo(we,Ie),x.stroke()}}}}if(A.alarm){let[b,w]=Ne(),I=Ce((W-5980)/170)*(1-Ce((W-b)/(w-b))),z=P?.06*I:I*(.07+.05*(.5+.5*Math.sin(a*1.1*(W-6e3)/1e3)));for(let X of G){let ie=W-X.at;ie>0&&(z+=(X.strength>.8?.16:.06)*(P?.5:1)*Math.exp(-ie/(X.strength>.8?380:300)))}if(z>.004){let X=Math.min(L,F)*.07;x.globalCompositeOperation="source-over";let ie=(O,K,Y,fe,ne,Q,pe,we)=>{let Ie=x.createLinearGradient(O,K,Y,fe);Ie.addColorStop(0,"rgba(255,46,38,"+z+")"),Ie.addColorStop(1,"rgba(255,46,38,0)"),x.fillStyle=Ie,x.fillRect(ne,Q,pe,we)};ie(0,0,0,X,0,0,L,X),ie(0,F,0,F-X,0,F-X,L,X),ie(0,0,X,0,0,0,X,F),ie(L,0,L-X,0,L-X,0,X,F)}}}function Ae(){let W=u();G.forEach(le=>ce(le,W)),i.__cracksGrid=null,te.grid=W}te.grid=u();function De(W){let le=t(W.strength==null?.5:W.strength,0,1),A={x:W.x,y:W.y,strength:le,at:W.at||0,idx:G.length,seed:G.length*7919+Math.round(W.x*1e3)*131+Math.round(W.y*1e3)*17+Math.round(le*100)*3+4242>>>0};return te(),G.push(A),ce(A,te.grid),ee="",A}function Je(W){N=W&&W.intensity>0?{x:W.x,y:W.y,rgb:c(W.color),i:t(W.intensity,0,1.5)}:null}function de(W){D={from:W.from,to:W.to}}let ge=(W,le)=>1+.07*Math.sin(2*le+W.ph[0])+.05*Math.sin(3*le+W.ph[1])+.03*Math.sin(5*le+W.ph[2]);function xe(W,le,A){let b=W.layers,w=b.base.width,I=b.base.height;if(A<=.002)return;W.hTmp||(W.hTmp=l(w,I),W.hMask=l(w,I));let z=W.hTmp.getContext("2d"),X=W.hMask.getContext("2d"),ie=W.u;z.globalCompositeOperation="source-over",z.clearRect(0,0,w,I),z.drawImage(b.base,0,0),X.setTransform(1,0,0,1,0,0),X.clearRect(0,0,w,I);let O=2e4,K=W.cx-b.ox,Y=W.cy-b.oy;X.shadowColor="rgba(0,0,0,1)",X.shadowBlur=26*ie,X.shadowOffsetX=-O,X.fillStyle="#000",X.beginPath();for(let fe=0;fe<72;fe++){let ne=fe/72*a,Q=Math.max(1,le*ge(W,ne)+ie*24*(.5*Math.sin(7*ne+W.ph[0])+.35*Math.sin(13*ne+W.ph[1])+.25*Math.sin(23*ne+W.ph[2]))),pe=K+Math.cos(ne)*Q+O,we=Y+Math.sin(ne)*Q;fe?X.lineTo(pe,we):X.moveTo(pe,we)}X.closePath(),X.fill(),X.shadowColor="transparent",X.shadowBlur=0,X.shadowOffsetX=0,z.globalCompositeOperation="destination-in",z.drawImage(W.hMask,0,0),z.globalCompositeOperation="source-over",x.globalAlpha=A,x.drawImage(W.hTmp,b.ox,b.oy),x.globalAlpha=1}function _e(W,le,A){let b=W.layers;if(!W.sched){let w=b.lines.slice().sort((z,X)=>z.len-X.len),I=w.length;W.sched=w.map((z,X)=>{let ie=X>=I-9;return{ln:z,st:ie?.46+.12*((X-(I-9))/8):.02+.44*(X/Math.max(1,I-9)),du:ie?.12:.1}})}x.globalAlpha=A*(1-Ce((le-.3)/.55)),x.drawImage(b.base0,b.ox,b.oy),x.globalAlpha=A;for(let w of W.sched){let I=t((le-w.st)/w.du,0,1);I>=1||(x.globalAlpha=A*(1-s((I-.8)/.2)),E(x,w.ln,1-.65*I))}x.globalAlpha=1}function Me(W,le){x.beginPath();for(let A=0;A<64;A++){let b=A/64*a,w=Math.max(.5,le*ge(W,b)),I=W.cx+Math.cos(b)*w,z=W.cy+Math.sin(b)*w;A?x.lineTo(I,z):x.moveTo(I,z)}x.closePath(),x.clip()}function Ue(W){let le=W.layers,A=[Math.round(N.x*L/24),Math.round(N.y*F/24),Math.round(N.i*25),N.rgb.join()].join("|");if(W.warmKey===A)return;W.warmKey=A;let b=le.warm;W.warmCv||(W.warmCv=l(b.width,b.height));let w=W.warmCv.getContext("2d"),I=b.width,z=b.height;w.globalCompositeOperation="source-over",w.clearRect(0,0,I,z);let X=(N.x*L-le.ox)/2,ie=(N.y*F-le.oy)/2,O=L*.17,K=t(N.i,0,1),Y=N.rgb,fe=t(Math.floor(X-O),0,I),ne=t(Math.floor(ie-O),0,z),Q=t(Math.ceil(X+O),0,I),pe=t(Math.ceil(ie+O),0,z);if(W.warmRect=Q>fe&&pe>ne?[fe,ne,Q-fe,pe-ne]:null,!W.warmRect)return;w.drawImage(b,fe,ne,Q-fe,pe-ne,fe,ne,Q-fe,pe-ne);let we=w.createRadialGradient(X,ie,0,X,ie,O);we.addColorStop(0,"rgba(0,0,0,"+K+")"),we.addColorStop(.5,"rgba(0,0,0,"+K*.55+")"),we.addColorStop(1,"rgba(0,0,0,0)"),w.globalCompositeOperation="destination-in",w.fillStyle=we,w.fillRect(fe,ne,Q-fe,pe-ne),w.globalCompositeOperation="source-atop",w.fillStyle="rgba("+Y[0]+","+Y[1]+","+Y[2]+",0.5)",w.fillRect(fe,ne,Q-fe,pe-ne);let Ie=w.createRadialGradient(X,ie,0,X,ie,O*.5);Ie.addColorStop(0,"rgba("+Y[0]+","+Y[1]+","+Y[2]+","+.16*K+")"),Ie.addColorStop(1,"rgba("+Y[0]+","+Y[1]+","+Y[2]+",0)"),w.fillStyle=Ie,w.fillRect(fe,ne,Q-fe,pe-ne)}function ve(W,le){if(S.warm===!1||!N||N.i<.01)return;Ue(W);let A=W.warmRect;A&&(x.globalCompositeOperation="lighter",x.globalAlpha=le,x.drawImage(W.warmCv,A[0],A[1],A[2],A[3],W.layers.ox+A[0]*2,W.layers.oy+A[1]*2,A[2]*2,A[3]*2),x.globalAlpha=1,x.globalCompositeOperation="source-over")}function ue(W,le){let A=le-W.at,b=t(A/W.prop,0,1),w=1,I=0;return b=1-Math.pow(1-b,2.2),D&&le>D.from&&(I=t((le-D.from)/(D.to-D.from),0,1)),P&&(b=A>=0?1:0,w=t(A/260,0,1)*(1-t(I*1.2,0,1)),I=0,D&&le>D.from&&(w=Math.min(w,1-t((le-D.from)/((D.to-D.from)*.8),0,1)))),{age:A,grow:b,heal:I,alpha:w}}function me(W){te(),x.setTransform(1,0,0,1,0,0),x.clearRect(0,0,L,F);let le=G.map(b=>ue(b,W)),A=[];for(let b=0;b<G.length;b++)le[b].age>=0&&le[b].grow>=1&&le[b].heal===0&&le[b].alpha>=1&&A.push(b);if(A.length>1){let b=A.join();if(q||(q=l(L,F)),b!==ee){let w=q.getContext("2d");w.clearRect(0,0,L,F),A.forEach(I=>w.drawImage(G[I].layers.base,G[I].layers.ox,G[I].layers.oy)),ee=b}x.drawImage(q,0,0)}else if(A.length===1){let b=G[A[0]].layers;x.drawImage(b.base,b.ox,b.oy)}A.forEach(b=>ve(G[b],1));for(let b=0;b<G.length;b++){let w=G[b],I=le[b];if(I.age<0||I.heal>=1||A.indexOf(b)>=0)continue;let z=w.layers;if(!(!P&&I.age<17)){if(I.heal>0&&!P&&I.grow>=1){_e(w,I.heal,I.alpha);continue}if(!P&&I.grow<1){xe(w,w.maxR*1.2*I.grow,I.alpha);continue}x.globalAlpha=I.alpha,x.drawImage(z.base,z.ox,z.oy),x.globalAlpha=1}}V&&Pe(W,le);for(let b=0;b<G.length&&!P;b++){let w=G[b],I=le[b];if(!(I.age<0||I.heal>=1)&&S.glints!==!1&&I.age>w.prop*.6){let z=t((I.age-w.prop*.6)/200,0,1),X=I.heal>0?1-t(I.heal*1.5,0,1):1,ie=I.heal>0?w.maxR*1.2*(1-I.heal*I.heal*(3-2*I.heal)):w.maxR*1.2*I.grow;x.globalCompositeOperation="lighter",x.lineCap="round",w.geo.glints.forEach(O=>{let K=Math.sin(W*O.f+O.ph),Y=K>.55?(K-.55)/.45:0;if(Y<=.02||Math.hypot(O.x-w.cx,O.y-w.cy)>ie*.9)return;let fe=O.s*(.5+Y),ne=Y*z*X,Q=N?t(1-Math.hypot(O.x-N.x*L,O.y-N.y*F)/(L*.3),0,1)*N.i:0;x.strokeStyle="rgba(255,"+Math.round(255-60*Q)+","+Math.round(255-130*Q)+","+ne+")",x.lineWidth=Math.max(.7,.9*w.u),x.beginPath(),x.moveTo(O.x-fe,O.y),x.lineTo(O.x+fe,O.y),x.moveTo(O.x,O.y-fe*.9),x.lineTo(O.x,O.y+fe*.9),x.stroke()}),x.globalCompositeOperation="source-over"}}}function B(){T.parentNode&&T.parentNode.removeChild(T),G.length=0,q=null}return{hit:De,light:Je,seal:de,render:me,dispose:B,canvas:T,cockpit:he,ventPoints:ae,get hits(){return G}}}i.Cracks={create:M}})(typeof window<"u"?window:globalThis);(function(i){"use strict";let e=(d,_,y)=>Math.min(y,Math.max(_,d)),t=Math.PI*2;function n(d){return function(){d|=0,d=d+1831565813|0;let _=Math.imul(d^d>>>15,1|d);return _=_+Math.imul(_^_>>>7,61|_)^_,((_^_>>>14)>>>0)/4294967296}}let s=`#version 300 es
  in vec2 p; out vec2 vUv; void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`,r=`#version 300 es
  in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`,a=`#version 300 es
  precision highp float; uniform sampler2D tSeed; in vec2 vUv; out vec4 o;
  void main(){ o = texture(tSeed, vUv); }`,o=`#version 300 es
  precision highp float; precision highp sampler2D; uniform sampler2D tJ; uniform float uStep; uniform vec2 uSize; in vec2 vUv; out vec4 o;
  void main(){
    vec2 me = vUv * uSize; vec4 best = vec4(-1.); float bd = 1e20;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 q = vUv + vec2(float(i), float(j)) * uStep / uSize; if (q.x < 0. || q.y < 0. || q.x > 1. || q.y > 1.) continue;
      vec4 s = texture(tJ, q); if (s.x < 0.) continue; float d = dot(s.xy - me, s.xy - me); if (d < bd) { bd = d; best = s; }
    }
    o = best; }`,c=`#version 300 es
  precision highp float; precision highp sampler2D; uniform sampler2D tJ, tAttr; uniform vec2 uSize; in vec2 vUv; out vec4 o;
  void main(){ vec4 s = texture(tJ, vUv); if (s.x < 0.) { o = vec4(9., 0., 0., 0.); return; }
    vec2 me = vUv * uSize; float d = length(s.xy - me) / uSize.y; vec4 a = texelFetch(tAttr, ivec2(s.xy), 0); o = vec4(d, a.x * 255., (a.y * 255. * 256. + a.w * 255.) / 65535., a.z); }`,l=`#version 300 es
  precision highp float; precision highp sampler2D; precision highp sampler2DArray;
  uniform sampler2DArray uField; uniform float uT, uAspect, uReduced; uniform vec2 uSeal;
  uniform float uAt[4], uProp[4], uS[4], uMaxR[4]; uniform vec2 uCore[4]; uniform int uN;
  in vec2 vUv; out vec4 outc;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }
  float tOpen(int i, float rN){ return uAt[i] + uProp[i] * (1. - pow(1. - min(1., rN / 1.2), 1. / 2.2)); }
  float tClose(float rN){ return mix(uSeal.x, uSeal.y, clamp(1. - rN, 0., 1.)); }             // linear tip -> core, same as the cracks module
  float tClr(float rN){ return uSeal.x + (.30 + .32 * (1. - rN)) * (uSeal.y - uSeal.x); }   // fog / rime clear a little ahead of the crack lines, tip first
  float Xf(float ms){ float a = max(ms, 0.) / 1000.; return a < .4 ? .46 * a : .184 + .276 * (1. - exp(-(a - .4) / .6)); }   // distance travelled (sh): 500 px/s for 400 ms, then decaying with tau = 600 ms
  vec4 over(vec4 s, vec4 dst){ return s + (1. - s.a) * dst; }
  vec4 hitLayer(int i){
    vec4 F = texture(uField, vec3(vUv, float(i))); float d = F.x, rN = F.z, w = F.w;
    if (d > .26) return vec4(0.);
    vec2 p = vUv * vec2(uAspect, 1.);
    float tO = tOpen(i, rN), tC = tClr(rN), T = uT;
    float age = T - tO; if (uReduced > .5) { age = uT >= uAt[i] ? 4000. : -1.; T = uAt[i] + 4000.; } if (age < 0.) return vec4(0.);
    float tCe = min(tC, 14400.), dC = length(p - uCore[i]), coreW = exp(-dC / .07);
    float sealed = smoothstep(tCe - 100., tCe + 500., uT);
    // A: condensation: a thin fogged band along the cracks (<= 0.04 away from the cores), a short local fog flash at the cores only
    float R = (.003 + .009 * (1. - exp(-age / 1500.))) * (.6 + .8 * w) * (1. + 1.2 * coreW), e = R * (.5 + 1.0 * fbm(p * 9.));
    float flash = uReduced > .5 ? 0. : uS[i] * coreW * exp(-pow((uT - uAt[i] - 150.) / 130., 2.));
    float aFog = (.035 * pow(1. - smoothstep(.0, e, d), 2.2) * (.85 + .3 * fbm(p * 9.)) * (1. + .6 * coreW) + .07 * flash) * (1. - sealed);
    aFog = min(aFog, .04 + .05 * coreW);
    // B: rime hugging the crack line (<= 6 px, <= 0.08), creeping outward along each crack from the core between 6.3 s and 11.3 s, gone well before the sealant reaches it
    float prog = clamp((uT - 6300.) / 5000., 0., 1.), rimeReach = .12 + 1.0 * pow(prog, .8);
    float gR = smoothstep(tO + 250., tO + 2850., T) * (1. - smoothstep(tC - 700., tC - 300., uT)) * (1. - smoothstep(rimeReach - .12, rimeReach, rN));
    float aFr = .10 * (1. - smoothstep(.0, .0030 + .0026 * prog, d)) * (.5 + .5 * fbm(p * 14. + uT * .00006)) * gR * smoothstep(.02, .06, dC);
    // pressure-loss fog hugging the cracks: faint, slowly drifting, slowly thinning (<= 0.03, no veil away from them)
    float aPf = .034 * (1. - .5 * smoothstep(8000., 11400., uT)) * (.2 + .8 * fbm(p * 11. + vec2(uT * .0013, -uT * .0009) + float(i) * 5.)) * (1. - smoothstep(.0, .03, d)) * smoothstep(tO, tO + 600., uT) * (1. - sealed);
    // C: venting: after EACH hit, condensation jets rush along the cracks INTO the hole (>= 600 px/s for ~1.2 s, 80-250 px streaks, up to 0.30 within 120 px of the core, 0 by 250 px),
    // flickering and tearing in pulses; afterwards a weaker steady trickle until ~8.5 s. A faint white frost bloom builds at the core.
    float aV = 0., aCb = 0.;
    float agH = uT - uAt[i];
    if (uReduced < .5 && agH > 0. && uT < 8700.) {
      float jet = 1. - smoothstep(1000., 1700., agH);
      float amp = mix(.22, 1., jet) * (1. - smoothstep(5500., 8500., uT)) * (1. - sealed);
      float sp = .62 * min(agH, 1200.) / 1000. + .10 * max(agH - 1200., 0.) / 1000.;   // distance travelled toward the core (sh): .62 sh/s ~ 670 px/s at 1080p
      if (dC < .24 && d < .04 && amp > .004) {
        float s = rN * uMaxR[i], coord = s + sp, cl = float(i); vec2 dn = (p - uCore[i]) / max(dC, 1e-4); float ang = dn.x * 1.9 + dn.y * 1.3;
        float n1 = vn(vec2(coord / .17 + cl * 11., ang * 1.1 + cl)), n2 = vn(vec2(coord / .08 + 3. + cl * 7., ang * 1.6 + cl * 2.));
        float ridge = smoothstep(.42, .72, n1 * .7 + n2 * .3);
        float tear = smoothstep(.22, .68, vn(vec2(s / .09 + cl * 5., uT * .012 + ang)));
        float pul = .5 + .5 * sin(uT * .034 + cl * 2.1 + 4. * vn(vec2(s / .2, uT * .004)));
        float rad = 1. - smoothstep(.111, .231, dC), across = exp(-pow(d / .0075, 2.)) + .4 * exp(-pow(d / .02, 2.));
        aV = 0. * ridge * (.55 + .45 * tear) * (.7 + .3 * pul) * rad * across * amp * smoothstep(0., 60., agH);
      }
      aCb = .10 * exp(-dC / .035) * smoothstep(0., 900., agH) * (1. - smoothstep(2500., 5500., agH)) * (1. - sealed);
    }
    // seal front: a faint highlight with a darker wet edge, travelling tip -> core from 11.4 s
    float aWet = 0., aHi = 0.;
    if (uT > uSeal.x - 50. && uT < uSeal.y + 200. && uReduced < .5) { float hf = clamp((uT - uSeal.x) / (uSeal.y - uSeal.x), 0., 1.); float rf = 1. - hf; float band = (1. - smoothstep(.02, .10, abs(rN - rf))) * smoothstep(.10, .22, rN) * (1. - smoothstep(.8, .92, hf)); aWet = .20 * band * (1. - smoothstep(0., .0045, d)); aHi = .12 * band * (1. - smoothstep(0., .0014, d)) * (1. - smoothstep(.55, .72, hf)); }
    float tip = smoothstep(.07, .22, w);
    aCb *= 1.;   // cracks taper straight: no soft caps or hairpins around the tips
    aFog *= tip; aFr *= tip; aV *= tip; aPf *= tip;
    float hfG = clamp((uT - uSeal.x) / (uSeal.y - uSeal.x), 0., 1.), gone = 1. - smoothstep(.28, .46, hfG);   // fog / rime / mist are gone before the last cracks retreat
    aFog *= gone; aFr *= gone; aPf *= gone; aV *= gone; aCb *= gone;
    vec4 o = vec4(vec3(.74, .82, .92) * aFr, aFr);
    o += (1. - o.a) * vec4(vec3(.86, .89, .93) * aFog, aFog);
    o += (1. - o.a) * vec4(vec3(.85, .88, .93) * aPf, aPf);
    o += (1. - o.a) * vec4(vec3(.87, .91, .96) * aV, aV);
    o += (1. - o.a) * vec4(vec3(.92, .95, 1.) * aCb, aCb);
    o += (1. - o.a) * vec4(vec3(.08, .10, .13) * aWet, aWet);
    o += (1. - o.a) * vec4(vec3(1.) * aHi, aHi);
    float cap = .45; if (o.a > cap) o *= cap / o.a;
    return o * smoothstep(20., 70., agH); }   // nothing but the flash on the contact frame
  // air leaving the cabin: 2-3 uneven inflow lobes of thin filaments (2-5 px wide, 60-180 px long, 0.15-0.30) that curve 15-25 deg and accelerate toward the hole (300 -> 900 px/s),
  // dense for 0.6 s after the hit then thinning. Angles only enter through sin/cos of differences, so there is no +-pi seam.
  // turbulent condensation: <= 10 short soft wisps per hole whose PATHS are advected on the CPU through a converging curl-noise flow (uniform texture uWisp, 9 points per wisp, head -> tail),
  // plus a soft swirling fog cone at the hole. Wisp width tapers 1 -> 8 px, alpha 0.08-0.22, noise-broken, soft edges. Starts after the contact flash.
  uniform sampler2D uWisp;
  float sdSeg(vec2 p, vec2 a, vec2 b, out float h){ vec2 pa = p - a, ba = b - a; h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0., 1.); return length(pa - ba * h); }
  vec4 vapour(int i, vec2 p){
    vec2 dc = p - uCore[i]; float r = length(dc), agH = uT - uAt[i];
    if (r > .27 || agH < 40. || uT > 8800. || uReduced > .5) return vec4(0.);
    float acc = 0.;
    for (int k = 0; k < 10; k++) {
      int row = i * 10 + k; vec4 h0 = texelFetch(uWisp, ivec2(0, row), 0); if (h0.b <= 0.) continue;
      vec2 prev = h0.xy;
      for (int j = 0; j < 8; j++) {
        vec2 nxt = texelFetch(uWisp, ivec2(j + 1, row), 0).xy; float h;
        float d = sdSeg(p, prev, nxt, h), s = (float(j) + h) / 8.;
        float w = mix(.0009, .0074, s) * h0.a;
        if (d < w) {
          float edge = 1. - smoothstep(.15 * w, w, d);
          float nb = .7 + .3 * smoothstep(.1, .9, vn(vec2(s * 5. + float(row) * 3.1, d / w * .8 + uT * .0007)));   // breaks along the length only, never into islands      // noise-broken
          float a = h0.b * edge * nb * smoothstep(0., .4, s) * (1. - smoothstep(.55, 1., s)) * 1.8;   // spindle: no round cap at either end                                                   // the tail is the fuller part, the head tapers away
          acc = 1. - (1. - acc) * (1. - a);
        }
        prev = nxt;
      }
    }
    // swirling fog cone at the hole: radius ~50-80 px, <= 0.25, rotating slowly, fading over ~1 s
    float R = .074, rot = agH * .0016 * (1. - clamp(r / R, 0., 1.)) + float(i);
    vec2 q = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * dc;
    float fog = .25 * pow(1. - smoothstep(0., R, r), 1.6) * (.4 + .6 * fbm(q * 34. + float(i) * 5.)) * smoothstep(40., 180., agH) * (1. - smoothstep(500., 1150., agH));
    float a = clamp(acc * (1. - .65 * smoothstep(5500., 8600., uT)) + fog, 0., .3);
    return vec4(vec3(.91, .95, 1.) * a, a);
  }
  // explosive-decompression fog (Wilson cloud): forms in ~120 ms around the hole, then is advected INTO the hole (inflow 200 -> 1200 px/s, ~25% swirl), streaks stretched 4:1 along the flow.
  // Semi-Lagrangian: trace each pixel back through the flow to its source position, sample a domain-warped 2-octave noise there. Material outside the source disc is empty, so the outer region drains by transport.
  vec4 veil(int i, vec2 p){
    vec2 dc = p - uCore[i]; float r = length(dc), agH = uT - uAt[i];
    float Rs = i >= 2 ? .60 : .39;
    if (agH < 17. || agH > 1500. || r > Rs * 1.5 || uT > 8800. || uReduced > .5) return vec4(0.);
    float age = min(agH, 1300.) / 1000.;
    vec2 d = dc;                                                                           // Cartesian throughout: no polar angle, so no +-pi seam and no radius-locked bands
    float dt = age / 8.;
    for (int k = 0; k < 8; k++) {                                                          // trace back to where this air was at formation
      float rk = max(length(d), 1e-4), v = .185 + .93 * exp(-rk / .09);
      vec2 e = d / rk, tg = vec2(-e.y, e.x);                                               // swirl direction = perpendicular vector, normalised
      d += (e - .25 * tg) * v * dt;
    }
    float src = 1. - smoothstep(.55 * Rs, Rs, length(d));
    // streaks: line-integral of a warped 2-octave noise along the (curved) flow path, so they stretch along the flow and converge into the hole
    float sd = float(i) * 7.3, acc = 0., dtl = .05;
    vec2 ds = d;
    for (int k = 0; k < 7; k++) {
      vec2 q = (uCore[i] + ds) * 3.0 + vec2(sd, 1.7);
      vec2 wp = vec2(vn(q * .6 + vec2(3.1, sd)), vn(q * .6 + vec2(7.7, 2. * sd))) - .5;
      q += wp * 2.6;
      acc += .62 * vn(q) + .38 * vn(q * 2.1 + vec2(5.2, 1.3 + sd));
      float rk = max(length(ds), 1e-4), v = .185 + .93 * exp(-rk / .09);
      vec2 e = ds / rk, tg = vec2(-e.y, e.x);
      ds += (e - .25 * tg) * v * dtl;
    }
    float n = clamp(.5 + (acc / 7. - .5) * 2.3, 0., 1.);
    float cov = .42 + .58 * smoothstep(.10, .85, n);
    float form = smoothstep(17., 120., agH), clear = 1. - smoothstep(780., 1300., agH);
    float dens = 1. + .5 * exp(-r / .045) * (1. - smoothstep(500., 1300., agH));         // brief pile-up at the hole
    float a = .31 * cov * src * form * clear * dens * smoothstep(.005, .03, r);
    a = min(a, r < .056 ? .35 : .30);
    float col = 1. - smoothstep(.02, .04, r), collar = .05 * col * (1. - smoothstep(1300., 1500., agH)) * form;   // thin collar left behind
    a = max(a, collar);
    return vec4(vec3(.875, .91, .949) * a, a);
  }
  void main(){
    vec4 o = vec4(0.); vec2 p = vUv * vec2(uAspect, 1.);
    for (int i = 0; i < 4; i++) { if (i >= uN) break; o = over(hitLayer(i), o); }
    for (int i = 0; i < 4; i++) { if (i >= uN) break; o = over(veil(i, p), o); o = over(vapour(i, p), o); }
    for (int i = 0; i < 4; i++) { if (i >= uN || uReduced > .5) break;
      float age = uT - uAt[i]; if (age < 0. || age > 700.) continue; float r = length(p - uCore[i]), s = uS[i];
      // heat bloom in the glass: one soft gradient, 0.30 -> 0.45 over the first 120 ms, orange to dull red by 400 ms, gone by ~560 ms
      { float hR = (.045 + .04 * s) * (1. + age / 500.), ht = (age < 120. ? .30 + .15 * age / 120. : .45) * (1. - smoothstep(120., 560., age)), hd = pow(1. - smoothstep(0., hR, r), 1.7);
        vec3 hc = mix(vec3(1., .52, .16), vec3(.52, .1, .06), smoothstep(20., 400., age)); float a = ht * hd * (.6 + .4 * s); o = over(vec4(hc * a, a), o); }
      // plasma flash on the glass: one soft white-blue disk, full strength on the contact frame, 40 ms decay, R = 0.05 H (1 + s)
      { float R = .05 * (1. + s), dk = 1. - smoothstep(0., R, r), a = .9 * dk * dk * exp(-age / 40.); o = over(vec4(vec3(.82, .9, 1.) * a, a), o); }
    }
    outc = o; }`,h=`#version 300 es
  in vec2 q; in vec4 iA; in vec4 iB; in vec4 iC;   // iA: center(px/H units: x*aspect, y), len, thickness  iB: angle, kind(0 slit 1 sink), tOpen, tClose  iC: hit, variantOffset, maxAlpha, flip
  uniform float uAspect; out vec2 vUv; out vec4 vB; out vec4 vC;
  void main(){
    vec2 c = iA.xy; float L = iA.z, Th = iA.w, ang = iB.x; vec2 loc = vec2(q.x * L, q.y * Th) * .5;
    float ca = cos(ang), sa = sin(ang); vec2 pp = c + vec2(ca * loc.x - sa * loc.y, sa * loc.x + ca * loc.y);
    vUv = vec2(q.x * .5 + .5, iC.w > .5 ? .5 - q.y * .5 : .5 + q.y * .5); vB = iB; vC = iC;
    gl_Position = vec4(pp.x / uAspect * 2. - 1., 1. - pp.y * 2., 0., 1.); }`,u=`#version 300 es
  precision highp float; precision highp sampler2D; uniform sampler2D tSlit, tSink; uniform float uT, uReduced; uniform vec2 uGridSlit, uGridSink; in vec2 vUv; in vec4 vB; in vec4 vC; out vec4 outc;
  vec4 fetch(sampler2D t, vec2 grid, float f, float nf){ float col = mod(f, grid.x), row = floor(f / grid.x); return texture(t, (vec2(col, row) + vUv) / grid); }
  void main(){
    if (uReduced > .5) discard;
    float tO = vB.z, tC = vB.w, age = uT - tO; if (age < 0. || uT > tC + 250.) discard;
    float fin = smoothstep(150., 300., age), hit = vC.x, steady = mix(.55, 1., 1. - smoothstep(1200., 2400., uT - tO));
    float a = vC.z * fin * steady * (1. - smoothstep(tC, tC + 250., uT));
    float fr = age / 1000. * 20. + vC.y, f0 = floor(fr), mf = fract(fr); vec4 s0, s1;
    if (vB.y < .5) { s0 = fetch(tSlit, uGridSlit, mod(f0, 32.) + (vC.y > 31. ? 32. : 0.), 64.); s1 = fetch(tSlit, uGridSlit, mod(f0 + 1., 32.) + (vC.y > 31. ? 32. : 0.), 64.); }
    else { s0 = fetch(tSink, uGridSink, mod(f0, 32.), 32.); s1 = fetch(tSink, uGridSink, mod(f0 + 1., 32.), 32.); }
    vec4 s = mix(s0, s1, mf); float edge = smoothstep(0., .2, vUv.x) * smoothstep(1., .8, vUv.x) * smoothstep(0., .25, vUv.y) * smoothstep(1., .75, vUv.y); outc = s * a * edge; }`;function f(d,_){_=_||{};let y=document.createElement("canvas");y.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block",d.appendChild(y);let g=_.dpr||i.devicePixelRatio||1,p=_.maxWidth||1920,E=!!_.reduced,m=y.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,preserveDrawingBuffer:!!_.preserveDrawingBuffer});if(!m||!m.getExtension("EXT_color_buffer_float"))return{setCracks(){},setSeal(){},render(){},dispose(){y.remove()},ok:!1};let M=0,v=0,S=null,T={from:11400,to:13800},x=[],C=[],P=null,U=0,L=0,F={},N=m.createBuffer();m.bindBuffer(m.ARRAY_BUFFER,N),m.bufferData(m.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),m.STATIC_DRAW);function D(w,I){let z=(O,K)=>{let Y=m.createShader(O);return m.shaderSource(Y,K),m.compileShader(Y),m.getShaderParameter(Y,m.COMPILE_STATUS)||console.warn("Glass shader",m.getShaderInfoLog(Y)),Y},X=m.createProgram();m.attachShader(X,z(m.VERTEX_SHADER,w)),m.attachShader(X,z(m.FRAGMENT_SHADER,I)),m.linkProgram(X),X.u={};let ie=m.getProgramParameter(X,m.ACTIVE_UNIFORMS);for(let O=0;O<ie;O++){let K=m.getActiveUniform(X,O).name.replace(/\[0\]$/,"");X.u[K]=m.getUniformLocation(X,m.getActiveUniform(X,O).name)}return X}let V=D(r,o),q=D(r,c),ee=D(s,l),G=D(h,u);function te(w,I,z,X,ie,O,K){let Y=m.createTexture();return m.bindTexture(m.TEXTURE_2D,Y),O&&!(O.buffer||O instanceof ArrayBuffer)?m.texImage2D(m.TEXTURE_2D,0,z,X,ie,O):m.texImage2D(m.TEXTURE_2D,0,z,w,I,0,X,ie,O),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MIN_FILTER,K),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MAG_FILTER,K),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_S,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_T,m.CLAMP_TO_EDGE),Y}function ce(w){let I=m.createFramebuffer();return m.bindFramebuffer(m.FRAMEBUFFER,I),m.framebufferTexture2D(m.FRAMEBUFFER,m.COLOR_ATTACHMENT0,m.TEXTURE_2D,w,0),I}function Le(w){m.bindBuffer(m.ARRAY_BUFFER,N);let I=m.getAttribLocation(w,"p");m.enableVertexAttribArray(I),m.vertexAttribPointer(I,2,m.FLOAT,!1,0,0)}function Ce(w,I){m.useProgram(w),Le(w),I&&I(),m.drawArrays(m.TRIANGLE_STRIP,0,4)}let Ne=null;function ze(w){Ne&&m.deleteTexture(Ne),Ne=te(w.width,w.height,m.RGBA8,m.RGBA,m.UNSIGNED_BYTE,w,m.LINEAR),m.bindTexture(m.TEXTURE_2D,Ne),m.generateMipmap(m.TEXTURE_2D),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MIN_FILTER,m.LINEAR_MIPMAP_LINEAR),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_S,m.REPEAT),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_T,m.REPEAT)}function tt(){let w=document.createElement("canvas");w.width=w.height=256;let I=w.getContext("2d");I.fillStyle="rgb(128,128,0)",I.fillRect(0,0,256,256);let z=I.getImageData(0,0,256,256);for(let X=0;X<65536;X++){let ie=X&255,O=X>>8,K=Math.sin(ie*.4)*Math.sin(O*.4)*.5+.5;z.data[X*4]=255*K,z.data[X*4+1]=255*(K>.5?1:.2),z.data[X*4+2]=0,z.data[X*4+3]=255}I.putImageData(z,0,0),ze(w)}if(tt(),_.frostUrl!==!1){let w=new Image;w.onload=()=>ze(w),w.src=_.frostUrl||"../vfx/frost_dla.png"}let Z=m.createTexture();m.bindTexture(m.TEXTURE_2D,Z),m.texImage2D(m.TEXTURE_2D,0,m.RGBA32F,9,40,0,m.RGBA,m.FLOAT,null),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MIN_FILTER,m.NEAREST),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MAG_FILTER,m.NEAREST),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_S,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_T,m.CLAMP_TO_EDGE);let ae=new Float32Array(360*4),he=(w,I)=>{let z=Math.sin(w*127.1+I*311.7)*43758.5453;return z-Math.floor(z)},Pe=(w,I,z)=>(z=e((z-w)/(I-w),0,1),z*z*(3-2*z)),Ae=w=>Array.from({length:4},(I,z)=>{let X=he(w*11+z,1)*6.2832,ie=16+10*he(w*11+z,2);return{kx:Math.cos(X)*ie,ky:Math.sin(X)*ie,w:3+4*he(w*11+z,3),ph:he(w*11+z,4)*6.2832,A:.13/ie}}),De=[0,0];function Je(w,I,z,X,ie,O){let K=ie-w,Y=O-I,fe=Math.hypot(K,Y)||1e-4,ne=K/fe,Q=Y/fe,pe=1-Math.min(1,fe/.23),we=.3+.5*pe,Ie=.1+.22*pe,H=ne*we-Q*Ie,ye=Q*we+ne*Ie;for(let se of X){let Se=Math.cos(se.kx*w+se.ky*I+se.w*z+se.ph)*se.A;H+=Se*se.ky,ye-=Se*se.kx}De[0]=H,De[1]=ye}function de(w){ae.fill(0);let I=.02;x.forEach((z,X)=>{if(X>3)return;let ie=Ae(X),O=z.core[0],K=z.core[1],Y=(w-z.at)/1e3,fe=(1-.65*Pe(.6,1.5,Y))*(1-Pe(5.5,8.5,Y+z.at/1e3-0));for(let ne=0;ne<10;ne++){let Q=X*100+ne*7,pe=.45+.35*he(Q,1),we=-.3*he(Q,2),Ie=Y-we;if(Y<.03)continue;let H=Math.floor(Ie/pe),ye=Ie-H*pe,se=.55+.4*he(Q,4);if(ye>se||he(Q+H*13.7,3)>fe)continue;let Se=Math.floor(Math.pow(he(Q+H,5),1.7)*3),Te=he(X*31+Se,6)*6.2832,be=.25+.3*he(X*7+Se,7),Be=Te+(he(Q+H*1.7,8)-.5)*2*be,ke=.07+.1*he(Q+H,9),ht=O+Math.cos(Be)*ke,st=K+Math.sin(Be)*ke,Gt=w/1e3-ye,Tt=[ht,st],Gn=Math.floor(ye/I);for(let mn=0;mn<Gn;mn++)Je(ht,st,Gt+mn*I,ie,O,K),ht+=De[0]*I,st+=De[1]*I,Tt.push(ht,st);let Vn=Tt.length/2,li=Math.hypot(Tt[Tt.length-2]-O,Tt[Tt.length-1]-K),Wn=(.17+.05*he(Q,5))*Pe(.03,.12,Y)*Pe(0,.08,ye)*Pe(0,.15,se-ye)*Pe(.018,.05,li);if(Wn<=.002)continue;let hi=X*10+ne;if(Vn<3)continue;let ui=Math.min(Vn-1,10);for(let mn=0;mn<9;mn++){let re=Vn-1-ui*mn/8,je=Math.floor(re),He=Math.min(Vn-1,je+1),Xe=re-je,Ze=(hi*9+mn)*4;ae[Ze]=Tt[je*2]*(1-Xe)+Tt[He*2]*Xe,ae[Ze+1]=Tt[je*2+1]*(1-Xe)+Tt[He*2+1]*Xe,ae[Ze+2]=Wn,ae[Ze+3]=.75+.5*he(Q,6)}}}),m.activeTexture(m.TEXTURE2),m.bindTexture(m.TEXTURE_2D,Z),m.texSubImage2D(m.TEXTURE_2D,0,0,0,9,40,m.RGBA,m.FLOAT,ae)}let ge=te(1,1,m.RGBA8,m.RGBA,m.UNSIGNED_BYTE,new Uint8Array(4),m.NEAREST),xe={slit:ge,sink:ge,gs:[8,8],gk:[8,4],n:0};function _e(w,I){if(!I)return;let z=new Image;if(z.onload=()=>{let X=te(z.width,z.height,m.RGBA8,m.RGBA,m.UNSIGNED_BYTE,z,m.LINEAR);xe[w]=X,xe.n++},z.src=I.url,I.json){let X=I.json.grid||[I.json.columns,I.json.rows];w==="slit"?xe.gs=X:xe.gk=X}}_.atlas&&(_e("slit",_.atlas.slit),_e("sink",_.atlas.sink));function Me(){let w=(d.clientWidth||i.innerWidth)*g,I=(d.clientHeight||i.innerHeight)*g,z=Math.min(1,p/w)*.75,X=Math.max(2,Math.round(w*z)),ie=Math.max(2,Math.round(I*z));(X!==y.width||ie!==y.height)&&(y.width=X,y.height=ie),M=d.clientWidth||i.innerWidth,v=d.clientHeight||i.innerHeight}function Ue(w){S=w,Me();let I=w.hits||[];x=[];let z=w.canvas.width,X=w.canvas.height;U=Math.min(2048,Math.max(256,z)),L=Math.round(U*X/z);let ie=U/z,O=L/X,K=Math.max(1,I.length);P&&m.deleteTexture(P),P=m.createTexture(),m.bindTexture(m.TEXTURE_2D_ARRAY,P),m.texStorage3D(m.TEXTURE_2D_ARRAY,1,m.RGBA16F,U,L,K),m.texParameteri(m.TEXTURE_2D_ARRAY,m.TEXTURE_MIN_FILTER,m.LINEAR),m.texParameteri(m.TEXTURE_2D_ARRAY,m.TEXTURE_MAG_FILTER,m.LINEAR),m.texParameteri(m.TEXTURE_2D_ARRAY,m.TEXTURE_WRAP_S,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D_ARRAY,m.TEXTURE_WRAP_T,m.CLAMP_TO_EDGE),m.viewport(0,0,U,L),m.disable(m.BLEND);let Y=te(U,L,m.RGBA32F,m.RGBA,m.FLOAT,null,m.NEAREST),fe=ce(Y);I.forEach((ne,Q)=>{let pe=new Float32Array(U*L*4).fill(-1),we=new Uint8Array(U*L*4),Ie=ne.u,H=ne.geo.rays.filter(st=>st.depth<=2).concat(ne.geo.bridges);for(let st of H)for(let Gt=1;Gt<st.pts.length;Gt++){let Tt=st.pts[Gt-1],Gn=st.pts[Gt],Vn=Math.hypot(Gn.x-Tt.x,Gn.y-Tt.y)*ie,li=Math.max(1,Math.ceil(Vn*2));for(let Wn=0;Wn<=li;Wn++){let hi=Wn/li,ui=Tt.x+(Gn.x-Tt.x)*hi,mn=Tt.y+(Gn.y-Tt.y)*hi,re=Math.floor(ui*ie),je=Math.floor(mn*O);if(re<0||je<0||re>=U||je>=L)continue;let He=(je*U+re)*4,Xe=Math.min(1,Math.hypot(ui-ne.cx,mn-ne.cy)/ne.maxR),Ze=e((Tt.w+(Gn.w-Tt.w)*hi)/(7*Ie),0,1);pe[He]=re+.5,pe[He+1]=je+.5,pe[He+2]=0,pe[He+3]=1,we[He]=Q+1;let $e=Math.round(Xe*65535);we[He+1]=$e>>8,we[He+3]=$e&255,we[He+2]=Math.round(Ze*255)}}x.push({at:ne.at,prop:ne.prop,s:ne.strength,maxR:ne.maxR/X,core:[ne.cx/X,ne.cy/X]});let ye=te(U,L,m.RGBA32F,m.RGBA,m.FLOAT,pe,m.NEAREST),se=te(U,L,m.RGBA8,m.RGBA,m.UNSIGNED_BYTE,we,m.NEAREST),Se=ce(ye),Te=ye,be=Y,Be=Se,ke=fe;for(let st=Math.pow(2,Math.ceil(Math.log2(Math.max(U,L)))-1);st>=1;st/=2)m.bindFramebuffer(m.FRAMEBUFFER,ke),Ce(V,()=>{m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D,Te),m.uniform1i(V.u.tJ,0),m.uniform1f(V.u.uStep,st),m.uniform2f(V.u.uSize,U,L)}),[Te,be]=[be,Te],[Be,ke]=[ke,Be];let ht=m.createFramebuffer();m.bindFramebuffer(m.FRAMEBUFFER,ht),m.framebufferTextureLayer(m.FRAMEBUFFER,m.COLOR_ATTACHMENT0,P,0,Q),Ce(q,()=>{m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D,Te),m.uniform1i(q.u.tJ,0),m.activeTexture(m.TEXTURE1),m.bindTexture(m.TEXTURE_2D,se),m.uniform1i(q.u.tAttr,1),m.uniform2f(q.u.uSize,U,L)}),m.bindFramebuffer(m.FRAMEBUFFER,null),m.deleteTexture(ye),m.deleteTexture(se),m.deleteFramebuffer(Se),m.deleteFramebuffer(ht)}),m.deleteTexture(Y),m.deleteFramebuffer(fe),B(I,z,X)}function ve(w){T={from:w.from,to:w.to},S&&B(S.hits||[],S.canvas.width,S.canvas.height)}let ue=w=>(w=e(w,0,1),w*w*(3-2*w));function me(w){let I=0,z=1;for(let X=0;X<24;X++){let ie=(I+z)/2;ue(ie)<w?I=ie:z=ie}return(I+z)/2}function B(w,I,z){let X=[],ie=I/z;C=[],w.forEach((O,K)=>{let Y=n(800+K),fe=O.u,ne=[],Q=0;for(let ye of O.geo.rays.filter(se=>se.depth<=1).concat(O.geo.bridges))for(let se=1;se<ye.pts.length;se++){let Se=ye.pts[se-1],Te=ye.pts[se],be=Math.hypot(Te.x-Se.x,Te.y-Se.y),Be=(Se.x+Te.x)/2,ke=(Se.y+Te.y)/2,ht=Math.hypot(Be-O.cx,ke-O.cy);if(ht>.35*O.maxR||be<6*fe)continue;let st=be*Te.w*Math.exp(-ht/(.45*O.maxR));Q+=st,ne.push({a:Se,b:Te,wt:st,cum:Q,rr:ht})}let pe=ye=>O.at+O.prop*(1-Math.pow(1-Math.min(1,ye/1.2),1/2.2)),we=ye=>T.from+e(1-ye,0,1)*(T.to-T.from),Ie=Math.round(6+6*O.strength);for(let ye=0;ye<Ie&&ne.length;ye++){let se=Y()*Q,Se=0;for(;Se<ne.length-1&&ne[Se].cum<se;)Se++;let Te=ne[Se],be=Y(),Be=Te.a.x+(Te.b.x-Te.a.x)*be,ke=Te.a.y+(Te.b.y-Te.a.y)*be,ht=Math.atan2(Te.b.y-Te.a.y,Te.b.x-Te.a.x),st=Te.rr/O.maxR,Gt=.06+.08*Y();X.push(Be/z,ke/z,Gt,Gt*.5,ht,0,pe(st),we(st),K,Math.floor(Y()*32)+(Y()<.5?0:32),.3*(.7+.3*Y()),Y()<.5?1:0)}let H=6*O.geo.coreR/z;X.push(O.cx/z,O.cy/z,H,H,Y()*t,1,pe(0),T.to,K,Math.floor(Y()*32),.38,0)}),C=X}let W=null,le=null;function A(w){if(x.length&&!E&&de(w),Me(),m.bindFramebuffer(m.FRAMEBUFFER,null),m.viewport(0,0,y.width,y.height),m.clearColor(0,0,0,0),m.clear(m.COLOR_BUFFER_BIT),!P||!x.length)return;m.enable(m.BLEND),m.blendFunc(m.ONE,m.ONE_MINUS_SRC_ALPHA);let I=y.width/y.height;if(Ce(ee,()=>{m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D_ARRAY,P),m.uniform1i(ee.u.uField,0),m.activeTexture(m.TEXTURE2),m.bindTexture(m.TEXTURE_2D,Z),m.uniform1i(ee.u.uWisp,2),m.activeTexture(m.TEXTURE0),m.uniform1f(ee.u.uT,w),m.uniform1f(ee.u.uAspect,I),m.uniform1f(ee.u.uReduced,E?1:0),m.uniform2f(ee.u.uSeal,T.from,T.to),m.uniform1i(ee.u.uN,x.length);let z=[0,0,0,0],X=[0,0,0,0],ie=[0,0,0,0],O=[0,0,0,0],K=[0,0,0,0,0,0,0,0];x.forEach((Y,fe)=>{z[fe]=Y.at,X[fe]=Y.prop,ie[fe]=Y.s,O[fe]=Y.maxR,K[fe*2]=Y.core[0],K[fe*2+1]=Y.core[1]}),m.uniform1fv(ee.u.uMaxR,O),m.uniform1fv(ee.u.uAt,z),m.uniform1fv(ee.u.uProp,X),m.uniform1fv(ee.u.uS,ie),m.uniform2fv(ee.u.uCore,K)}),!E&&C.length&&xe.n>0){W||(W=m.createBuffer(),le=m.createVertexArray()),m.bindVertexArray(le),m.useProgram(G),m.bindBuffer(m.ARRAY_BUFFER,N);let z=m.getAttribLocation(G,"q");m.enableVertexAttribArray(z),m.vertexAttribPointer(z,2,m.FLOAT,!1,0,0),m.vertexAttribDivisor(z,0),m.bindBuffer(m.ARRAY_BUFFER,W),m.bufferData(m.ARRAY_BUFFER,new Float32Array(C),m.DYNAMIC_DRAW),["iA","iB","iC"].forEach((X,ie)=>{let O=m.getAttribLocation(G,X);m.enableVertexAttribArray(O),m.vertexAttribPointer(O,4,m.FLOAT,!1,48,ie*16),m.vertexAttribDivisor(O,1)}),m.uniform1f(G.u.uAspect,I),m.uniform1f(G.u.uT,w),m.uniform1f(G.u.uReduced,0),m.uniform2f(G.u.uGridSlit,xe.gs[0],xe.gs[1]),m.uniform2f(G.u.uGridSink,xe.gk[0],xe.gk[1]),m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D,xe.slit),m.uniform1i(G.u.tSlit,0),m.activeTexture(m.TEXTURE1),m.bindTexture(m.TEXTURE_2D,xe.sink),m.uniform1i(G.u.tSink,1),m.drawArraysInstanced(m.TRIANGLE_STRIP,0,4,C.length/12),m.vertexAttribDivisor(m.getAttribLocation(G,"iA"),0),m.vertexAttribDivisor(m.getAttribLocation(G,"iB"),0),m.vertexAttribDivisor(m.getAttribLocation(G,"iC"),0),m.bindVertexArray(null)}}function b(){y.remove();let w=m.getExtension("WEBGL_lose_context");w&&w.loseContext()}return{setCracks:Ue,setSeal:ve,render:A,dispose:b,canvas:y,ok:!0}}i.Glass={create:f}})(typeof window<"u"?window:globalThis);var $u={};Dp($u,{StubCracks:()=>Ml,T:()=>Nt,createAttackScene:()=>Yv});var Wf=0,fh=1,qf=2;var Fa=1,Xf=2,Mr=3,Si=0,sn=1,pn=2,On=0,Sr=1,dh=2,ph=3,mh=4,Na=5;var Ti=100,jf=101,Kf=102,Yf=103,Jf=104,Zf=200,Xi=201,$f=202,Qf=203,gh=204,Tr=205,ed=206,td=207,nd=208,id=209,sd=210,rd=211,ad=212,od=213,cd=214,Do=0,Fo=1,No=2,ir=3,Uo=4,Oo=5,Bo=6,ko=7,uc=0,ld=1,hd=2,ai=0,bh=1,xh=2,_h=3,Is=4,vh=5,Ua=6,yh=7,Jl="attached",ud="detached",Mh=300,cs=301,Ls=302,fc=303,dc=304,Oa=306,ss=1e3,Xn=1001,sr=1002,Xt=1003,pc=1004;var Ds=1005;var It=1006,Er=1007;var Bn=1008;var In=1009,Sh=1010,Th=1011,wr=1012,mc=1013,oi=1014,kn=1015,Ln=1016,gc=1017,bc=1018,Ar=1020,Eh=35902,wh=35899,Ah=1021,Rh=1022,vn=1023,mi=1026,ls=1027,xc=1028,_c=1029,hs=1030,vc=1031;var yc=1033,Ba=33776,ka=33777,za=33778,Ha=33779,Mc=35840,Sc=35841,Tc=35842,Ec=35843,wc=36196,Ac=37492,Rc=37496,Cc=37488,Pc=37489,Ga=37490,Ic=37491,Lc=37808,Dc=37809,Fc=37810,Nc=37811,Uc=37812,Oc=37813,Bc=37814,kc=37815,zc=37816,Hc=37817,Gc=37818,Vc=37819,Wc=37820,qc=37821,Xc=36492,jc=36494,Kc=36495,Yc=36283,Jc=36284,Va=36285,Zc=36286;var ys=2300,Ms=2301,Po=2302,Zl=2303,$l=2400,Ql=2401,eh=2402,fd=2500;var Ch=0,Wa=1,Rr=2,dd=3200;var qa=0,pd=1,ji="",Vt="srgb",En="srgb-linear",ea="linear",At="srgb";var Io=7680;var md=519,gd=512,bd=513,xd=514,$c=515,_d=516,vd=517,Qc=518,yd=519,Ph=35044,Cr=35048;var Ih="300 es",ri=2e3,rr=2001;function Fp(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Np(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function ar(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Md(){let i=ar("canvas");return i.style.display="block",i}var ef={},or=null;function ta(...i){let e="THREE."+i.shift();or?or("log",e,...i):console.log(e,...i)}function Sd(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function et(...i){i=Sd(i);let e="THREE."+i.shift();if(or)or("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function at(...i){i=Sd(i);let e="THREE."+i.shift();if(or)or("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function vs(...i){let e=i.join(" ");e in ef||(ef[e]=!0,et(...i))}function Td(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Ed={[Do]:Fo,[No]:Bo,[Uo]:ko,[ir]:Oo,[Fo]:Do,[Bo]:No,[ko]:Uo,[Oo]:ir},gi=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},gn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],tf=1234567,Jr=Math.PI/180,Ss=180/Math.PI;function jn(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(gn[i&255]+gn[i>>8&255]+gn[i>>16&255]+gn[i>>24&255]+"-"+gn[e&255]+gn[e>>8&255]+"-"+gn[e>>16&15|64]+gn[e>>24&255]+"-"+gn[t&63|128]+gn[t>>8&255]+"-"+gn[t>>16&255]+gn[t>>24&255]+gn[n&255]+gn[n>>8&255]+gn[n>>16&255]+gn[n>>24&255]).toLowerCase()}function dt(i,e,t){return Math.max(e,Math.min(t,i))}function Lh(i,e){return(i%e+e)%e}function Up(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Op(i,e,t){return i!==e?(t-i)/(e-i):0}function Zr(i,e,t){return(1-t)*i+t*e}function Bp(i,e,t,n){return Zr(i,e,1-Math.exp(-t*n))}function kp(i,e=1){return e-Math.abs(Lh(i,e*2)-e)}function zp(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Hp(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Gp(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Vp(i,e){return i+Math.random()*(e-i)}function Wp(i){return i*(.5-Math.random())}function qp(i){i!==void 0&&(tf=i);let e=tf+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Xp(i){return i*Jr}function jp(i){return i*Ss}function Kp(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Yp(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Jp(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Zp(i,e,t,n,s){let r=Math.cos,a=Math.sin,o=r(t/2),c=a(t/2),l=r((e+n)/2),h=a((e+n)/2),u=r((e-n)/2),f=a((e-n)/2),d=r((n-e)/2),_=a((n-e)/2);switch(s){case"XYX":i.set(o*h,c*u,c*f,o*l);break;case"YZY":i.set(c*f,o*h,c*u,o*l);break;case"ZXZ":i.set(c*u,c*f,o*h,o*l);break;case"XZX":i.set(o*h,c*_,c*d,o*l);break;case"YXY":i.set(c*d,o*h,c*_,o*l);break;case"ZYZ":i.set(c*_,c*d,o*h,o*l);break;default:et("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function si(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Rt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Dh={DEG2RAD:Jr,RAD2DEG:Ss,generateUUID:jn,clamp:dt,euclideanModulo:Lh,mapLinear:Up,inverseLerp:Op,lerp:Zr,damp:Bp,pingpong:kp,smoothstep:zp,smootherstep:Hp,randInt:Gp,randFloat:Vp,randFloatSpread:Wp,seededRandom:qp,degToRad:Xp,radToDeg:jp,isPowerOfTwo:Kp,ceilPowerOfTwo:Yp,floorPowerOfTwo:Jp,setQuaternionFromProperEuler:Zp,normalize:Rt,denormalize:si},kh=class kh{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=dt(this.x,e.x,t.x),this.y=dt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=dt(this.x,e,t),this.y=dt(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(dt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(dt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};kh.prototype.isVector2=!0;var Re=kh,Ot=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let c=n[s+0],l=n[s+1],h=n[s+2],u=n[s+3],f=r[a+0],d=r[a+1],_=r[a+2],y=r[a+3];if(u!==y||c!==f||l!==d||h!==_){let g=c*f+l*d+h*_+u*y;g<0&&(f=-f,d=-d,_=-_,y=-y,g=-g);let p=1-o;if(g<.9995){let E=Math.acos(g),m=Math.sin(E);p=Math.sin(p*E)/m,o=Math.sin(o*E)/m,c=c*p+f*o,l=l*p+d*o,h=h*p+_*o,u=u*p+y*o}else{c=c*p+f*o,l=l*p+d*o,h=h*p+_*o,u=u*p+y*o;let E=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=E,l*=E,h*=E,u*=E}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,a){let o=n[s],c=n[s+1],l=n[s+2],h=n[s+3],u=r[a],f=r[a+1],d=r[a+2],_=r[a+3];return e[t]=o*_+h*u+c*d-l*f,e[t+1]=c*_+h*f+l*u-o*d,e[t+2]=l*_+h*d+o*f-c*u,e[t+3]=h*_-o*u-c*f-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(s/2),u=o(r/2),f=c(n/2),d=c(s/2),_=c(r/2);switch(a){case"XYZ":this._x=f*h*u+l*d*_,this._y=l*d*u-f*h*_,this._z=l*h*_+f*d*u,this._w=l*h*u-f*d*_;break;case"YXZ":this._x=f*h*u+l*d*_,this._y=l*d*u-f*h*_,this._z=l*h*_-f*d*u,this._w=l*h*u+f*d*_;break;case"ZXY":this._x=f*h*u-l*d*_,this._y=l*d*u+f*h*_,this._z=l*h*_+f*d*u,this._w=l*h*u-f*d*_;break;case"ZYX":this._x=f*h*u-l*d*_,this._y=l*d*u+f*h*_,this._z=l*h*_-f*d*u,this._w=l*h*u+f*d*_;break;case"YZX":this._x=f*h*u+l*d*_,this._y=l*d*u+f*h*_,this._z=l*h*_-f*d*u,this._w=l*h*u-f*d*_;break;case"XZY":this._x=f*h*u-l*d*_,this._y=l*d*u-f*h*_,this._z=l*h*_+f*d*u,this._w=l*h*u+f*d*_;break;default:et("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],c=t[9],l=t[2],h=t[6],u=t[10],f=n+o+u;if(f>0){let d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(h-c)*d,this._y=(r-l)*d,this._z=(a-s)*d}else if(n>o&&n>u){let d=2*Math.sqrt(1+n-o-u);this._w=(h-c)/d,this._x=.25*d,this._y=(s+a)/d,this._z=(r+l)/d}else if(o>u){let d=2*Math.sqrt(1+o-n-u);this._w=(r-l)/d,this._x=(s+a)/d,this._y=.25*d,this._z=(c+h)/d}else{let d=2*Math.sqrt(1+u-n-o);this._w=(a-s)/d,this._x=(r+l)/d,this._y=(c+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(dt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+a*o+s*l-r*c,this._y=s*h+a*c+r*o-n*l,this._z=r*h+a*l+n*c-s*o,this._w=a*h-n*o-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let c=1-t;if(o<.9995){let l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+s*t,this._z=this._z*c+r*t,this._w=this._w*c+a*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+s*t,this._z=this._z*c+r*t,this._w=this._w*c+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},zh=class zh{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(nf.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(nf.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*s-o*n),h=2*(o*t-r*s),u=2*(r*n-a*t);return this.x=t+c*l+a*u-o*h,this.y=n+c*h+o*l-r*u,this.z=s+c*u+r*h-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=dt(this.x,e.x,t.x),this.y=dt(this.y,e.y,t.y),this.z=dt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=dt(this.x,e,t),this.y=dt(this.y,e,t),this.z=dt(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(dt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,c=t.z;return this.x=s*c-r*o,this.y=r*a-n*c,this.z=n*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Sl.copy(this).projectOnVector(e),this.sub(Sl)}reflect(e){return this.sub(Sl.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(dt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};zh.prototype.isVector3=!0;var k=zh,Sl=new k,nf=new Ot,Hh=class Hh{constructor(e,t,n,s,r,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l)}set(e,t,n,s,r,a,o,c,l){let h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],u=n[7],f=n[2],d=n[5],_=n[8],y=s[0],g=s[3],p=s[6],E=s[1],m=s[4],M=s[7],v=s[2],S=s[5],T=s[8];return r[0]=a*y+o*E+c*v,r[3]=a*g+o*m+c*S,r[6]=a*p+o*M+c*T,r[1]=l*y+h*E+u*v,r[4]=l*g+h*m+u*S,r[7]=l*p+h*M+u*T,r[2]=f*y+d*E+_*v,r[5]=f*g+d*m+_*S,r[8]=f*p+d*M+_*T,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*a*h-t*o*l-n*r*h+n*o*c+s*r*l-s*a*c}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=h*a-o*l,f=o*c-h*r,d=l*r-a*c,_=t*u+n*f+s*d;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/_;return e[0]=u*y,e[1]=(s*l-h*n)*y,e[2]=(o*n-s*a)*y,e[3]=f*y,e[4]=(h*t-s*c)*y,e[5]=(s*r-o*t)*y,e[6]=d*y,e[7]=(n*c-l*t)*y,e[8]=(a*t-n*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-s*l,s*c,-s*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return vs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Tl.makeScale(e,t)),this}rotate(e){return vs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Tl.makeRotation(-e)),this}translate(e,t){return vs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Tl.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Hh.prototype.isMatrix3=!0;var lt=Hh,Tl=new lt,sf=new lt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),rf=new lt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function $p(){let i={enabled:!0,workingColorSpace:En,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===At&&(s.r=Oi(s.r),s.g=Oi(s.g),s.b=Oi(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===At&&(s.r=nr(s.r),s.g=nr(s.g),s.b=nr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ji?ea:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return vs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return vs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[En]:{primaries:e,whitePoint:n,transfer:ea,toXYZ:sf,fromXYZ:rf,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Vt},outputColorSpaceConfig:{drawingBufferColorSpace:Vt}},[Vt]:{primaries:e,whitePoint:n,transfer:At,toXYZ:sf,fromXYZ:rf,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Vt}}}),i}var bt=$p();function Oi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function nr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Gs,zo=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Gs===void 0&&(Gs=ar("canvas")),Gs.width=e.width,Gs.height=e.height;let s=Gs.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=Gs}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=ar("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Oi(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Oi(t[n]/255)*255):t[n]=Oi(t[n]);return{data:t,width:e.width,height:e.height}}else return et("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Qp=0,cr=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Qp++}),this.uuid=jn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(El(s[a].image)):r.push(El(s[a]))}else r=El(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function El(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?zo.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(et("Texture: Unable to serialize Texture."),{})}var em=0,wl=new k,jt=class i extends gi{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=Xn,s=Xn,r=It,a=Bn,o=vn,c=In,l=i.DEFAULT_ANISOTROPY,h=ji){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:em++}),this.uuid=jn(),this.name="",this.source=new cr(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Re(0,0),this.repeat=new Re(1,1),this.center=new Re(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new lt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(wl).x}get height(){return this.source.getSize(wl).y}get depth(){return this.source.getSize(wl).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){et(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){et(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Mh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ss:e.x=e.x-Math.floor(e.x);break;case Xn:e.x=e.x<0?0:1;break;case sr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ss:e.y=e.y-Math.floor(e.y);break;case Xn:e.y=e.y<0?0:1;break;case sr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};jt.DEFAULT_IMAGE=null;jt.DEFAULT_MAPPING=Mh;jt.DEFAULT_ANISOTROPY=1;var Gh=class Gh{constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,c=e.elements,l=c[0],h=c[4],u=c[8],f=c[1],d=c[5],_=c[9],y=c[2],g=c[6],p=c[10];if(Math.abs(h-f)<.01&&Math.abs(u-y)<.01&&Math.abs(_-g)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+y)<.1&&Math.abs(_+g)<.1&&Math.abs(l+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let m=(l+1)/2,M=(d+1)/2,v=(p+1)/2,S=(h+f)/4,T=(u+y)/4,x=(_+g)/4;return m>M&&m>v?m<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(m),s=S/n,r=T/n):M>v?M<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),n=S/s,r=x/s):v<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(v),n=T/r,s=x/r),this.set(n,s,r,t),this}let E=Math.sqrt((g-_)*(g-_)+(u-y)*(u-y)+(f-h)*(f-h));return Math.abs(E)<.001&&(E=1),this.x=(g-_)/E,this.y=(u-y)/E,this.z=(f-h)/E,this.w=Math.acos((l+d+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=dt(this.x,e.x,t.x),this.y=dt(this.y,e.y,t.y),this.z=dt(this.z,e.z,t.z),this.w=dt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=dt(this.x,e,t),this.y=dt(this.y,e,t),this.z=dt(this.z,e,t),this.w=dt(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(dt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Gh.prototype.isVector4=!0;var wt=Gh,Ho=class extends gi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:It,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new wt(0,0,e,t),this.scissorTest=!1,this.viewport=new wt(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new jt(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:It,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new cr(s)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},ln=class extends Ho{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},na=class extends jt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Xt,this.minFilter=Xt,this.wrapR=Xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Go=class extends jt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Xt,this.minFilter=Xt,this.wrapR=Xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}};var hc=class hc{constructor(e,t,n,s,r,a,o,c,l,h,u,f,d,_,y,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l,h,u,f,d,_,y,g)}set(e,t,n,s,r,a,o,c,l,h,u,f,d,_,y,g){let p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=h,p[10]=u,p[14]=f,p[3]=d,p[7]=_,p[11]=y,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new hc().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,s=1/Vs.setFromMatrixColumn(e,0).length(),r=1/Vs.setFromMatrixColumn(e,1).length(),a=1/Vs.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let f=a*h,d=a*u,_=o*h,y=o*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=d+_*l,t[5]=f-y*l,t[9]=-o*c,t[2]=y-f*l,t[6]=_+d*l,t[10]=a*c}else if(e.order==="YXZ"){let f=c*h,d=c*u,_=l*h,y=l*u;t[0]=f+y*o,t[4]=_*o-d,t[8]=a*l,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=d*o-_,t[6]=y+f*o,t[10]=a*c}else if(e.order==="ZXY"){let f=c*h,d=c*u,_=l*h,y=l*u;t[0]=f-y*o,t[4]=-a*u,t[8]=_+d*o,t[1]=d+_*o,t[5]=a*h,t[9]=y-f*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){let f=a*h,d=a*u,_=o*h,y=o*u;t[0]=c*h,t[4]=_*l-d,t[8]=f*l+y,t[1]=c*u,t[5]=y*l+f,t[9]=d*l-_,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){let f=a*c,d=a*l,_=o*c,y=o*l;t[0]=c*h,t[4]=y-f*u,t[8]=_*u+d,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-l*h,t[6]=d*u+_,t[10]=f-y*u}else if(e.order==="XZY"){let f=a*c,d=a*l,_=o*c,y=o*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=f*u+y,t[5]=a*h,t[9]=d*u-_,t[2]=_*u-d,t[6]=o*h,t[10]=y*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(tm,e,nm)}lookAt(e,t,n){let s=this.elements;return Fn.subVectors(e,t),Fn.lengthSq()===0&&(Fn.z=1),Fn.normalize(),Zi.crossVectors(n,Fn),Zi.lengthSq()===0&&(Math.abs(n.z)===1?Fn.x+=1e-4:Fn.z+=1e-4,Fn.normalize(),Zi.crossVectors(n,Fn)),Zi.normalize(),no.crossVectors(Fn,Zi),s[0]=Zi.x,s[4]=no.x,s[8]=Fn.x,s[1]=Zi.y,s[5]=no.y,s[9]=Fn.y,s[2]=Zi.z,s[6]=no.z,s[10]=Fn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],u=n[5],f=n[9],d=n[13],_=n[2],y=n[6],g=n[10],p=n[14],E=n[3],m=n[7],M=n[11],v=n[15],S=s[0],T=s[4],x=s[8],C=s[12],P=s[1],U=s[5],L=s[9],F=s[13],N=s[2],D=s[6],V=s[10],q=s[14],ee=s[3],G=s[7],te=s[11],ce=s[15];return r[0]=a*S+o*P+c*N+l*ee,r[4]=a*T+o*U+c*D+l*G,r[8]=a*x+o*L+c*V+l*te,r[12]=a*C+o*F+c*q+l*ce,r[1]=h*S+u*P+f*N+d*ee,r[5]=h*T+u*U+f*D+d*G,r[9]=h*x+u*L+f*V+d*te,r[13]=h*C+u*F+f*q+d*ce,r[2]=_*S+y*P+g*N+p*ee,r[6]=_*T+y*U+g*D+p*G,r[10]=_*x+y*L+g*V+p*te,r[14]=_*C+y*F+g*q+p*ce,r[3]=E*S+m*P+M*N+v*ee,r[7]=E*T+m*U+M*D+v*G,r[11]=E*x+m*L+M*V+v*te,r[15]=E*C+m*F+M*q+v*ce,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],c=e[9],l=e[13],h=e[2],u=e[6],f=e[10],d=e[14],_=e[3],y=e[7],g=e[11],p=e[15],E=c*d-l*f,m=o*d-l*u,M=o*f-c*u,v=a*d-l*h,S=a*f-c*h,T=a*u-o*h;return t*(y*E-g*m+p*M)-n*(_*E-g*v+p*S)+s*(_*m-y*v+p*T)-r*(_*M-y*S+g*T)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],a=e[5],o=e[9],c=e[2],l=e[6],h=e[10];return t*(a*h-o*l)-n*(r*h-o*c)+s*(r*l-a*c)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=e[9],f=e[10],d=e[11],_=e[12],y=e[13],g=e[14],p=e[15],E=t*o-n*a,m=t*c-s*a,M=t*l-r*a,v=n*c-s*o,S=n*l-r*o,T=s*l-r*c,x=h*y-u*_,C=h*g-f*_,P=h*p-d*_,U=u*g-f*y,L=u*p-d*y,F=f*p-d*g,N=E*F-m*L+M*U+v*P-S*C+T*x;if(N===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let D=1/N;return e[0]=(o*F-c*L+l*U)*D,e[1]=(s*L-n*F-r*U)*D,e[2]=(y*T-g*S+p*v)*D,e[3]=(f*S-u*T-d*v)*D,e[4]=(c*P-a*F-l*C)*D,e[5]=(t*F-s*P+r*C)*D,e[6]=(g*M-_*T-p*m)*D,e[7]=(h*T-f*M+d*m)*D,e[8]=(a*L-o*P+l*x)*D,e[9]=(n*P-t*L-r*x)*D,e[10]=(_*S-y*M+p*E)*D,e[11]=(u*M-h*S-d*E)*D,e[12]=(o*C-a*U-c*x)*D,e[13]=(t*U-n*C+s*x)*D,e[14]=(y*m-_*v-g*E)*D,e[15]=(h*v-u*m+f*E)*D,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,c=e.z,l=r*a,h=r*o;return this.set(l*a+n,l*o-s*c,l*c+s*o,0,l*o+s*c,h*o+n,h*c-s*a,0,l*c-s*o,h*c+s*a,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,a=t._y,o=t._z,c=t._w,l=r+r,h=a+a,u=o+o,f=r*l,d=r*h,_=r*u,y=a*h,g=a*u,p=o*u,E=c*l,m=c*h,M=c*u,v=n.x,S=n.y,T=n.z;return s[0]=(1-(y+p))*v,s[1]=(d+M)*v,s[2]=(_-m)*v,s[3]=0,s[4]=(d-M)*S,s[5]=(1-(f+p))*S,s[6]=(g+E)*S,s[7]=0,s[8]=(_+m)*T,s[9]=(g-E)*T,s[10]=(1-(f+y))*T,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let a=Vs.set(s[0],s[1],s[2]).length(),o=Vs.set(s[4],s[5],s[6]).length(),c=Vs.set(s[8],s[9],s[10]).length();r<0&&(a=-a),ei.copy(this);let l=1/a,h=1/o,u=1/c;return ei.elements[0]*=l,ei.elements[1]*=l,ei.elements[2]*=l,ei.elements[4]*=h,ei.elements[5]*=h,ei.elements[6]*=h,ei.elements[8]*=u,ei.elements[9]*=u,ei.elements[10]*=u,t.setFromRotationMatrix(ei),n.x=a,n.y=o,n.z=c,this}makePerspective(e,t,n,s,r,a,o=ri,c=!1){let l=this.elements,h=2*r/(t-e),u=2*r/(n-s),f=(t+e)/(t-e),d=(n+s)/(n-s),_,y;if(c)_=r/(a-r),y=a*r/(a-r);else if(o===ri)_=-(a+r)/(a-r),y=-2*a*r/(a-r);else if(o===rr)_=-a/(a-r),y=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=u,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=_,l[14]=y,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=ri,c=!1){let l=this.elements,h=2/(t-e),u=2/(n-s),f=-(t+e)/(t-e),d=-(n+s)/(n-s),_,y;if(c)_=1/(a-r),y=a/(a-r);else if(o===ri)_=-2/(a-r),y=-(a+r)/(a-r);else if(o===rr)_=-1/(a-r),y=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=u,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=_,l[14]=y,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};hc.prototype.isMatrix4=!0;var ct=hc,Vs=new k,ei=new ct,tm=new k(0,0,0),nm=new k(1,1,1),Zi=new k,no=new k,Fn=new k,af=new ct,of=new Ot,bi=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],h=s[9],u=s[2],f=s[6],d=s[10];switch(t){case"XYZ":this._y=Math.asin(dt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-dt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(dt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-dt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(dt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-dt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:et("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return af.makeRotationFromQuaternion(e),this.setFromRotationMatrix(af,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return of.setFromEuler(this),this.setFromQuaternion(of,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};bi.DEFAULT_ORDER="XYZ";var ia=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},im=0,cf=new k,Ws=new Ot,Ii=new ct,io=new k,Hr=new k,sm=new k,rm=new Ot,lf=new k(1,0,0),hf=new k(0,1,0),uf=new k(0,0,1),ff={type:"added"},am={type:"removed"},qs={type:"childadded",child:null},Al={type:"childremoved",child:null},Bt=class i extends gi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:im++}),this.uuid=jn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new k,t=new bi,n=new Ot,s=new k(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ct},normalMatrix:{value:new lt}}),this.matrix=new ct,this.matrixWorld=new ct,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ia,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ws.setFromAxisAngle(e,t),this.quaternion.multiply(Ws),this}rotateOnWorldAxis(e,t){return Ws.setFromAxisAngle(e,t),this.quaternion.premultiply(Ws),this}rotateX(e){return this.rotateOnAxis(lf,e)}rotateY(e){return this.rotateOnAxis(hf,e)}rotateZ(e){return this.rotateOnAxis(uf,e)}translateOnAxis(e,t){return cf.copy(e).applyQuaternion(this.quaternion),this.position.add(cf.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(lf,e)}translateY(e){return this.translateOnAxis(hf,e)}translateZ(e){return this.translateOnAxis(uf,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ii.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?io.copy(e):io.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Hr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ii.lookAt(Hr,io,this.up):Ii.lookAt(io,Hr,this.up),this.quaternion.setFromRotationMatrix(Ii),s&&(Ii.extractRotation(s.matrixWorld),Ws.setFromRotationMatrix(Ii),this.quaternion.premultiply(Ws.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(at("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ff),qs.child=e,this.dispatchEvent(qs),qs.child=null):at("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(am),Al.child=e,this.dispatchEvent(Al),Al.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ii.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ii.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ii),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ff),qs.child=e,this.dispatchEvent(qs),qs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Hr,e,sm),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Hr,rm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(e.materials,this.material[c]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];s.animations.push(r(e.animations,c))}}if(t){let o=a(e.geometries),c=a(e.materials),l=a(e.textures),h=a(e.images),u=a(e.shapes),f=a(e.skeletons),d=a(e.animations),_=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),d.length>0&&(n.animations=d),_.length>0&&(n.nodes=_)}return n.object=s,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Bt.DEFAULT_UP=new k(0,1,0);Bt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Bt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var tn=class extends Bt{constructor(){super(),this.isGroup=!0,this.type="Group"}},om={type:"move"},lr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new tn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new tn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new k,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new k),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new tn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new k,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new k,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(let y of e.hand.values()){let g=t.getJointPose(y,n),p=this._getHandJoint(l,y);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],f=h.position.distanceTo(u.position),d=.02,_=.005;l.inputState.pinching&&f>d+_?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=d-_&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(om)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new tn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},wd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},$i={h:0,s:0,l:0},so={h:0,s:0,l:0};function Rl(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Ge=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Vt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,bt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=bt.workingColorSpace){return this.r=e,this.g=t,this.b=n,bt.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=bt.workingColorSpace){if(e=Lh(e,1),t=dt(t,0,1),n=dt(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=Rl(a,r,e+1/3),this.g=Rl(a,r,e),this.b=Rl(a,r,e-1/3)}return bt.colorSpaceToWorking(this,s),this}setStyle(e,t=Vt){function n(r){r!==void 0&&parseFloat(r)<1&&et("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:et("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);et("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Vt){let n=wd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):et("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Oi(e.r),this.g=Oi(e.g),this.b=Oi(e.b),this}copyLinearToSRGB(e){return this.r=nr(e.r),this.g=nr(e.g),this.b=nr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Vt){return bt.workingToColorSpace(bn.copy(this),e),Math.round(dt(bn.r*255,0,255))*65536+Math.round(dt(bn.g*255,0,255))*256+Math.round(dt(bn.b*255,0,255))}getHexString(e=Vt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=bt.workingColorSpace){bt.workingToColorSpace(bn.copy(this),t);let n=bn.r,s=bn.g,r=bn.b,a=Math.max(n,s,r),o=Math.min(n,s,r),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let u=a-o;switch(l=h<=.5?u/(a+o):u/(2-a-o),a){case n:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-n)/u+2;break;case r:c=(n-s)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=bt.workingColorSpace){return bt.workingToColorSpace(bn.copy(this),t),e.r=bn.r,e.g=bn.g,e.b=bn.b,e}getStyle(e=Vt){bt.workingToColorSpace(bn.copy(this),e);let t=bn.r,n=bn.g,s=bn.b;return e!==Vt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL($i),this.setHSL($i.h+e,$i.s+t,$i.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL($i),e.getHSL(so);let n=Zr($i.h,so.h,t),s=Zr($i.s,so.s,t),r=Zr($i.l,so.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},bn=new Ge;Ge.NAMES=wd;var xi=class extends Bt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new bi,this.environmentIntensity=1,this.environmentRotation=new bi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},ti=new k,Li=new k,Cl=new k,Di=new k,Xs=new k,js=new k,df=new k,Pl=new k,Il=new k,Ll=new k,Dl=new wt,Fl=new wt,Nl=new wt,is=class i{constructor(e=new k,t=new k,n=new k){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),ti.subVectors(e,t),s.cross(ti);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){ti.subVectors(s,t),Li.subVectors(n,t),Cl.subVectors(e,t);let a=ti.dot(ti),o=ti.dot(Li),c=ti.dot(Cl),l=Li.dot(Li),h=Li.dot(Cl),u=a*l-o*o;if(u===0)return r.set(0,0,0),null;let f=1/u,d=(l*c-o*h)*f,_=(a*h-o*c)*f;return r.set(1-d-_,_,d)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Di)===null?!1:Di.x>=0&&Di.y>=0&&Di.x+Di.y<=1}static getInterpolation(e,t,n,s,r,a,o,c){return this.getBarycoord(e,t,n,s,Di)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Di.x),c.addScaledVector(a,Di.y),c.addScaledVector(o,Di.z),c)}static getInterpolatedAttribute(e,t,n,s,r,a){return Dl.setScalar(0),Fl.setScalar(0),Nl.setScalar(0),Dl.fromBufferAttribute(e,t),Fl.fromBufferAttribute(e,n),Nl.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(Dl,r.x),a.addScaledVector(Fl,r.y),a.addScaledVector(Nl,r.z),a}static isFrontFacing(e,t,n,s){return ti.subVectors(n,t),Li.subVectors(e,t),ti.cross(Li).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return ti.subVectors(this.c,this.b),Li.subVectors(this.a,this.b),ti.cross(Li).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,a,o;Xs.subVectors(s,n),js.subVectors(r,n),Pl.subVectors(e,n);let c=Xs.dot(Pl),l=js.dot(Pl);if(c<=0&&l<=0)return t.copy(n);Il.subVectors(e,s);let h=Xs.dot(Il),u=js.dot(Il);if(h>=0&&u<=h)return t.copy(s);let f=c*u-h*l;if(f<=0&&c>=0&&h<=0)return a=c/(c-h),t.copy(n).addScaledVector(Xs,a);Ll.subVectors(e,r);let d=Xs.dot(Ll),_=js.dot(Ll);if(_>=0&&d<=_)return t.copy(r);let y=d*l-c*_;if(y<=0&&l>=0&&_<=0)return o=l/(l-_),t.copy(n).addScaledVector(js,o);let g=h*_-d*u;if(g<=0&&u-h>=0&&d-_>=0)return df.subVectors(r,s),o=(u-h)/(u-h+(d-_)),t.copy(s).addScaledVector(df,o);let p=1/(g+y+f);return a=y*p,o=f*p,t.copy(n).addScaledVector(Xs,a).addScaledVector(js,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},wn=class{constructor(e=new k(1/0,1/0,1/0),t=new k(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ni.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ni.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=ni.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,ni):ni.fromBufferAttribute(r,a),ni.applyMatrix4(e.matrixWorld),this.expandByPoint(ni);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ro.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ro.copy(n.boundingBox)),ro.applyMatrix4(e.matrixWorld),this.union(ro)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ni),ni.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Gr),ao.subVectors(this.max,Gr),Ks.subVectors(e.a,Gr),Ys.subVectors(e.b,Gr),Js.subVectors(e.c,Gr),Qi.subVectors(Ys,Ks),es.subVectors(Js,Ys),gs.subVectors(Ks,Js);let t=[0,-Qi.z,Qi.y,0,-es.z,es.y,0,-gs.z,gs.y,Qi.z,0,-Qi.x,es.z,0,-es.x,gs.z,0,-gs.x,-Qi.y,Qi.x,0,-es.y,es.x,0,-gs.y,gs.x,0];return!Ul(t,Ks,Ys,Js,ao)||(t=[1,0,0,0,1,0,0,0,1],!Ul(t,Ks,Ys,Js,ao))?!1:(oo.crossVectors(Qi,es),t=[oo.x,oo.y,oo.z],Ul(t,Ks,Ys,Js,ao))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ni).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ni).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Fi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Fi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Fi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Fi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Fi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Fi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Fi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Fi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Fi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Fi=[new k,new k,new k,new k,new k,new k,new k,new k],ni=new k,ro=new wn,Ks=new k,Ys=new k,Js=new k,Qi=new k,es=new k,gs=new k,Gr=new k,ao=new k,oo=new k,bs=new k;function Ul(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){bs.fromArray(i,r);let o=s.x*Math.abs(bs.x)+s.y*Math.abs(bs.y)+s.z*Math.abs(bs.z),c=e.dot(bs),l=t.dot(bs),h=n.dot(bs);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var $t=new k,co=new Re,cm=0,St=class extends gi{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:cm++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Ph,this.updateRanges=[],this.gpuType=kn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)co.fromBufferAttribute(this,t),co.applyMatrix3(e),this.setXY(t,co.x,co.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyMatrix3(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyMatrix4(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyNormalMatrix(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.transformDirection(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=si(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Rt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=si(t,this.array)),t}setX(e,t){return this.normalized&&(t=Rt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=si(t,this.array)),t}setY(e,t){return this.normalized&&(t=Rt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=si(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Rt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=si(t,this.array)),t}setW(e,t){return this.normalized&&(t=Rt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Rt(t,this.array),n=Rt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=Rt(t,this.array),n=Rt(n,this.array),s=Rt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=Rt(t,this.array),n=Rt(n,this.array),s=Rt(s,this.array),r=Rt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}};var sa=class extends St{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var ra=class extends St{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var pt=class extends St{constructor(e,t,n){super(new Float32Array(e),t,n)}},lm=new wn,Vr=new k,Ol=new k,Cn=class{constructor(e=new k,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):lm.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Vr.subVectors(e,this.center);let t=Vr.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Vr,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ol.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Vr.copy(e.center).add(Ol)),this.expandByPoint(Vr.copy(e.center).sub(Ol))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},hm=0,qn=new ct,Bl=new Bt,Zs=new k,Nn=new wn,Wr=new wn,cn=new k,Ct=class i extends gi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:hm++}),this.uuid=jn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Fp(e)?ra:sa)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new lt().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return qn.makeRotationFromQuaternion(e),this.applyMatrix4(qn),this}rotateX(e){return qn.makeRotationX(e),this.applyMatrix4(qn),this}rotateY(e){return qn.makeRotationY(e),this.applyMatrix4(qn),this}rotateZ(e){return qn.makeRotationZ(e),this.applyMatrix4(qn),this}translate(e,t,n){return qn.makeTranslation(e,t,n),this.applyMatrix4(qn),this}scale(e,t,n){return qn.makeScale(e,t,n),this.applyMatrix4(qn),this}lookAt(e){return Bl.lookAt(e),Bl.updateMatrix(),this.applyMatrix4(Bl.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Zs).negate(),this.translate(Zs.x,Zs.y,Zs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new pt(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&et("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new wn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){at("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new k(-1/0,-1/0,-1/0),new k(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];Nn.setFromBufferAttribute(r),this.morphTargetsRelative?(cn.addVectors(this.boundingBox.min,Nn.min),this.boundingBox.expandByPoint(cn),cn.addVectors(this.boundingBox.max,Nn.max),this.boundingBox.expandByPoint(cn)):(this.boundingBox.expandByPoint(Nn.min),this.boundingBox.expandByPoint(Nn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&at('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){at("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new k,1/0);return}if(e){let n=this.boundingSphere.center;if(Nn.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];Wr.setFromBufferAttribute(o),this.morphTargetsRelative?(cn.addVectors(Nn.min,Wr.min),Nn.expandByPoint(cn),cn.addVectors(Nn.max,Wr.max),Nn.expandByPoint(cn)):(Nn.expandByPoint(Wr.min),Nn.expandByPoint(Wr.max))}Nn.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)cn.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(cn));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)cn.fromBufferAttribute(o,l),c&&(Zs.fromBufferAttribute(e,l),cn.add(Zs)),s=Math.max(s,n.distanceToSquared(cn))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&at('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){at("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new St(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],c=[];for(let x=0;x<n.count;x++)o[x]=new k,c[x]=new k;let l=new k,h=new k,u=new k,f=new Re,d=new Re,_=new Re,y=new k,g=new k;function p(x,C,P){l.fromBufferAttribute(n,x),h.fromBufferAttribute(n,C),u.fromBufferAttribute(n,P),f.fromBufferAttribute(r,x),d.fromBufferAttribute(r,C),_.fromBufferAttribute(r,P),h.sub(l),u.sub(l),d.sub(f),_.sub(f);let U=1/(d.x*_.y-_.x*d.y);isFinite(U)&&(y.copy(h).multiplyScalar(_.y).addScaledVector(u,-d.y).multiplyScalar(U),g.copy(u).multiplyScalar(d.x).addScaledVector(h,-_.x).multiplyScalar(U),o[x].add(y),o[C].add(y),o[P].add(y),c[x].add(g),c[C].add(g),c[P].add(g))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let x=0,C=E.length;x<C;++x){let P=E[x],U=P.start,L=P.count;for(let F=U,N=U+L;F<N;F+=3)p(e.getX(F+0),e.getX(F+1),e.getX(F+2))}let m=new k,M=new k,v=new k,S=new k;function T(x){v.fromBufferAttribute(s,x),S.copy(v);let C=o[x];m.copy(C),m.sub(v.multiplyScalar(v.dot(C))).normalize(),M.crossVectors(S,C);let U=M.dot(c[x])<0?-1:1;a.setXYZW(x,m.x,m.y,m.z,U)}for(let x=0,C=E.length;x<C;++x){let P=E[x],U=P.start,L=P.count;for(let F=U,N=U+L;F<N;F+=3)T(e.getX(F+0)),T(e.getX(F+1)),T(e.getX(F+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new St(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,d=n.count;f<d;f++)n.setXYZ(f,0,0,0);let s=new k,r=new k,a=new k,o=new k,c=new k,l=new k,h=new k,u=new k;if(e)for(let f=0,d=e.count;f<d;f+=3){let _=e.getX(f+0),y=e.getX(f+1),g=e.getX(f+2);s.fromBufferAttribute(t,_),r.fromBufferAttribute(t,y),a.fromBufferAttribute(t,g),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,_),c.fromBufferAttribute(n,y),l.fromBufferAttribute(n,g),o.add(h),c.add(h),l.add(h),n.setXYZ(_,o.x,o.y,o.z),n.setXYZ(y,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let f=0,d=t.count;f<d;f+=3)s.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(f+0,h.x,h.y,h.z),n.setXYZ(f+1,h.x,h.y,h.z),n.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)cn.fromBufferAttribute(e,t),cn.normalize(),e.setXYZ(t,cn.x,cn.y,cn.z)}toNonIndexed(){function e(o,c){let l=o.array,h=o.itemSize,u=o.normalized,f=new l.constructor(c.length*h),d=0,_=0;for(let y=0,g=c.length;y<g;y++){o.isInterleavedBufferAttribute?d=c[y]*o.data.stride+o.offset:d=c[y]*h;for(let p=0;p<h;p++)f[_++]=l[d++]}return new St(f,h,u)}if(this.index===null)return et("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let o in s){let c=s[o],l=e(c,n);t.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let h=0,u=l.length;h<u;h++){let f=l[h],d=e(f,n);c.push(d)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,f=l.length;u<f;u++){let d=l[u];h.push(d.toJSON(e.data))}h.length>0&&(s[c]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(t))}let r=e.morphAttributes;for(let l in r){let h=[],u=r[l];for(let f=0,d=u.length;f<d;f++)h.push(u[f].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let l=0,h=a.length;l<h;l++){let u=a[l];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},hr=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Ph,this.updateRanges=[],this.version=0,this.uuid=jn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=jn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=jn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let t={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return t.usage=this.usage,t}},Tn=new k,ur=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.applyMatrix4(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.applyNormalMatrix(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Tn.fromBufferAttribute(this,t),Tn.transformDirection(e),this.setXYZ(t,Tn.x,Tn.y,Tn.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=si(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Rt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Rt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=si(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=si(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=si(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=si(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Rt(t,this.array),n=Rt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=Rt(t,this.array),n=Rt(n,this.array),s=Rt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Rt(t,this.array),n=Rt(n,this.array),s=Rt(s,this.array),r=Rt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){ta("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new St(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){ta("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},kl=new k,um=new k,fm=new lt,ii=class{constructor(e=new k(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=kl.subVectors(n,t).cross(um.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let s=e.delta(kl),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(s,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||fm.getNormalMatrix(e),s=this.coplanarPoint(kl).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},dm=0,An=class extends gi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:dm++}),this.uuid=jn(),this.name="",this.type="Material",this.blending=Sr,this.side=Si,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=gh,this.blendDst=Tr,this.blendEquation=Ti,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ge(0,0,0),this.blendAlpha=0,this.depthFunc=ir,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=md,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Io,this.stencilZFail=Io,this.stencilZPass=Io,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){et(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){et(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Ge().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(n=>new ii().fromJSON(n))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Re().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Re().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var Ni=new k,zl=new k,lo=new k,ho=new k,Ts=class{constructor(e=new k,t=new k(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ni)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Ni.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ni.copy(this.origin).addScaledVector(this.direction,t),Ni.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){zl.copy(e).add(t).multiplyScalar(.5),lo.copy(t).sub(e).normalize(),ho.copy(this.origin).sub(zl);let r=e.distanceTo(t)*.5,a=-this.direction.dot(lo),o=ho.dot(this.direction),c=-ho.dot(lo),l=ho.lengthSq(),h=Math.abs(1-a*a),u,f,d,_;if(h>0)if(u=a*c-o,f=a*o-c,_=r*h,u>=0)if(f>=-_)if(f<=_){let y=1/h;u*=y,f*=y,d=u*(u+a*f+2*o)+f*(a*u+f+2*c)+l}else f=r,u=Math.max(0,-(a*f+o)),d=-u*u+f*(f+2*c)+l;else f=-r,u=Math.max(0,-(a*f+o)),d=-u*u+f*(f+2*c)+l;else f<=-_?(u=Math.max(0,-(-a*r+o)),f=u>0?-r:Math.min(Math.max(-r,-c),r),d=-u*u+f*(f+2*c)+l):f<=_?(u=0,f=Math.min(Math.max(-r,-c),r),d=f*(f+2*c)+l):(u=Math.max(0,-(a*r+o)),f=u>0?r:Math.min(Math.max(-r,-c),r),d=-u*u+f*(f+2*c)+l);else f=a>0?-r:r,u=Math.max(0,-(a*f+o)),d=-u*u+f*(f+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(zl).addScaledVector(lo,f),d}intersectSphere(e,t){if(e.radius<0)return null;Ni.subVectors(e.center,this.origin);let n=Ni.dot(this.direction),s=Ni.dot(Ni)-n*n,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return l>=0?(n=(e.min.x-f.x)*l,s=(e.max.x-f.x)*l):(n=(e.max.x-f.x)*l,s=(e.min.x-f.x)*l),h>=0?(r=(e.min.y-f.y)*h,a=(e.max.y-f.y)*h):(r=(e.max.y-f.y)*h,a=(e.min.y-f.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(e.min.z-f.z)*u,c=(e.max.z-f.z)*u):(o=(e.max.z-f.z)*u,c=(e.min.z-f.z)*u),n>c||o>s)||((o>n||n!==n)&&(n=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Ni)!==null}intersectTriangle(e,t,n,s,r){let a=this.origin,o=this.direction,c=o.x,l=o.y,h=o.z,u=e.x-a.x,f=e.y-a.y,d=e.z-a.z,_=t.x-a.x,y=t.y-a.y,g=t.z-a.z,p=n.x-a.x,E=n.y-a.y,m=n.z-a.z,M=Math.abs(c),v=Math.abs(l),S=Math.abs(h),T,x,C,P,U,L,F,N,D,V,q,ee;if(M>=v&&M>=S?(C=c,L=u,D=_,ee=p,c>=0?(T=l,x=h,P=f,U=d,F=y,N=g,V=E,q=m):(T=h,x=l,P=d,U=f,F=g,N=y,V=m,q=E)):v>=S?(C=l,L=f,D=y,ee=E,l>=0?(T=h,x=c,P=d,U=u,F=g,N=_,V=m,q=p):(T=c,x=h,P=u,U=d,F=_,N=g,V=p,q=m)):(C=h,L=d,D=g,ee=m,h>=0?(T=c,x=l,P=u,U=f,F=_,N=y,V=p,q=E):(T=l,x=c,P=f,U=u,F=y,N=_,V=E,q=p)),C===0)return null;let G=T/C,te=x/C,ce=1/C,Le=P-G*L,Ce=U-te*L,Ne=F-G*D,ze=N-te*D,tt=V-G*ee,Z=q-te*ee,ae=tt*ze-Z*Ne,he=Le*Z-Ce*tt,Pe=Ne*Ce-ze*Le;if(s){if(ae<0||he<0||Pe<0)return null}else if((ae<0||he<0||Pe<0)&&(ae>0||he>0||Pe>0))return null;let Ae=ae+he+Pe;if(Ae===0)return null;let De=ce*(ae*L+he*D+Pe*ee);return(Ae>0?De<0:De>0)?null:this.at(De/Ae,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},hn=class extends An{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ge(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new bi,this.combine=uc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},pf=new ct,xs=new Ts,uo=new Cn,mf=new k,fo=new k,po=new k,mo=new k,Hl=new k,go=new k,gf=new k,bo=new k,yt=class extends Bt{constructor(e=new Ct,t=new hn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){go.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=o[c],u=r[c];h!==0&&(Hl.fromBufferAttribute(u,e),a?go.addScaledVector(Hl,h):go.addScaledVector(Hl.sub(t),h))}t.add(go)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),uo.copy(n.boundingSphere),uo.applyMatrix4(r),xs.copy(e.ray).recast(e.near),!(uo.containsPoint(xs.origin)===!1&&(xs.intersectSphere(uo,mf)===null||xs.origin.distanceToSquared(mf)>(e.far-e.near)**2))&&(pf.copy(r).invert(),xs.copy(e.ray).applyMatrix4(pf),!(n.boundingBox!==null&&xs.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,xs)))}_computeIntersections(e,t,n){let s,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,f=r.groups,d=r.drawRange;if(o!==null)if(Array.isArray(a))for(let _=0,y=f.length;_<y;_++){let g=f[_],p=a[g.materialIndex],E=Math.max(g.start,d.start),m=Math.min(o.count,Math.min(g.start+g.count,d.start+d.count));for(let M=E,v=m;M<v;M+=3){let S=o.getX(M),T=o.getX(M+1),x=o.getX(M+2);s=xo(this,p,e,n,l,h,u,S,T,x),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let _=Math.max(0,d.start),y=Math.min(o.count,d.start+d.count);for(let g=_,p=y;g<p;g+=3){let E=o.getX(g),m=o.getX(g+1),M=o.getX(g+2);s=xo(this,a,e,n,l,h,u,E,m,M),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let _=0,y=f.length;_<y;_++){let g=f[_],p=a[g.materialIndex],E=Math.max(g.start,d.start),m=Math.min(c.count,Math.min(g.start+g.count,d.start+d.count));for(let M=E,v=m;M<v;M+=3){let S=M,T=M+1,x=M+2;s=xo(this,p,e,n,l,h,u,S,T,x),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let _=Math.max(0,d.start),y=Math.min(c.count,d.start+d.count);for(let g=_,p=y;g<p;g+=3){let E=g,m=g+1,M=g+2;s=xo(this,a,e,n,l,h,u,E,m,M),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}}};function pm(i,e,t,n,s,r,a,o){let c;if(e.side===sn?c=n.intersectTriangle(a,r,s,!0,o):c=n.intersectTriangle(s,r,a,e.side===Si,o),c===null)return null;bo.copy(o),bo.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(bo);return l<t.near||l>t.far?null:{distance:l,point:bo.clone(),object:i}}function xo(i,e,t,n,s,r,a,o,c,l){i.getVertexPosition(o,fo),i.getVertexPosition(c,po),i.getVertexPosition(l,mo);let h=pm(i,e,t,n,fo,po,mo,gf);if(h){let u=new k;is.getBarycoord(gf,fo,po,mo,u),s&&(h.uv=is.getInterpolatedAttribute(s,o,c,l,u,new Re)),r&&(h.uv1=is.getInterpolatedAttribute(r,o,c,l,u,new Re)),a&&(h.normal=is.getInterpolatedAttribute(a,o,c,l,u,new k),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let f={a:o,b:c,c:l,normal:new k,materialIndex:0};is.getNormal(fo,po,mo,f.normal),h.face=f,h.barycoord=u}return h}var qr=new wt,bf=new wt,xf=new wt,mm=new wt,_f=new ct,_o=new k,Gl=new Cn,vf=new ct,Vl=new Ts,aa=class extends yt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Jl,this.bindMatrix=new ct,this.bindMatrixInverse=new ct,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new wn),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,_o),this.boundingBox.expandByPoint(_o)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Cn),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,_o),this.boundingSphere.expandByPoint(_o)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,s=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Gl.copy(this.boundingSphere),Gl.applyMatrix4(s),e.ray.intersectsSphere(Gl)!==!1&&(vf.copy(s).invert(),Vl.copy(e.ray).applyMatrix4(vf),!(this.boundingBox!==null&&Vl.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Vl)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new wt,t=this.geometry.attributes.skinWeight;for(let n=0,s=t.count;n<s;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Jl?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===ud?this.bindMatrixInverse.copy(this.bindMatrix).invert():et("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,s=this.geometry;bf.fromBufferAttribute(s.attributes.skinIndex,e),xf.fromBufferAttribute(s.attributes.skinWeight,e),t.isVector4?(qr.copy(t),t.set(0,0,0,0)):(qr.set(...t,1),t.set(0,0,0)),qr.applyMatrix4(this.bindMatrix);for(let r=0;r<4;r++){let a=xf.getComponent(r);if(a!==0){let o=bf.getComponent(r);_f.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(mm.copy(qr).applyMatrix4(_f),a)}}return t.isVector4&&(t.w=qr.w),t.applyMatrix4(this.bindMatrixInverse)}},fr=class extends Bt{constructor(){super(),this.isBone=!0,this.type="Bone"}},dr=class extends jt{constructor(e=null,t=1,n=1,s,r,a,o,c,l=Xt,h=Xt,u,f){super(null,a,o,c,l,h,s,r,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},yf=new ct,gm=new ct,oa=class i{constructor(e=[],t=[]){this.uuid=jn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){et("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,s=this.bones.length;n<s;n++)this.boneInverses.push(new ct)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let n=new ct;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,s=this.boneTexture;for(let r=0,a=e.length;r<a;r++){let o=e[r]?e[r].matrixWorld:gm;yf.multiplyMatrices(o,t[r]),yf.toArray(n,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new i(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new dr(t,e,e,vn,kn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,s=e.bones.length;n<s;n++){let r=e.bones[n],a=t[r];a===void 0&&(et("Skeleton: No bone found with UUID:",r),a=new fr),this.bones.push(a),this.boneInverses.push(new ct().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let s=0,r=t.length;s<r;s++){let a=t[s];e.bones.push(a.uuid);let o=n[s];e.boneInverses.push(o.toArray())}return e}},Bi=class extends St{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},$s=new ct,Mf=new ct,vo=[],Sf=new wn,bm=new ct,Xr=new yt,jr=new Cn,Es=class extends yt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Bi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,bm)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new wn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,$s),Sf.copy(e.boundingBox).applyMatrix4($s),this.boundingBox.union(Sf)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Cn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,$s),jr.copy(e.boundingSphere).applyMatrix4($s),this.boundingSphere.union(jr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(Xr.geometry=this.geometry,Xr.material=this.material,Xr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),jr.copy(this.boundingSphere),jr.applyMatrix4(n),e.ray.intersectsSphere(jr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,$s),Mf.multiplyMatrices(n,$s),Xr.matrixWorld=Mf,Xr.raycast(e,vo);for(let a=0,o=vo.length;a<o;a++){let c=vo[a];c.instanceId=r,c.object=this,t.push(c)}vo.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Bi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new dr(new Float32Array(s*this.count),s,this.count,xc,kn));let r=this.morphTexture.source.data.data,a=0;for(let l=0;l<n.length;l++)a+=n[l];let o=this.geometry.morphTargetsRelative?1:1-a,c=s*e;return r[c]=o,r.set(n,c+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},_s=new Cn,xm=new Re(.5,.5),yo=new k,pr=class{constructor(e=new ii,t=new ii,n=new ii,s=new ii,r=new ii,a=new ii){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=ri,n=!1){let s=this.planes,r=e.elements,a=r[0],o=r[1],c=r[2],l=r[3],h=r[4],u=r[5],f=r[6],d=r[7],_=r[8],y=r[9],g=r[10],p=r[11],E=r[12],m=r[13],M=r[14],v=r[15];if(s[0].setComponents(l-a,d-h,p-_,v-E).normalize(),s[1].setComponents(l+a,d+h,p+_,v+E).normalize(),s[2].setComponents(l+o,d+u,p+y,v+m).normalize(),s[3].setComponents(l-o,d-u,p-y,v-m).normalize(),n)s[4].setComponents(c,f,g,M).normalize(),s[5].setComponents(l-c,d-f,p-g,v-M).normalize();else if(s[4].setComponents(l-c,d-f,p-g,v-M).normalize(),t===ri)s[5].setComponents(l+c,d+f,p+g,v+M).normalize();else if(t===rr)s[5].setComponents(c,f,g,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),_s.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),_s.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(_s)}intersectsSprite(e){_s.center.set(0,0,0);let t=xm.distanceTo(e.center);return _s.radius=.7071067811865476+t,_s.applyMatrix4(e.matrixWorld),this.intersectsSphere(_s)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(yo.x=s.normal.x>0?e.max.x:e.min.x,yo.y=s.normal.y>0?e.max.y:e.min.y,yo.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(yo)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var mr=class extends An{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ge(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Vo=new k,Wo=new k,Tf=new ct,Kr=new Ts,Mo=new Cn,Wl=new k,Ef=new k,ws=class extends Bt{constructor(e=new Ct,t=new mr){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)Vo.fromBufferAttribute(t,s-1),Wo.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=Vo.distanceTo(Wo);e.setAttribute("lineDistance",new pt(n,1))}else et("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Mo.copy(n.boundingSphere),Mo.applyMatrix4(s),Mo.radius+=r,e.ray.intersectsSphere(Mo)===!1)return;Tf.copy(s).invert(),Kr.copy(e.ray).applyMatrix4(Tf);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=n.index,f=n.attributes.position;if(h!==null){let d=Math.max(0,a.start),_=Math.min(h.count,a.start+a.count);for(let y=d,g=_-1;y<g;y+=l){let p=h.getX(y),E=h.getX(y+1),m=So(this,e,Kr,c,p,E,y);m&&t.push(m)}if(this.isLineLoop){let y=h.getX(_-1),g=h.getX(d),p=So(this,e,Kr,c,y,g,_-1);p&&t.push(p)}}else{let d=Math.max(0,a.start),_=Math.min(f.count,a.start+a.count);for(let y=d,g=_-1;y<g;y+=l){let p=So(this,e,Kr,c,y,y+1,y);p&&t.push(p)}if(this.isLineLoop){let y=So(this,e,Kr,c,_-1,d,_-1);y&&t.push(y)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function So(i,e,t,n,s,r,a){let o=i.geometry.attributes.position;if(Vo.fromBufferAttribute(o,s),Wo.fromBufferAttribute(o,r),t.distanceSqToSegment(Vo,Wo,Wl,Ef)>n)return;Wl.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(Wl);if(!(l<e.near||l>e.far))return{distance:l,point:Ef.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var wf=new k,Af=new k,ca=class extends ws{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)wf.fromBufferAttribute(t,s),Af.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+wf.distanceTo(Af);e.setAttribute("lineDistance",new pt(n,1))}else et("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},la=class extends ws{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}},gr=class extends An{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ge(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Rf=new ct,th=new Ts,To=new Cn,Eo=new k,ha=class extends Bt{constructor(e=new Ct,t=new gr){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),To.copy(n.boundingSphere),To.applyMatrix4(s),To.radius+=r,e.ray.intersectsSphere(To)===!1)return;Rf.copy(s).invert(),th.copy(e.ray).applyMatrix4(Rf);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,u=n.attributes.position;if(l!==null){let f=Math.max(0,a.start),d=Math.min(l.count,a.start+a.count);for(let _=f,y=d;_<y;_++){let g=l.getX(_);Eo.fromBufferAttribute(u,g),Cf(Eo,g,c,s,e,t,this)}}else{let f=Math.max(0,a.start),d=Math.min(u.count,a.start+a.count);for(let _=f,y=d;_<y;_++)Eo.fromBufferAttribute(u,_),Cf(Eo,_,c,s,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Cf(i,e,t,n,s,r,a){let o=th.distanceSqToPoint(i);if(o<t){let c=new k;th.closestPointToPoint(i,c),c.applyMatrix4(n);let l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}var ua=class extends jt{constructor(e=[],t=cs,n,s,r,a,o,c,l,h){super(e,t,n,s,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},fa=class extends jt{constructor(e,t,n,s,r,a,o,c,l){super(e,t,n,s,r,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}};var rs=class extends jt{constructor(e,t,n=oi,s,r,a,o=Xt,c=Xt,l,h=mi,u=1){if(h!==mi&&h!==ls)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let f={width:e,height:t,depth:u};super(f,s,r,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new cr(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},qo=class extends rs{constructor(e,t=oi,n=cs,s,r,a=Xt,o=Xt,c,l=mi){let h={width:e,height:e,depth:1},u=[h,h,h,h,h,h];super(e,e,t,n,s,r,a,o,c,l),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},da=class extends jt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},nn=class i extends Ct{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],h=[],u=[],f=0,d=0;_("z","y","x",-1,-1,n,t,e,a,r,0),_("z","y","x",1,-1,n,t,-e,a,r,1),_("x","z","y",1,1,e,n,t,s,a,2),_("x","z","y",1,-1,e,n,-t,s,a,3),_("x","y","z",1,-1,e,t,n,s,r,4),_("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new pt(l,3)),this.setAttribute("normal",new pt(h,3)),this.setAttribute("uv",new pt(u,2));function _(y,g,p,E,m,M,v,S,T,x,C){let P=M/T,U=v/x,L=M/2,F=v/2,N=S/2,D=T+1,V=x+1,q=0,ee=0,G=new k;for(let te=0;te<V;te++){let ce=te*U-F;for(let Le=0;Le<D;Le++){let Ce=Le*P-L;G[y]=Ce*E,G[g]=ce*m,G[p]=N,l.push(G.x,G.y,G.z),G[y]=0,G[g]=0,G[p]=S>0?1:-1,h.push(G.x,G.y,G.z),u.push(Le/T),u.push(1-te/x),q+=1}}for(let te=0;te<x;te++)for(let ce=0;ce<T;ce++){let Le=f+ce+D*te,Ce=f+ce+D*(te+1),Ne=f+(ce+1)+D*(te+1),ze=f+(ce+1)+D*te;c.push(Le,Ce,ze),c.push(Ce,Ne,ze),ee+=6}o.addGroup(d,ee,C),d+=ee,f+=q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var pa=class i extends Ct{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);let r=[],a=[],o=[],c=[],l=new k,h=new Re;a.push(0,0,0),o.push(0,0,1),c.push(.5,.5);for(let u=0,f=3;u<=t;u++,f+=3){let d=n+u/t*s;l.x=e*Math.cos(d),l.y=e*Math.sin(d),a.push(l.x,l.y,l.z),o.push(0,0,1),h.x=(a[f]/e+1)/2,h.y=(a[f+1]/e+1)/2,c.push(h.x,h.y)}for(let u=1;u<=t;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new pt(a,3)),this.setAttribute("normal",new pt(o,3)),this.setAttribute("uv",new pt(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.segments,e.thetaStart,e.thetaLength)}},As=class i extends Ct{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};let l=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],f=[],d=[],_=0,y=[],g=n/2,p=0;E(),a===!1&&(e>0&&m(!0),t>0&&m(!1)),this.setIndex(h),this.setAttribute("position",new pt(u,3)),this.setAttribute("normal",new pt(f,3)),this.setAttribute("uv",new pt(d,2));function E(){let M=new k,v=new k,S=0,T=(t-e)/n;for(let x=0;x<=r;x++){let C=[],P=x/r,U=P*(t-e)+e;for(let L=0;L<=s;L++){let F=L/s,N=F*c+o,D=Math.sin(N),V=Math.cos(N);v.x=U*D,v.y=-P*n+g,v.z=U*V,u.push(v.x,v.y,v.z),M.set(D,T,V).normalize(),f.push(M.x,M.y,M.z),d.push(F,1-P),C.push(_++)}y.push(C)}for(let x=0;x<s;x++)for(let C=0;C<r;C++){let P=y[C][x],U=y[C+1][x],L=y[C+1][x+1],F=y[C][x+1];(e>0||C!==0)&&(h.push(P,U,F),S+=3),(t>0||C!==r-1)&&(h.push(U,L,F),S+=3)}l.addGroup(p,S,0),p+=S}function m(M){let v=_,S=new Re,T=new k,x=0,C=M===!0?e:t,P=M===!0?1:-1;for(let L=1;L<=s;L++)u.push(0,g*P,0),f.push(0,P,0),d.push(.5,.5),_++;let U=_;for(let L=0;L<=s;L++){let N=L/s*c+o,D=Math.cos(N),V=Math.sin(N);T.x=C*V,T.y=g*P,T.z=C*D,u.push(T.x,T.y,T.z),f.push(0,P,0),S.x=D*.5+.5,S.y=V*.5*P+.5,d.push(S.x,S.y),_++}for(let L=0;L<s;L++){let F=v+L,N=U+L;M===!0?h.push(N,N+1,F):h.push(N+1,N,F),x+=3}l.addGroup(p,x,M===!0?1:2),p+=x}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Un=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){et("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),s=0,r=n.length,a;t?a=t:a=e*n[r-1];let o=0,c=r-1,l;for(;o<=c;)if(s=Math.floor(o+(c-o)/2),l=n[s]-a,l<0)o=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===a)return s/(r-1);let h=n[s],f=n[s+1]-h,d=(a-h)/f;return(s+d)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),c=t||(a.isVector2?new Re:new k);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new k,s=[],r=[],a=[],o=new k,c=new ct;for(let d=0;d<=e;d++){let _=d/e;s[d]=this.getTangentAt(_,new k)}r[0]=new k,a[0]=new k;let l=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),f=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),f<=l&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let d=1;d<=e;d++){if(r[d]=r[d-1].clone(),a[d]=a[d-1].clone(),o.crossVectors(s[d-1],s[d]),o.length()>Number.EPSILON){o.normalize();let _=Math.acos(dt(s[d-1].dot(s[d]),-1,1));r[d].applyMatrix4(c.makeRotationAxis(o,_))}a[d].crossVectors(s[d],r[d])}if(t===!0){let d=Math.acos(dt(r[0].dot(r[e]),-1,1));d/=e,s[0].dot(o.crossVectors(r[0],r[e]))>0&&(d=-d);for(let _=1;_<=e;_++)r[_].applyMatrix4(c.makeRotationAxis(s[_],d*_)),a[_].crossVectors(s[_],r[_])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},br=class extends Un{constructor(e=0,t=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t=new Re){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+e*r,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=c-this.aX,d=l-this.aY;c=f*h-d*u+this.aX,l=f*u+d*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Xo=class extends br{constructor(e,t,n,s,r,a){super(e,t,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Fh(){let i=0,e=0,t=0,n=0;function s(r,a,o,c){i=r,e=o,t=-3*r+3*a-2*o-c,n=2*r-2*a+o+c}return{initCatmullRom:function(r,a,o,c,l){s(a,o,l*(o-r),l*(c-a))},initNonuniformCatmullRom:function(r,a,o,c,l,h,u){let f=(a-r)/l-(o-r)/(l+h)+(o-a)/h,d=(o-a)/h-(c-a)/(h+u)+(c-o)/u;f*=h,d*=h,s(a,o,f,d)},calc:function(r){let a=r*r,o=a*r;return i+e*r+t*a+n*o}}}var Pf=new k,If=new k,ql=new Fh,Xl=new Fh,jl=new Fh,jo=class extends Un{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new k){let n=t,s=this.points,r=s.length,a=(r-(this.closed?0:1))*e,o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:c===0&&o===r-1&&(o=r-2,c=1);let l,h;this.closed||o>0?l=s[(o-1)%r]:(If.subVectors(s[0],s[1]).add(s[0]),l=If);let u=s[o%r],f=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(Pf.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Pf),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,_=Math.pow(l.distanceToSquared(u),d),y=Math.pow(u.distanceToSquared(f),d),g=Math.pow(f.distanceToSquared(h),d);y<1e-4&&(y=1),_<1e-4&&(_=y),g<1e-4&&(g=y),ql.initNonuniformCatmullRom(l.x,u.x,f.x,h.x,_,y,g),Xl.initNonuniformCatmullRom(l.y,u.y,f.y,h.y,_,y,g),jl.initNonuniformCatmullRom(l.z,u.z,f.z,h.z,_,y,g)}else this.curveType==="catmullrom"&&(ql.initCatmullRom(l.x,u.x,f.x,h.x,this.tension),Xl.initCatmullRom(l.y,u.y,f.y,h.y,this.tension),jl.initCatmullRom(l.z,u.z,f.z,h.z,this.tension));return n.set(ql.calc(c),Xl.calc(c),jl.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new k().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Lf(i,e,t,n,s){let r=(n-e)*.5,a=(s-t)*.5,o=i*i,c=i*o;return(2*t-2*n+r+a)*c+(-3*t+3*n-2*r-a)*o+r*i+t}function _m(i,e){let t=1-i;return t*t*e}function vm(i,e){return 2*(1-i)*i*e}function ym(i,e){return i*i*e}function $r(i,e,t,n){return _m(i,e)+vm(i,t)+ym(i,n)}function Mm(i,e){let t=1-i;return t*t*t*e}function Sm(i,e){let t=1-i;return 3*t*t*i*e}function Tm(i,e){return 3*(1-i)*i*i*e}function Em(i,e){return i*i*i*e}function Qr(i,e,t,n,s){return Mm(i,e)+Sm(i,t)+Tm(i,n)+Em(i,s)}var ma=class extends Un{constructor(e=new Re,t=new Re,n=new Re,s=new Re){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new Re){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Qr(e,s.x,r.x,a.x,o.x),Qr(e,s.y,r.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ko=class extends Un{constructor(e=new k,t=new k,n=new k,s=new k){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new k){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Qr(e,s.x,r.x,a.x,o.x),Qr(e,s.y,r.y,a.y,o.y),Qr(e,s.z,r.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},ga=class extends Un{constructor(e=new Re,t=new Re){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new Re){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new Re){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Yo=class extends Un{constructor(e=new k,t=new k){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new k){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new k){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ba=class extends Un{constructor(e=new Re,t=new Re,n=new Re){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new Re){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set($r(e,s.x,r.x,a.x),$r(e,s.y,r.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Jo=class extends Un{constructor(e=new k,t=new k,n=new k){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new k){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set($r(e,s.x,r.x,a.x),$r(e,s.y,r.y,a.y),$r(e,s.z,r.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},xa=class extends Un{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new Re){let n=t,s=this.points,r=(s.length-1)*e,a=Math.floor(r),o=r-a,c=s[a===0?a:a-1],l=s[a],h=s[a>s.length-2?s.length-1:a+1],u=s[a>s.length-3?s.length-1:a+2];return n.set(Lf(o,c.x,l.x,h.x,u.x),Lf(o,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new Re().fromArray(s))}return this}},nh=Object.freeze({__proto__:null,ArcCurve:Xo,CatmullRomCurve3:jo,CubicBezierCurve:ma,CubicBezierCurve3:Ko,EllipseCurve:br,LineCurve:ga,LineCurve3:Yo,QuadraticBezierCurve:ba,QuadraticBezierCurve3:Jo,SplineCurve:xa}),Zo=class extends Un{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new nh[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new nh[s.type]().fromJSON(s))}return this}},_a=class extends Zo{constructor(e){super(),this.type="Path",this.currentPoint=new Re,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new ga(this.currentPoint.clone(),new Re(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new ba(this.currentPoint.clone(),new Re(e,t),new Re(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,a){let o=new ma(this.currentPoint.clone(),new Re(e,t),new Re(n,s),new Re(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new xa(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,s,r,a),this}absarc(e,t,n,s,r,a){return this.absellipse(e,t,n,n,s,r,a),this}ellipse(e,t,n,s,r,a,o,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,n,s,r,a,o,c),this}absellipse(e,t,n,s,r,a,o,c){let l=new br(e,t,n,s,r,a,o,c);if(this.curves.length>0){let u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},as=class extends _a{constructor(e){super(e),this.uuid=jn(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(new _a().fromJSON(s))}return this}};function wm(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=Ad(i,0,s,t,!0),a=[];if(!r||r.next===r.prev)return a;let o,c,l;if(n&&(r=Im(i,e,r,t)),i.length>80*t){o=i[0],c=i[1];let h=o,u=c;for(let f=t;f<s;f+=t){let d=i[f],_=i[f+1];d<o&&(o=d),_<c&&(c=_),d>h&&(h=d),_>u&&(u=_)}l=Math.max(h-o,u-c),l=l!==0?32767/l:0}return va(r,a,t,o,c,l,0),a}function Ad(i,e,t,n,s){let r;if(s===Gm(i,e,t,n)>0)for(let a=e;a<t;a+=n)r=Df(a/n|0,i[a],i[a+1],r);else for(let a=t-n;a>=e;a-=n)r=Df(a/n|0,i[a],i[a+1],r);return r&&xr(r,r.next)&&(Ma(r),r=r.next),r}function Rs(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(xr(t,t.next)||Ht(t.prev,t,t.next)===0)){if(Ma(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function va(i,e,t,n,s,r,a){if(!i)return;!a&&r&&Um(i,n,s,r);let o=i;for(;i.prev!==i.next;){let c=i.prev,l=i.next;if(r?Rm(i,n,s,r):Am(i)){e.push(c.i,i.i,l.i),Ma(i),i=l.next,o=l.next;continue}if(i=l,i===o){a?a===1?(i=Cm(Rs(i),e),va(i,e,t,n,s,r,2)):a===2&&Pm(i,e,t,n,s,r):va(Rs(i),e,t,n,s,r,1);break}}}function Am(i){let e=i.prev,t=i,n=i.next;if(Ht(e,t,n)>=0)return!1;let s=e.x,r=t.x,a=n.x,o=e.y,c=t.y,l=n.y,h=Math.min(s,r,a),u=Math.min(o,c,l),f=Math.max(s,r,a),d=Math.max(o,c,l),_=n.next;for(;_!==e;){if(_.x>=h&&_.x<=f&&_.y>=u&&_.y<=d&&Yr(s,o,r,c,a,l,_.x,_.y)&&Ht(_.prev,_,_.next)>=0)return!1;_=_.next}return!0}function Rm(i,e,t,n){let s=i.prev,r=i,a=i.next;if(Ht(s,r,a)>=0)return!1;let o=s.x,c=r.x,l=a.x,h=s.y,u=r.y,f=a.y,d=Math.min(o,c,l),_=Math.min(h,u,f),y=Math.max(o,c,l),g=Math.max(h,u,f),p=ih(d,_,e,t,n),E=ih(y,g,e,t,n),m=i.prevZ,M=i.nextZ;for(;m&&m.z>=p&&M&&M.z<=E;){if(m.x>=d&&m.x<=y&&m.y>=_&&m.y<=g&&m!==s&&m!==a&&Yr(o,h,c,u,l,f,m.x,m.y)&&Ht(m.prev,m,m.next)>=0||(m=m.prevZ,M.x>=d&&M.x<=y&&M.y>=_&&M.y<=g&&M!==s&&M!==a&&Yr(o,h,c,u,l,f,M.x,M.y)&&Ht(M.prev,M,M.next)>=0))return!1;M=M.nextZ}for(;m&&m.z>=p;){if(m.x>=d&&m.x<=y&&m.y>=_&&m.y<=g&&m!==s&&m!==a&&Yr(o,h,c,u,l,f,m.x,m.y)&&Ht(m.prev,m,m.next)>=0)return!1;m=m.prevZ}for(;M&&M.z<=E;){if(M.x>=d&&M.x<=y&&M.y>=_&&M.y<=g&&M!==s&&M!==a&&Yr(o,h,c,u,l,f,M.x,M.y)&&Ht(M.prev,M,M.next)>=0)return!1;M=M.nextZ}return!0}function Cm(i,e){let t=i;do{let n=t.prev,s=t.next.next;!xr(n,s)&&Cd(n,t,t.next,s)&&ya(n,s)&&ya(s,n)&&(e.push(n.i,t.i,s.i),Ma(t),Ma(t.next),t=i=s),t=t.next}while(t!==i);return Rs(t)}function Pm(i,e,t,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&km(a,o)){let c=Pd(a,o);a=Rs(a,a.next),c=Rs(c,c.next),va(a,e,t,n,s,r,0),va(c,e,t,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function Im(i,e,t,n){let s=[];for(let r=0,a=e.length;r<a;r++){let o=e[r]*n,c=r<a-1?e[r+1]*n:i.length,l=Ad(i,o,c,n,!1);l===l.next&&(l.steiner=!0),s.push(Bm(l))}s.sort(Lm);for(let r=0;r<s.length;r++)t=Dm(s[r],t);return t}function Lm(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function Dm(i,e){let t=Fm(i,e);if(!t)return e;let n=Pd(t,i);return Rs(n,n.next),Rs(t,t.next)}function Fm(i,e){let t=e,n=i.x,s=i.y,r=-1/0,a;if(xr(i,t))return t;do{if(xr(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){let u=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(u<=n&&u>r&&(r=u,a=t.x<t.next.x?t:t.next,u===n))return a}t=t.next}while(t!==e);if(!a)return null;let o=a,c=a.x,l=a.y,h=1/0;t=a;do{if(n>=t.x&&t.x>=c&&n!==t.x&&Rd(s<l?n:r,s,c,l,s<l?r:n,s,t.x,t.y)){let u=Math.abs(s-t.y)/(n-t.x);ya(t,i)&&(u<h||u===h&&(t.x>a.x||t.x===a.x&&Nm(a,t)))&&(a=t,h=u)}t=t.next}while(t!==o);return a}function Nm(i,e){return Ht(i.prev,i,e.prev)<0&&Ht(e.next,i,i.next)<0}function Um(i,e,t,n){let s=i;do s.z===0&&(s.z=ih(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Om(s)}function Om(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let a=n,o=0;for(let l=0;l<t&&(o++,a=a.nextZ,!!a);l++);let c=t;for(;o>0||c>0&&a;)o!==0&&(c===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,c--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,t*=2}while(e>1);return i}function ih(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function Bm(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Rd(i,e,t,n,s,r,a,o){return(s-a)*(e-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(r-o)>=(s-a)*(n-o)}function Yr(i,e,t,n,s,r,a,o){return!(i===a&&e===o)&&Rd(i,e,t,n,s,r,a,o)}function km(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!zm(i,e)&&(ya(i,e)&&ya(e,i)&&Hm(i,e)&&(Ht(i.prev,i,e.prev)||Ht(i,e.prev,e))||xr(i,e)&&Ht(i.prev,i,i.next)>0&&Ht(e.prev,e,e.next)>0)}function Ht(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function xr(i,e){return i.x===e.x&&i.y===e.y}function Cd(i,e,t,n){let s=Ao(Ht(i,e,t)),r=Ao(Ht(i,e,n)),a=Ao(Ht(t,n,i)),o=Ao(Ht(t,n,e));return!!(s!==r&&a!==o||s===0&&wo(i,t,e)||r===0&&wo(i,n,e)||a===0&&wo(t,i,n)||o===0&&wo(t,e,n))}function wo(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function Ao(i){return i>0?1:i<0?-1:0}function zm(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Cd(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function ya(i,e){return Ht(i.prev,i,i.next)<0?Ht(i,e,i.next)>=0&&Ht(i,i.prev,e)>=0:Ht(i,e,i.prev)<0||Ht(i,i.next,e)<0}function Hm(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Pd(i,e){let t=sh(i.i,i.x,i.y),n=sh(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function Df(i,e,t,n){let s=sh(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Ma(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function sh(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Gm(i,e,t,n){let s=0;for(let r=e,a=t-n;r<t;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var rh=class{static triangulate(e,t,n=2){return wm(e,t,n)}},di=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];Ff(e),Nf(n,e);let a=e.length;t.forEach(Ff);for(let c=0;c<t.length;c++)s.push(a),a+=t[c].length,Nf(n,t[c]);let o=rh.triangulate(n,s);for(let c=0;c<o.length;c+=3)r.push(o.slice(c,c+3));return r}};function Ff(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Nf(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var Sa=class i extends Ct{constructor(e=new as([new Re(.5,.5),new Re(-.5,.5),new Re(-.5,-.5),new Re(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,s=[],r=[];for(let o=0,c=e.length;o<c;o++){let l=e[o];a(l)}this.setAttribute("position",new pt(s,3)),this.setAttribute("uv",new pt(r,2)),this.computeVertexNormals();function a(o){let c=[],l=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1,f=t.bevelEnabled!==void 0?t.bevelEnabled:!0,d=t.bevelThickness!==void 0?t.bevelThickness:.2,_=t.bevelSize!==void 0?t.bevelSize:d-.1,y=t.bevelOffset!==void 0?t.bevelOffset:0,g=t.bevelSegments!==void 0?t.bevelSegments:3,p=t.extrudePath,E=t.UVGenerator!==void 0?t.UVGenerator:Vm,m,M=!1,v,S,T,x;if(p){m=p.getSpacedPoints(h),M=!0,f=!1;let de=p.isCatmullRomCurve3?p.closed:!1;v=p.computeFrenetFrames(h,de),S=new k,T=new k,x=new k}f||(g=0,d=0,_=0,y=0);let C=o.extractPoints(l),P=C.shape,U=C.holes;if(!di.isClockWise(P)){P=P.reverse();for(let de=0,ge=U.length;de<ge;de++){let xe=U[de];di.isClockWise(xe)&&(U[de]=xe.reverse())}}function F(de){let xe=10000000000000001e-36,_e=de[0];for(let Me=1;Me<=de.length;Me++){let Ue=Me%de.length,ve=de[Ue],ue=ve.x-_e.x,me=ve.y-_e.y,B=ue*ue+me*me,W=Math.max(Math.abs(ve.x),Math.abs(ve.y),Math.abs(_e.x),Math.abs(_e.y)),le=xe*W*W;if(B<=le){de.splice(Ue,1),Me--;continue}_e=ve}}F(P),U.forEach(F);let N=U.length,D=P;for(let de=0;de<N;de++){let ge=U[de];P=P.concat(ge)}function V(de,ge,xe){return ge||at("ExtrudeGeometry: vec does not exist"),de.clone().addScaledVector(ge,xe)}let q=P.length;function ee(de,ge,xe){let _e,Me,Ue,ve=de.x-ge.x,ue=de.y-ge.y,me=xe.x-de.x,B=xe.y-de.y,W=ve*ve+ue*ue,le=ve*B-ue*me;if(Math.abs(le)>Number.EPSILON){let A=Math.sqrt(W),b=Math.sqrt(me*me+B*B),w=ge.x-ue/A,I=ge.y+ve/A,z=xe.x-B/b,X=xe.y+me/b,ie=((z-w)*B-(X-I)*me)/(ve*B-ue*me);_e=w+ve*ie-de.x,Me=I+ue*ie-de.y;let O=_e*_e+Me*Me;if(O<=2)return new Re(_e,Me);Ue=Math.sqrt(O/2)}else{let A=!1;ve>Number.EPSILON?me>Number.EPSILON&&(A=!0):ve<-Number.EPSILON?me<-Number.EPSILON&&(A=!0):Math.sign(ue)===Math.sign(B)&&(A=!0),A?(_e=-ue,Me=ve,Ue=Math.sqrt(W)):(_e=ve,Me=ue,Ue=Math.sqrt(W/2))}return new Re(_e/Ue,Me/Ue)}let G=[];for(let de=0,ge=D.length,xe=ge-1,_e=de+1;de<ge;de++,xe++,_e++)xe===ge&&(xe=0),_e===ge&&(_e=0),G[de]=ee(D[de],D[xe],D[_e]);let te=[],ce,Le=G.concat();for(let de=0,ge=N;de<ge;de++){let xe=U[de];ce=[];for(let _e=0,Me=xe.length,Ue=Me-1,ve=_e+1;_e<Me;_e++,Ue++,ve++)Ue===Me&&(Ue=0),ve===Me&&(ve=0),ce[_e]=ee(xe[_e],xe[Ue],xe[ve]);te.push(ce),Le=Le.concat(ce)}let Ce;if(g===0)Ce=di.triangulateShape(D,U);else{let de=[],ge=[];for(let xe=0;xe<g;xe++){let _e=xe/g,Me=d*Math.cos(_e*Math.PI/2),Ue=_*Math.sin(_e*Math.PI/2)+y;for(let ve=0,ue=D.length;ve<ue;ve++){let me=V(D[ve],G[ve],Ue);he(me.x,me.y,-Me),_e===0&&de.push(me)}for(let ve=0,ue=N;ve<ue;ve++){let me=U[ve];ce=te[ve];let B=[];for(let W=0,le=me.length;W<le;W++){let A=V(me[W],ce[W],Ue);he(A.x,A.y,-Me),_e===0&&B.push(A)}_e===0&&ge.push(B)}}Ce=di.triangulateShape(de,ge)}let Ne=Ce.length,ze=_+y;for(let de=0;de<q;de++){let ge=f?V(P[de],Le[de],ze):P[de];M?(T.copy(v.normals[0]).multiplyScalar(ge.x),S.copy(v.binormals[0]).multiplyScalar(ge.y),x.copy(m[0]).add(T).add(S),he(x.x,x.y,x.z)):he(ge.x,ge.y,0)}for(let de=1;de<=h;de++)for(let ge=0;ge<q;ge++){let xe=f?V(P[ge],Le[ge],ze):P[ge];M?(T.copy(v.normals[de]).multiplyScalar(xe.x),S.copy(v.binormals[de]).multiplyScalar(xe.y),x.copy(m[de]).add(T).add(S),he(x.x,x.y,x.z)):he(xe.x,xe.y,u/h*de)}for(let de=g-1;de>=0;de--){let ge=de/g,xe=d*Math.cos(ge*Math.PI/2),_e=_*Math.sin(ge*Math.PI/2)+y;for(let Me=0,Ue=D.length;Me<Ue;Me++){let ve=V(D[Me],G[Me],_e);he(ve.x,ve.y,u+xe)}for(let Me=0,Ue=U.length;Me<Ue;Me++){let ve=U[Me];ce=te[Me];for(let ue=0,me=ve.length;ue<me;ue++){let B=V(ve[ue],ce[ue],_e);M?he(B.x,B.y+m[h-1].y,m[h-1].x+xe):he(B.x,B.y,u+xe)}}}tt(),Z();function tt(){let de=s.length/3;if(f){let ge=0,xe=q*ge;for(let _e=0;_e<Ne;_e++){let Me=Ce[_e];Pe(Me[2]+xe,Me[1]+xe,Me[0]+xe)}ge=h+g*2,xe=q*ge;for(let _e=0;_e<Ne;_e++){let Me=Ce[_e];Pe(Me[0]+xe,Me[1]+xe,Me[2]+xe)}}else{for(let ge=0;ge<Ne;ge++){let xe=Ce[ge];Pe(xe[2],xe[1],xe[0])}for(let ge=0;ge<Ne;ge++){let xe=Ce[ge];Pe(xe[0]+q*h,xe[1]+q*h,xe[2]+q*h)}}n.addGroup(de,s.length/3-de,0)}function Z(){let de=s.length/3,ge=0;ae(D,ge),ge+=D.length;for(let xe=0,_e=U.length;xe<_e;xe++){let Me=U[xe];ae(Me,ge),ge+=Me.length}n.addGroup(de,s.length/3-de,1)}function ae(de,ge){let xe=de.length;for(;--xe>=0;){let _e=xe,Me=xe-1;Me<0&&(Me=de.length-1);for(let Ue=0,ve=h+g*2;Ue<ve;Ue++){let ue=q*Ue,me=q*(Ue+1),B=ge+_e+ue,W=ge+Me+ue,le=ge+Me+me,A=ge+_e+me;Ae(B,W,le,A)}}}function he(de,ge,xe){c.push(de),c.push(ge),c.push(xe)}function Pe(de,ge,xe){De(de),De(ge),De(xe);let _e=s.length/3,Me=E.generateTopUV(n,s,_e-3,_e-2,_e-1);Je(Me[0]),Je(Me[1]),Je(Me[2])}function Ae(de,ge,xe,_e){De(de),De(ge),De(_e),De(ge),De(xe),De(_e);let Me=s.length/3,Ue=E.generateSideWallUV(n,s,Me-6,Me-3,Me-2,Me-1);Je(Ue[0]),Je(Ue[1]),Je(Ue[3]),Je(Ue[1]),Je(Ue[2]),Je(Ue[3])}function De(de){s.push(c[de*3+0]),s.push(c[de*3+1]),s.push(c[de*3+2])}function Je(de){r.push(de.x),r.push(de.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Wm(t,n,e)}static fromJSON(e,t){let n=[];for(let r=0,a=e.shapes.length;r<a;r++){let o=t[e.shapes[r]];n.push(o)}let s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new nh[s.type]().fromJSON(s)),new i(n,e.options)}},Vm={generateTopUV:function(i,e,t,n,s){let r=e[t*3],a=e[t*3+1],o=e[n*3],c=e[n*3+1],l=e[s*3],h=e[s*3+1];return[new Re(r,a),new Re(o,c),new Re(l,h)]},generateSideWallUV:function(i,e,t,n,s,r){let a=e[t*3],o=e[t*3+1],c=e[t*3+2],l=e[n*3],h=e[n*3+1],u=e[n*3+2],f=e[s*3],d=e[s*3+1],_=e[s*3+2],y=e[r*3],g=e[r*3+1],p=e[r*3+2];return Math.abs(o-h)<Math.abs(a-l)?[new Re(a,1-c),new Re(l,1-u),new Re(f,1-_),new Re(y,1-p)]:[new Re(o,1-c),new Re(h,1-u),new Re(d,1-_),new Re(g,1-p)]}};function Wm(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var Ta=class i extends Ct{constructor(e=[new Re(0,-.5),new Re(.5,0),new Re(0,.5)],t=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:s},t=Math.floor(t),s=dt(s,0,Math.PI*2);let r=[],a=[],o=[],c=[],l=[],h=1/t,u=new k,f=new Re,d=new k,_=new k,y=new k,g=0,p=0;for(let E=0;E<=e.length-1;E++)switch(E){case 0:g=e[E+1].x-e[E].x,p=e[E+1].y-e[E].y,d.x=p*1,d.y=-g,d.z=p*0,y.copy(d),d.normalize(),c.push(d.x,d.y,d.z);break;case e.length-1:c.push(y.x,y.y,y.z);break;default:g=e[E+1].x-e[E].x,p=e[E+1].y-e[E].y,d.x=p*1,d.y=-g,d.z=p*0,_.copy(d),d.x+=y.x,d.y+=y.y,d.z+=y.z,d.normalize(),c.push(d.x,d.y,d.z),y.copy(_)}for(let E=0;E<=t;E++){let m=n+E*h*s,M=Math.sin(m),v=Math.cos(m);for(let S=0;S<=e.length-1;S++){u.x=e[S].x*M,u.y=e[S].y,u.z=e[S].x*v,a.push(u.x,u.y,u.z),f.x=E/t,f.y=S/(e.length-1),o.push(f.x,f.y);let T=c[3*S+0]*M,x=c[3*S+1],C=c[3*S+0]*v;l.push(T,x,C)}}for(let E=0;E<t;E++)for(let m=0;m<e.length-1;m++){let M=m+E*e.length,v=M,S=M+e.length,T=M+e.length+1,x=M+1;r.push(v,S,x),r.push(T,x,S)}this.setIndex(r),this.setAttribute("position",new pt(a,3)),this.setAttribute("uv",new pt(o,2)),this.setAttribute("normal",new pt(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.points,e.segments,e.phiStart,e.phiLength)}};var ki=class i extends Ct{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(n),c=Math.floor(s),l=o+1,h=c+1,u=e/o,f=t/c,d=[],_=[],y=[],g=[];for(let p=0;p<h;p++){let E=p*f-a;for(let m=0;m<l;m++){let M=m*u-r;_.push(M,-E,0),y.push(0,0,1),g.push(m/o),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let E=0;E<o;E++){let m=E+l*p,M=E+l*(p+1),v=E+1+l*(p+1),S=E+1+l*p;d.push(m,M,S),d.push(M,v,S)}this.setIndex(d),this.setAttribute("position",new pt(_,3)),this.setAttribute("normal",new pt(y,3)),this.setAttribute("uv",new pt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}};var Ea=class i extends Ct{constructor(e=new as([new Re(0,.5),new Re(-.5,-.5),new Re(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};let n=[],s=[],r=[],a=[],o=0,c=0;if(Array.isArray(e)===!1)l(e);else for(let h=0;h<e.length;h++)l(e[h]),this.addGroup(o,c,h),o+=c,c=0;this.setIndex(n),this.setAttribute("position",new pt(s,3)),this.setAttribute("normal",new pt(r,3)),this.setAttribute("uv",new pt(a,2));function l(h){let u=s.length/3,f=h.extractPoints(t),d=f.shape,_=f.holes;di.isClockWise(d)===!1&&(d=d.reverse());for(let g=0,p=_.length;g<p;g++){let E=_[g];di.isClockWise(E)===!0&&(_[g]=E.reverse())}let y=di.triangulateShape(d,_);for(let g=0,p=_.length;g<p;g++){let E=_[g];d=d.concat(E)}for(let g=0,p=d.length;g<p;g++){let E=d[g];s.push(E.x,E.y,0),r.push(0,0,1),a.push(E.x,E.y)}for(let g=0,p=y.length;g<p;g++){let E=y[g],m=E[0]+u,M=E[1]+u,v=E[2]+u;n.push(m,M,v),c+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes;return qm(t,e)}static fromJSON(e,t){let n=[];for(let s=0,r=e.shapes.length;s<r;s++){let a=t[e.shapes[s]];n.push(a)}return new i(n,e.curveSegments)}};function qm(i,e){if(e.shapes=[],Array.isArray(i))for(let t=0,n=i.length;t<n;t++){let s=i[t];e.shapes.push(s.uuid)}else e.shapes.push(i.uuid);return e}var _r=class i extends Ct{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let c=Math.min(a+o,Math.PI),l=0,h=[],u=new k,f=new k,d=[],_=[],y=[],g=[];for(let p=0;p<=n;p++){let E=[],m=p/n,M=a+m*o,v=e*Math.cos(M),S=Math.sqrt(e*e-v*v),T=0;p===0&&a===0?T=.5/t:p===n&&c===Math.PI&&(T=-.5/t);for(let x=0;x<=t;x++){let C=x/t,P=s+C*r;u.x=-S*Math.cos(P),u.y=v,u.z=S*Math.sin(P),_.push(u.x,u.y,u.z),f.copy(u).normalize(),y.push(f.x,f.y,f.z),g.push(C+T,1-m),E.push(l++)}h.push(E)}for(let p=0;p<n;p++)for(let E=0;E<t;E++){let m=h[p][E+1],M=h[p][E],v=h[p+1][E],S=h[p+1][E+1];(p!==0||a>0)&&d.push(m,M,S),(p!==n-1||c<Math.PI)&&d.push(M,v,S)}this.setIndex(d),this.setAttribute("position",new pt(_,3)),this.setAttribute("normal",new pt(y,3)),this.setAttribute("uv",new pt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var wa=class i extends Ct{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2,a=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r,thetaStart:a,thetaLength:o},n=Math.floor(n),s=Math.floor(s);let c=[],l=[],h=[],u=[],f=new k,d=new k,_=new k;for(let y=0;y<=n;y++){let g=a+y/n*o;for(let p=0;p<=s;p++){let E=p/s*r;d.x=(e+t*Math.cos(g))*Math.cos(E),d.y=(e+t*Math.cos(g))*Math.sin(E),d.z=t*Math.sin(g),l.push(d.x,d.y,d.z),f.x=e*Math.cos(E),f.y=e*Math.sin(E),_.subVectors(d,f).normalize(),h.push(_.x,_.y,_.z),u.push(p/s),u.push(y/n)}}for(let y=1;y<=n;y++)for(let g=1;g<=s;g++){let p=(s+1)*y+g-1,E=(s+1)*(y-1)+g-1,m=(s+1)*(y-1)+g,M=(s+1)*y+g;c.push(p,E,M),c.push(E,m,M)}this.setIndex(c),this.setAttribute("position",new pt(l,3)),this.setAttribute("normal",new pt(h,3)),this.setAttribute("uv",new pt(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc,e.thetaStart,e.thetaLength)}};function Fs(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];if(Uf(s))s.isRenderTargetTexture?(et("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(Uf(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function yn(i){let e={};for(let t=0;t<i.length;t++){let n=Fs(i[t]);for(let s in n)e[s]=n[s]}return e}function Uf(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Xm(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Nh(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:bt.workingColorSpace}var Id={clone:Fs,merge:yn},jm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Km=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,un=class extends An{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=jm,this.fragmentShader=Km,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fs(e.uniforms),this.uniformsGroups=Xm(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new Ge().setHex(s.value);break;case"v2":this.uniforms[n].value=new Re().fromArray(s.value);break;case"v3":this.uniforms[n].value=new k().fromArray(s.value);break;case"v4":this.uniforms[n].value=new wt().fromArray(s.value);break;case"m3":this.uniforms[n].value=new lt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new ct().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},$o=class extends un{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},xn=class extends An{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ge(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ge(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qa,this.normalScale=new Re(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new bi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},_n=class extends xn{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Re(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return dt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ge(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ge(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ge(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Aa=class extends An{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ge(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ge(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qa,this.normalScale=new Re(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new bi,this.combine=uc,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Qo=class extends An{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=dd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},ec=class extends An{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function ns(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function Lo(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}function Ym(i){function e(s,r){return i[s]-i[r]}let t=i.length,n=new Array(t);for(let s=0;s!==t;++s)n[s]=s;return n.sort(e),n}function Of(i,e,t){let n=i.length,s=new i.constructor(n);for(let r=0,a=0;a!==n;++r){let o=t[r]*e;for(let c=0;c!==e;++c)s[a++]=i[o+c]}return s}function Jm(i,e,t,n){let s=1,r=i[0];for(;r!==void 0&&r[n]===void 0;)r=i[s++];if(r===void 0)return;let a=r[n];if(a!==void 0)if(Array.isArray(a))do a=r[n],a!==void 0&&(e.push(r.time),t.push(...a)),r=i[s++];while(r!==void 0);else if(a.toArray!==void 0)do a=r[n],a!==void 0&&(e.push(r.time),a.toArray(t,t.length)),r=i[s++];while(r!==void 0);else do a=r[n],a!==void 0&&(e.push(r.time),t.push(a)),r=i[s++];while(r!==void 0)}var _i=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let a;t:{i:if(!(e<s)){for(let o=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=t[++n],e<s)break e}a=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(n=2,r=o);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=t[--n-1],e>=r)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=n[r+a];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},tc=class extends _i{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:$l,endingEnd:$l}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],c=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case Ql:r=e,o=2*t-n;break;case eh:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Ql:a=e,c=2*n-t;break;case eh:a=1,c=n+s[1]-s[0];break;default:a=e-1,c=t}let l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,u=this._offsetNext,f=this._weightPrev,d=this._weightNext,_=(n-t)/(s-t),y=_*_,g=y*_,p=-f*g+2*f*y-f*_,E=(1+f)*g+(-1.5-2*f)*y+(-.5+f)*_+1,m=(-1-d)*g+(1.5+d)*y+.5*_,M=d*g-d*y;for(let v=0;v!==o;++v)r[v]=p*a[h+v]+E*a[l+v]+m*a[c+v]+M*a[u+v];return r}},nc=class extends _i{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(s-t),u=1-h;for(let f=0;f!==o;++f)r[f]=a[l+f]*u+a[c+f]*h;return r}},ic=class extends _i{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},sc=class extends _i{interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this.inTangents,u=this.outTangents;if(!h||!u){let _=(n-t)/(s-t),y=1-_;for(let g=0;g!==o;++g)r[g]=a[l+g]*y+a[c+g]*_;return r}let f=o*2,d=e-1;for(let _=0;_!==o;++_){let y=a[l+_],g=a[c+_],p=d*f+_*2,E=u[p],m=u[p+1],M=e*f+_*2,v=h[M],S=h[M+1],T=$m(n,t,E,v,s);r[_]=Ld(T,y,m,S,g)}return r}};function Ld(i,e,t,n,s){let r=1-i;return r*r*r*e+3*r*r*i*t+3*r*i*i*n+i*i*i*s}function Zm(i,e,t,n,s){let r=1-i;return 3*r*r*(t-e)+6*r*i*(n-t)+3*i*i*(s-n)}function $m(i,e,t,n,s){let r=(i-e)/(s-e);for(let a=0;a<8;a++){let o=Ld(r,e,t,n,s)-i;if(Math.abs(o)<1e-10)break;let c=Zm(r,e,t,n,s);if(Math.abs(c)<1e-10)break;r=Math.max(0,Math.min(1,r-o/c))}return r}var Pn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ns(t,this.TimeBufferType),this.values=ns(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ns(e.times,Array),values:ns(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s),Lo(e.settings)&&(n.settings={inTangents:ns(e.settings.inTangents,Array),outTangents:ns(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ic(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new nc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new tc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new sc(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case ys:t=this.InterpolantFactoryMethodDiscrete;break;case Ms:t=this.InterpolantFactoryMethodLinear;break;case Po:t=this.InterpolantFactoryMethodSmooth;break;case Zl:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return et("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ys;case this.InterpolantFactoryMethodLinear:return Ms;case this.InterpolantFactoryMethodSmooth:return Po;case this.InterpolantFactoryMethodBezier:return Zl}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e;Lo(this.settings)&&(Bf(this.settings.inTangents,e),Bf(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<e;)++r;for(;a!==-1&&n[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(at("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(at("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){at("KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){at("KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(s!==void 0&&Np(s))for(let o=0,c=s.length;o!==c;++o){let l=s[o];if(isNaN(l)){at("KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Po,r=e.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(s)c=!0;else{let u=o*n,f=u-n,d=u+n;for(let _=0;_!==n;++_){let y=t[u+_];if(y!==t[f+_]||y!==t[d+_]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];let u=o*n,f=a*n;for(let d=0;d!==n;++d)t[f+d]=t[u+d]}++a}}if(r>0){e[a]=e[r];for(let o=r*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,Lo(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Bf(i,e){for(let t=0,n=i.length;t!==n;t+=2)i[t]*=e}Pn.prototype.ValueTypeName="";Pn.prototype.TimeBufferType=Float32Array;Pn.prototype.ValueBufferType=Float32Array;Pn.prototype.DefaultInterpolation=Ms;var zi=class extends Pn{constructor(e,t,n){super(e,t,n)}};zi.prototype.ValueTypeName="bool";zi.prototype.ValueBufferType=Array;zi.prototype.DefaultInterpolation=ys;zi.prototype.InterpolantFactoryMethodLinear=void 0;zi.prototype.InterpolantFactoryMethodSmooth=void 0;var Ra=class extends Pn{constructor(e,t,n,s){super(e,t,n,s)}};Ra.prototype.ValueTypeName="color";var Hi=class extends Pn{constructor(e,t,n,s){super(e,t,n,s)}};Hi.prototype.ValueTypeName="number";var rc=class extends _i{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(s-t),l=e*o;for(let h=l+o;l!==h;l+=4)Ot.slerpFlat(r,0,a,l-o,a,l,c);return r}},Gi=class extends Pn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new rc(this.times,this.values,this.getValueSize(),e)}};Gi.prototype.ValueTypeName="quaternion";Gi.prototype.InterpolantFactoryMethodSmooth=void 0;var Vi=class extends Pn{constructor(e,t,n){super(e,t,n)}};Vi.prototype.ValueTypeName="string";Vi.prototype.ValueBufferType=Array;Vi.prototype.DefaultInterpolation=ys;Vi.prototype.InterpolantFactoryMethodLinear=void 0;Vi.prototype.InterpolantFactoryMethodSmooth=void 0;var os=class extends Pn{constructor(e,t,n,s){super(e,t,n,s)}};os.prototype.ValueTypeName="vector";var Ca=class{constructor(e="",t=-1,n=[],s=fd){this.name=e,this.tracks=n,this.duration=t,this.blendMode=s,this.uuid=jn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,s=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(e0(n[a]).scale(s));let r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){let t=[],n=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,a=n.length;r!==a;++r)t.push(Pn.toJSON(n[r]));return s}static CreateFromMorphTargetSequence(e,t,n,s){let r=t.length,a=[];for(let o=0;o<r;o++){let c=[],l=[];c.push((o+r-1)%r,o,(o+1)%r),l.push(0,1,0);let h=Ym(c);c=Of(c,1,h),l=Of(l,1,h),!s&&c[0]===0&&(c.push(r),l.push(l[0])),a.push(new Hi(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let s=e;n=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<n.length;s++)if(n[s].name===t)return n[s];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let s={},r=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){let l=e[o],h=l.name.match(r);if(h&&h.length>1){let u=h[1],f=s[u];f||(s[u]=f=[]),f.push(l)}}let a=[];for(let o in s)a.push(this.CreateFromMorphTargetSequence(o,s[o],t,n));return a}resetDuration(){let e=this.tracks,t=0;for(let n=0,s=e.length;n!==s;++n){let r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function Qm(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Hi;case"vector":case"vector2":case"vector3":case"vector4":return os;case"color":return Ra;case"quaternion":return Gi;case"bool":case"boolean":return zi;case"string":return Vi}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function e0(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=Qm(i.type);if(i.times===void 0){let n=[],s=[];Jm(i.keys,n,s,"value"),i.times=n,i.values=s}let t;return e.parse!==void 0?t=e.parse(i):t=new e(i.name,i.times,i.values,i.interpolation),Lo(i.settings)&&(t.settings={inTangents:ns(i.settings.inTangents,Float32Array),outTangents:ns(i.settings.outTangents,Float32Array)}),t}var pi={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(kf(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!kf(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function kf(i){try{let e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}var ac=class{constructor(e,t,n){let s=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=l.length;u<f;u+=2){let d=l[u],_=l[u+1];if(d.global&&(d.lastIndex=0),d.test(h))return _}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Dd=new ac,vi=class{constructor(e){this.manager=e!==void 0?e:Dd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};vi.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ui={},ah=class extends Error{constructor(e,t){super(e),this.response=t}},vr=class extends vi{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=pi.get(`file:${e}`);if(r!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0);return}if(Ui[e]!==void 0){Ui[e].push({onLoad:t,onProgress:n,onError:s});return}Ui[e]=[],Ui[e].push({onLoad:t,onProgress:n,onError:s});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,c=this.responseType;fetch(a).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&et("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;let h=Ui[e],u=l.body.getReader(),f=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),d=f?parseInt(f):0,_=d!==0,y=0,g=new ReadableStream({start(p){E();function E(){u.read().then(({done:m,value:M})=>{if(m)p.close();else{y+=M.byteLength;let v=new ProgressEvent("progress",{lengthComputable:_,loaded:y,total:d});for(let S=0,T=h.length;S<T;S++){let x=h[S];x.onProgress&&x.onProgress(v)}p.enqueue(M),E()}},m=>{p.error(m)})}}});return new Response(g)}else throw new ah(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return l.json();default:if(o==="")return l.text();{let u=/charset="?([^;"\s]*)"?/i.exec(o),f=u&&u[1]?u[1].toLowerCase():void 0,d=new TextDecoder(f);return l.arrayBuffer().then(_=>d.decode(_))}}}).then(l=>{pi.add(`file:${e}`,l);let h=Ui[e];delete Ui[e];for(let u=0,f=h.length;u<f;u++){let d=h[u];d.onLoad&&d.onLoad(l)}}).catch(l=>{let h=Ui[e];if(h===void 0)throw this.manager.itemError(e),l;delete Ui[e];for(let u=0,f=h.length;u<f;u++){let d=h[u];d.onError&&d.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var Qs=new WeakMap,oc=class extends vi{constructor(e){super(e)}load(e,t,n,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=pi.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0);else{let u=Qs.get(a);u===void 0&&(u=[],Qs.set(a,u)),u.push({onLoad:t,onError:s})}return a}let o=ar("img");function c(){h(),t&&t(this);let u=Qs.get(this)||[];for(let f=0;f<u.length;f++){let d=u[f];d.onLoad&&d.onLoad(this)}Qs.delete(this),r.manager.itemEnd(e)}function l(u){h(),s&&s(u),pi.remove(`image:${e}`);let f=Qs.get(this)||[];for(let d=0;d<f.length;d++){let _=f[d];_.onError&&_.onError(u)}Qs.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),pi.add(`image:${e}`,o),r.manager.itemStart(e),o.src=e,o}};var Cs=class extends vi{constructor(e){super(e)}load(e,t,n,s){let r=new jt,a=new oc(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},n,s),r}},Ps=class extends Bt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ge(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Pa=class extends Ps{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Bt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ge(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},Kl=new ct,zf=new k,Hf=new k,yr=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Re(512,512),this.mapType=In,this.map=null,this.mapPass=null,this.matrix=new ct,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new pr,this._frameExtents=new Re(1,1),this._viewportCount=1,this._viewports=[new wt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;zf.setFromMatrixPosition(e.matrixWorld),t.position.copy(zf),Hf.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Hf),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,s){Kl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(Kl,e.coordinateSystem,e.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,c=s?s.x/r.x:0,l=s?s.y/r.y:0;e.coordinateSystem===rr||e.reversedDepth?t.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):t.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),t.multiply(Kl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Ro=new k,Co=new Ot,fi=new k,Ia=class extends Bt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ct,this.projectionMatrix=new ct,this.projectionMatrixInverse=new ct,this.coordinateSystem=ri,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ro,Co,fi),fi.x===1&&fi.y===1&&fi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ro,Co,fi.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Ro,Co,fi),fi.x===1&&fi.y===1&&fi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ro,Co,fi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ts=new k,Gf=new Re,Vf=new Re,Wt=class extends Ia{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Ss*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Jr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ss*2*Math.atan(Math.tan(Jr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ts.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ts.x,ts.y).multiplyScalar(-e/ts.z),ts.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ts.x,ts.y).multiplyScalar(-e/ts.z)}getViewSize(e,t){return this.getViewBounds(e,Gf,Vf),t.subVectors(Vf,Gf)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Jr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,t-=a.offsetY*n/l,s*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},oh=class extends yr{constructor(){super(new Wt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=Ss*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){let e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}},La=class extends Ps{constructor(e,t,n=0,s=Math.PI/3,r=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Bt.DEFAULT_UP),this.updateMatrix(),this.target=new Bt,this.distance=n,this.angle=s,this.penumbra=r,this.decay=a,this.map=null,this.shadow=new oh}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},ch=class extends yr{constructor(){super(new Wt(90,1,.5,500)),this.isPointLightShadow=!0}},yi=class extends Ps{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new ch}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},Mi=class extends Ia{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,a=n+e,o=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},lh=class extends yr{constructor(){super(new Mi(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Wi=class extends Ps{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Bt.DEFAULT_UP),this.updateMatrix(),this.target=new Bt,this.shadow=new lh}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var qi=class{static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}};var Yl=new WeakMap,Da=class extends vi{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&et("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&et("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=pi.get(`image-bitmap:${e}`);if(a!==void 0){if(r.manager.itemStart(e),a.then){a.then(l=>{Yl.has(a)===!0?(s&&s(Yl.get(a)),r.manager.itemError(e),r.manager.itemEnd(e)):(t&&t(l),r.manager.itemEnd(e))});return}setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0);return}let o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let c=fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign({},r.options,{colorSpaceConversion:"none"}))}).then(function(l){return pi.add(`image-bitmap:${e}`,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){s&&s(l),Yl.set(c,l),pi.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});pi.add(`image-bitmap:${e}`,c),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var er=-90,tr=1,cc=class extends Bt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Wt(er,tr,e,t);s.layers=this.layers,this.add(s);let r=new Wt(er,tr,e,t);r.layers=this.layers,this.add(r);let a=new Wt(er,tr,e,t);a.layers=this.layers,this.add(a);let o=new Wt(er,tr,e,t);o.layers=this.layers,this.add(o);let c=new Wt(er,tr,e,t);c.layers=this.layers,this.add(c);let l=new Wt(er,tr,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,c]=t;for(let l of t)this.remove(l);if(e===ri)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===rr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),_=e.xr.enabled;e.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=y,e.setRenderTarget(n,5,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(u,f,d),e.xr.enabled=_,n.texture.needsPMREMUpdate=!0}},lc=class extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var Uh="\\[\\]\\.:\\/",t0=new RegExp("["+Uh+"]","g"),Oh="[^"+Uh+"]",n0="[^"+Uh.replace("\\.","")+"]",i0=/((?:WC+[\/:])*)/.source.replace("WC",Oh),s0=/(WCOD+)?/.source.replace("WCOD",n0),r0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Oh),a0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Oh),o0=new RegExp("^"+i0+s0+r0+a0+"$"),c0=["material","materials","bones","map"],hh=class{constructor(e,t,n){let s=n||Ft.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Ft=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(t0,"")}static parseTrackName(e){let t=o0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);c0.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let c=n(o.children);if(c)return c}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){et("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){at("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){at("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){at("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){at("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){at("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){at("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){at("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let a=e[s];if(a===void 0){let l=t.nodeName;at("PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){at("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){at("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ft.Composite=hh;Ft.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ft.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ft.prototype.GetterByBindingType=[Ft.prototype._getValue_direct,Ft.prototype._getValue_array,Ft.prototype._getValue_arrayElement,Ft.prototype._getValue_toArray];Ft.prototype.SetterByBindingTypeAndVersioning=[[Ft.prototype._setValue_direct,Ft.prototype._setValue_direct_setNeedsUpdate,Ft.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ft.prototype._setValue_array,Ft.prototype._setValue_array_setNeedsUpdate,Ft.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ft.prototype._setValue_arrayElement,Ft.prototype._setValue_arrayElement_setNeedsUpdate,Ft.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ft.prototype._setValue_fromArray,Ft.prototype._setValue_fromArray_setNeedsUpdate,Ft.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Zv=new Float32Array(1);var Vh=class Vh{constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};Vh.prototype.isMatrix2=!0;var uh=Vh;function Bh(i,e,t,n){let s=l0(n);switch(t){case Ah:return i*e;case xc:return i*e/s.components*s.byteLength;case _c:return i*e/s.components*s.byteLength;case hs:return i*e*2/s.components*s.byteLength;case vc:return i*e*2/s.components*s.byteLength;case Rh:return i*e*3/s.components*s.byteLength;case vn:return i*e*4/s.components*s.byteLength;case yc:return i*e*4/s.components*s.byteLength;case Ba:case ka:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case za:case Ha:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Sc:case Ec:return Math.max(i,16)*Math.max(e,8)/4;case Mc:case Tc:return Math.max(i,8)*Math.max(e,8)/2;case wc:case Ac:case Cc:case Pc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Rc:case Ga:case Ic:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Lc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Dc:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Fc:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Nc:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Uc:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Oc:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Bc:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case kc:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case zc:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Hc:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Gc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Vc:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Wc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case qc:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Xc:case jc:case Kc:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Yc:case Jc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Va:case Zc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function l0(i){switch(i){case In:case Sh:return{byteLength:1,components:1};case wr:case Th:case Ln:return{byteLength:2,components:1};case gc:case bc:return{byteLength:2,components:4};case oi:case mc:case kn:return{byteLength:4,components:1};case Eh:case wh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?et("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function tp(){let i=null,e=!1,t=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),t(r,a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function u0(i){let e=new WeakMap;function t(o,c){let l=o.array,h=o.usage,u=l.byteLength,f=i.createBuffer();i.bindBuffer(c,f),i.bufferData(c,l,h),o.onUploadCallback();let d;if(l instanceof Float32Array)d=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)d=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?d=i.HALF_FLOAT:d=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)d=i.SHORT;else if(l instanceof Uint32Array)d=i.UNSIGNED_INT;else if(l instanceof Int32Array)d=i.INT;else if(l instanceof Int8Array)d=i.BYTE;else if(l instanceof Uint8Array)d=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)d=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:d,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,c,l){let h=c.array,u=c.updateRanges;if(i.bindBuffer(l,o),u.length===0)i.bufferSubData(l,0,h);else{u.sort((d,_)=>d.start-_.start);let f=0;for(let d=1;d<u.length;d++){let _=u[f],y=u[d];y.start<=_.start+_.count+1?_.count=Math.max(_.count,y.start+y.count-_.start):(++f,u[f]=y)}u.length=f+1;for(let d=0,_=u.length;d<_;d++){let y=u[d];i.bufferSubData(l,y.start*h.BYTES_PER_ELEMENT,h,y.start,y.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}var f0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,d0=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,p0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,m0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,g0=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,b0=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,x0=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,_0=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,v0=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,y0=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,M0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,S0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,T0=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,E0=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,w0=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,A0=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,R0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,C0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,P0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,I0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,L0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,D0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,F0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,N0=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,U0=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,O0=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,B0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,k0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,z0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,H0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,G0="gl_FragColor = linearToOutputTexel( gl_FragColor );",V0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,W0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,q0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,X0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,j0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,K0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Y0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,J0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Z0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,$0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Q0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,eg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,tg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,ng=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,ig=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,sg=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,rg=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ag=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,og=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,cg=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lg=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,hg=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,ug=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,fg=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,dg=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,pg=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,mg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,gg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,bg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,_g=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,vg=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,yg=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Mg=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Sg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Tg=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Eg=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,wg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ag=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Rg=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Cg=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Pg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Ig=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Lg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Dg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Fg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Ng=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Ug=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Og=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Bg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,kg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,zg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Hg=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Gg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Vg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Wg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,qg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Xg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,jg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Kg=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Yg=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Jg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Zg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,$g=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Qg=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,eb=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,tb=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,nb=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ib=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sb=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rb=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ab=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ob=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,cb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,lb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,ub=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,fb=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,db=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,mb=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,gb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,bb=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,_b=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,vb=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,yb=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Mb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Sb=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Tb=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Eb=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,wb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Ab=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rb=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cb=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pb=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Ib=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lb=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Db=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Fb=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Nb=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ub=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ob=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bb=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,kb=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zb=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Hb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Gb=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vb=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Wb=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,qb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,mt={alphahash_fragment:f0,alphahash_pars_fragment:d0,alphamap_fragment:p0,alphamap_pars_fragment:m0,alphatest_fragment:g0,alphatest_pars_fragment:b0,aomap_fragment:x0,aomap_pars_fragment:_0,batching_pars_vertex:v0,batching_vertex:y0,begin_vertex:M0,beginnormal_vertex:S0,bsdfs:T0,iridescence_fragment:E0,bumpmap_pars_fragment:w0,clipping_planes_fragment:A0,clipping_planes_pars_fragment:R0,clipping_planes_pars_vertex:C0,clipping_planes_vertex:P0,color_fragment:I0,color_pars_fragment:L0,color_pars_vertex:D0,color_vertex:F0,common:N0,cube_uv_reflection_fragment:U0,defaultnormal_vertex:O0,displacementmap_pars_vertex:B0,displacementmap_vertex:k0,emissivemap_fragment:z0,emissivemap_pars_fragment:H0,colorspace_fragment:G0,colorspace_pars_fragment:V0,envmap_fragment:W0,envmap_common_pars_fragment:q0,envmap_pars_fragment:X0,envmap_pars_vertex:j0,envmap_physical_pars_fragment:sg,envmap_vertex:K0,fog_vertex:Y0,fog_pars_vertex:J0,fog_fragment:Z0,fog_pars_fragment:$0,gradientmap_pars_fragment:Q0,lightmap_pars_fragment:eg,lights_lambert_fragment:tg,lights_lambert_pars_fragment:ng,lights_pars_begin:ig,lights_toon_fragment:rg,lights_toon_pars_fragment:ag,lights_phong_fragment:og,lights_phong_pars_fragment:cg,lights_physical_fragment:lg,lights_physical_pars_fragment:hg,lights_fragment_begin:ug,lights_fragment_maps:fg,lights_fragment_end:dg,lightprobes_pars_fragment:pg,logdepthbuf_fragment:mg,logdepthbuf_pars_fragment:gg,logdepthbuf_pars_vertex:bg,logdepthbuf_vertex:xg,map_fragment:_g,map_pars_fragment:vg,map_particle_fragment:yg,map_particle_pars_fragment:Mg,metalnessmap_fragment:Sg,metalnessmap_pars_fragment:Tg,morphinstance_vertex:Eg,morphcolor_vertex:wg,morphnormal_vertex:Ag,morphtarget_pars_vertex:Rg,morphtarget_vertex:Cg,normal_fragment_begin:Pg,normal_fragment_maps:Ig,normal_pars_fragment:Lg,normal_pars_vertex:Dg,normal_vertex:Fg,normalmap_pars_fragment:Ng,clearcoat_normal_fragment_begin:Ug,clearcoat_normal_fragment_maps:Og,clearcoat_pars_fragment:Bg,iridescence_pars_fragment:kg,opaque_fragment:zg,packing:Hg,premultiplied_alpha_fragment:Gg,project_vertex:Vg,dithering_fragment:Wg,dithering_pars_fragment:qg,roughnessmap_fragment:Xg,roughnessmap_pars_fragment:jg,shadowmap_pars_fragment:Kg,shadowmap_pars_vertex:Yg,shadowmap_vertex:Jg,shadowmask_pars_fragment:Zg,skinbase_vertex:$g,skinning_pars_vertex:Qg,skinning_vertex:eb,skinnormal_vertex:tb,specularmap_fragment:nb,specularmap_pars_fragment:ib,tonemapping_fragment:sb,tonemapping_pars_fragment:rb,transmission_fragment:ab,transmission_pars_fragment:ob,uv_pars_fragment:cb,uv_pars_vertex:lb,uv_vertex:hb,worldpos_vertex:ub,background_vert:fb,background_frag:db,backgroundCube_vert:pb,backgroundCube_frag:mb,cube_vert:gb,cube_frag:bb,depth_vert:xb,depth_frag:_b,distance_vert:vb,distance_frag:yb,equirect_vert:Mb,equirect_frag:Sb,linedashed_vert:Tb,linedashed_frag:Eb,meshbasic_vert:wb,meshbasic_frag:Ab,meshlambert_vert:Rb,meshlambert_frag:Cb,meshmatcap_vert:Pb,meshmatcap_frag:Ib,meshnormal_vert:Lb,meshnormal_frag:Db,meshphong_vert:Fb,meshphong_frag:Nb,meshphysical_vert:Ub,meshphysical_frag:Ob,meshtoon_vert:Bb,meshtoon_frag:kb,points_vert:zb,points_frag:Hb,shadow_vert:Gb,shadow_frag:Vb,sprite_vert:Wb,sprite_frag:qb},We={common:{diffuse:{value:new Ge(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new lt},alphaMap:{value:null},alphaMapTransform:{value:new lt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new lt}},envmap:{envMap:{value:null},envMapRotation:{value:new lt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new lt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new lt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new lt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new lt},normalScale:{value:new Re(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new lt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new lt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new lt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new lt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ge(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new k},probesMax:{value:new k},probesResolution:{value:new k}},points:{diffuse:{value:new Ge(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new lt},alphaTest:{value:0},uvTransform:{value:new lt}},sprite:{diffuse:{value:new Ge(16777215)},opacity:{value:1},center:{value:new Re(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new lt},alphaMap:{value:null},alphaMapTransform:{value:new lt},alphaTest:{value:0}}},wi={basic:{uniforms:yn([We.common,We.specularmap,We.envmap,We.aomap,We.lightmap,We.fog]),vertexShader:mt.meshbasic_vert,fragmentShader:mt.meshbasic_frag},lambert:{uniforms:yn([We.common,We.specularmap,We.envmap,We.aomap,We.lightmap,We.emissivemap,We.bumpmap,We.normalmap,We.displacementmap,We.fog,We.lights,{emissive:{value:new Ge(0)},envMapIntensity:{value:1}}]),vertexShader:mt.meshlambert_vert,fragmentShader:mt.meshlambert_frag},phong:{uniforms:yn([We.common,We.specularmap,We.envmap,We.aomap,We.lightmap,We.emissivemap,We.bumpmap,We.normalmap,We.displacementmap,We.fog,We.lights,{emissive:{value:new Ge(0)},specular:{value:new Ge(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:mt.meshphong_vert,fragmentShader:mt.meshphong_frag},standard:{uniforms:yn([We.common,We.envmap,We.aomap,We.lightmap,We.emissivemap,We.bumpmap,We.normalmap,We.displacementmap,We.roughnessmap,We.metalnessmap,We.fog,We.lights,{emissive:{value:new Ge(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:mt.meshphysical_vert,fragmentShader:mt.meshphysical_frag},toon:{uniforms:yn([We.common,We.aomap,We.lightmap,We.emissivemap,We.bumpmap,We.normalmap,We.displacementmap,We.gradientmap,We.fog,We.lights,{emissive:{value:new Ge(0)}}]),vertexShader:mt.meshtoon_vert,fragmentShader:mt.meshtoon_frag},matcap:{uniforms:yn([We.common,We.bumpmap,We.normalmap,We.displacementmap,We.fog,{matcap:{value:null}}]),vertexShader:mt.meshmatcap_vert,fragmentShader:mt.meshmatcap_frag},points:{uniforms:yn([We.points,We.fog]),vertexShader:mt.points_vert,fragmentShader:mt.points_frag},dashed:{uniforms:yn([We.common,We.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:mt.linedashed_vert,fragmentShader:mt.linedashed_frag},depth:{uniforms:yn([We.common,We.displacementmap]),vertexShader:mt.depth_vert,fragmentShader:mt.depth_frag},normal:{uniforms:yn([We.common,We.bumpmap,We.normalmap,We.displacementmap,{opacity:{value:1}}]),vertexShader:mt.meshnormal_vert,fragmentShader:mt.meshnormal_frag},sprite:{uniforms:yn([We.sprite,We.fog]),vertexShader:mt.sprite_vert,fragmentShader:mt.sprite_frag},background:{uniforms:{uvTransform:{value:new lt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:mt.background_vert,fragmentShader:mt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new lt}},vertexShader:mt.backgroundCube_vert,fragmentShader:mt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:mt.cube_vert,fragmentShader:mt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:mt.equirect_vert,fragmentShader:mt.equirect_frag},distance:{uniforms:yn([We.common,We.displacementmap,{referencePosition:{value:new k},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:mt.distance_vert,fragmentShader:mt.distance_frag},shadow:{uniforms:yn([We.lights,We.fog,{color:{value:new Ge(0)},opacity:{value:1}}]),vertexShader:mt.shadow_vert,fragmentShader:mt.shadow_frag}};wi.physical={uniforms:yn([wi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new lt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new lt},clearcoatNormalScale:{value:new Re(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new lt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new lt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new lt},sheen:{value:0},sheenColor:{value:new Ge(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new lt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new lt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new lt},transmissionSamplerSize:{value:new Re},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new lt},attenuationDistance:{value:0},attenuationColor:{value:new Ge(0)},specularColor:{value:new Ge(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new lt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new lt},anisotropyVector:{value:new Re},anisotropyMap:{value:null},anisotropyMapTransform:{value:new lt}}]),vertexShader:mt.meshphysical_vert,fragmentShader:mt.meshphysical_frag};var el={r:0,b:0,g:0},Xb=new ct,np=new lt;np.set(-1,0,0,0,1,0,0,0,1);function jb(i,e,t,n,s,r){let a=new Ge(0),o=s===!0?0:1,c,l,h=null,u=0,f=null;function d(E){let m=E.isScene===!0?E.background:null;if(m&&m.isTexture){let M=E.backgroundBlurriness>0;m=e.get(m,M)}return m}function _(E){let m=!1,M=d(E);M===null?g(a,o):M&&M.isColor&&(g(M,1),m=!0);let v=i.xr.getEnvironmentBlendMode();v==="additive"?t.buffers.color.setClear(0,0,0,1,r):v==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||m)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function y(E,m){let M=d(m);M&&(M.isCubeTexture||M.mapping===Oa)?(l===void 0&&(l=new yt(new nn(1,1,1),new un({name:"BackgroundCubeMaterial",uniforms:Fs(wi.backgroundCube.uniforms),vertexShader:wi.backgroundCube.vertexShader,fragmentShader:wi.backgroundCube.fragmentShader,side:sn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(v,S,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=M,l.material.uniforms.backgroundBlurriness.value=m.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Xb.makeRotationFromEuler(m.backgroundRotation)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(np),l.material.toneMapped=bt.getTransfer(M.colorSpace)!==At,(h!==M||u!==M.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,h=M,u=M.version,f=i.toneMapping),l.layers.enableAll(),E.unshift(l,l.geometry,l.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new yt(new ki(2,2),new un({name:"BackgroundMaterial",uniforms:Fs(wi.background.uniforms),vertexShader:wi.background.vertexShader,fragmentShader:wi.background.fragmentShader,side:Si,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,c.material.toneMapped=bt.getTransfer(M.colorSpace)!==At,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||u!==M.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,h=M,u=M.version,f=i.toneMapping),c.layers.enableAll(),E.unshift(c,c.geometry,c.material,0,0,null))}function g(E,m){E.getRGB(el,Nh(i)),t.buffers.color.setClear(el.r,el.g,el.b,m,r)}function p(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(E,m=1){a.set(E),o=m,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(E){o=E,g(a,o)},render:_,addToRenderList:y,dispose:p}}function Kb(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=f(null),r=s,a=!1;function o(U,L,F,N,D){let V=!1,q=u(U,N,F,L);r!==q&&(r=q,l(r.object)),V=d(U,N,F,D),V&&_(U,N,F,D),D!==null&&e.update(D,i.ELEMENT_ARRAY_BUFFER),(V||a)&&(a=!1,M(U,L,F,N),D!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(D).buffer))}function c(){return i.createVertexArray()}function l(U){return i.bindVertexArray(U)}function h(U){return i.deleteVertexArray(U)}function u(U,L,F,N){let D=N.wireframe===!0,V=n[L.id];V===void 0&&(V={},n[L.id]=V);let q=U.isInstancedMesh===!0?U.id:0,ee=V[q];ee===void 0&&(ee={},V[q]=ee);let G=ee[F.id];G===void 0&&(G={},ee[F.id]=G);let te=G[D];return te===void 0&&(te=f(c()),G[D]=te),te}function f(U){let L=[],F=[],N=[];for(let D=0;D<t;D++)L[D]=0,F[D]=0,N[D]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:F,attributeDivisors:N,object:U,attributes:{},index:null}}function d(U,L,F,N){let D=r.attributes,V=L.attributes,q=0,ee=F.getAttributes();for(let G in ee)if(ee[G].location>=0){let ce=D[G],Le=V[G];if(Le===void 0&&(G==="instanceMatrix"&&U.instanceMatrix&&(Le=U.instanceMatrix),G==="instanceColor"&&U.instanceColor&&(Le=U.instanceColor)),ce===void 0||ce.attribute!==Le||Le&&ce.data!==Le.data)return!0;q++}return r.attributesNum!==q||r.index!==N}function _(U,L,F,N){let D={},V=L.attributes,q=0,ee=F.getAttributes();for(let G in ee)if(ee[G].location>=0){let ce=V[G];ce===void 0&&(G==="instanceMatrix"&&U.instanceMatrix&&(ce=U.instanceMatrix),G==="instanceColor"&&U.instanceColor&&(ce=U.instanceColor));let Le={};Le.attribute=ce,ce&&ce.data&&(Le.data=ce.data),D[G]=Le,q++}r.attributes=D,r.attributesNum=q,r.index=N}function y(){let U=r.newAttributes;for(let L=0,F=U.length;L<F;L++)U[L]=0}function g(U){p(U,0)}function p(U,L){let F=r.newAttributes,N=r.enabledAttributes,D=r.attributeDivisors;F[U]=1,N[U]===0&&(i.enableVertexAttribArray(U),N[U]=1),D[U]!==L&&(i.vertexAttribDivisor(U,L),D[U]=L)}function E(){let U=r.newAttributes,L=r.enabledAttributes;for(let F=0,N=L.length;F<N;F++)L[F]!==U[F]&&(i.disableVertexAttribArray(F),L[F]=0)}function m(U,L,F,N,D,V,q){q===!0?i.vertexAttribIPointer(U,L,F,D,V):i.vertexAttribPointer(U,L,F,N,D,V)}function M(U,L,F,N){y();let D=N.attributes,V=F.getAttributes(),q=L.defaultAttributeValues;for(let ee in V){let G=V[ee];if(G.location>=0){let te=D[ee];if(te===void 0&&(ee==="instanceMatrix"&&U.instanceMatrix&&(te=U.instanceMatrix),ee==="instanceColor"&&U.instanceColor&&(te=U.instanceColor)),te!==void 0){let ce=te.normalized,Le=te.itemSize,Ce=e.get(te);if(Ce===void 0)continue;let Ne=Ce.buffer,ze=Ce.type,tt=Ce.bytesPerElement,Z=ze===i.INT||ze===i.UNSIGNED_INT||te.gpuType===mc;if(te.isInterleavedBufferAttribute){let ae=te.data,he=ae.stride,Pe=te.offset;if(ae.isInstancedInterleavedBuffer){for(let Ae=0;Ae<G.locationSize;Ae++)p(G.location+Ae,ae.meshPerAttribute);U.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let Ae=0;Ae<G.locationSize;Ae++)g(G.location+Ae);i.bindBuffer(i.ARRAY_BUFFER,Ne);for(let Ae=0;Ae<G.locationSize;Ae++)m(G.location+Ae,Le/G.locationSize,ze,ce,he*tt,(Pe+Le/G.locationSize*Ae)*tt,Z)}else{if(te.isInstancedBufferAttribute){for(let ae=0;ae<G.locationSize;ae++)p(G.location+ae,te.meshPerAttribute);U.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let ae=0;ae<G.locationSize;ae++)g(G.location+ae);i.bindBuffer(i.ARRAY_BUFFER,Ne);for(let ae=0;ae<G.locationSize;ae++)m(G.location+ae,Le/G.locationSize,ze,ce,Le*tt,Le/G.locationSize*ae*tt,Z)}}else if(q!==void 0){let ce=q[ee];if(ce!==void 0)switch(ce.length){case 2:i.vertexAttrib2fv(G.location,ce);break;case 3:i.vertexAttrib3fv(G.location,ce);break;case 4:i.vertexAttrib4fv(G.location,ce);break;default:i.vertexAttrib1fv(G.location,ce)}}}}E()}function v(){C();for(let U in n){let L=n[U];for(let F in L){let N=L[F];for(let D in N){let V=N[D];for(let q in V)h(V[q].object),delete V[q];delete N[D]}}delete n[U]}}function S(U){if(n[U.id]===void 0)return;let L=n[U.id];for(let F in L){let N=L[F];for(let D in N){let V=N[D];for(let q in V)h(V[q].object),delete V[q];delete N[D]}}delete n[U.id]}function T(U){for(let L in n){let F=n[L];for(let N in F){let D=F[N];if(D[U.id]===void 0)continue;let V=D[U.id];for(let q in V)h(V[q].object),delete V[q];delete D[U.id]}}}function x(U){for(let L in n){let F=n[L],N=U.isInstancedMesh===!0?U.id:0,D=F[N];if(D!==void 0){for(let V in D){let q=D[V];for(let ee in q)h(q[ee].object),delete q[ee];delete D[V]}delete F[N],Object.keys(F).length===0&&delete n[L]}}}function C(){P(),a=!0,r!==s&&(r=s,l(r.object))}function P(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:C,resetDefaultState:P,dispose:v,releaseStatesOfGeometry:S,releaseStatesOfObject:x,releaseStatesOfProgram:T,initAttributes:y,enableAttribute:g,disableUnusedAttributes:E}}function Yb(i,e,t){let n;function s(c){n=c}function r(c,l){i.drawArrays(n,c,l),t.update(l,n,1)}function a(c,l,h){h!==0&&(i.drawArraysInstanced(n,c,l,h),t.update(l,n,h))}function o(c,l,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let f=0;for(let d=0;d<h;d++)f+=l[d];t.update(f,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function Jb(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let T=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(T){return!(T!==vn&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(T){let x=T===Ln&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(T!==In&&T!==kn&&!x&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function c(T){if(T==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp",h=c(l);h!==l&&(et("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let u=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&f===!1&&et("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let d=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),E=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),m=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),v=i.getParameter(i.MAX_SAMPLES),S=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:_,maxTextureSize:y,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:E,maxVaryings:m,maxFragmentUniforms:M,maxSamples:v,samples:S}}function Zb(i){let e=this,t=null,n=0,s=!1,r=!1,a=new ii,o=new lt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){let d=u.length!==0||f||n!==0||s;return s=f,n=u.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,d){let _=u.clippingPlanes,y=u.clipIntersection,g=u.clipShadows,p=i.get(u);if(!s||_===null||_.length===0||r&&!g)r?h(null):l();else{let E=r?0:n,m=E*4,M=p.clippingState||null;c.value=M,M=h(_,f,m,d);for(let v=0;v!==m;++v)M[v]=t[v];p.clippingState=M,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=E}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,f,d,_){let y=u!==null?u.length:0,g=null;if(y!==0){if(g=c.value,_!==!0||g===null){let p=d+y*4,E=f.matrixWorldInverse;o.getNormalMatrix(E),(g===null||g.length<p)&&(g=new Float32Array(p));for(let m=0,M=d;m!==y;++m,M+=4)a.copy(u[m]).applyMatrix4(E,o),a.normal.toArray(g,M),g[M+3]=a.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,g}}var Ir=4,$b=6,Qb=20,ex=256,Xa=new Mi,Fd=new Ge,Wh=null,qh=0,Xh=0,jh=!1,tx=new k,Ns=new k,us=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:a=256,position:o=tx}=r;Wh=this._renderer.getRenderTarget(),qh=this._renderer.getActiveCubeFace(),Xh=this._renderer.getActiveMipmapLevel(),jh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,s,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Od(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ud(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Wh,qh,Xh),this._renderer.xr.enabled=jh,e.scissorTest=!1,Pr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===cs||e.mapping===Ls?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Wh=this._renderer.getRenderTarget(),qh=this._renderer.getActiveCubeFace(),Xh=this._renderer.getActiveMipmapLevel(),jh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:It,minFilter:It,generateMipmaps:!1,type:Ln,format:vn,colorSpace:En,depthBuffer:!1},s=Nd(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Nd(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=nx(r)),this._blurMaterial=sx(r,e,t),this._ggxMaterial=ix(r,e,t)}return s}_compileMaterial(e){let t=new yt(new Ct,e);this._renderer.compile(t,Xa)}_sceneToCubeUV(e,t,n,s,r){let c=new Wt(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,d=u.toneMapping;u.getClearColor(Fd),u.toneMapping=ai,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new yt(new nn,new hn({name:"PMREM.Background",side:sn,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,g=y.material,p=!1,E=e.background;E?E.isColor&&(g.color.copy(E),e.background=null,p=!0):(g.color.copy(Fd),p=!0);for(let m=0;m<6;m++){let M=m%3;M===0?(c.up.set(0,l[m],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[m],r.y,r.z)):M===1?(c.up.set(0,0,l[m]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[m],r.z)):(c.up.set(0,l[m],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[m]));let v=this._cubeSize;Pr(s,M*v,m>2?v:0,v,v),u.setRenderTarget(s),p&&u.render(y,c),u.render(e,c)}u.toneMapping=d,u.autoClear=f,e.background=E}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===cs||e.mapping===Ls;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Od()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ud());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=e;let c=this._cubeSize;Pr(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,Xa)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let c=a.uniforms,l=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(l*l-h*h),f=l*1.25,d=u*f,{_lodMax:_}=this,y=this._sizeLods[n],g=3*y*(n>_-Ir?n-_+Ir:0),p=4*(this._cubeSize-y);c.envMap.value=e.texture,c.roughness.value=d,c.mipInt.value=_-t,Pr(r,g,p,3*y,2*y),s.setRenderTarget(r),s.render(o,Xa),c.envMap.value=r.texture,c.roughness.value=0,c.mipInt.value=_-n,Pr(e,g,p,3*y,2*y),s.setRenderTarget(e),s.render(o,Xa)}_blur(e,t,n,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(e,r,t,n,a),this._blurPass(r,e,n,n,a)}_blurPass(e,t,n,s,r){let a=this._renderer,o=this._blurMaterial,c=this._lodMeshes[s];c.material=o;let l=o.uniforms;l.envMap.value=e.texture,l.sigma.value=r,l.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],u=3*h*(s>this._lodMax-Ir?s-this._lodMax+Ir:0),f=4*(this._cubeSize-h);Pr(t,u,f,3*h,2*h),a.setRenderTarget(t),a.render(c,Xa)}};function nx(i){let e=[],t=[],n=i,s=i-Ir+1+$b;for(let r=0;r<s;r++){let a=Math.pow(2,n);e.push(a);let o=1/(a-2),c=-o,l=1+o,h=[c,c,l,c,l,l,c,c,l,l,c,l],u=6,f=6,d=3,_=new Float32Array(d*f*u),y=new Float32Array(d*f*u);for(let p=0;p<u;p++){let E=p%3*2/3-1,m=p>2?0:-1,M=[E,m,0,E+2/3,m,0,E+2/3,m+1,0,E,m,0,E+2/3,m+1,0,E,m+1,0];_.set(M,d*f*p);for(let v=0;v<f;v++){let S=h[v*2]*2-1,T=h[v*2+1]*2-1;p===0?Ns.set(1,T,S):p===1?Ns.set(-S,1,-T):p===2?Ns.set(-S,T,1):p===3?Ns.set(-1,T,-S):p===4?Ns.set(-S,-1,T):Ns.set(S,T,-1),Ns.toArray(y,(p*f+v)*d)}}let g=new Ct;g.setAttribute("position",new St(_,d)),g.setAttribute("outputDirection",new St(y,d)),t.push(new yt(g,null)),n>Ir&&n--}return{lodMeshes:t,sizeLods:e}}function Nd(i,e,t){let n=new ln(i,e,t);return n.texture.mapping=Oa,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Pr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function ix(i,e,t){return new un({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:ex,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:il(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:On,depthTest:!1,depthWrite:!1})}function sx(i,e,t){return new un({name:"SphericalGaussianBlur",defines:{SAMPLES:Qb,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:il(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:On,depthTest:!1,depthWrite:!1})}function Ud(){return new un({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:il(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:On,depthTest:!1,depthWrite:!1})}function Od(){return new un({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:il(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:On,depthTest:!1,depthWrite:!1})}function il(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var nl=class extends ln{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new ua(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new nn(5,5,5),r=new un({name:"CubemapFromEquirect",uniforms:Fs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:sn,blending:On});r.uniforms.tEquirect.value=t;let a=new yt(s,r),o=t.minFilter;return t.minFilter===Bn&&(t.minFilter=It),new cc(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}};function rx(i){let e=new WeakMap,t=new WeakMap,n=null;function s(f,d=!1){return f==null?null:d?a(f):r(f)}function r(f){if(f&&f.isTexture){let d=f.mapping;if(d===fc||d===dc)if(e.has(f)){let _=e.get(f).texture;return o(_,f.mapping)}else{let _=f.image;if(_&&_.height>0){let y=new nl(_.height);return y.fromEquirectangularTexture(i,f),e.set(f,y),f.addEventListener("dispose",l),o(y.texture,f.mapping)}else return null}}return f}function a(f){if(f&&f.isTexture){let d=f.mapping,_=d===fc||d===dc,y=d===cs||d===Ls;if(_||y){let g=t.get(f),p=g!==void 0?g.texture.pmremVersion:0;if(f.isRenderTargetTexture&&f.pmremVersion!==p)return n===null&&(n=new us(i)),g=_?n.fromEquirectangular(f,g):n.fromCubemap(f,g),g.texture.pmremVersion=f.pmremVersion,t.set(f,g),g.texture;if(g!==void 0)return g.texture;{let E=f.image;return _&&E&&E.height>0||y&&E&&c(E)?(n===null&&(n=new us(i)),g=_?n.fromEquirectangular(f):n.fromCubemap(f),g.texture.pmremVersion=f.pmremVersion,t.set(f,g),f.addEventListener("dispose",h),g.texture):null}}}return f}function o(f,d){return d===fc?f.mapping=cs:d===dc&&(f.mapping=Ls),f}function c(f){let d=0,_=6;for(let y=0;y<_;y++)f[y]!==void 0&&d++;return d===_}function l(f){let d=f.target;d.removeEventListener("dispose",l);let _=e.get(d);_!==void 0&&(e.delete(d),_.dispose())}function h(f){let d=f.target;d.removeEventListener("dispose",h);let _=t.get(d);_!==void 0&&(t.delete(d),_.dispose())}function u(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:u}}function ax(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&vs("WebGLRenderer: "+n+" extension not supported."),s}}}function ox(i,e,t,n){let s={},r=new WeakMap;function a(u){let f=u.target;f.index!==null&&e.remove(f.index);for(let _ in f.attributes)e.remove(f.attributes[_]);f.removeEventListener("dispose",a),delete s[f.id];let d=r.get(f);d&&(e.remove(d),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(u,f){return s[f.id]===!0||(f.addEventListener("dispose",a),s[f.id]=!0,t.memory.geometries++),f}function c(u){let f=u.attributes;for(let d in f)e.update(f[d],i.ARRAY_BUFFER)}function l(u){let f=[],d=u.index,_=u.attributes.position,y=0;if(_===void 0)return;if(d!==null){let E=d.array;y=d.version;for(let m=0,M=E.length;m<M;m+=3){let v=E[m+0],S=E[m+1],T=E[m+2];f.push(v,S,S,T,T,v)}}else{let E=_.array;y=_.version;for(let m=0,M=E.length/3-1;m<M;m+=3){let v=m+0,S=m+1,T=m+2;f.push(v,S,S,T,T,v)}}let g=new(_.count>=65535?ra:sa)(f,1);g.version=y;let p=r.get(u);p&&e.remove(p),r.set(u,g)}function h(u){let f=r.get(u);if(f){let d=u.index;d!==null&&f.version<d.version&&l(u)}else l(u);return r.get(u)}return{get:o,update:c,getWireframeAttribute:h}}function cx(i,e,t){let n;function s(u){n=u}let r,a;function o(u){r=u.type,a=u.bytesPerElement}function c(u,f){i.drawElements(n,f,r,u*a),t.update(f,n,1)}function l(u,f,d){d!==0&&(i.drawElementsInstanced(n,f,r,u*a,d),t.update(f,n,d))}function h(u,f,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,u,0,d);let y=0;for(let g=0;g<d;g++)y+=f[g];t.update(y,n,1)}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function lx(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:at("WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function hx(i,e,t){let n=new WeakMap,s=new wt;function r(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0,f=n.get(o);if(f===void 0||f.count!==u){let C=function(){T.dispose(),n.delete(o),o.removeEventListener("dispose",C)};f!==void 0&&f.texture.dispose();let d=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,y=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],E=o.morphAttributes.color||[],m=0;d===!0&&(m=1),_===!0&&(m=2),y===!0&&(m=3);let M=o.attributes.position.count*m,v=1;M>e.maxTextureSize&&(v=Math.ceil(M/e.maxTextureSize),M=e.maxTextureSize);let S=new Float32Array(M*v*4*u),T=new na(S,M,v,u);T.type=kn,T.needsUpdate=!0;let x=m*4;for(let P=0;P<u;P++){let U=g[P],L=p[P],F=E[P],N=M*v*4*P;for(let D=0;D<U.count;D++){let V=D*x;d===!0&&(s.fromBufferAttribute(U,D),S[N+V+0]=s.x,S[N+V+1]=s.y,S[N+V+2]=s.z,S[N+V+3]=0),_===!0&&(s.fromBufferAttribute(L,D),S[N+V+4]=s.x,S[N+V+5]=s.y,S[N+V+6]=s.z,S[N+V+7]=0),y===!0&&(s.fromBufferAttribute(F,D),S[N+V+8]=s.x,S[N+V+9]=s.y,S[N+V+10]=s.z,S[N+V+11]=F.itemSize===4?s.w:1)}}f={count:u,texture:T,size:new Re(M,v)},n.set(o,f),o.addEventListener("dispose",C)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let d=0;for(let y=0;y<l.length;y++)d+=l[y];let _=o.morphTargetsRelative?1:1-d;c.getUniforms().setValue(i,"morphTargetBaseInfluence",_),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",f.size)}return{update:r}}function ux(i,e,t,n,s){let r=new WeakMap;function a(l){let h=s.render.frame,u=l.geometry,f=e.get(l,u);if(r.get(f)!==h&&(e.update(f),r.set(f,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==h&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,h))),l.isSkinnedMesh){let d=l.skeleton;r.get(d)!==h&&(d.update(),r.set(d,h))}return f}function o(){r=new WeakMap}function c(l){let h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:a,dispose:o}}var fx={[bh]:"LINEAR_TONE_MAPPING",[xh]:"REINHARD_TONE_MAPPING",[_h]:"CINEON_TONE_MAPPING",[Is]:"ACES_FILMIC_TONE_MAPPING",[Ua]:"AGX_TONE_MAPPING",[yh]:"NEUTRAL_TONE_MAPPING",[vh]:"CUSTOM_TONE_MAPPING"};function dx(i,e,t,n,s,r){let a=new ln(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,c=null,l=new Ct;l.setAttribute("position",new pt([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new pt([0,2,0,0,2,0],2));let h=new $o({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new yt(l,h),f=new Mi(-1,1,1,-1,0,1),d=null,_=null,y=!1,g,p=null,E=[],m=!1;this.setSize=function(M,v){a.setSize(M,v),o!==null&&o.setSize(M,v),c!==null&&c.setSize(M,v);for(let S=0;S<E.length;S++){let T=E[S];T.setSize&&T.setSize(M,v)}},this.setEffects=function(M){E=M,m=E.length>0&&E[0].isRenderPass===!0;let v=a.width,S=a.height;E.length>0&&o===null&&(o=new ln(v,S,{type:Ln,depthBuffer:!1,stencilBuffer:!1}),c=new ln(v,S,{type:Ln,depthBuffer:!1,stencilBuffer:!1}));for(let T=0;T<E.length;T++){let x=E[T];x.setSize&&x.setSize(v,S)}},this.begin=function(M,v){if(y||M.toneMapping===ai&&E.length===0)return!1;if(p=v,v!==null){let S=v.width,T=v.height;(a.width!==S||a.height!==T)&&this.setSize(S,T)}return m===!1&&M.setRenderTarget(a),g=M.toneMapping,M.toneMapping=ai,!0},this.hasRenderPass=function(){return m},this.end=function(M,v){M.toneMapping=g,y=!0;let S=a,T=o;for(let x=0;x<E.length;x++){let C=E[x];C.enabled!==!1&&(C.render(M,T,S,v),C.needsSwap!==!1&&(S=T,T=T===o?c:o))}if(d!==M.outputColorSpace||_!==M.toneMapping){d=M.outputColorSpace,_=M.toneMapping,h.defines={},bt.getTransfer(d)===At&&(h.defines.SRGB_TRANSFER="");let x=fx[_];x&&(h.defines[x]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=S.texture,M.setRenderTarget(p),M.render(u,f),p=null,y=!1},this.isCompositing=function(){return y},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),l.dispose(),h.dispose()}}var ip=new jt,Jh=new rs(1,1),sp=new na,rp=new Go,ap=new ua,Bd=[],kd=[],zd=new Float32Array(16),Hd=new Float32Array(9),Gd=new Float32Array(4);function Fr(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Bd[s];if(r===void 0&&(r=new Float32Array(s),Bd[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function rn(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function an(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function sl(i,e){let t=kd[e];t===void 0&&(t=new Int32Array(e),kd[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function px(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function mx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(rn(t,e))return;i.uniform2fv(this.addr,e),an(t,e)}}function gx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(rn(t,e))return;i.uniform3fv(this.addr,e),an(t,e)}}function bx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(rn(t,e))return;i.uniform4fv(this.addr,e),an(t,e)}}function xx(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(rn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),an(t,e)}else{if(rn(t,n))return;Gd.set(n),i.uniformMatrix2fv(this.addr,!1,Gd),an(t,n)}}function _x(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(rn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),an(t,e)}else{if(rn(t,n))return;Hd.set(n),i.uniformMatrix3fv(this.addr,!1,Hd),an(t,n)}}function vx(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(rn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),an(t,e)}else{if(rn(t,n))return;zd.set(n),i.uniformMatrix4fv(this.addr,!1,zd),an(t,n)}}function yx(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Mx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(rn(t,e))return;i.uniform2iv(this.addr,e),an(t,e)}}function Sx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(rn(t,e))return;i.uniform3iv(this.addr,e),an(t,e)}}function Tx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(rn(t,e))return;i.uniform4iv(this.addr,e),an(t,e)}}function Ex(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function wx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(rn(t,e))return;i.uniform2uiv(this.addr,e),an(t,e)}}function Ax(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(rn(t,e))return;i.uniform3uiv(this.addr,e),an(t,e)}}function Rx(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(rn(t,e))return;i.uniform4uiv(this.addr,e),an(t,e)}}function Cx(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Jh.compareFunction=t.isReversedDepthBuffer()?Qc:$c,r=Jh):r=ip,t.setTexture2D(e||r,s)}function Px(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||rp,s)}function Ix(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||ap,s)}function Lx(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||sp,s)}function Dx(i){switch(i){case 5126:return px;case 35664:return mx;case 35665:return gx;case 35666:return bx;case 35674:return xx;case 35675:return _x;case 35676:return vx;case 5124:case 35670:return yx;case 35667:case 35671:return Mx;case 35668:case 35672:return Sx;case 35669:case 35673:return Tx;case 5125:return Ex;case 36294:return wx;case 36295:return Ax;case 36296:return Rx;case 35678:case 36198:case 36298:case 36306:case 35682:return Cx;case 35679:case 36299:case 36307:return Px;case 35680:case 36300:case 36308:case 36293:return Ix;case 36289:case 36303:case 36311:case 36292:return Lx}}function Fx(i,e){i.uniform1fv(this.addr,e)}function Nx(i,e){let t=Fr(e,this.size,2);i.uniform2fv(this.addr,t)}function Ux(i,e){let t=Fr(e,this.size,3);i.uniform3fv(this.addr,t)}function Ox(i,e){let t=Fr(e,this.size,4);i.uniform4fv(this.addr,t)}function Bx(i,e){let t=Fr(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function kx(i,e){let t=Fr(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function zx(i,e){let t=Fr(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Hx(i,e){i.uniform1iv(this.addr,e)}function Gx(i,e){i.uniform2iv(this.addr,e)}function Vx(i,e){i.uniform3iv(this.addr,e)}function Wx(i,e){i.uniform4iv(this.addr,e)}function qx(i,e){i.uniform1uiv(this.addr,e)}function Xx(i,e){i.uniform2uiv(this.addr,e)}function jx(i,e){i.uniform3uiv(this.addr,e)}function Kx(i,e){i.uniform4uiv(this.addr,e)}function Yx(i,e,t){let n=this.cache,s=e.length,r=sl(t,s);rn(n,r)||(i.uniform1iv(this.addr,r),an(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=Jh:a=ip;for(let o=0;o!==s;++o)t.setTexture2D(e[o]||a,r[o])}function Jx(i,e,t){let n=this.cache,s=e.length,r=sl(t,s);rn(n,r)||(i.uniform1iv(this.addr,r),an(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||rp,r[a])}function Zx(i,e,t){let n=this.cache,s=e.length,r=sl(t,s);rn(n,r)||(i.uniform1iv(this.addr,r),an(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||ap,r[a])}function $x(i,e,t){let n=this.cache,s=e.length,r=sl(t,s);rn(n,r)||(i.uniform1iv(this.addr,r),an(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||sp,r[a])}function Qx(i){switch(i){case 5126:return Fx;case 35664:return Nx;case 35665:return Ux;case 35666:return Ox;case 35674:return Bx;case 35675:return kx;case 35676:return zx;case 5124:case 35670:return Hx;case 35667:case 35671:return Gx;case 35668:case 35672:return Vx;case 35669:case 35673:return Wx;case 5125:return qx;case 36294:return Xx;case 36295:return jx;case 36296:return Kx;case 35678:case 36198:case 36298:case 36306:case 35682:return Yx;case 35679:case 36299:case 36307:return Jx;case 35680:case 36300:case 36308:case 36293:return Zx;case 36289:case 36303:case 36311:case 36292:return $x}}var Zh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Dx(t.type)}},$h=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Qx(t.type)}},Qh=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],n)}}},Kh=/(\w+)(\])?(\[|\.)?/g;function Vd(i,e){i.seq.push(e),i.map[e.id]=e}function e_(i,e,t){let n=i.name,s=n.length;for(Kh.lastIndex=0;;){let r=Kh.exec(n),a=Kh.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){Vd(t,l===void 0?new Zh(o,i,e):new $h(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new Qh(o),Vd(t,u)),t=u}}}var Lr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=e.getActiveUniform(t,a),c=e.getUniformLocation(t,o.name);e_(o,c,this)}let s=[],r=[];for(let a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&n.push(a)}return n}};function Wd(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var t_=37297,n_=0;function i_(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var qd=new lt;function s_(i){bt._getMatrix(qd,bt.workingColorSpace,i);let e=`mat3( ${qd.elements.map(t=>t.toFixed(4))} )`;switch(bt.getTransfer(i)){case ea:return[e,"LinearTransferOETF"];case At:return[e,"sRGBTransferOETF"];default:return et("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Xd(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+i_(i.getShaderSource(e),o)}else return r}function r_(i,e){let t=s_(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var a_={[bh]:"Linear",[xh]:"Reinhard",[_h]:"Cineon",[Is]:"ACESFilmic",[Ua]:"AgX",[yh]:"Neutral",[vh]:"Custom"};function o_(i,e){let t=a_[e];return t===void 0?(et("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var tl=new k;function c_(){bt.getLuminanceCoefficients(tl);let i=tl.x.toFixed(4),e=tl.y.toFixed(4),t=tl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function l_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ka).join(`
`)}function h_(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function u_(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Ka(i){return i!==""}function jd(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Kd(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var f_=/^[ \t]*#include +<([\w\d./]+)>/gm;function eu(i){return i.replace(f_,p_)}var d_=new Map;function p_(i,e){let t=mt[e];if(t===void 0){let n=d_.get(e);if(n!==void 0)t=mt[n],et('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return eu(t)}var m_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Yd(i){return i.replace(m_,g_)}function g_(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Jd(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var b_={[Fa]:"SHADOWMAP_TYPE_PCF",[Mr]:"SHADOWMAP_TYPE_VSM"};function x_(i){return b_[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var __={[cs]:"ENVMAP_TYPE_CUBE",[Ls]:"ENVMAP_TYPE_CUBE",[Oa]:"ENVMAP_TYPE_CUBE_UV"};function v_(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":__[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var y_={[Ls]:"ENVMAP_MODE_REFRACTION"};function M_(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":y_[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var S_={[uc]:"ENVMAP_BLENDING_MULTIPLY",[ld]:"ENVMAP_BLENDING_MIX",[hd]:"ENVMAP_BLENDING_ADD"};function T_(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":S_[i.combine]||"ENVMAP_BLENDING_NONE"}function E_(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function w_(i,e,t,n){let s=i.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,c=x_(t),l=v_(t),h=M_(t),u=T_(t),f=E_(t),d=l_(t),_=h_(r),y=s.createProgram(),g,p,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(Ka).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(Ka).join(`
`),p.length>0&&(p+=`
`)):(g=[Jd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ka).join(`
`),p=[Jd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ai?"#define TONE_MAPPING":"",t.toneMapping!==ai?mt.tonemapping_pars_fragment:"",t.toneMapping!==ai?o_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",mt.colorspace_pars_fragment,r_("linearToOutputTexel",t.outputColorSpace),c_(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ka).join(`
`)),a=eu(a),a=jd(a,t),a=Kd(a,t),o=eu(o),o=jd(o,t),o=Kd(o,t),a=Yd(a),o=Yd(o),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,g=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===Ih?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ih?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let m=E+g+a,M=E+p+o,v=Wd(s,s.VERTEX_SHADER,m),S=Wd(s,s.FRAGMENT_SHADER,M);s.attachShader(y,v),s.attachShader(y,S),t.index0AttributeName!==void 0?s.bindAttribLocation(y,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function T(U){if(i.debug.checkShaderErrors){let L=s.getProgramInfoLog(y)||"",F=s.getShaderInfoLog(v)||"",N=s.getShaderInfoLog(S)||"",D=L.trim(),V=F.trim(),q=N.trim(),ee=!0,G=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(ee=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,v,S);else{let te=Xd(s,v,"vertex"),ce=Xd(s,S,"fragment");at("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+U.name+`
Material Type: `+U.type+`

Program Info Log: `+D+`
`+te+`
`+ce)}else D!==""?et("WebGLProgram: Program Info Log:",D):(V===""||q==="")&&(G=!1);G&&(U.diagnostics={runnable:ee,programLog:D,vertexShader:{log:V,prefix:g},fragmentShader:{log:q,prefix:p}})}s.deleteShader(v),s.deleteShader(S),x=new Lr(s,y),C=u_(s,y)}let x;this.getUniforms=function(){return x===void 0&&T(this),x};let C;this.getAttributes=function(){return C===void 0&&T(this),C};let P=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=s.getProgramParameter(y,t_)),P},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=n_++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=v,this.fragmentShader=S,this}var A_=0,tu=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new nu(e),t.set(e,n)),n}},nu=class{constructor(e){this.id=A_++,this.code=e,this.usedTimes=0}};function R_(i){return i===hs||i===Ga||i===Va}function C_(i,e,t,n,s,r){let a=new ia,o=new tu,c=new Set,l=[],h=new Map,u=n.logarithmicDepthBuffer,f=n.precision,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(x){return c.add(x),x===0?"uv":`uv${x}`}function y(x,C,P,U,L,F){let N=U.fog,D=L.geometry,V=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?U.environment:null,q=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,ee=e.get(x.envMap||V,q),G=ee&&ee.mapping===Oa?ee.image.height:null,te=d[x.type];x.precision!==null&&(f=n.getMaxPrecision(x.precision),f!==x.precision&&et("WebGLProgram.getParameters:",x.precision,"not supported, using",f,"instead."));let ce=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,Le=ce!==void 0?ce.length:0,Ce=0;D.morphAttributes.position!==void 0&&(Ce=1),D.morphAttributes.normal!==void 0&&(Ce=2),D.morphAttributes.color!==void 0&&(Ce=3);let Ne,ze,tt,Z;if(te){let ht=wi[te];Ne=ht.vertexShader,ze=ht.fragmentShader}else{Ne=x.vertexShader,ze=x.fragmentShader;let ht=o.getVertexShaderStage(x),st=o.getFragmentShaderStage(x);o.update(x,ht,st),tt=ht.id,Z=st.id}let ae=i.getRenderTarget(),he=i.state.buffers.depth.getReversed(),Pe=L.isInstancedMesh===!0,Ae=L.isBatchedMesh===!0,De=!!x.map,Je=!!x.matcap,de=!!ee,ge=!!x.aoMap,xe=!!x.lightMap,_e=!!x.bumpMap&&x.wireframe===!1,Me=!!x.normalMap,Ue=!!x.displacementMap,ve=!!x.emissiveMap,ue=!!x.metalnessMap,me=!!x.roughnessMap,B=x.anisotropy>0,W=x.clearcoat>0,le=x.dispersion>0,A=x.retroreflectivity>0,b=x.iridescence>0,w=x.sheen>0,I=x.transmission>0,z=B&&!!x.anisotropyMap,X=W&&!!x.clearcoatMap,ie=W&&!!x.clearcoatNormalMap,O=W&&!!x.clearcoatRoughnessMap,K=b&&!!x.iridescenceMap,Y=b&&!!x.iridescenceThicknessMap,fe=w&&!!x.sheenColorMap,ne=w&&!!x.sheenRoughnessMap,Q=!!x.specularMap,pe=!!x.specularColorMap,we=!!x.specularIntensityMap,Ie=I&&!!x.transmissionMap,H=I&&!!x.thicknessMap,ye=!!x.gradientMap,se=!!x.alphaMap,Se=x.alphaTest>0,Te=!!x.alphaHash,be=!!x.extensions,Be=ai;x.toneMapped&&(ae===null||ae.isXRRenderTarget===!0)&&(Be=i.toneMapping);let ke={shaderID:te,shaderType:x.type,shaderName:x.name,vertexShader:Ne,fragmentShader:ze,defines:x.defines,customVertexShaderID:tt,customFragmentShaderID:Z,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:f,batching:Ae,batchingColor:Ae&&L._colorsTexture!==null,instancing:Pe,instancingColor:Pe&&L.instanceColor!==null,instancingMorph:Pe&&L.morphTexture!==null,outputColorSpace:ae===null?i.outputColorSpace:ae.isXRRenderTarget===!0?ae.texture.colorSpace:bt.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:De,matcap:Je,envMap:de,envMapMode:de&&ee.mapping,envMapCubeUVHeight:G,aoMap:ge,lightMap:xe,bumpMap:_e,normalMap:Me,displacementMap:Ue,emissiveMap:ve,normalMapObjectSpace:Me&&x.normalMapType===pd,normalMapTangentSpace:Me&&x.normalMapType===qa,packedNormalMap:Me&&x.normalMapType===qa&&R_(x.normalMap.format),metalnessMap:ue,roughnessMap:me,anisotropy:B,anisotropyMap:z,clearcoat:W,clearcoatMap:X,clearcoatNormalMap:ie,clearcoatRoughnessMap:O,dispersion:le,retroreflection:A,iridescence:b,iridescenceMap:K,iridescenceThicknessMap:Y,sheen:w,sheenColorMap:fe,sheenRoughnessMap:ne,specularMap:Q,specularColorMap:pe,specularIntensityMap:we,transmission:I,transmissionMap:Ie,thicknessMap:H,gradientMap:ye,opaque:x.transparent===!1&&x.blending===Sr&&x.alphaToCoverage===!1,alphaMap:se,alphaTest:Se,alphaHash:Te,combine:x.combine,mapUv:De&&_(x.map.channel),aoMapUv:ge&&_(x.aoMap.channel),lightMapUv:xe&&_(x.lightMap.channel),bumpMapUv:_e&&_(x.bumpMap.channel),normalMapUv:Me&&_(x.normalMap.channel),displacementMapUv:Ue&&_(x.displacementMap.channel),emissiveMapUv:ve&&_(x.emissiveMap.channel),metalnessMapUv:ue&&_(x.metalnessMap.channel),roughnessMapUv:me&&_(x.roughnessMap.channel),anisotropyMapUv:z&&_(x.anisotropyMap.channel),clearcoatMapUv:X&&_(x.clearcoatMap.channel),clearcoatNormalMapUv:ie&&_(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:O&&_(x.clearcoatRoughnessMap.channel),iridescenceMapUv:K&&_(x.iridescenceMap.channel),iridescenceThicknessMapUv:Y&&_(x.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&_(x.sheenColorMap.channel),sheenRoughnessMapUv:ne&&_(x.sheenRoughnessMap.channel),specularMapUv:Q&&_(x.specularMap.channel),specularColorMapUv:pe&&_(x.specularColorMap.channel),specularIntensityMapUv:we&&_(x.specularIntensityMap.channel),transmissionMapUv:Ie&&_(x.transmissionMap.channel),thicknessMapUv:H&&_(x.thicknessMap.channel),alphaMapUv:se&&_(x.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(Me||B),vertexNormals:!!D.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:L.isPoints===!0&&!!D.attributes.uv&&(De||se),fog:!!N,useFog:x.fog===!0,fogExp2:!!N&&N.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||D.attributes.normal===void 0&&Me===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:he,skinning:L.isSkinnedMesh===!0,hasPositionAttribute:D.attributes.position!==void 0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:Le,morphTextureStride:Ce,numSunLights:C.sun.length,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numSunLightShadows:C.sunShadowMap.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numLightProbeGrids:F.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:Be,decodeVideoTexture:De&&x.map.isVideoTexture===!0&&bt.getTransfer(x.map.colorSpace)===At,decodeVideoTextureEmissive:ve&&x.emissiveMap.isVideoTexture===!0&&bt.getTransfer(x.emissiveMap.colorSpace)===At,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===pn,flipSided:x.side===sn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:be&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(be&&x.extensions.multiDraw===!0||Ae)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return ke.vertexUv1s=c.has(1),ke.vertexUv2s=c.has(2),ke.vertexUv3s=c.has(3),c.clear(),ke}function g(x){let C=[];if(x.shaderID?C.push(x.shaderID):(C.push(x.customVertexShaderID),C.push(x.customFragmentShaderID)),x.defines!==void 0)for(let P in x.defines)C.push(P),C.push(x.defines[P]);return x.isRawShaderMaterial===!1&&(p(C,x),E(C,x),C.push(i.outputColorSpace)),C.push(x.customProgramCacheKey),C.join()}function p(x,C){x.push(C.precision),x.push(C.outputColorSpace),x.push(C.envMapMode),x.push(C.envMapCubeUVHeight),x.push(C.mapUv),x.push(C.alphaMapUv),x.push(C.lightMapUv),x.push(C.aoMapUv),x.push(C.bumpMapUv),x.push(C.normalMapUv),x.push(C.displacementMapUv),x.push(C.emissiveMapUv),x.push(C.metalnessMapUv),x.push(C.roughnessMapUv),x.push(C.anisotropyMapUv),x.push(C.clearcoatMapUv),x.push(C.clearcoatNormalMapUv),x.push(C.clearcoatRoughnessMapUv),x.push(C.iridescenceMapUv),x.push(C.iridescenceThicknessMapUv),x.push(C.sheenColorMapUv),x.push(C.sheenRoughnessMapUv),x.push(C.specularMapUv),x.push(C.specularColorMapUv),x.push(C.specularIntensityMapUv),x.push(C.transmissionMapUv),x.push(C.thicknessMapUv),x.push(C.combine),x.push(C.fogExp2),x.push(C.sizeAttenuation),x.push(C.morphTargetsCount),x.push(C.morphAttributeCount),x.push(C.numSunLights),x.push(C.numDirLights),x.push(C.numPointLights),x.push(C.numSpotLights),x.push(C.numSpotLightMaps),x.push(C.numHemiLights),x.push(C.numRectAreaLights),x.push(C.numSunLightShadows),x.push(C.numDirLightShadows),x.push(C.numPointLightShadows),x.push(C.numSpotLightShadows),x.push(C.numSpotLightShadowsWithMaps),x.push(C.numLightProbes),x.push(C.shadowMapType),x.push(C.toneMapping),x.push(C.numClippingPlanes),x.push(C.numClipIntersection),x.push(C.depthPacking)}function E(x,C){a.disableAll(),C.instancing&&a.enable(0),C.instancingColor&&a.enable(1),C.instancingMorph&&a.enable(2),C.matcap&&a.enable(3),C.envMap&&a.enable(4),C.normalMapObjectSpace&&a.enable(5),C.normalMapTangentSpace&&a.enable(6),C.clearcoat&&a.enable(7),C.iridescence&&a.enable(8),C.alphaTest&&a.enable(9),C.vertexColors&&a.enable(10),C.vertexAlphas&&a.enable(11),C.vertexUv1s&&a.enable(12),C.vertexUv2s&&a.enable(13),C.vertexUv3s&&a.enable(14),C.vertexTangents&&a.enable(15),C.anisotropy&&a.enable(16),C.alphaHash&&a.enable(17),C.batching&&a.enable(18),C.dispersion&&a.enable(19),C.retroreflection&&a.enable(24),C.batchingColor&&a.enable(20),C.gradientMap&&a.enable(21),C.packedNormalMap&&a.enable(22),C.vertexNormals&&a.enable(23),x.push(a.mask),a.disableAll(),C.fog&&a.enable(0),C.useFog&&a.enable(1),C.flatShading&&a.enable(2),C.logarithmicDepthBuffer&&a.enable(3),C.reversedDepthBuffer&&a.enable(4),C.skinning&&a.enable(5),C.morphTargets&&a.enable(6),C.morphNormals&&a.enable(7),C.morphColors&&a.enable(8),C.premultipliedAlpha&&a.enable(9),C.shadowMapEnabled&&a.enable(10),C.doubleSided&&a.enable(11),C.flipSided&&a.enable(12),C.useDepthPacking&&a.enable(13),C.dithering&&a.enable(14),C.transmission&&a.enable(15),C.sheen&&a.enable(16),C.opaque&&a.enable(17),C.pointsUvs&&a.enable(18),C.decodeVideoTexture&&a.enable(19),C.decodeVideoTextureEmissive&&a.enable(20),C.alphaToCoverage&&a.enable(21),C.numLightProbeGrids>0&&a.enable(22),C.hasPositionAttribute&&a.enable(23),x.push(a.mask)}function m(x){let C=d[x.type],P;if(C){let U=wi[C];P=Id.clone(U.uniforms)}else P=x.uniforms;return P}function M(x,C){let P=h.get(C);return P!==void 0?++P.usedTimes:(P=new w_(i,C,x,s),l.push(P),h.set(C,P)),P}function v(x){if(--x.usedTimes===0){let C=l.indexOf(x);l[C]=l[l.length-1],l.pop(),h.delete(x.cacheKey),x.destroy()}}function S(x){o.remove(x)}function T(){o.dispose()}return{getParameters:y,getProgramCacheKey:g,getUniforms:m,acquireProgram:M,releaseProgram:v,releaseShaderCache:S,programs:l,dispose:T}}function P_(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,c){i.get(a)[o]=c}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function I_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Zd(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function $d(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(f){let d=0;return f.isInstancedMesh&&(d+=2),f.isSkinnedMesh&&(d+=1),d}function o(f,d,_,y,g,p){let E=i[e];return E===void 0?(E={id:f.id,object:f,geometry:d,material:_,materialVariant:a(f),groupOrder:y,renderOrder:f.renderOrder,z:g,group:p},i[e]=E):(E.id=f.id,E.object=f,E.geometry=d,E.material=_,E.materialVariant=a(f),E.groupOrder=y,E.renderOrder=f.renderOrder,E.z=g,E.group=p),e++,E}function c(f,d,_,y,g,p,E){E.reversedDepth===!0&&(g=-g);let m=o(f,d,_,y,g,p);_.transmission>0?n.push(m):_.transparent===!0?s.push(m):t.push(m)}function l(f,d,_,y,g,p){let E=o(f,d,_,y,g,p);_.transmission>0?n.unshift(E):_.transparent===!0?s.unshift(E):t.unshift(E)}function h(f,d){t.length>1&&t.sort(f||I_),n.length>1&&n.sort(d||Zd),s.length>1&&s.sort(d||Zd)}function u(){for(let f=e,d=i.length;f<d;f++){let _=i[f];if(_.id===null)break;_.id=null,_.object=null,_.geometry=null,_.material=null,_.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:c,unshift:l,finish:u,sort:h}}function L_(){let i=new WeakMap;function e(n,s){let r=i.get(n),a;return r===void 0?(a=new $d,i.set(n,[a])):s>=r.length?(a=new $d,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function D_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new k,color:new Ge};break;case"SpotLight":t={position:new k,direction:new k,color:new Ge,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new k,color:new Ge,distance:0,decay:0};break;case"HemisphereLight":t={direction:new k,skyColor:new Ge,groundColor:new Ge};break;case"RectAreaLight":t={color:new Ge,position:new k,halfWidth:new k,halfHeight:new k};break}return i[e.id]=t,t}}}function F_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Re};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Re};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Re,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var N_=0;function U_(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function O_(i){let e=new D_,t=F_(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new k);let s=new k,r=new ct,a=new ct;function o(l){let h=0,u=0,f=0;for(let L=0;L<9;L++)n.probe[L].set(0,0,0);let d=0,_=0,y=0,g=0,p=0,E=0,m=0,M=0,v=0,S=0,T=0,x=0,C=0,P=0;l.sort(U_);for(let L=0,F=l.length;L<F;L++){let N=l[L],D=N.color,V=N.intensity,q=N.distance,ee=null;if(N.shadow&&N.shadow.map&&(N.shadow.map.texture.format===hs?ee=N.shadow.map.texture:ee=N.shadow.map.depthTexture||N.shadow.map.texture),N.isAmbientLight)h+=D.r*V,u+=D.g*V,f+=D.b*V;else if(N.isLightProbe){for(let G=0;G<9;G++)n.probe[G].addScaledVector(N.sh.coefficients[G],V);P++}else if(N.isSunLight){let G=e.get(N);if(G.color.copy(N.color).multiplyScalar(N.intensity),N.castShadow){let te=N.shadow,ce=t.get(N);ce.shadowIntensity=te.intensity,ce.shadowBias=te.bias,ce.shadowNormalBias=te.normalBias,ce.shadowRadius=te.radius,ce.shadowMapSize.copy(te.mapSize).multiply(te.getFrameExtents()),n.sunShadow[_]=ce,n.sunShadowMap[_]=ee;let Le=te.getViewportCount();for(let Ce=0;Ce<Le;Ce++)n.sunShadowMatrix[y+Ce]=te.getMatrix(Ce),n.sunShadowCascade[y+Ce]=te._cascadeData[Ce];y+=Le,_++}n.sun[d]=G,d++}else if(N.isDirectionalLight){let G=e.get(N);if(G.color.copy(N.color).multiplyScalar(N.intensity),N.castShadow){let te=N.shadow,ce=t.get(N);ce.shadowIntensity=te.intensity,ce.shadowBias=te.bias,ce.shadowNormalBias=te.normalBias,ce.shadowRadius=te.radius,ce.shadowMapSize=te.mapSize,n.directionalShadow[g]=ce,n.directionalShadowMap[g]=ee,n.directionalShadowMatrix[g]=N.shadow.matrix,v++}n.directional[g]=G,g++}else if(N.isSpotLight){let G=e.get(N);G.position.setFromMatrixPosition(N.matrixWorld),G.color.copy(D).multiplyScalar(V),G.distance=q,G.coneCos=Math.cos(N.angle),G.penumbraCos=Math.cos(N.angle*(1-N.penumbra)),G.decay=N.decay,n.spot[E]=G;let te=N.shadow;if(N.map&&(n.spotLightMap[x]=N.map,x++,te.updateMatrices(N),N.castShadow&&C++),n.spotLightMatrix[E]=te.matrix,N.castShadow){let ce=t.get(N);ce.shadowIntensity=te.intensity,ce.shadowBias=te.bias,ce.shadowNormalBias=te.normalBias,ce.shadowRadius=te.radius,ce.shadowMapSize=te.mapSize,n.spotShadow[E]=ce,n.spotShadowMap[E]=ee,T++}E++}else if(N.isRectAreaLight){let G=e.get(N);G.color.copy(D).multiplyScalar(V),G.halfWidth.set(N.width*.5,0,0),G.halfHeight.set(0,N.height*.5,0),n.rectArea[m]=G,m++}else if(N.isPointLight){let G=e.get(N);if(G.color.copy(N.color).multiplyScalar(N.intensity),G.distance=N.distance,G.decay=N.decay,N.castShadow){let te=N.shadow,ce=t.get(N);ce.shadowIntensity=te.intensity,ce.shadowBias=te.bias,ce.shadowNormalBias=te.normalBias,ce.shadowRadius=te.radius,ce.shadowMapSize=te.mapSize,ce.shadowCameraNear=te.camera.near,ce.shadowCameraFar=te.camera.far,n.pointShadow[p]=ce,n.pointShadowMap[p]=ee,n.pointShadowMatrix[p]=N.shadow.matrix,S++}n.point[p]=G,p++}else if(N.isHemisphereLight){let G=e.get(N);G.skyColor.copy(N.color).multiplyScalar(V),G.groundColor.copy(N.groundColor).multiplyScalar(V),n.hemi[M]=G,M++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=We.LTC_FLOAT_1,n.rectAreaLTC2=We.LTC_FLOAT_2):(n.rectAreaLTC1=We.LTC_HALF_1,n.rectAreaLTC2=We.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=f;let U=n.hash;(U.sunLength!==d||U.directionalLength!==g||U.pointLength!==p||U.spotLength!==E||U.rectAreaLength!==m||U.hemiLength!==M||U.numSunShadows!==_||U.numDirectionalShadows!==v||U.numPointShadows!==S||U.numSpotShadows!==T||U.numSpotMaps!==x||U.numLightProbes!==P)&&(n.sun.length=d,n.directional.length=g,n.spot.length=E,n.rectArea.length=m,n.point.length=p,n.hemi.length=M,n.sunShadow.length=_,n.sunShadowMap.length=_,n.sunShadowMatrix.length=y,n.sunShadowCascade.length=y,n.directionalShadow.length=v,n.directionalShadowMap.length=v,n.directionalShadowMatrix.length=v,n.pointShadow.length=S,n.pointShadowMap.length=S,n.pointShadowMatrix.length=S,n.spotShadow.length=T,n.spotShadowMap.length=T,n.spotLightMatrix.length=T+x-C,n.spotLightMap.length=x,n.numSpotLightShadowsWithMaps=C,n.numLightProbes=P,U.sunLength=d,U.directionalLength=g,U.pointLength=p,U.spotLength=E,U.rectAreaLength=m,U.hemiLength=M,U.numSunShadows=_,U.numDirectionalShadows=v,U.numPointShadows=S,U.numSpotShadows=T,U.numSpotMaps=x,U.numLightProbes=P,n.version=N_++)}function c(l,h){let u=0,f=0,d=0,_=0,y=0,g=0,p=h.matrixWorldInverse;for(let E=0,m=l.length;E<m;E++){let M=l[E];if(M.isSunLight){let v=n.sun[u];v.direction.setFromMatrixPosition(M.matrixWorld),v.direction.transformDirection(p),u++}else if(M.isDirectionalLight){let v=n.directional[f];v.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(p),f++}else if(M.isSpotLight){let v=n.spot[_];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(p),v.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(p),_++}else if(M.isRectAreaLight){let v=n.rectArea[y];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(p),a.identity(),r.copy(M.matrixWorld),r.premultiply(p),a.extractRotation(r),v.halfWidth.set(M.width*.5,0,0),v.halfHeight.set(0,M.height*.5,0),v.halfWidth.applyMatrix4(a),v.halfHeight.applyMatrix4(a),y++}else if(M.isPointLight){let v=n.point[d];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(p),d++}else if(M.isHemisphereLight){let v=n.hemi[g];v.direction.setFromMatrixPosition(M.matrixWorld),v.direction.transformDirection(p),g++}}}return{setup:o,setupView:c,state:n}}function Qd(i){let e=new O_(i),t=[],n=[],s=[];function r(f){u.camera=f,t.length=0,n.length=0,s.length=0}function a(f){t.push(f)}function o(f){n.push(f)}function c(f){s.push(f)}function l(){e.setup(t)}function h(f){e.setupView(t,f)}let u={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:l,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:c}}function B_(i){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new Qd(i),e.set(s,[o])):r>=a.length?(o=new Qd(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var k_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,z_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,H_=[new k(1,0,0),new k(-1,0,0),new k(0,1,0),new k(0,-1,0),new k(0,0,1),new k(0,0,-1)],G_=[new k(0,-1,0),new k(0,-1,0),new k(0,0,1),new k(0,0,-1),new k(0,-1,0),new k(0,-1,0)],ep=new ct,ja=new k,Yh=new k;function V_(i,e,t){let n=new pr,s=new Re,r=new Re,a=new wt,o=new Qo,c=new ec,l={},h=t.maxTextureSize,u={[Si]:sn,[sn]:Si,[pn]:pn},f=new un({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Re},radius:{value:4}},vertexShader:k_,fragmentShader:z_}),d=f.clone();d.defines.HORIZONTAL_PASS=1;let _=new Ct;_.setAttribute("position",new St(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new yt(_,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Fa;let p=this.type;this.render=function(S,T,x){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||S.length===0)return;this.type===Xf&&(et("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Fa);let C=i.getRenderTarget(),P=i.getActiveCubeFace(),U=i.getActiveMipmapLevel(),L=i.state;L.setBlending(On),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);let F=p!==this.type;F&&T.traverse(function(N){N.material&&(Array.isArray(N.material)?N.material.forEach(D=>D.needsUpdate=!0):N.material.needsUpdate=!0)});for(let N=0,D=S.length;N<D;N++){let V=S[N],q=V.shadow;if(q===void 0){et("WebGLShadowMap:",V,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;s.copy(q.mapSize);let ee=q.getFrameExtents();s.multiply(ee),r.copy(q.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ee.x),s.x=r.x*ee.x,q.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ee.y),s.y=r.y*ee.y,q.mapSize.y=r.y));let G=i.state.buffers.depth.getReversed();if(q.camera._reversedDepth=G,q.map===null||F===!0){if(q.map!==null&&(q.map.depthTexture!==null&&(q.map.depthTexture.dispose(),q.map.depthTexture=null),q.map.dispose()),this.type===Mr){if(V.isPointLight){et("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}q.map=new ln(s.x,s.y,{format:hs,type:Ln,minFilter:It,magFilter:It,generateMipmaps:!1}),q.map.texture.name=V.name+".shadowMap",q.map.depthTexture=new rs(s.x,s.y,kn),q.map.depthTexture.name=V.name+".shadowMapDepth",q.map.depthTexture.format=mi,q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=Xt,q.map.depthTexture.magFilter=Xt}else V.isPointLight?(q.map=new nl(s.x),q.map.depthTexture=new qo(s.x,oi)):(q.map=new ln(s.x,s.y),q.map.depthTexture=new rs(s.x,s.y,oi)),q.map.depthTexture.name=V.name+".shadowMap",q.map.depthTexture.format=mi,this.type===Fa?(q.map.depthTexture.compareFunction=G?Qc:$c,q.map.depthTexture.minFilter=It,q.map.depthTexture.magFilter=It):(q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=Xt,q.map.depthTexture.magFilter=Xt);q.camera.updateProjectionMatrix()}q.map.isWebGLCubeRenderTarget!==!0&&(q.map.width!==s.x||q.map.height!==s.y)&&q.map.setSize(s.x,s.y);let te=q.map.isWebGLCubeRenderTarget?6:q.getViewportCount();V.isPointLight!==!0&&q.updateMatrices(V,x);for(let ce=0;ce<te;ce++){let Le=q.getCamera(ce);if(V.isPointLight){let Ce=q.camera,Ne=q.matrix,ze=V.distance||Ce.far;ze!==Ce.far&&(Ce.far=ze,Ce.updateProjectionMatrix()),ja.setFromMatrixPosition(V.matrixWorld),Ce.position.copy(ja),Yh.copy(Ce.position),Yh.add(H_[ce]),Ce.up.copy(G_[ce]),Ce.lookAt(Yh),Ce.updateMatrixWorld(),Ne.makeTranslation(-ja.x,-ja.y,-ja.z),ep.multiplyMatrices(Ce.projectionMatrix,Ce.matrixWorldInverse),q._frustum.setFromProjectionMatrix(ep,Ce.coordinateSystem,Ce.reversedDepth)}if(q.map.isWebGLCubeRenderTarget)i.setRenderTarget(q.map,ce),i.clear();else{ce===0&&(i.setRenderTarget(q.map),i.clear());let Ce=q.getViewport(ce);a.set(r.x*Ce.x,r.y*Ce.y,r.x*Ce.z,r.y*Ce.w),L.viewport(a)}n=q.getFrustum(ce),M(T,x,Le,V,this.type)}q.isPointLightShadow!==!0&&this.type===Mr&&E(q,x),q.needsUpdate=!1}p=this.type,g.needsUpdate=!1,i.setRenderTarget(C,P,U)};function E(S,T){let x=e.update(y);f.defines.VSM_SAMPLES!==S.blurSamples&&(f.defines.VSM_SAMPLES=S.blurSamples,d.defines.VSM_SAMPLES=S.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),S.mapPass===null?S.mapPass=new ln(s.x,s.y,{format:hs,type:Ln}):(S.mapPass.width!==S.map.width||S.mapPass.height!==S.map.height)&&S.mapPass.setSize(S.map.width,S.map.height),f.uniforms.shadow_pass.value=S.map.depthTexture,f.uniforms.resolution.value.set(S.map.width,S.map.height),f.uniforms.radius.value=S.radius,i.setRenderTarget(S.mapPass),i.clear(),i.renderBufferDirect(T,null,x,f,y,null),d.uniforms.shadow_pass.value=S.mapPass.texture,d.uniforms.resolution.value.set(S.map.width,S.map.height),d.uniforms.radius.value=S.radius,i.setRenderTarget(S.map),i.clear(),i.renderBufferDirect(T,null,x,d,y,null)}function m(S,T,x,C){let P=null,U=x.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(U!==void 0)P=U;else if(P=x.isPointLight===!0?c:o,i.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0||T.alphaToCoverage===!0){let L=P.uuid,F=T.uuid,N=l[L];N===void 0&&(N={},l[L]=N);let D=N[F];D===void 0&&(D=P.clone(),N[F]=D,T.addEventListener("dispose",v)),P=D}if(P.visible=T.visible,P.wireframe=T.wireframe,C===Mr?P.side=T.shadowSide!==null?T.shadowSide:T.side:P.side=T.shadowSide!==null?T.shadowSide:u[T.side],P.alphaMap=T.alphaMap,P.alphaTest=T.alphaToCoverage===!0?.5:T.alphaTest,P.map=T.map,P.clipShadows=T.clipShadows,P.clippingPlanes=T.clippingPlanes,P.clipIntersection=T.clipIntersection,P.displacementMap=T.displacementMap,P.displacementScale=T.displacementScale,P.displacementBias=T.displacementBias,P.wireframeLinewidth=T.wireframeLinewidth,P.linewidth=T.linewidth,x.isPointLight===!0&&P.isMeshDistanceMaterial===!0){let L=i.properties.get(P);L.light=x}return P}function M(S,T,x,C,P){if(S.visible===!1)return;if(S.layers.test(T.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&P===Mr)&&(!S.frustumCulled||S.intersectsFrustum(n))){S.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,S.matrixWorld);let F=e.update(S),N=S.material;if(Array.isArray(N)){let D=F.groups;for(let V=0,q=D.length;V<q;V++){let ee=D[V],G=N[ee.materialIndex];if(G&&G.visible){let te=m(S,G,C,P);S.onBeforeShadow(i,S,T,x,F,te,ee),i.renderBufferDirect(x,null,F,te,S,ee),S.onAfterShadow(i,S,T,x,F,te,ee)}}}else if(N.visible){let D=m(S,N,C,P);S.onBeforeShadow(i,S,T,x,F,D,null),i.renderBufferDirect(x,null,F,D,S,null),S.onAfterShadow(i,S,T,x,F,D,null)}}let L=S.children;for(let F=0,N=L.length;F<N;F++)M(L[F],T,x,C,P)}function v(S){S.target.removeEventListener("dispose",v);for(let x in l){let C=l[x],P=S.target.uuid;P in C&&(C[P].dispose(),delete C[P])}}}function W_(i,e){function t(){let H=!1,ye=new wt,se=null,Se=new wt(0,0,0,0);return{setMask:function(Te){se!==Te&&!H&&(i.colorMask(Te,Te,Te,Te),se=Te)},setLocked:function(Te){H=Te},setClear:function(Te,be,Be,ke,ht){ht===!0&&(Te*=ke,be*=ke,Be*=ke),ye.set(Te,be,Be,ke),Se.equals(ye)===!1&&(i.clearColor(Te,be,Be,ke),Se.copy(ye))},reset:function(){H=!1,se=null,Se.set(-1,0,0,0)}}}function n(){let H=!1,ye=!1,se=null,Se=null,Te=null;return{setReversed:function(be){if(ye!==be){let Be=e.get("EXT_clip_control");be?Be.clipControlEXT(Be.LOWER_LEFT_EXT,Be.ZERO_TO_ONE_EXT):Be.clipControlEXT(Be.LOWER_LEFT_EXT,Be.NEGATIVE_ONE_TO_ONE_EXT),ye=be;let ke=Te;Te=null,this.setClear(ke)}},getReversed:function(){return ye},setTest:function(be){be?ae(i.DEPTH_TEST):he(i.DEPTH_TEST)},setMask:function(be){se!==be&&!H&&(i.depthMask(be),se=be)},setFunc:function(be){if(ye&&(be=Ed[be]),Se!==be){switch(be){case Do:i.depthFunc(i.NEVER);break;case Fo:i.depthFunc(i.ALWAYS);break;case No:i.depthFunc(i.LESS);break;case ir:i.depthFunc(i.LEQUAL);break;case Uo:i.depthFunc(i.EQUAL);break;case Oo:i.depthFunc(i.GEQUAL);break;case Bo:i.depthFunc(i.GREATER);break;case ko:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Se=be}},setLocked:function(be){H=be},setClear:function(be){Te!==be&&(Te=be,ye&&(be=1-be),i.clearDepth(be))},reset:function(){H=!1,se=null,Se=null,Te=null,ye=!1}}}function s(){let H=!1,ye=null,se=null,Se=null,Te=null,be=null,Be=null,ke=null,ht=null;return{setTest:function(st){H||(st?ae(i.STENCIL_TEST):he(i.STENCIL_TEST))},setMask:function(st){ye!==st&&!H&&(i.stencilMask(st),ye=st)},setFunc:function(st,Gt,Tt){(se!==st||Se!==Gt||Te!==Tt)&&(i.stencilFunc(st,Gt,Tt),se=st,Se=Gt,Te=Tt)},setOp:function(st,Gt,Tt){(be!==st||Be!==Gt||ke!==Tt)&&(i.stencilOp(st,Gt,Tt),be=st,Be=Gt,ke=Tt)},setLocked:function(st){H=st},setClear:function(st){ht!==st&&(i.clearStencil(st),ht=st)},reset:function(){H=!1,ye=null,se=null,Se=null,Te=null,be=null,Be=null,ke=null,ht=null}}}let r=new t,a=new n,o=new s,c=new WeakMap,l=new WeakMap,h={},u={},f={},d=new WeakMap,_=[],y=null,g=!1,p=null,E=null,m=null,M=null,v=null,S=null,T=null,x=new Ge(0,0,0),C=0,P=!1,U=null,L=null,F=null,N=null,D=null,V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),q=!1,ee=0,G=i.getParameter(i.VERSION);G.indexOf("WebGL")!==-1?(ee=parseFloat(/^WebGL (\d)/.exec(G)[1]),q=ee>=1):G.indexOf("OpenGL ES")!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),q=ee>=2);let te=null,ce={},Le=i.getParameter(i.SCISSOR_BOX),Ce=i.getParameter(i.VIEWPORT),Ne=new wt().fromArray(Le),ze=new wt().fromArray(Ce);function tt(H,ye,se,Se){let Te=new Uint8Array(4),be=i.createTexture();i.bindTexture(H,be),i.texParameteri(H,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(H,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Be=0;Be<se;Be++)H===i.TEXTURE_3D||H===i.TEXTURE_2D_ARRAY?i.texImage3D(ye,0,i.RGBA,1,1,Se,0,i.RGBA,i.UNSIGNED_BYTE,Te):i.texImage2D(ye+Be,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Te);return be}let Z={};Z[i.TEXTURE_2D]=tt(i.TEXTURE_2D,i.TEXTURE_2D,1),Z[i.TEXTURE_CUBE_MAP]=tt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[i.TEXTURE_2D_ARRAY]=tt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Z[i.TEXTURE_3D]=tt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ae(i.DEPTH_TEST),a.setFunc(ir),_e(!1),Me(fh),ae(i.CULL_FACE),ge(On);function ae(H){h[H]!==!0&&(i.enable(H),h[H]=!0)}function he(H){h[H]!==!1&&(i.disable(H),h[H]=!1)}function Pe(H,ye){return f[H]!==ye?(i.bindFramebuffer(H,ye),f[H]=ye,H===i.DRAW_FRAMEBUFFER&&(f[i.FRAMEBUFFER]=ye),H===i.FRAMEBUFFER&&(f[i.DRAW_FRAMEBUFFER]=ye),!0):!1}function Ae(H,ye){let se=_,Se=!1;if(H){se=d.get(ye),se===void 0&&(se=[],d.set(ye,se));let Te=H.textures;if(se.length!==Te.length||se[0]!==i.COLOR_ATTACHMENT0){for(let be=0,Be=Te.length;be<Be;be++)se[be]=i.COLOR_ATTACHMENT0+be;se.length=Te.length,Se=!0}}else se[0]!==i.BACK&&(se[0]=i.BACK,Se=!0);Se&&i.drawBuffers(se)}function De(H){return y!==H?(i.useProgram(H),y=H,!0):!1}let Je={[Ti]:i.FUNC_ADD,[jf]:i.FUNC_SUBTRACT,[Kf]:i.FUNC_REVERSE_SUBTRACT};Je[Yf]=i.MIN,Je[Jf]=i.MAX;let de={[Zf]:i.ZERO,[Xi]:i.ONE,[$f]:i.SRC_COLOR,[gh]:i.SRC_ALPHA,[sd]:i.SRC_ALPHA_SATURATE,[nd]:i.DST_COLOR,[ed]:i.DST_ALPHA,[Qf]:i.ONE_MINUS_SRC_COLOR,[Tr]:i.ONE_MINUS_SRC_ALPHA,[id]:i.ONE_MINUS_DST_COLOR,[td]:i.ONE_MINUS_DST_ALPHA,[rd]:i.CONSTANT_COLOR,[ad]:i.ONE_MINUS_CONSTANT_COLOR,[od]:i.CONSTANT_ALPHA,[cd]:i.ONE_MINUS_CONSTANT_ALPHA};function ge(H,ye,se,Se,Te,be,Be,ke,ht,st){if(H===On){g===!0&&(he(i.BLEND),g=!1);return}if(g===!1&&(ae(i.BLEND),g=!0),H!==Na){if(H!==p||st!==P){if((E!==Ti||v!==Ti)&&(i.blendEquation(i.FUNC_ADD),E=Ti,v=Ti),st)switch(H){case Sr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case dh:i.blendFunc(i.ONE,i.ONE);break;case ph:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case mh:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:at("WebGLState: Invalid blending: ",H);break}else switch(H){case Sr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case dh:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case ph:at("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case mh:at("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:at("WebGLState: Invalid blending: ",H);break}m=null,M=null,S=null,T=null,x.set(0,0,0),C=0,p=H,P=st}return}Te=Te||ye,be=be||se,Be=Be||Se,(ye!==E||Te!==v)&&(i.blendEquationSeparate(Je[ye],Je[Te]),E=ye,v=Te),(se!==m||Se!==M||be!==S||Be!==T)&&(i.blendFuncSeparate(de[se],de[Se],de[be],de[Be]),m=se,M=Se,S=be,T=Be),(ke.equals(x)===!1||ht!==C)&&(i.blendColor(ke.r,ke.g,ke.b,ht),x.copy(ke),C=ht),p=H,P=!1}function xe(H,ye){H.side===pn?he(i.CULL_FACE):ae(i.CULL_FACE);let se=H.side===sn;ye&&(se=!se),_e(se),H.blending===Sr&&H.transparent===!1?ge(On):ge(H.blending,H.blendEquation,H.blendSrc,H.blendDst,H.blendEquationAlpha,H.blendSrcAlpha,H.blendDstAlpha,H.blendColor,H.blendAlpha,H.premultipliedAlpha),a.setFunc(H.depthFunc),a.setTest(H.depthTest),a.setMask(H.depthWrite),r.setMask(H.colorWrite);let Se=H.stencilWrite;o.setTest(Se),Se&&(o.setMask(H.stencilWriteMask),o.setFunc(H.stencilFunc,H.stencilRef,H.stencilFuncMask),o.setOp(H.stencilFail,H.stencilZFail,H.stencilZPass)),ve(H.polygonOffset,H.polygonOffsetFactor,H.polygonOffsetUnits),H.alphaToCoverage===!0?ae(i.SAMPLE_ALPHA_TO_COVERAGE):he(i.SAMPLE_ALPHA_TO_COVERAGE)}function _e(H){U!==H&&(H?i.frontFace(i.CW):i.frontFace(i.CCW),U=H)}function Me(H){H!==Wf?(ae(i.CULL_FACE),H!==L&&(H===fh?i.cullFace(i.BACK):H===qf?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):he(i.CULL_FACE),L=H}function Ue(H){H!==F&&(q&&i.lineWidth(H),F=H)}function ve(H,ye,se){H?(ae(i.POLYGON_OFFSET_FILL),(N!==ye||D!==se)&&(N=ye,D=se,a.getReversed()&&(ye=-ye),i.polygonOffset(ye,se))):he(i.POLYGON_OFFSET_FILL)}function ue(H){H?ae(i.SCISSOR_TEST):he(i.SCISSOR_TEST)}function me(H){H===void 0&&(H=i.TEXTURE0+V-1),te!==H&&(i.activeTexture(H),te=H)}function B(H,ye,se){se===void 0&&(te===null?se=i.TEXTURE0+V-1:se=te);let Se=ce[se];Se===void 0&&(Se={type:void 0,texture:void 0},ce[se]=Se),(Se.type!==H||Se.texture!==ye)&&(te!==se&&(i.activeTexture(se),te=se),i.bindTexture(H,ye||Z[H]),Se.type=H,Se.texture=ye)}function W(){let H=ce[te];H!==void 0&&H.type!==void 0&&(i.bindTexture(H.type,null),H.type=void 0,H.texture=void 0)}function le(){try{i.compressedTexImage2D(...arguments)}catch(H){at("WebGLState:",H)}}function A(){try{i.compressedTexImage3D(...arguments)}catch(H){at("WebGLState:",H)}}function b(){try{i.texSubImage2D(...arguments)}catch(H){at("WebGLState:",H)}}function w(){try{i.texSubImage3D(...arguments)}catch(H){at("WebGLState:",H)}}function I(){try{i.compressedTexSubImage2D(...arguments)}catch(H){at("WebGLState:",H)}}function z(){try{i.compressedTexSubImage3D(...arguments)}catch(H){at("WebGLState:",H)}}function X(){try{i.texStorage2D(...arguments)}catch(H){at("WebGLState:",H)}}function ie(){try{i.texStorage3D(...arguments)}catch(H){at("WebGLState:",H)}}function O(){try{i.texImage2D(...arguments)}catch(H){at("WebGLState:",H)}}function K(){try{i.texImage3D(...arguments)}catch(H){at("WebGLState:",H)}}function Y(H){return u[H]!==void 0?u[H]:i.getParameter(H)}function fe(H,ye){u[H]!==ye&&(i.pixelStorei(H,ye),u[H]=ye)}function ne(H){Ne.equals(H)===!1&&(i.scissor(H.x,H.y,H.z,H.w),Ne.copy(H))}function Q(H){ze.equals(H)===!1&&(i.viewport(H.x,H.y,H.z,H.w),ze.copy(H))}function pe(H,ye){let se=l.get(ye);se===void 0&&(se=new WeakMap,l.set(ye,se));let Se=se.get(H);Se===void 0&&(Se=i.getUniformBlockIndex(ye,H.name),se.set(H,Se))}function we(H,ye){let Se=l.get(ye).get(H);c.get(ye)!==Se&&(i.uniformBlockBinding(ye,Se,H.__bindingPointIndex),c.set(ye,Se))}function Ie(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},u={},te=null,ce={},f={},d=new WeakMap,_=[],y=null,g=!1,p=null,E=null,m=null,M=null,v=null,S=null,T=null,x=new Ge(0,0,0),C=0,P=!1,U=null,L=null,F=null,N=null,D=null,Ne.set(0,0,i.canvas.width,i.canvas.height),ze.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:ae,disable:he,bindFramebuffer:Pe,drawBuffers:Ae,useProgram:De,setBlending:ge,setMaterial:xe,setFlipSided:_e,setCullFace:Me,setLineWidth:Ue,setPolygonOffset:ve,setScissorTest:ue,activeTexture:me,bindTexture:B,unbindTexture:W,compressedTexImage2D:le,compressedTexImage3D:A,texImage2D:O,texImage3D:K,pixelStorei:fe,getParameter:Y,updateUBOMapping:pe,uniformBlockBinding:we,texStorage2D:X,texStorage3D:ie,texSubImage2D:b,texSubImage3D:w,compressedTexSubImage2D:I,compressedTexSubImage3D:z,scissor:ne,viewport:Q,reset:Ie}}function q_(i,e,t,n,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Re,h=new WeakMap,u=new Set,f,d=new WeakMap,_=!1;try{_=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(A,b){return _?new OffscreenCanvas(A,b):ar("canvas")}function g(A,b,w){let I=1,z=le(A);if((z.width>w||z.height>w)&&(I=w/Math.max(z.width,z.height)),I<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let X=Math.floor(I*z.width),ie=Math.floor(I*z.height);f===void 0&&(f=y(X,ie));let O=b?y(X,ie):f;return O.width=X,O.height=ie,O.getContext("2d").drawImage(A,0,0,X,ie),et("WebGLRenderer: Texture has been resized from ("+z.width+"x"+z.height+") to ("+X+"x"+ie+")."),O}else return"data"in A&&et("WebGLRenderer: Image in DataTexture is too big ("+z.width+"x"+z.height+")."),A;return A}function p(A){return A.generateMipmaps}function E(A){i.generateMipmap(A)}function m(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function M(A,b,w,I,z,X=!1){if(A!==null){if(i[A]!==void 0)return i[A];et("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let ie;I&&(ie=e.get("EXT_texture_norm16"),ie||et("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let O=b;if(b===i.RED&&(w===i.FLOAT&&(O=i.R32F),w===i.HALF_FLOAT&&(O=i.R16F),w===i.UNSIGNED_BYTE&&(O=i.R8),w===i.UNSIGNED_SHORT&&ie&&(O=ie.R16_EXT),w===i.SHORT&&ie&&(O=ie.R16_SNORM_EXT)),b===i.RED_INTEGER&&(w===i.UNSIGNED_BYTE&&(O=i.R8UI),w===i.UNSIGNED_SHORT&&(O=i.R16UI),w===i.UNSIGNED_INT&&(O=i.R32UI),w===i.BYTE&&(O=i.R8I),w===i.SHORT&&(O=i.R16I),w===i.INT&&(O=i.R32I)),b===i.RG&&(w===i.FLOAT&&(O=i.RG32F),w===i.HALF_FLOAT&&(O=i.RG16F),w===i.UNSIGNED_BYTE&&(O=i.RG8),w===i.UNSIGNED_SHORT&&ie&&(O=ie.RG16_EXT),w===i.SHORT&&ie&&(O=ie.RG16_SNORM_EXT)),b===i.RG_INTEGER&&(w===i.UNSIGNED_BYTE&&(O=i.RG8UI),w===i.UNSIGNED_SHORT&&(O=i.RG16UI),w===i.UNSIGNED_INT&&(O=i.RG32UI),w===i.BYTE&&(O=i.RG8I),w===i.SHORT&&(O=i.RG16I),w===i.INT&&(O=i.RG32I)),b===i.RGB_INTEGER&&(w===i.UNSIGNED_BYTE&&(O=i.RGB8UI),w===i.UNSIGNED_SHORT&&(O=i.RGB16UI),w===i.UNSIGNED_INT&&(O=i.RGB32UI),w===i.BYTE&&(O=i.RGB8I),w===i.SHORT&&(O=i.RGB16I),w===i.INT&&(O=i.RGB32I)),b===i.RGBA_INTEGER&&(w===i.UNSIGNED_BYTE&&(O=i.RGBA8UI),w===i.UNSIGNED_SHORT&&(O=i.RGBA16UI),w===i.UNSIGNED_INT&&(O=i.RGBA32UI),w===i.BYTE&&(O=i.RGBA8I),w===i.SHORT&&(O=i.RGBA16I),w===i.INT&&(O=i.RGBA32I)),b===i.RGB&&(w===i.UNSIGNED_SHORT&&ie&&(O=ie.RGB16_EXT),w===i.SHORT&&ie&&(O=ie.RGB16_SNORM_EXT),w===i.UNSIGNED_INT_5_9_9_9_REV&&(O=i.RGB9_E5),w===i.UNSIGNED_INT_10F_11F_11F_REV&&(O=i.R11F_G11F_B10F)),b===i.RGBA){let K=X?ea:bt.getTransfer(z);w===i.FLOAT&&(O=i.RGBA32F),w===i.HALF_FLOAT&&(O=i.RGBA16F),w===i.UNSIGNED_BYTE&&(O=K===At?i.SRGB8_ALPHA8:i.RGBA8),w===i.UNSIGNED_SHORT&&ie&&(O=ie.RGBA16_EXT),w===i.SHORT&&ie&&(O=ie.RGBA16_SNORM_EXT),w===i.UNSIGNED_SHORT_4_4_4_4&&(O=i.RGBA4),w===i.UNSIGNED_SHORT_5_5_5_1&&(O=i.RGB5_A1)}return(O===i.R16F||O===i.R32F||O===i.RG16F||O===i.RG32F||O===i.RGBA16F||O===i.RGBA32F)&&e.get("EXT_color_buffer_float"),O}function v(A,b){let w;return A?b===null||b===oi||b===Ar?w=i.DEPTH24_STENCIL8:b===kn?w=i.DEPTH32F_STENCIL8:b===wr&&(w=i.DEPTH24_STENCIL8,et("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===oi||b===Ar?w=i.DEPTH_COMPONENT24:b===kn?w=i.DEPTH_COMPONENT32F:b===wr&&(w=i.DEPTH_COMPONENT16),w}function S(A,b){return p(A)===!0||A.isFramebufferTexture&&A.minFilter!==Xt&&A.minFilter!==It?Math.log2(Math.max(b.width,b.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?b.mipmaps.length:1}function T(A){let b=A.target;b.removeEventListener("dispose",T),C(b),b.isVideoTexture&&h.delete(b),b.isHTMLTexture&&u.delete(b)}function x(A){let b=A.target;b.removeEventListener("dispose",x),U(b)}function C(A){let b=n.get(A);if(b.__webglInit===void 0)return;let w=A.source,I=d.get(w);if(I){let z=I[b.__cacheKey];z.usedTimes--,z.usedTimes===0&&P(A),Object.keys(I).length===0&&d.delete(w)}n.remove(A)}function P(A){let b=n.get(A);i.deleteTexture(b.__webglTexture);let w=A.source,I=d.get(w);delete I[b.__cacheKey],a.memory.textures--}function U(A){let b=n.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),n.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let I=0;I<6;I++){if(Array.isArray(b.__webglFramebuffer[I]))for(let z=0;z<b.__webglFramebuffer[I].length;z++)i.deleteFramebuffer(b.__webglFramebuffer[I][z]);else i.deleteFramebuffer(b.__webglFramebuffer[I]);b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer[I])}else{if(Array.isArray(b.__webglFramebuffer))for(let I=0;I<b.__webglFramebuffer.length;I++)i.deleteFramebuffer(b.__webglFramebuffer[I]);else i.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&i.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let I=0;I<b.__webglColorRenderbuffer.length;I++)b.__webglColorRenderbuffer[I]&&i.deleteRenderbuffer(b.__webglColorRenderbuffer[I]);b.__webglDepthRenderbuffer&&i.deleteRenderbuffer(b.__webglDepthRenderbuffer)}let w=A.textures;for(let I=0,z=w.length;I<z;I++){let X=n.get(w[I]);X.__webglTexture&&(i.deleteTexture(X.__webglTexture),a.memory.textures--),n.remove(w[I])}n.remove(A)}let L=0;function F(){L=0}function N(){return L}function D(A){L=A}function V(){let A=L;return A>=s.maxTextures&&et("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures),L+=1,A}function q(A){let b=[];return b.push(A.wrapS),b.push(A.wrapT),b.push(A.wrapR||0),b.push(A.magFilter),b.push(A.minFilter),b.push(A.anisotropy),b.push(A.internalFormat),b.push(A.format),b.push(A.type),b.push(A.generateMipmaps),b.push(A.premultiplyAlpha),b.push(A.flipY),b.push(A.unpackAlignment),b.push(A.colorSpace),b.join()}function ee(A,b){let w=n.get(A);if(A.isVideoTexture&&B(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&w.__version!==A.version){let I=A.image;if(I===null)et("WebGLRenderer: Texture marked for update but no image data found.");else if(I.complete===!1)et("WebGLRenderer: Texture marked for update but image is incomplete");else{he(w,A,b);return}}else A.isExternalTexture&&(w.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,w.__webglTexture,i.TEXTURE0+b)}function G(A,b){let w=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&w.__version!==A.version){he(w,A,b);return}else A.isExternalTexture&&(w.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,w.__webglTexture,i.TEXTURE0+b)}function te(A,b){let w=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&w.__version!==A.version){he(w,A,b);return}t.bindTexture(i.TEXTURE_3D,w.__webglTexture,i.TEXTURE0+b)}function ce(A,b){let w=n.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&w.__version!==A.version){Pe(w,A,b);return}t.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+b)}let Le={[ss]:i.REPEAT,[Xn]:i.CLAMP_TO_EDGE,[sr]:i.MIRRORED_REPEAT},Ce={[Xt]:i.NEAREST,[pc]:i.NEAREST_MIPMAP_NEAREST,[Ds]:i.NEAREST_MIPMAP_LINEAR,[It]:i.LINEAR,[Er]:i.LINEAR_MIPMAP_NEAREST,[Bn]:i.LINEAR_MIPMAP_LINEAR},Ne={[gd]:i.NEVER,[yd]:i.ALWAYS,[bd]:i.LESS,[$c]:i.LEQUAL,[xd]:i.EQUAL,[Qc]:i.GEQUAL,[_d]:i.GREATER,[vd]:i.NOTEQUAL};function ze(A,b){if(b.type===kn&&e.has("OES_texture_float_linear")===!1&&(b.magFilter===It||b.magFilter===Er||b.magFilter===Ds||b.magFilter===Bn||b.minFilter===It||b.minFilter===Er||b.minFilter===Ds||b.minFilter===Bn)&&et("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,Le[b.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,Le[b.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,Le[b.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,Ce[b.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,Ce[b.minFilter]),b.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,Ne[b.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===Xt||b.minFilter!==Ds&&b.minFilter!==Bn||b.type===kn&&e.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||n.get(b).__currentAnisotropy){let w=e.get("EXT_texture_filter_anisotropic");i.texParameterf(A,w.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,s.getMaxAnisotropy())),n.get(b).__currentAnisotropy=b.anisotropy}}}function tt(A,b){let w=!1;A.__webglInit===void 0&&(A.__webglInit=!0,b.addEventListener("dispose",T));let I=b.source,z=d.get(I);z===void 0&&(z={},d.set(I,z));let X=q(b);if(X!==A.__cacheKey){z[X]===void 0&&(z[X]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,w=!0),z[X].usedTimes++;let ie=z[A.__cacheKey];ie!==void 0&&(z[A.__cacheKey].usedTimes--,ie.usedTimes===0&&P(b)),A.__cacheKey=X,A.__webglTexture=z[X].texture}return w}function Z(A,b,w){return Math.floor(Math.floor(A/w)/b)}function ae(A,b,w,I){let X=A.updateRanges;if(X.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,b.width,b.height,w,I,b.data);else{X.sort((fe,ne)=>fe.start-ne.start);let ie=0;for(let fe=1;fe<X.length;fe++){let ne=X[ie],Q=X[fe],pe=ne.start+ne.count,we=Z(Q.start,b.width,4),Ie=Z(ne.start,b.width,4);Q.start<=pe+1&&we===Ie&&Z(Q.start+Q.count-1,b.width,4)===we?ne.count=Math.max(ne.count,Q.start+Q.count-ne.start):(++ie,X[ie]=Q)}X.length=ie+1;let O=t.getParameter(i.UNPACK_ROW_LENGTH),K=t.getParameter(i.UNPACK_SKIP_PIXELS),Y=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,b.width);for(let fe=0,ne=X.length;fe<ne;fe++){let Q=X[fe],pe=Math.floor(Q.start/4),we=Math.ceil(Q.count/4),Ie=pe%b.width,H=Math.floor(pe/b.width),ye=we,se=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,Ie),t.pixelStorei(i.UNPACK_SKIP_ROWS,H),t.texSubImage2D(i.TEXTURE_2D,0,Ie,H,ye,se,w,I,b.data)}A.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,O),t.pixelStorei(i.UNPACK_SKIP_PIXELS,K),t.pixelStorei(i.UNPACK_SKIP_ROWS,Y)}}function he(A,b,w){let I=i.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(I=i.TEXTURE_2D_ARRAY),b.isData3DTexture&&(I=i.TEXTURE_3D);let z=tt(A,b),X=b.source;t.bindTexture(I,A.__webglTexture,i.TEXTURE0+w);let ie=n.get(X);if(X.version!==ie.__version||z===!0){if(t.activeTexture(i.TEXTURE0+w),(typeof ImageBitmap<"u"&&b.image instanceof ImageBitmap)===!1){let se=bt.getPrimaries(bt.workingColorSpace),Se=b.colorSpace===ji?null:bt.getPrimaries(b.colorSpace),Te=b.colorSpace===ji||se===Se?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te)}t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment);let K=g(b.image,!1,s.maxTextureSize);K=W(b,K);let Y=r.convert(b.format,b.colorSpace),fe=r.convert(b.type),ne=M(b.internalFormat,Y,fe,b.normalized,b.colorSpace,b.isVideoTexture);ze(I,b);let Q,pe=b.mipmaps,we=b.isVideoTexture!==!0,Ie=ie.__version===void 0||z===!0,H=X.dataReady,ye=S(b,K);if(b.isDepthTexture)ne=v(b.format===ls,b.type),Ie&&(we?t.texStorage2D(i.TEXTURE_2D,1,ne,K.width,K.height):t.texImage2D(i.TEXTURE_2D,0,ne,K.width,K.height,0,Y,fe,null));else if(b.isDataTexture)if(pe.length>0){we&&Ie&&t.texStorage2D(i.TEXTURE_2D,ye,ne,pe[0].width,pe[0].height);for(let se=0,Se=pe.length;se<Se;se++)Q=pe[se],we?H&&t.texSubImage2D(i.TEXTURE_2D,se,0,0,Q.width,Q.height,Y,fe,Q.data):t.texImage2D(i.TEXTURE_2D,se,ne,Q.width,Q.height,0,Y,fe,Q.data);b.generateMipmaps=!1}else we?(Ie&&t.texStorage2D(i.TEXTURE_2D,ye,ne,K.width,K.height),H&&ae(b,K,Y,fe)):t.texImage2D(i.TEXTURE_2D,0,ne,K.width,K.height,0,Y,fe,K.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){we&&Ie&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ye,ne,pe[0].width,pe[0].height,K.depth);for(let se=0,Se=pe.length;se<Se;se++)if(Q=pe[se],b.format!==vn)if(Y!==null)if(we){if(H)if(b.layerUpdates.size>0){let Te=Bh(Q.width,Q.height,b.format,b.type);for(let be of b.layerUpdates){let Be=Q.data.subarray(be*Te/Q.data.BYTES_PER_ELEMENT,(be+1)*Te/Q.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,se,0,0,be,Q.width,Q.height,1,Y,Be)}}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,se,0,0,0,Q.width,Q.height,K.depth,Y,Q.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,se,ne,Q.width,Q.height,K.depth,0,Q.data,0,0);else et("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else we?H&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,se,0,0,0,Q.width,Q.height,K.depth,Y,fe,Q.data):t.texImage3D(i.TEXTURE_2D_ARRAY,se,ne,Q.width,Q.height,K.depth,0,Y,fe,Q.data);b.layerUpdates.size>0&&b.clearLayerUpdates()}else{we&&Ie&&t.texStorage2D(i.TEXTURE_2D,ye,ne,pe[0].width,pe[0].height);for(let se=0,Se=pe.length;se<Se;se++)Q=pe[se],b.format!==vn?Y!==null?we?H&&t.compressedTexSubImage2D(i.TEXTURE_2D,se,0,0,Q.width,Q.height,Y,Q.data):t.compressedTexImage2D(i.TEXTURE_2D,se,ne,Q.width,Q.height,0,Q.data):et("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):we?H&&t.texSubImage2D(i.TEXTURE_2D,se,0,0,Q.width,Q.height,Y,fe,Q.data):t.texImage2D(i.TEXTURE_2D,se,ne,Q.width,Q.height,0,Y,fe,Q.data)}else if(b.isDataArrayTexture)if(we){if(Ie&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ye,ne,K.width,K.height,K.depth),H)if(b.layerUpdates.size>0){let se=Bh(K.width,K.height,b.format,b.type);for(let Se of b.layerUpdates){let Te=K.data.subarray(Se*se/K.data.BYTES_PER_ELEMENT,(Se+1)*se/K.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Se,K.width,K.height,1,Y,fe,Te)}b.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,Y,fe,K.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ne,K.width,K.height,K.depth,0,Y,fe,K.data);else if(b.isData3DTexture)we?(Ie&&t.texStorage3D(i.TEXTURE_3D,ye,ne,K.width,K.height,K.depth),H&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,Y,fe,K.data)):t.texImage3D(i.TEXTURE_3D,0,ne,K.width,K.height,K.depth,0,Y,fe,K.data);else if(b.isFramebufferTexture){if(Ie)if(we)t.texStorage2D(i.TEXTURE_2D,ye,ne,K.width,K.height);else{let se=K.width,Se=K.height;for(let Te=0;Te<ye;Te++)t.texImage2D(i.TEXTURE_2D,Te,ne,se,Se,0,Y,fe,null),se>>=1,Se>>=1}}else if(b.isHTMLTexture){if("texElementImage2D"in i){let se=i.canvas;if(se.hasAttribute("layoutsubtree")||se.setAttribute("layoutsubtree","true"),K.parentNode!==se){se.appendChild(K),u.add(b),se.onpaint=Se=>{let Te=Se.changedElements;for(let be of u)Te.includes(be.image)&&(be.needsUpdate=!0)},se.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,K);else{let Te=i.RGBA,be=i.RGBA,Be=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Te,be,Be,K)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(pe.length>0){if(we&&Ie){let se=le(pe[0]);t.texStorage2D(i.TEXTURE_2D,ye,ne,se.width,se.height)}for(let se=0,Se=pe.length;se<Se;se++)Q=pe[se],we?H&&t.texSubImage2D(i.TEXTURE_2D,se,0,0,Y,fe,Q):t.texImage2D(i.TEXTURE_2D,se,ne,Y,fe,Q);b.generateMipmaps=!1}else if(we){if(Ie){let se=le(K);t.texStorage2D(i.TEXTURE_2D,ye,ne,se.width,se.height)}H&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Y,fe,K)}else t.texImage2D(i.TEXTURE_2D,0,ne,Y,fe,K);p(b)&&E(I),ie.__version=X.version,b.onUpdate&&b.onUpdate(b)}A.__version=b.version}function Pe(A,b,w){if(b.image.length!==6)return;let I=tt(A,b),z=b.source;t.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+w);let X=n.get(z);if(z.version!==X.__version||I===!0){t.activeTexture(i.TEXTURE0+w);let ie=bt.getPrimaries(bt.workingColorSpace),O=b.colorSpace===ji?null:bt.getPrimaries(b.colorSpace),K=b.colorSpace===ji||ie===O?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,K);let Y=b.isCompressedTexture||b.image[0].isCompressedTexture,fe=b.image[0]&&b.image[0].isDataTexture,ne=[];for(let be=0;be<6;be++)!Y&&!fe?ne[be]=g(b.image[be],!0,s.maxCubemapSize):ne[be]=fe?b.image[be].image:b.image[be],ne[be]=W(b,ne[be]);let Q=ne[0],pe=r.convert(b.format,b.colorSpace),we=r.convert(b.type),Ie=M(b.internalFormat,pe,we,b.normalized,b.colorSpace),H=b.isVideoTexture!==!0,ye=X.__version===void 0||I===!0,se=z.dataReady,Se=S(b,Q);ze(i.TEXTURE_CUBE_MAP,b);let Te;if(Y){H&&ye&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Se,Ie,Q.width,Q.height);for(let be=0;be<6;be++){Te=ne[be].mipmaps;for(let Be=0;Be<Te.length;Be++){let ke=Te[Be];b.format!==vn?pe!==null?H?se&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be,0,0,ke.width,ke.height,pe,ke.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be,Ie,ke.width,ke.height,0,ke.data):et("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):H?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be,0,0,ke.width,ke.height,pe,we,ke.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be,Ie,ke.width,ke.height,0,pe,we,ke.data)}}}else{if(Te=b.mipmaps,H&&ye){Te.length>0&&Se++;let be=le(ne[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Se,Ie,be.width,be.height)}for(let be=0;be<6;be++)if(fe){H?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,0,0,0,ne[be].width,ne[be].height,pe,we,ne[be].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,0,Ie,ne[be].width,ne[be].height,0,pe,we,ne[be].data);for(let Be=0;Be<Te.length;Be++){let ht=Te[Be].image[be].image;H?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be+1,0,0,ht.width,ht.height,pe,we,ht.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be+1,Ie,ht.width,ht.height,0,pe,we,ht.data)}}else{H?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,0,0,0,pe,we,ne[be]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,0,Ie,pe,we,ne[be]);for(let Be=0;Be<Te.length;Be++){let ke=Te[Be];H?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be+1,0,0,pe,we,ke.image[be]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+be,Be+1,Ie,pe,we,ke.image[be])}}}p(b)&&E(i.TEXTURE_CUBE_MAP),X.__version=z.version,b.onUpdate&&b.onUpdate(b)}A.__version=b.version}function Ae(A,b,w,I,z,X){let ie=r.convert(w.format,w.colorSpace),O=r.convert(w.type),K=M(w.internalFormat,ie,O,w.normalized,w.colorSpace),Y=n.get(b),fe=n.get(w);if(fe.__renderTarget=b,!Y.__hasExternalTextures){let ne=Math.max(1,b.width>>X),Q=Math.max(1,b.height>>X);z===i.TEXTURE_3D||z===i.TEXTURE_2D_ARRAY?t.texImage3D(z,X,K,ne,Q,b.depth,0,ie,O,null):t.texImage2D(z,X,K,ne,Q,0,ie,O,null)}t.bindFramebuffer(i.FRAMEBUFFER,A),me(b)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,I,z,fe.__webglTexture,0,ue(b)):(z===i.TEXTURE_2D||z>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&z<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,I,z,fe.__webglTexture,X),t.bindFramebuffer(i.FRAMEBUFFER,null)}function De(A,b,w){if(i.bindRenderbuffer(i.RENDERBUFFER,A),b.depthBuffer){let I=b.depthTexture,z=I&&I.isDepthTexture?I.type:null,X=v(b.stencilBuffer,z),ie=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;me(b)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ue(b),X,b.width,b.height):w?i.renderbufferStorageMultisample(i.RENDERBUFFER,ue(b),X,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,X,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,ie,i.RENDERBUFFER,A)}else{let I=b.textures;for(let z=0;z<I.length;z++){let X=I[z],ie=r.convert(X.format,X.colorSpace),O=r.convert(X.type),K=M(X.internalFormat,ie,O,X.normalized,X.colorSpace);me(b)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ue(b),K,b.width,b.height):w?i.renderbufferStorageMultisample(i.RENDERBUFFER,ue(b),K,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,K,b.width,b.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Je(A,b,w){let I=b.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,A),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let z=n.get(b.depthTexture);if(z.__renderTarget=b,(!z.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),I){if(z.__webglInit===void 0&&(z.__webglInit=!0,b.depthTexture.addEventListener("dispose",T)),z.__webglTexture===void 0){z.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture),ze(i.TEXTURE_CUBE_MAP,b.depthTexture);let Y=r.convert(b.depthTexture.format),fe=r.convert(b.depthTexture.type),ne;b.depthTexture.format===mi?ne=i.DEPTH_COMPONENT24:b.depthTexture.format===ls&&(ne=i.DEPTH24_STENCIL8);for(let Q=0;Q<6;Q++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,ne,b.width,b.height,0,Y,fe,null)}}else ee(b.depthTexture,0);let X=z.__webglTexture,ie=ue(b),O=I?i.TEXTURE_CUBE_MAP_POSITIVE_X+w:i.TEXTURE_2D,K=b.depthTexture.format===ls?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(b.depthTexture.format===mi)me(b)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,O,X,0,ie):i.framebufferTexture2D(i.FRAMEBUFFER,K,O,X,0);else if(b.depthTexture.format===ls)me(b)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,O,X,0,ie):i.framebufferTexture2D(i.FRAMEBUFFER,K,O,X,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function de(A){let b=n.get(A),w=A.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==A.depthTexture){let I=A.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),I){let z=()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,I.removeEventListener("dispose",z)};I.addEventListener("dispose",z),b.__depthDisposeCallback=z}b.__boundDepthTexture=I}if(A.depthTexture&&!b.__autoAllocateDepthBuffer)if(w)for(let I=0;I<6;I++)Je(b.__webglFramebuffer[I],A,I);else{let I=A.texture.mipmaps;I&&I.length>0?Je(b.__webglFramebuffer[0],A,0):Je(b.__webglFramebuffer,A,0)}else if(w){b.__webglDepthbuffer=[];for(let I=0;I<6;I++)if(t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[I]),b.__webglDepthbuffer[I]===void 0)b.__webglDepthbuffer[I]=i.createRenderbuffer(),De(b.__webglDepthbuffer[I],A,!1);else{let z=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,X=b.__webglDepthbuffer[I];i.bindRenderbuffer(i.RENDERBUFFER,X),i.framebufferRenderbuffer(i.FRAMEBUFFER,z,i.RENDERBUFFER,X)}}else{let I=A.texture.mipmaps;if(I&&I.length>0?t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=i.createRenderbuffer(),De(b.__webglDepthbuffer,A,!1);else{let z=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,X=b.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,X),i.framebufferRenderbuffer(i.FRAMEBUFFER,z,i.RENDERBUFFER,X)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function ge(A,b,w){let I=n.get(A);b!==void 0&&Ae(I.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),w!==void 0&&de(A)}function xe(A){let b=A.texture,w=n.get(A),I=n.get(b);A.addEventListener("dispose",x);let z=A.textures,X=A.isWebGLCubeRenderTarget===!0,ie=z.length>1;if(ie||(I.__webglTexture===void 0&&(I.__webglTexture=i.createTexture()),I.__version=b.version,a.memory.textures++),X){w.__webglFramebuffer=[];for(let O=0;O<6;O++)if(b.mipmaps&&b.mipmaps.length>0){w.__webglFramebuffer[O]=[];for(let K=0;K<b.mipmaps.length;K++)w.__webglFramebuffer[O][K]=i.createFramebuffer()}else w.__webglFramebuffer[O]=i.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){w.__webglFramebuffer=[];for(let O=0;O<b.mipmaps.length;O++)w.__webglFramebuffer[O]=i.createFramebuffer()}else w.__webglFramebuffer=i.createFramebuffer();if(ie)for(let O=0,K=z.length;O<K;O++){let Y=n.get(z[O]);Y.__webglTexture===void 0&&(Y.__webglTexture=i.createTexture(),a.memory.textures++)}if(A.samples>0&&me(A)===!1){w.__webglMultisampledFramebuffer=i.createFramebuffer(),w.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,w.__webglMultisampledFramebuffer);for(let O=0;O<z.length;O++){let K=z[O];w.__webglColorRenderbuffer[O]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,w.__webglColorRenderbuffer[O]);let Y=r.convert(K.format,K.colorSpace),fe=r.convert(K.type),ne=M(K.internalFormat,Y,fe,K.normalized,K.colorSpace,A.isXRRenderTarget===!0),Q=ue(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,Q,ne,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+O,i.RENDERBUFFER,w.__webglColorRenderbuffer[O])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(w.__webglDepthRenderbuffer=i.createRenderbuffer(),De(w.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(X){t.bindTexture(i.TEXTURE_CUBE_MAP,I.__webglTexture),ze(i.TEXTURE_CUBE_MAP,b);for(let O=0;O<6;O++)if(b.mipmaps&&b.mipmaps.length>0)for(let K=0;K<b.mipmaps.length;K++)Ae(w.__webglFramebuffer[O][K],A,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+O,K);else Ae(w.__webglFramebuffer[O],A,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+O,0);p(b)&&E(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ie){for(let O=0,K=z.length;O<K;O++){let Y=z[O],fe=n.get(Y),ne=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(ne=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ne,fe.__webglTexture),ze(ne,Y),Ae(w.__webglFramebuffer,A,Y,i.COLOR_ATTACHMENT0+O,ne,0),p(Y)&&E(ne)}t.unbindTexture()}else{let O=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(O=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(O,I.__webglTexture),ze(O,b),b.mipmaps&&b.mipmaps.length>0)for(let K=0;K<b.mipmaps.length;K++)Ae(w.__webglFramebuffer[K],A,b,i.COLOR_ATTACHMENT0,O,K);else Ae(w.__webglFramebuffer,A,b,i.COLOR_ATTACHMENT0,O,0);p(b)&&E(O),t.unbindTexture()}A.depthBuffer&&de(A)}function _e(A){let b=A.textures;for(let w=0,I=b.length;w<I;w++){let z=b[w];if(p(z)){let X=m(A),ie=n.get(z).__webglTexture;t.bindTexture(X,ie),E(X),t.unbindTexture()}}}let Me=[],Ue=[];function ve(A){if(A.samples>0){if(me(A)===!1){let b=A.textures,w=A.width,I=A.height,z=i.COLOR_BUFFER_BIT,X=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ie=n.get(A),O=b.length>1;if(O)for(let Y=0;Y<b.length;Y++)t.bindFramebuffer(i.FRAMEBUFFER,ie.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,ie.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,ie.__webglMultisampledFramebuffer);let K=A.texture.mipmaps;K&&K.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ie.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ie.__webglFramebuffer);for(let Y=0;Y<b.length;Y++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(z|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(z|=i.STENCIL_BUFFER_BIT)),O){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,ie.__webglColorRenderbuffer[Y]);let fe=n.get(b[Y]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,fe,0)}i.blitFramebuffer(0,0,w,I,0,0,w,I,z,i.NEAREST),c===!0&&(Me.length=0,Ue.length=0,Me.push(i.COLOR_ATTACHMENT0+Y),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&(Me.push(X),Ue.push(X),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ue)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Me))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),O)for(let Y=0;Y<b.length;Y++){t.bindFramebuffer(i.FRAMEBUFFER,ie.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.RENDERBUFFER,ie.__webglColorRenderbuffer[Y]);let fe=n.get(b[Y]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,ie.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.TEXTURE_2D,fe,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ie.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&c){let b=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[b])}}}function ue(A){return Math.min(s.maxSamples,A.samples)}function me(A){let b=n.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}function B(A){let b=a.render.frame;h.get(A)!==b&&(h.set(A,b),A.update())}function W(A,b){let w=A.colorSpace,I=A.format,z=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||w!==En&&w!==ji&&(bt.getTransfer(w)===At?(I!==vn||z!==In)&&et("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):at("WebGLTextures: Unsupported texture color space:",w)),b}function le(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(l.width=A.naturalWidth||A.width,l.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(l.width=A.displayWidth,l.height=A.displayHeight):(l.width=A.width,l.height=A.height),l}this.allocateTextureUnit=V,this.resetTextureUnits=F,this.getTextureUnits=N,this.setTextureUnits=D,this.setTexture2D=ee,this.setTexture2DArray=G,this.setTexture3D=te,this.setTextureCube=ce,this.rebindTextures=ge,this.setupRenderTarget=xe,this.updateRenderTargetMipmap=_e,this.updateMultisampleRenderTarget=ve,this.setupDepthRenderbuffer=de,this.setupFrameBufferTexture=Ae,this.useMultisampledRTT=me,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function X_(i,e){function t(n,s=ji){let r,a=bt.getTransfer(s);if(n===In)return i.UNSIGNED_BYTE;if(n===gc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===bc)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Eh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===wh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Sh)return i.BYTE;if(n===Th)return i.SHORT;if(n===wr)return i.UNSIGNED_SHORT;if(n===mc)return i.INT;if(n===oi)return i.UNSIGNED_INT;if(n===kn)return i.FLOAT;if(n===Ln)return i.HALF_FLOAT;if(n===Ah)return i.ALPHA;if(n===Rh)return i.RGB;if(n===vn)return i.RGBA;if(n===mi)return i.DEPTH_COMPONENT;if(n===ls)return i.DEPTH_STENCIL;if(n===xc)return i.RED;if(n===_c)return i.RED_INTEGER;if(n===hs)return i.RG;if(n===vc)return i.RG_INTEGER;if(n===yc)return i.RGBA_INTEGER;if(n===Ba||n===ka||n===za||n===Ha)if(a===At)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Ba)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ka)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===za)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ha)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Ba)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ka)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===za)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ha)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Mc||n===Sc||n===Tc||n===Ec)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Mc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Sc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Tc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ec)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===wc||n===Ac||n===Rc||n===Cc||n===Pc||n===Ga||n===Ic)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===wc||n===Ac)return a===At?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Rc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Cc)return r.COMPRESSED_R11_EAC;if(n===Pc)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Ga)return r.COMPRESSED_RG11_EAC;if(n===Ic)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Lc||n===Dc||n===Fc||n===Nc||n===Uc||n===Oc||n===Bc||n===kc||n===zc||n===Hc||n===Gc||n===Vc||n===Wc||n===qc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Lc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Dc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Fc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Nc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Uc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Oc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Bc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===kc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===zc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Hc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Gc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Vc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Wc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===qc)return a===At?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Xc||n===jc||n===Kc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Xc)return a===At?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===jc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Kc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Yc||n===Jc||n===Va||n===Zc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Yc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Jc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Va)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Zc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ar?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var j_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,K_=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,iu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new da(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new un({vertexShader:j_,fragmentShader:K_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new yt(new ki(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},su=class extends gi{constructor(e,t){super();let n=this,s=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,u=null,f=null,d=null,_=null,y=typeof XRWebGLBinding<"u",g=new iu,p={},E=t.getContextAttributes(),m=null,M=null,v=[],S=[],T=new Re,x=null,C=null,P=new Wt;P.viewport=new wt;let U=new Wt;U.viewport=new wt;let L=[P,U],F=new lc,N=null,D=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let ae=v[Z];return ae===void 0&&(ae=new lr,v[Z]=ae),ae.getTargetRaySpace()},this.getControllerGrip=function(Z){let ae=v[Z];return ae===void 0&&(ae=new lr,v[Z]=ae),ae.getGripSpace()},this.getHand=function(Z){let ae=v[Z];return ae===void 0&&(ae=new lr,v[Z]=ae),ae.getHandSpace()};function V(Z){let ae=S.indexOf(Z.inputSource);if(ae===-1)return;let he=v[ae];he!==void 0&&(he.update(Z.inputSource,Z.frame,l||a),he.dispatchEvent({type:Z.type,data:Z.inputSource}))}function q(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",q),s.removeEventListener("inputsourceschange",ee);for(let Z=0;Z<v.length;Z++){let ae=S[Z];ae!==null&&(S[Z]=null,v[Z].disconnect(ae))}N=null,D=null,g.reset();for(let Z in p)delete p[Z];if(e.setRenderTarget(m),d=null,f=null,u=null,s=null,M=null,tt.stop(),n.isPresenting=!1,e.setPixelRatio(x),e.setSize(T.width,T.height,!1),C!==null){let Z=C.camera;Z.fov=C.fov,Z.zoom=C.zoom,Z.updateProjectionMatrix(),C=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,n.isPresenting===!0&&et("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,n.isPresenting===!0&&et("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Z){l=Z},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return u===null&&y&&(u=new XRWebGLBinding(s,t)),u},this.getFrame=function(){return _},this.getSession=function(){return s},this.setSession=async function(Z){if(s=Z,s!==null){if(m=e.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",q),s.addEventListener("inputsourceschange",ee),E.xrCompatible!==!0&&await t.makeXRCompatible(),x=e.getPixelRatio(),e.getSize(T),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let he=null,Pe=null,Ae=null;E.depth&&(Ae=E.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,he=E.stencil?ls:mi,Pe=E.stencil?Ar:oi);let De={colorFormat:t.RGBA8,depthFormat:Ae,scaleFactor:r};u=this.getBinding(),f=u.createProjectionLayer(De),s.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),M=new ln(f.textureWidth,f.textureHeight,{format:vn,type:In,depthTexture:new rs(f.textureWidth,f.textureHeight,Pe,void 0,void 0,void 0,void 0,void 0,void 0,he),stencilBuffer:E.stencil,colorSpace:e.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}else{let he={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(s,t,he),s.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),M=new ln(d.framebufferWidth,d.framebufferHeight,{format:vn,type:In,colorSpace:e.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),tt.setContext(s),tt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function ee(Z){for(let ae=0;ae<Z.removed.length;ae++){let he=Z.removed[ae],Pe=S.indexOf(he);Pe>=0&&(S[Pe]=null,v[Pe].disconnect(he))}for(let ae=0;ae<Z.added.length;ae++){let he=Z.added[ae],Pe=S.indexOf(he);if(Pe===-1){for(let De=0;De<v.length;De++)if(De>=S.length){S.push(he),Pe=De;break}else if(S[De]===null){S[De]=he,Pe=De;break}if(Pe===-1)break}let Ae=v[Pe];Ae&&Ae.connect(he)}}let G=new k,te=new k;function ce(Z,ae,he){G.setFromMatrixPosition(ae.matrixWorld),te.setFromMatrixPosition(he.matrixWorld);let Pe=G.distanceTo(te),Ae=ae.projectionMatrix.elements,De=he.projectionMatrix.elements,Je=Ae[14]/(Ae[10]-1),de=Ae[14]/(Ae[10]+1),ge=(Ae[9]+1)/Ae[5],xe=(Ae[9]-1)/Ae[5],_e=(Ae[8]-1)/Ae[0],Me=(De[8]+1)/De[0],Ue=Je*_e,ve=Je*Me,ue=Pe/(-_e+Me),me=ue*-_e;if(ae.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(me),Z.translateZ(ue),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),Ae[10]===-1)Z.projectionMatrix.copy(ae.projectionMatrix),Z.projectionMatrixInverse.copy(ae.projectionMatrixInverse);else{let B=Je+ue,W=de+ue,le=Ue-me,A=ve+(Pe-me),b=ge*de/W*B,w=xe*de/W*B;Z.projectionMatrix.makePerspective(le,A,b,w,B,W),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function Le(Z,ae){ae===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(ae.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(s===null)return;let ae=Z.near,he=Z.far;g.texture!==null&&(g.depthNear>0&&(ae=g.depthNear),g.depthFar>0&&(he=g.depthFar)),F.near=U.near=P.near=ae,F.far=U.far=P.far=he,(N!==F.near||D!==F.far)&&(s.updateRenderState({depthNear:F.near,depthFar:F.far}),N=F.near,D=F.far),F.layers.mask=Z.layers.mask|6,P.layers.mask=F.layers.mask&-5,U.layers.mask=F.layers.mask&-3;let Pe=Z.parent,Ae=F.cameras;Le(F,Pe);for(let De=0;De<Ae.length;De++)Le(Ae[De],Pe);Ae.length===2?ce(F,P,U):F.projectionMatrix.copy(P.projectionMatrix),C===null&&Z.isPerspectiveCamera&&(C={camera:Z,fov:Z.fov,zoom:Z.zoom}),Ce(Z,F,Pe)};function Ce(Z,ae,he){he===null?Z.matrix.copy(ae.matrixWorld):(Z.matrix.copy(he.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(ae.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(ae.projectionMatrix),Z.projectionMatrixInverse.copy(ae.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=Ss*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return F},this.getFoveation=function(){if(!(f===null&&d===null))return c},this.setFoveation=function(Z){c=Z,f!==null&&(f.fixedFoveation=Z),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=Z)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(F)},this.getCameraTexture=function(Z){return p[Z]};let Ne=null;function ze(Z,ae){if(h=ae.getViewerPose(l||a),_=ae,h!==null){let he=h.views;d!==null&&(e.setRenderTargetFramebuffer(M,d.framebuffer),e.setRenderTarget(M));let Pe=!1;he.length!==F.cameras.length&&(F.cameras.length=0,Pe=!0);for(let de=0;de<he.length;de++){let ge=he[de],xe=null;if(d!==null)xe=d.getViewport(ge);else{let Me=u.getViewSubImage(f,ge);xe=Me.viewport,de===0&&(e.setRenderTargetTextures(M,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(M))}let _e=L[de];_e===void 0&&(_e=new Wt,_e.layers.enable(de),_e.viewport=new wt,L[de]=_e),_e.matrix.fromArray(ge.transform.matrix),_e.matrix.decompose(_e.position,_e.quaternion,_e.scale),_e.projectionMatrix.fromArray(ge.projectionMatrix),_e.projectionMatrixInverse.copy(_e.projectionMatrix).invert(),_e.viewport.set(xe.x,xe.y,xe.width,xe.height),de===0&&(F.matrix.copy(_e.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale)),Pe===!0&&F.cameras.push(_e)}let Ae=s.enabledFeatures;if(Ae&&Ae.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){u=n.getBinding();let de=u.getDepthInformation(he[0]);de&&de.isValid&&de.texture&&g.init(de,s.renderState)}if(Ae&&Ae.includes("camera-access")&&y){e.state.unbindTexture(),u=n.getBinding();for(let de=0;de<he.length;de++){let ge=he[de].camera;if(ge){let xe=p[ge];xe||(xe=new da,p[ge]=xe);let _e=u.getCameraImage(ge);xe.sourceTexture=_e}}}}for(let he=0;he<v.length;he++){let Pe=S[he],Ae=v[he];Pe!==null&&Ae!==void 0&&Ae.update(Pe,ae,l||a)}Ne&&Ne(Z,ae),ae.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ae}),_=null}let tt=new tp;tt.setAnimationLoop(ze),this.setAnimationLoop=function(Z){Ne=Z},this.dispose=function(){}}},Y_=new ct,op=new lt;op.set(-1,0,0,0,1,0,0,0,1);function J_(i,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,Nh(i)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function s(g,p,E,m,M){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(g,p):p.isMeshLambertMaterial?(r(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(g,p),u(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(g,p),f(g,p),p.isMeshPhysicalMaterial&&d(g,p,M)):p.isMeshMatcapMaterial?(r(g,p),_(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),y(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(a(g,p),p.isLineDashedMaterial&&o(g,p)):p.isPointsMaterial?c(g,p,E,m):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===sn&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===sn&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let E=e.get(p),m=E.envMap,M=E.envMapRotation;m&&(g.envMap.value=m,g.envMapRotation.value.setFromMatrix4(Y_.makeRotationFromEuler(M)).transpose(),m.isCubeTexture&&m.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(op),g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function a(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function o(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,E,m){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*E,g.scale.value=m*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function u(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function d(g,p,E){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===sn&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.retroreflectivity>0&&(g.retroreflectivity.value=p.retroreflectivity),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=E.texture,g.transmissionSamplerSize.value.set(E.width,E.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function _(g,p){p.matcap&&(g.matcap.value=p.matcap)}function y(g,p){let E=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(E.matrixWorld),g.nearDistance.value=E.shadow.camera.near,g.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Z_(i,e,t,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(M,v){let S=v.program;n.uniformBlockBinding(M,S)}function l(M,v){let S=s[M.id];S===void 0&&(g(M),S=h(M),s[M.id]=S,M.addEventListener("dispose",E));let T=v.program;n.updateUBOMapping(M,T);let x=e.render.frame;r[M.id]!==x&&(f(M),r[M.id]=x)}function h(M){let v=u();M.__bindingPointIndex=v;let S=i.createBuffer(),T=M.__size,x=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,T,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,v,S),S}function u(){for(let M=0;M<o;M++)if(a.indexOf(M)===-1)return a.push(M),M;return at("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(M){let v=s[M.id],S=M.uniforms,T=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,v);for(let x=0,C=S.length;x<C;x++){let P=S[x];if(Array.isArray(P))for(let U=0,L=P.length;U<L;U++)d(P[U],x,U,T);else d(P,x,0,T)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function d(M,v,S,T){if(y(M,v,S,T)===!0){let x=M.__offset,C=M.value;if(Array.isArray(C)){let P=0;for(let U=0;U<C.length;U++){let L=C[U],F=p(L);_(L,M.__data,P),typeof L!="number"&&typeof L!="boolean"&&!L.isMatrix3&&!ArrayBuffer.isView(L)&&(P+=F.storage/Float32Array.BYTES_PER_ELEMENT)}}else _(C,M.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,M.__data)}}function _(M,v,S){typeof M=="number"||typeof M=="boolean"?v[0]=M:M.isMatrix3?(v[0]=M.elements[0],v[1]=M.elements[1],v[2]=M.elements[2],v[3]=0,v[4]=M.elements[3],v[5]=M.elements[4],v[6]=M.elements[5],v[7]=0,v[8]=M.elements[6],v[9]=M.elements[7],v[10]=M.elements[8],v[11]=0):ArrayBuffer.isView(M)?v.set(new M.constructor(M.buffer,M.byteOffset,v.length)):M.toArray(v,S)}function y(M,v,S,T){let x=M.value,C=v+"_"+S;if(T[C]===void 0)return typeof x=="number"||typeof x=="boolean"?T[C]=x:ArrayBuffer.isView(x)?T[C]=x.slice():T[C]=x.clone(),!0;{let P=T[C];if(typeof x=="number"||typeof x=="boolean"){if(P!==x)return T[C]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(P.equals(x)===!1)return P.copy(x),!0}}return!1}function g(M){let v=M.uniforms,S=0,T=16;for(let C=0,P=v.length;C<P;C++){let U=Array.isArray(v[C])?v[C]:[v[C]];for(let L=0,F=U.length;L<F;L++){let N=U[L],D=Array.isArray(N.value)?N.value:[N.value];for(let V=0,q=D.length;V<q;V++){let ee=D[V],G=p(ee),te=S%T,ce=te%G.boundary,Le=te+ce;S+=ce,Le!==0&&T-Le<G.storage&&(S+=T-Le),N.__data=new Float32Array(G.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=S,S+=G.storage}}}let x=S%T;return x>0&&(S+=T-x),M.__size=S,M.__cache={},this}function p(M){let v={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(v.boundary=4,v.storage=4):M.isVector2?(v.boundary=8,v.storage=8):M.isVector3||M.isColor?(v.boundary=16,v.storage=12):M.isVector4?(v.boundary=16,v.storage=16):M.isMatrix3?(v.boundary=48,v.storage=48):M.isMatrix4?(v.boundary=64,v.storage=64):M.isTexture?et("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(M)?(v.boundary=16,v.storage=M.byteLength):et("WebGLRenderer: Unsupported uniform value type.",M),v}function E(M){let v=M.target;v.removeEventListener("dispose",E);let S=a.indexOf(v.__bindingPointIndex);a.splice(S,1),i.deleteBuffer(s[v.id]),delete s[v.id],delete r[v.id]}function m(){for(let M in s)i.deleteBuffer(s[M]);a=[],s={},r={}}return{bind:c,update:l,dispose:m}}var $_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Ei=null;function Q_(){return Ei===null&&(Ei=new dr($_,16,16,hs,Ln),Ei.name="DFG_LUT",Ei.minFilter=It,Ei.magFilter=It,Ei.wrapS=Xn,Ei.wrapT=Xn,Ei.generateMipmaps=!1,Ei.needsUpdate=!0),Ei}var Dr=class{constructor(e={}){let{canvas:t=Md(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:f=!1,outputBufferType:d=In}=e;this.isWebGLRenderer=!0;let _;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");_=n.getContextAttributes().alpha}else _=a;let y=d,g=new Set([yc,vc,_c]),p=new Set([In,oi,wr,Ar,gc,bc]),E=new Uint32Array(4),m=new Int32Array(4),M=new k,v=null,S=null,T=[],x=[],C=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ai,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,U=!1,L=null,F=null,N=null,D=null;this._outputColorSpace=Vt;let V=0,q=0,ee=null,G=-1,te=null,ce=new wt,Le=new wt,Ce=null,Ne=new Ge(0),ze=0,tt=t.width,Z=t.height,ae=1,he=null,Pe=null,Ae=new wt(0,0,tt,Z),De=new wt(0,0,tt,Z),Je=!1,de=new pr,ge=!1,xe=!1,_e=new ct,Me=new k,Ue=new wt,ve={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ue=!1;function me(){return ee===null?ae:1}let B=n;function W(R,j){return t.getContext(R,j)}let le,A,b,w,I,z,X,ie,O,K,Y,fe,ne,Q,pe,we,Ie,H,ye,se,Se,Te,be;try{let R={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"186"}`),t.addEventListener("webglcontextlost",ht,!1),t.addEventListener("webglcontextrestored",st,!1),t.addEventListener("webglcontextcreationerror",Gt,!1),B===null){let j="webgl2";if(B=W(j,R),B===null)throw W(j)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Be()}catch(R){throw t.removeEventListener("webglcontextlost",ht,!1),t.removeEventListener("webglcontextrestored",st,!1),t.removeEventListener("webglcontextcreationerror",Gt,!1),at("WebGLRenderer: "+R.message),R}function Be(){le=new ax(B),le.init(),Se=new X_(B,le),A=new Jb(B,le,e,Se),b=new W_(B,le),A.reversedDepthBuffer&&f&&b.buffers.depth.setReversed(!0),F=B.createFramebuffer(),N=B.createFramebuffer(),D=B.createFramebuffer(),w=new lx(B),I=new P_,z=new q_(B,le,b,I,A,Se,w),X=new rx(P),ie=new u0(B),Te=new Kb(B,ie),O=new ox(B,ie,w,Te),K=new ux(B,O,ie,Te,w),H=new hx(B,A,z),pe=new Zb(I),Y=new C_(P,X,le,A,Te,pe),fe=new J_(P,I),ne=new L_,Q=new B_(le),Ie=new jb(P,X,b,K,_,c),we=new V_(P,K,A),be=new Z_(B,w,A,b),ye=new Yb(B,le,w),se=new cx(B,le,w),w.programs=Y.programs,P.capabilities=A,P.extensions=le,P.properties=I,P.renderLists=ne,P.shadowMap=we,P.state=b,P.info=w}y!==In&&(C=new dx(y,t.width,t.height,o,s,r));let ke=new su(P,B);this.xr=ke,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let R=le.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){let R=le.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return ae},this.setPixelRatio=function(R){R!==void 0&&(ae=R,this.setSize(tt,Z,!1))},this.getSize=function(R){return R.set(tt,Z)},this.setSize=function(R,j,oe=!0){if(ke.isPresenting){et("WebGLRenderer: Can't change size while VR device is presenting.");return}tt=R,Z=j,t.width=Math.floor(R*ae),t.height=Math.floor(j*ae),oe===!0&&(t.style.width=R+"px",t.style.height=j+"px"),C!==null&&C.setSize(t.width,t.height),this.setViewport(0,0,R,j)},this.getDrawingBufferSize=function(R){return R.set(tt*ae,Z*ae).floor()},this.setDrawingBufferSize=function(R,j,oe){tt=R,Z=j,ae=oe,t.width=Math.floor(R*oe),t.height=Math.floor(j*oe),this.setViewport(0,0,R,j)},this.setEffects=function(R){if(y===In){at("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let j=0;j<R.length;j++)if(R[j].isOutputPass===!0){et("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}C.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(ce)},this.getViewport=function(R){return R.copy(Ae)},this.setViewport=function(R,j,oe,J){R.isVector4?Ae.set(R.x,R.y,R.z,R.w):Ae.set(R,j,oe,J),b.viewport(ce.copy(Ae).multiplyScalar(ae).round())},this.getScissor=function(R){return R.copy(De)},this.setScissor=function(R,j,oe,J){R.isVector4?De.set(R.x,R.y,R.z,R.w):De.set(R,j,oe,J),b.scissor(Le.copy(De).multiplyScalar(ae).round())},this.getScissorTest=function(){return Je},this.setScissorTest=function(R){b.setScissorTest(Je=R)},this.setOpaqueSort=function(R){he=R},this.setTransparentSort=function(R){Pe=R},this.getClearColor=function(R){return R.copy(Ie.getClearColor())},this.setClearColor=function(){Ie.setClearColor(...arguments)},this.getClearAlpha=function(){return Ie.getClearAlpha()},this.setClearAlpha=function(){Ie.setClearAlpha(...arguments)},this.clear=function(R=!0,j=!0,oe=!0){let J=0;if(R){let $=!1;if(ee!==null){let Fe=ee.texture.format;$=g.has(Fe)}if($){let Fe=ee.texture.type,Ve=p.has(Fe),Oe=Ie.getClearColor(),Ke=Ie.getClearAlpha(),Ye=Oe.r,ot=Oe.g,ut=Oe.b;Ve?(E[0]=Ye,E[1]=ot,E[2]=ut,E[3]=Ke,B.clearBufferuiv(B.COLOR,0,E)):(m[0]=Ye,m[1]=ot,m[2]=ut,m[3]=Ke,B.clearBufferiv(B.COLOR,0,m))}else J|=B.COLOR_BUFFER_BIT}j&&(J|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),oe&&(J|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),J!==0&&B.clear(J)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),L=R},this.dispose=function(){t.removeEventListener("webglcontextlost",ht,!1),t.removeEventListener("webglcontextrestored",st,!1),t.removeEventListener("webglcontextcreationerror",Gt,!1),Ie.dispose(),ne.dispose(),Q.dispose(),I.dispose(),X.dispose(),K.dispose(),Te.dispose(),be.dispose(),Y.dispose(),ke.dispose(),ke.removeEventListener("sessionstart",ui),ke.removeEventListener("sessionend",mn),re.stop()};function ht(R){R.preventDefault(),ta("WebGLRenderer: Context Lost."),U=!0}function st(){ta("WebGLRenderer: Context Restored."),U=!1;let R=w.autoReset,j=we.enabled,oe=we.autoUpdate,J=we.needsUpdate,$=we.type;Be(),w.autoReset=R,we.enabled=j,we.autoUpdate=oe,we.needsUpdate=J,we.type=$}function Gt(R){at("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function Tt(R){let j=R.target;j.removeEventListener("dispose",Tt),Gn(j)}function Gn(R){Vn(R),I.remove(R)}function Vn(R){let j=I.get(R).programs;j!==void 0&&(j.forEach(function(oe){Y.releaseProgram(oe)}),R.isShaderMaterial&&Y.releaseShaderCache(R))}this.renderBufferDirect=function(R,j,oe,J,$,Fe){j===null&&(j=ve);let Ve=$.isMesh&&$.matrixWorld.determinantAffine()<0,Oe=Lt(R,j,oe,J,$);b.setMaterial(J,Ve);let Ke=oe.index,Ye=1;if(J.wireframe===!0){if(Ke=O.getWireframeAttribute(oe),Ke===void 0)return;Ye=2}let ot=oe.drawRange,ut=oe.attributes.position,Ee=ot.start*Ye,it=(ot.start+ot.count)*Ye;Fe!==null&&(Ee=Math.max(Ee,Fe.start*Ye),it=Math.min(it,(Fe.start+Fe.count)*Ye)),Ke!==null?(Ee=Math.max(Ee,0),it=Math.min(it,Ke.count)):ut!=null&&(Ee=Math.max(Ee,0),it=Math.min(it,ut.count));let ft=it-Ee;if(ft<0||ft===1/0)return;Te.setup($,J,Oe,oe,Ke);let Qe,rt=ye;if(Ke!==null&&(Qe=ie.get(Ke),rt=se,rt.setIndex(Qe)),$.isMesh)J.wireframe===!0?(b.setLineWidth(J.wireframeLinewidth*me()),rt.setMode(B.LINES)):rt.setMode(B.TRIANGLES);else if($.isLine){let kt=J.linewidth;kt===void 0&&(kt=1),b.setLineWidth(kt*me()),$.isLineSegments?rt.setMode(B.LINES):$.isLineLoop?rt.setMode(B.LINE_LOOP):rt.setMode(B.LINE_STRIP)}else $.isPoints?rt.setMode(B.POINTS):$.isSprite&&rt.setMode(B.TRIANGLES);if($.isBatchedMesh)if(le.get("WEBGL_multi_draw"))rt.renderMultiDraw($._multiDrawStarts,$._multiDrawCounts,$._multiDrawCount);else{let kt=$._multiDrawStarts,qe=$._multiDrawCounts,Zt=$._multiDrawCount,xt=Ke?ie.get(Ke).bytesPerElement:1,on=I.get(J).currentProgram.getUniforms();for(let dn=0;dn<Zt;dn++)on.setValue(B,"_gl_DrawID",dn),rt.render(kt[dn]/xt,qe[dn])}else if($.isInstancedMesh)rt.renderInstances(Ee,ft,$.count);else if(oe.isInstancedBufferGeometry){let kt=oe._maxInstanceCount!==void 0?oe._maxInstanceCount:1/0,qe=Math.min(oe.instanceCount,kt);rt.renderInstances(Ee,ft,qe)}else rt.render(Ee,ft)};function li(R,j,oe,J){L!==null&&R.isNodeMaterial&&L.setObject(J,R),ge===!0&&pe.setState(R,oe,!1),R.transparent===!0&&R.side===pn&&R.forceSinglePass===!1?(R.side=sn,R.needsUpdate=!0,Mt(R,j,J),R.side=Si,R.needsUpdate=!0,Mt(R,j,J),R.side=pn):Mt(R,j,J)}this.compile=function(R,j,oe=null){oe===null&&(oe=R),L!==null&&L.renderStart(R,j,oe),S=Q.get(oe),S.init(j),x.push(S),oe.traverseVisible(function($){$.isLight&&$.layers.test(j.layers)&&(S.pushLight($),$.castShadow&&S.pushShadow($))}),R!==oe&&R.traverseVisible(function($){$.isLight&&$.layers.test(j.layers)&&(S.pushLight($),$.castShadow&&S.pushShadow($))}),S.setupLights(),L!==null&&L.updateLights(S.state.lightsArray),xe=this.localClippingEnabled,ge=pe.init(this.clippingPlanes,xe),ge===!0&&pe.setGlobalState(this.clippingPlanes,j),L!==null&&we.render(S.state.shadowsArray,oe,j);let J=new Set;return R.traverse(function($){if(!($.isMesh||$.isPoints||$.isLine||$.isSprite))return;let Fe=$.material;if(Fe)if(Array.isArray(Fe))for(let Ve=0;Ve<Fe.length;Ve++){let Oe=Fe[Ve];li(Oe,oe,j,$),J.add(Oe)}else li(Fe,oe,j,$),J.add(Fe)}),S=x.pop(),L!==null&&L.renderEnd(),J},this.compileAsync=function(R,j,oe=null){let J=this.compile(R,j,oe);return new Promise($=>{function Fe(){if(J.forEach(function(Ve){let Ke=I.get(Ve).currentProgram;(Ke===void 0||Ke.isReady())&&J.delete(Ve)}),J.size===0){$(R);return}setTimeout(Fe,10)}le.get("KHR_parallel_shader_compile")!==null?Fe():setTimeout(Fe,10)})};let Wn=null;function hi(R){Wn&&Wn(R)}function ui(){re.stop()}function mn(){re.start()}let re=new tp;re.setAnimationLoop(hi),typeof self<"u"&&re.setContext(self),this.setAnimationLoop=function(R){Wn=R,ke.setAnimationLoop(R),R===null?re.stop():re.start()},ke.addEventListener("sessionstart",ui),ke.addEventListener("sessionend",mn),this.render=function(R,j){if(j!==void 0&&j.isCamera!==!0){at("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(U===!0)return;L!==null&&L.renderStart(R,j);let oe=ke.enabled===!0&&ke.isPresenting===!0,J=C!==null&&(ee===null||oe)&&C.begin(P,ee);if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),j.parent===null&&j.matrixWorldAutoUpdate===!0&&j.updateMatrixWorld(),ke.enabled===!0&&ke.isPresenting===!0&&(C===null||C.isCompositing()===!1)&&(ke.cameraAutoUpdate===!0&&ke.updateCamera(j),j=ke.getCamera()),R.isScene===!0&&R.onBeforeRender(P,R,j,ee),S=Q.get(R,x.length),S.init(j),S.state.textureUnits=z.getTextureUnits(),x.push(S),_e.multiplyMatrices(j.projectionMatrix,j.matrixWorldInverse),de.setFromProjectionMatrix(_e,ri,j.reversedDepth),xe=this.localClippingEnabled,ge=pe.init(this.clippingPlanes,xe),v=ne.get(R,T.length),v.init(),T.push(v),ke.enabled===!0&&ke.isPresenting===!0){let Ve=P.xr.getDepthSensingMesh();Ve!==null&&je(Ve,j,-1/0,P.sortObjects)}je(R,j,0,P.sortObjects),v.finish(),L!==null&&L.updateLights(S.state.lightsArray),P.sortObjects===!0&&v.sort(he,Pe),ue=ke.enabled===!1||ke.isPresenting===!1||ke.hasDepthSensing()===!1,ue&&Ie.addToRenderList(v,R),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),ge===!0&&pe.beginShadows();let $=S.state.shadowsArray;if(we.render($,R,j),ge===!0&&pe.endShadows(),(J&&C.hasRenderPass())===!1){let Ve=v.opaque,Oe=v.transmissive;if(S.setupLights(),j.isArrayCamera){let Ke=j.cameras;if(Oe.length>0)for(let Ye=0,ot=Ke.length;Ye<ot;Ye++){let ut=Ke[Ye];Xe(Ve,Oe,R,ut)}ue&&Ie.render(R);for(let Ye=0,ot=Ke.length;Ye<ot;Ye++){let ut=Ke[Ye];He(v,R,ut,ut.viewport)}}else Oe.length>0&&Xe(Ve,Oe,R,j),ue&&Ie.render(R),He(v,R,j)}ee!==null&&q===0&&(z.updateMultisampleRenderTarget(ee),z.updateRenderTargetMipmap(ee)),J&&C.end(P),R.isScene===!0&&R.onAfterRender(P,R,j),Te.resetDefaultState(),G=-1,te=null,x.pop(),x.length>0?(S=x[x.length-1],z.setTextureUnits(S.state.textureUnits),ge===!0&&pe.setGlobalState(P.clippingPlanes,S.state.camera)):S=null,T.pop(),T.length>0?v=T[T.length-1]:v=null,L!==null&&L.renderEnd()};function je(R,j,oe,J){if(R.visible===!1)return;if(R.layers.test(j.layers)){if(R.isGroup)oe=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(j);else if(R.isLightProbeGrid)S.pushLightProbeGrid(R);else if(R.isLight)S.pushLight(R),R.castShadow&&S.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||R.intersectsFrustum(de)){J&&Ue.setFromMatrixPosition(R.matrixWorld).applyMatrix4(_e);let Ve=K.update(R),Oe=R.material;Oe.visible&&v.push(R,Ve,Oe,oe,Ue.z,null,j)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||R.intersectsFrustum(de))){let Ve=K.update(R),Oe=R.material;if(J&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),Ue.copy(R.boundingSphere.center)):(Ve.boundingSphere===null&&Ve.computeBoundingSphere(),Ue.copy(Ve.boundingSphere.center)),Ue.applyMatrix4(R.matrixWorld).applyMatrix4(_e)),Array.isArray(Oe)){let Ke=Ve.groups;for(let Ye=0,ot=Ke.length;Ye<ot;Ye++){let ut=Ke[Ye],Ee=Oe[ut.materialIndex];Ee&&Ee.visible&&v.push(R,Ve,Ee,oe,Ue.z,ut,j)}}else Oe.visible&&v.push(R,Ve,Oe,oe,Ue.z,null,j)}}let Fe=R.children;for(let Ve=0,Oe=Fe.length;Ve<Oe;Ve++)je(Fe[Ve],j,oe,J)}function He(R,j,oe,J){let{opaque:$,transmissive:Fe,transparent:Ve}=R;S.setupLightsView(oe),ge===!0&&pe.setGlobalState(P.clippingPlanes,oe),J&&b.viewport(ce.copy(J)),$.length>0&&Ze($,j,oe),Fe.length>0&&Ze(Fe,j,oe),Ve.length>0&&Ze(Ve,j,oe),b.buffers.depth.setTest(!0),b.buffers.depth.setMask(!0),b.buffers.color.setMask(!0),b.setPolygonOffset(!1)}function Xe(R,j,oe,J){if((oe.isScene===!0?oe.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[J.id]===void 0){let Ee=le.has("EXT_color_buffer_half_float")||le.has("EXT_color_buffer_float");S.state.transmissionRenderTarget[J.id]=new ln(1,1,{generateMipmaps:!0,type:Ee?Ln:In,minFilter:Bn,samples:Math.max(4,A.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:bt.workingColorSpace})}let Fe=S.state.transmissionRenderTarget[J.id],Ve=J.viewport||ce;Fe.setSize(Ve.z*P.transmissionResolutionScale,Ve.w*P.transmissionResolutionScale);let Oe=P.getRenderTarget(),Ke=P.getActiveCubeFace(),Ye=P.getActiveMipmapLevel();P.setRenderTarget(Fe),P.getClearColor(Ne),ze=P.getClearAlpha(),ze<1&&P.setClearColor(16777215,.5),P.clear(),ue&&Ie.render(oe);let ot=P.toneMapping;P.toneMapping=ai;let ut=J.viewport;if(J.viewport!==void 0&&(J.viewport=void 0),S.setupLightsView(J),ge===!0&&pe.setGlobalState(P.clippingPlanes,J),Ze(R,oe,J),z.updateMultisampleRenderTarget(Fe),z.updateRenderTargetMipmap(Fe),le.has("WEBGL_multisampled_render_to_texture")===!1){let Ee=!1;for(let it=0,ft=j.length;it<ft;it++){let Qe=j[it],{object:rt,geometry:kt,material:qe,group:Zt}=Qe;if(qe.side===pn&&rt.layers.test(J.layers)){let xt=qe.side;qe.side=sn,qe.needsUpdate=!0,$e(rt,oe,J,kt,qe,Zt),qe.side=xt,qe.needsUpdate=!0,Ee=!0}}Ee===!0&&(z.updateMultisampleRenderTarget(Fe),z.updateRenderTargetMipmap(Fe))}P.setRenderTarget(Oe,Ke,Ye),P.setClearColor(Ne,ze),ut!==void 0&&(J.viewport=ut),P.toneMapping=ot}function Ze(R,j,oe){let J=j.isScene===!0?j.overrideMaterial:null;for(let $=0,Fe=R.length;$<Fe;$++){let Ve=R[$],{object:Oe,geometry:Ke,group:Ye}=Ve,ot=Ve.material;ot.allowOverride===!0&&J!==null&&(ot=J),Oe.layers.test(oe.layers)&&$e(Oe,j,oe,Ke,ot,Ye)}}function $e(R,j,oe,J,$,Fe){L!==null&&$.isNodeMaterial&&L.setObject(R,$),R.onBeforeRender(P,j,oe,J,$,Fe),R.modelViewMatrix.multiplyMatrices(oe.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),$.onBeforeRender(P,j,oe,J,R,Fe),$.transparent===!0&&$.side===pn&&$.forceSinglePass===!1?($.side=sn,$.needsUpdate=!0,P.renderBufferDirect(oe,j,J,$,R,Fe),$.side=Si,$.needsUpdate=!0,P.renderBufferDirect(oe,j,J,$,R,Fe),$.side=pn):P.renderBufferDirect(oe,j,J,$,R,Fe),R.onAfterRender(P,j,oe,J,$,Fe)}function Mt(R,j,oe){j.isScene!==!0&&(j=ve);let J=I.get(R),$=S.state.lights,Fe=S.state.shadowsArray,Ve=$.state.version,Oe=Y.getParameters(R,$.state,Fe,j,oe,S.state.lightProbeGridArray),Ke=Y.getProgramCacheKey(Oe),Ye=J.programs;J.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?j.environment:null,J.fog=j.fog;let ot=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;J.envMap=X.get(R.envMap||J.environment,ot),J.envMapRotation=J.environment!==null&&R.envMap===null?j.environmentRotation:R.envMapRotation,Ye===void 0&&(R.addEventListener("dispose",Tt),Ye=new Map,J.programs=Ye);let ut=Ye.get(Ke);if(ut!==void 0){if(J.currentProgram===ut&&J.lightsStateVersion===Ve)return nt(R,Oe),ut}else Oe.uniforms=Y.getUniforms(R),L!==null&&R.isNodeMaterial&&L.build(R,oe,Oe),R.onBeforeCompile(Oe,P),ut=Y.acquireProgram(Oe,Ke),Ye.set(Ke,ut),J.uniforms=Oe.uniforms;let Ee=J.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ee.clippingPlanes=pe.uniform),nt(R,Oe),J.needsLights=Dt(R),J.lightsStateVersion=Ve,J.needsLights&&(Ee.ambientLightColor.value=$.state.ambient,Ee.lightProbe.value=$.state.probe,Ee.sunLights.value=$.state.sun,Ee.sunLightShadows.value=$.state.sunShadow,Ee.directionalLights.value=$.state.directional,Ee.directionalLightShadows.value=$.state.directionalShadow,Ee.spotLights.value=$.state.spot,Ee.spotLightShadows.value=$.state.spotShadow,Ee.rectAreaLights.value=$.state.rectArea,Ee.ltc_1.value=$.state.rectAreaLTC1,Ee.ltc_2.value=$.state.rectAreaLTC2,Ee.pointLights.value=$.state.point,Ee.pointLightShadows.value=$.state.pointShadow,Ee.hemisphereLights.value=$.state.hemi,Ee.sunShadowMatrix.value=$.state.sunShadowMatrix,Ee.sunShadowCascade.value=$.state.sunShadowCascade,Ee.directionalShadowMatrix.value=$.state.directionalShadowMatrix,Ee.spotLightMatrix.value=$.state.spotLightMatrix,Ee.spotLightMap.value=$.state.spotLightMap,Ee.pointShadowMatrix.value=$.state.pointShadowMatrix),J.lightProbeGrid=S.state.lightProbeGridArray.length>0,J.currentProgram=ut,J.uniformsList=null,ut}function fn(R){if(R.uniformsList===null){let j=R.currentProgram.getUniforms();R.uniformsList=Lr.seqWithValue(j.seq,R.uniforms)}return R.uniformsList}function nt(R,j){let oe=I.get(R);oe.outputColorSpace=j.outputColorSpace,oe.batching=j.batching,oe.batchingColor=j.batchingColor,oe.instancing=j.instancing,oe.instancingColor=j.instancingColor,oe.instancingMorph=j.instancingMorph,oe.skinning=j.skinning,oe.morphTargets=j.morphTargets,oe.morphNormals=j.morphNormals,oe.morphColors=j.morphColors,oe.morphTargetsCount=j.morphTargetsCount,oe.numClippingPlanes=j.numClippingPlanes,oe.numIntersection=j.numClipIntersection,oe.vertexAlphas=j.vertexAlphas,oe.vertexTangents=j.vertexTangents,oe.toneMapping=j.toneMapping}function Pt(R,j){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;M.setFromMatrixPosition(j.matrixWorld);for(let oe=0,J=R.length;oe<J;oe++){let $=R[oe];if($.texture!==null&&$.boundingBox.containsPoint(M))return $}return null}function Lt(R,j,oe,J,$){j.isScene!==!0&&(j=ve),z.resetTextureUnits();let Fe=j.fog,Ve=J.isMeshStandardMaterial||J.isMeshLambertMaterial||J.isMeshPhongMaterial?j.environment:null,Oe=ee===null?P.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:bt.workingColorSpace,Ke=J.isMeshStandardMaterial||J.isMeshLambertMaterial&&!J.envMap||J.isMeshPhongMaterial&&!J.envMap,Ye=X.get(J.envMap||Ve,Ke),ot=J.vertexColors===!0&&!!oe.attributes.color&&oe.attributes.color.itemSize===4,ut=!!oe.attributes.tangent&&(!!J.normalMap||J.anisotropy>0),Ee=!!oe.morphAttributes.position,it=!!oe.morphAttributes.normal,ft=!!oe.morphAttributes.color,Qe=ai;J.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(Qe=P.toneMapping);let rt=oe.morphAttributes.position||oe.morphAttributes.normal||oe.morphAttributes.color,kt=rt!==void 0?rt.length:0,qe=I.get(J),Zt=S.state.lights;if(ge===!0&&(xe===!0||R!==te)){let Ut=R===te&&J.id===G;pe.setState(J,R,Ut)}let xt=!1;J.version===qe.__version?(qe.needsLights&&qe.lightsStateVersion!==Zt.state.version||qe.outputColorSpace!==Oe||$.isBatchedMesh&&qe.batching===!1||!$.isBatchedMesh&&qe.batching===!0||$.isBatchedMesh&&qe.batchingColor===!0&&$._colorsTexture===null||$.isBatchedMesh&&qe.batchingColor===!1&&$._colorsTexture!==null||$.isInstancedMesh&&qe.instancing===!1||!$.isInstancedMesh&&qe.instancing===!0||$.isSkinnedMesh&&qe.skinning===!1||!$.isSkinnedMesh&&qe.skinning===!0||$.isInstancedMesh&&qe.instancingColor===!0&&$.instanceColor===null||$.isInstancedMesh&&qe.instancingColor===!1&&$.instanceColor!==null||$.isInstancedMesh&&qe.instancingMorph===!0&&$.morphTexture===null||$.isInstancedMesh&&qe.instancingMorph===!1&&$.morphTexture!==null||qe.envMap!==Ye||J.fog===!0&&qe.fog!==Fe||qe.numClippingPlanes!==void 0&&(qe.numClippingPlanes!==pe.numPlanes||qe.numIntersection!==pe.numIntersection)||qe.vertexAlphas!==ot||qe.vertexTangents!==ut||qe.morphTargets!==Ee||qe.morphNormals!==it||qe.morphColors!==ft||qe.toneMapping!==Qe||qe.morphTargetsCount!==kt||!!qe.lightProbeGrid!=S.state.lightProbeGridArray.length>0)&&(xt=!0):(xt=!0,qe.__version=J.version);let on=qe.currentProgram;xt===!0&&(on=Mt(J,j,$),L&&J.isNodeMaterial&&L.onUpdateProgram(J,on,qe));let dn=!1,Rn=!1,Ki=!1,Et=on.getUniforms(),qt=qe.uniforms;if(b.useProgram(on.program)&&(dn=!0,Rn=!0,Ki=!0),J.id!==G&&(G=J.id,Rn=!0),qe.needsLights){let Ut=Pt(S.state.lightProbeGridArray,$);qe.lightProbeGrid!==Ut&&(qe.lightProbeGrid=Ut,Rn=!0)}if(dn||te!==R){b.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),Et.setValue(B,"projectionMatrix",R.projectionMatrix),Et.setValue(B,"viewMatrix",R.matrixWorldInverse);let Ji=Et.map.cameraPosition;Ji!==void 0&&Ji.setValue(B,Me.setFromMatrixPosition(R.matrixWorld)),A.logarithmicDepthBuffer&&Et.setValue(B,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(J.isMeshPhongMaterial||J.isMeshToonMaterial||J.isMeshLambertMaterial||J.isMeshBasicMaterial||J.isMeshStandardMaterial||J.isShaderMaterial)&&Et.setValue(B,"isOrthographic",R.isOrthographicCamera===!0),te!==R&&(te=R,Rn=!0,Ki=!0)}if(qe.needsLights&&(Zt.state.sunShadowMap.length>0&&Et.setValue(B,"sunShadowMap",Zt.state.sunShadowMap,z),Zt.state.directionalShadowMap.length>0&&Et.setValue(B,"directionalShadowMap",Zt.state.directionalShadowMap,z),Zt.state.spotShadowMap.length>0&&Et.setValue(B,"spotShadowMap",Zt.state.spotShadowMap,z),Zt.state.pointShadowMap.length>0&&Et.setValue(B,"pointShadowMap",Zt.state.pointShadowMap,z)),$.isSkinnedMesh){Et.setOptional(B,$,"bindMatrix"),Et.setOptional(B,$,"bindMatrixInverse");let Ut=$.skeleton;Ut&&(Ut.boneTexture===null&&Ut.computeBoneTexture(),Et.setValue(B,"boneTexture",Ut.boneTexture,z))}$.isBatchedMesh&&(Et.setOptional(B,$,"batchingTexture"),Et.setValue(B,"batchingTexture",$._matricesTexture,z),Et.setOptional(B,$,"batchingIdTexture"),Et.setValue(B,"batchingIdTexture",$._indirectTexture,z),Et.setOptional(B,$,"batchingColorTexture"),$._colorsTexture!==null&&Et.setValue(B,"batchingColorTexture",$._colorsTexture,z));let Yi=oe.morphAttributes;if((Yi.position!==void 0||Yi.normal!==void 0||Yi.color!==void 0)&&H.update($,oe,on),(Rn||qe.receiveShadow!==$.receiveShadow)&&(qe.receiveShadow=$.receiveShadow,Et.setValue(B,"receiveShadow",$.receiveShadow)),(J.isMeshStandardMaterial||J.isMeshLambertMaterial||J.isMeshPhongMaterial)&&J.envMap===null&&j.environment!==null&&(qt.envMapIntensity.value=j.environmentIntensity),qt.dfgLUT!==void 0&&(qt.dfgLUT.value=Q_()),Rn){if(Et.setValue(B,"toneMappingExposure",P.toneMappingExposure),qe.needsLights&&zt(qt,Ki),Fe&&J.fog===!0&&fe.refreshFogUniforms(qt,Fe),fe.refreshMaterialUniforms(qt,J,ae,Z,S.state.transmissionRenderTarget[R.id]),qe.needsLights&&qe.lightProbeGrid){let Ut=qe.lightProbeGrid;qt.probesSH.value=Ut.texture,qt.probesMin.value.copy(Ut.boundingBox.min),qt.probesMax.value.copy(Ut.boundingBox.max),qt.probesResolution.value.copy(Ut.resolution)}Lr.upload(B,fn(qe),qt,z)}if(J.isShaderMaterial&&J.uniformsNeedUpdate===!0&&(Lr.upload(B,fn(qe),qt,z),J.uniformsNeedUpdate=!1),J.isSpriteMaterial&&Et.setValue(B,"center",$.center),Et.setValue(B,"modelViewMatrix",$.modelViewMatrix),Et.setValue(B,"normalMatrix",$.normalMatrix),Et.setValue(B,"modelMatrix",$.matrixWorld),J.uniformsGroups!==void 0){let Ut=J.uniformsGroups;for(let Ji=0,Hs=Ut.length;Ji<Hs;Ji++){let Qu=Ut[Ji];be.update(Qu,on),be.bind(Qu,on)}}return on}function zt(R,j){R.ambientLightColor.needsUpdate=j,R.lightProbe.needsUpdate=j,R.sunLights.needsUpdate=j,R.sunLightShadows.needsUpdate=j,R.directionalLights.needsUpdate=j,R.directionalLightShadows.needsUpdate=j,R.pointLights.needsUpdate=j,R.pointLightShadows.needsUpdate=j,R.spotLights.needsUpdate=j,R.spotLightShadows.needsUpdate=j,R.rectAreaLights.needsUpdate=j,R.hemisphereLights.needsUpdate=j}function Dt(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return V},this.getActiveMipmapLevel=function(){return q},this.getRenderTarget=function(){return ee},this.setRenderTargetTextures=function(R,j,oe){let J=I.get(R);J.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,J.__autoAllocateDepthBuffer===!1&&(J.__useRenderToTexture=!1),I.get(R.texture).__webglTexture=j,I.get(R.depthTexture).__webglTexture=J.__autoAllocateDepthBuffer?void 0:oe,J.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,j){let oe=I.get(R);oe.__webglFramebuffer=j,oe.__useDefaultFramebuffer=j===void 0},this.setRenderTarget=function(R,j=0,oe=0){ee=R,V=j,q=oe;let J=null,$=!1,Fe=!1;if(R){let Oe=I.get(R);if(Oe.__useDefaultFramebuffer!==void 0){b.bindFramebuffer(B.FRAMEBUFFER,Oe.__webglFramebuffer),ce.copy(R.viewport),Le.copy(R.scissor),Ce=R.scissorTest,b.viewport(ce),b.scissor(Le),b.setScissorTest(Ce),G=-1;return}else if(Oe.__webglFramebuffer===void 0)z.setupRenderTarget(R);else if(Oe.__hasExternalTextures)z.rebindTextures(R,I.get(R.texture).__webglTexture,I.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){let ot=R.depthTexture;if(Oe.__boundDepthTexture!==ot){if(ot!==null&&I.has(ot)&&(R.width!==ot.image.width||R.height!==ot.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(R)}}let Ke=R.texture;(Ke.isData3DTexture||Ke.isDataArrayTexture||Ke.isCompressedArrayTexture)&&(Fe=!0);let Ye=I.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Ye[j])?J=Ye[j][oe]:J=Ye[j],$=!0):R.samples>0&&z.useMultisampledRTT(R)===!1?J=I.get(R).__webglMultisampledFramebuffer:Array.isArray(Ye)?J=Ye[oe]:J=Ye,ce.copy(R.viewport),Le.copy(R.scissor),Ce=R.scissorTest}else ce.copy(Ae).multiplyScalar(ae).floor(),Le.copy(De).multiplyScalar(ae).floor(),Ce=Je;if(oe!==0&&(J=F),b.bindFramebuffer(B.FRAMEBUFFER,J)&&b.drawBuffers(R,J),b.viewport(ce),b.scissor(Le),b.setScissorTest(Ce),$){let Oe=I.get(R.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+j,Oe.__webglTexture,oe)}else if(Fe){let Oe=j;for(let Ke=0;Ke<R.textures.length;Ke++){let Ye=I.get(R.textures[Ke]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+Ke,Ye.__webglTexture,oe,Oe)}}else if(R!==null&&oe!==0){let Oe=I.get(R.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Oe.__webglTexture,oe)}G=-1};function Jt(R){let j=I.get(R);return(j.__readFormat!==R.format||j.__readType!==R.type)&&(j.__readFormat=R.format,j.__readType=R.type,j.__formatReadable=A.textureFormatReadable(R.format),j.__typeReadable=A.textureTypeReadable(R.type)),j}this.readRenderTargetPixels=function(R,j,oe,J,$,Fe,Ve,Oe=0){if(!(R&&R.isWebGLRenderTarget)){at("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ke=I.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Ve!==void 0&&(Ke=Ke[Ve]),Ke){b.bindFramebuffer(B.FRAMEBUFFER,Ke);try{let Ye=R.textures[Oe],ot=Ye.format,ut=Ye.type;R.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+Oe);let Ee=Jt(Ye);if(Ee.__formatReadable===!1){at("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Ee.__typeReadable===!1){at("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}j>=0&&j<=R.width-J&&oe>=0&&oe<=R.height-$&&B.readPixels(j,oe,J,$,Se.convert(ot),Se.convert(ut),Fe)}finally{let Ye=ee!==null?I.get(ee).__webglFramebuffer:null;b.bindFramebuffer(B.FRAMEBUFFER,Ye)}}},this.readRenderTargetPixelsAsync=async function(R,j,oe,J,$,Fe,Ve,Oe=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ke=I.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Ve!==void 0&&(Ke=Ke[Ve]),Ke)if(j>=0&&j<=R.width-J&&oe>=0&&oe<=R.height-$){b.bindFramebuffer(B.FRAMEBUFFER,Ke);let Ye=R.textures[Oe],ot=Ye.format,ut=Ye.type;R.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+Oe);let Ee=Jt(Ye);if(Ee.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Ee.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let it=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,it),B.bufferData(B.PIXEL_PACK_BUFFER,Fe.byteLength,B.STREAM_READ),B.readPixels(j,oe,J,$,Se.convert(ot),Se.convert(ut),0),B.bindBuffer(B.PIXEL_PACK_BUFFER,null);let ft=ee!==null?I.get(ee).__webglFramebuffer:null;b.bindFramebuffer(B.FRAMEBUFFER,ft);let Qe=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Td(B,Qe,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,it),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,Fe),B.bindBuffer(B.PIXEL_PACK_BUFFER,null),B.deleteBuffer(it),B.deleteSync(Qe),Fe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,j=null,oe=0){let J=Math.pow(2,-oe),$=Math.floor(R.image.width*J),Fe=Math.floor(R.image.height*J),Ve=j!==null?j.x:0,Oe=j!==null?j.y:0;z.setTexture2D(R,0),B.copyTexSubImage2D(B.TEXTURE_2D,oe,0,0,Ve,Oe,$,Fe),b.unbindTexture()},this.copyTextureToTexture=function(R,j,oe=null,J=null,$=0,Fe=0){let Ve,Oe,Ke,Ye,ot,ut,Ee,it,ft,Qe=R.isCompressedTexture?R.mipmaps[Fe]:R.image;if(oe!==null)Ve=oe.max.x-oe.min.x,Oe=oe.max.y-oe.min.y,Ke=oe.isBox3?oe.max.z-oe.min.z:1,Ye=oe.min.x,ot=oe.min.y,ut=oe.isBox3?oe.min.z:0;else{let qt=Math.pow(2,-$);Ve=Math.floor(Qe.width*qt),Oe=Math.floor(Qe.height*qt),R.isDataArrayTexture?Ke=Qe.depth:R.isData3DTexture?Ke=Math.floor(Qe.depth*qt):Ke=1,Ye=0,ot=0,ut=0}J!==null?(Ee=J.x,it=J.y,ft=J.z):(Ee=0,it=0,ft=0);let rt=Se.convert(j.format),kt=Se.convert(j.type),qe;j.isData3DTexture?(z.setTexture3D(j,0),qe=B.TEXTURE_3D):j.isDataArrayTexture||j.isCompressedArrayTexture?(z.setTexture2DArray(j,0),qe=B.TEXTURE_2D_ARRAY):(z.setTexture2D(j,0),qe=B.TEXTURE_2D),b.activeTexture(B.TEXTURE0),b.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,j.flipY),b.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,j.premultiplyAlpha),b.pixelStorei(B.UNPACK_ALIGNMENT,j.unpackAlignment);let Zt=b.getParameter(B.UNPACK_ROW_LENGTH),xt=b.getParameter(B.UNPACK_IMAGE_HEIGHT),on=b.getParameter(B.UNPACK_SKIP_PIXELS),dn=b.getParameter(B.UNPACK_SKIP_ROWS),Rn=b.getParameter(B.UNPACK_SKIP_IMAGES);b.pixelStorei(B.UNPACK_ROW_LENGTH,Qe.width),b.pixelStorei(B.UNPACK_IMAGE_HEIGHT,Qe.height),b.pixelStorei(B.UNPACK_SKIP_PIXELS,Ye),b.pixelStorei(B.UNPACK_SKIP_ROWS,ot),b.pixelStorei(B.UNPACK_SKIP_IMAGES,ut);let Ki=R.isDataArrayTexture||R.isData3DTexture,Et=j.isDataArrayTexture||j.isData3DTexture;if(R.isDepthTexture){let qt=I.get(R),Yi=I.get(j),Ut=I.get(qt.__renderTarget),Ji=I.get(Yi.__renderTarget);b.bindFramebuffer(B.READ_FRAMEBUFFER,Ut.__webglFramebuffer),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,Ji.__webglFramebuffer);for(let Hs=0;Hs<Ke;Hs++)Ki&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,I.get(R).__webglTexture,$,ut+Hs),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,I.get(j).__webglTexture,Fe,ft+Hs)),B.blitFramebuffer(Ye,ot,Ve,Oe,Ee,it,Ve,Oe,B.DEPTH_BUFFER_BIT,B.NEAREST);b.bindFramebuffer(B.READ_FRAMEBUFFER,null),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if($!==0||R.isRenderTargetTexture||I.has(R)){let qt=I.get(R),Yi=I.get(j);b.bindFramebuffer(B.READ_FRAMEBUFFER,N),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,D);for(let Ut=0;Ut<Ke;Ut++)Ki?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,qt.__webglTexture,$,ut+Ut):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,qt.__webglTexture,$),Et?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Yi.__webglTexture,Fe,ft+Ut):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Yi.__webglTexture,Fe),$!==0?B.blitFramebuffer(Ye,ot,Ve,Oe,Ee,it,Ve,Oe,B.COLOR_BUFFER_BIT,B.NEAREST):Et?B.copyTexSubImage3D(qe,Fe,Ee,it,ft+Ut,Ye,ot,Ve,Oe):B.copyTexSubImage2D(qe,Fe,Ee,it,Ye,ot,Ve,Oe);b.bindFramebuffer(B.READ_FRAMEBUFFER,null),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else Et?R.isDataTexture||R.isData3DTexture?B.texSubImage3D(qe,Fe,Ee,it,ft,Ve,Oe,Ke,rt,kt,Qe.data):j.isCompressedArrayTexture?B.compressedTexSubImage3D(qe,Fe,Ee,it,ft,Ve,Oe,Ke,rt,Qe.data):B.texSubImage3D(qe,Fe,Ee,it,ft,Ve,Oe,Ke,rt,kt,Qe):R.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,Fe,Ee,it,Ve,Oe,rt,kt,Qe.data):R.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,Fe,Ee,it,Qe.width,Qe.height,rt,Qe.data):B.texSubImage2D(B.TEXTURE_2D,Fe,Ee,it,Ve,Oe,rt,kt,Qe);b.pixelStorei(B.UNPACK_ROW_LENGTH,Zt),b.pixelStorei(B.UNPACK_IMAGE_HEIGHT,xt),b.pixelStorei(B.UNPACK_SKIP_PIXELS,on),b.pixelStorei(B.UNPACK_SKIP_ROWS,dn),b.pixelStorei(B.UNPACK_SKIP_IMAGES,Rn),Fe===0&&j.generateMipmaps&&B.generateMipmap(qe),b.unbindTexture()},this.initRenderTarget=function(R){I.get(R).__webglFramebuffer===void 0&&z.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?z.setTextureCube(R,0):R.isData3DTexture?z.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?z.setTexture2DArray(R,0):z.setTexture2D(R,0),b.unbindTexture()},this.resetState=function(){V=0,q=0,ee=null,b.reset(),Te.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ri}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=bt._getDrawingBufferColorSpace(e),t.unpackColorSpace=bt._getUnpackColorSpace()}};var ev=new Mi(-1,1,1,-1,0,1),ru=class extends Ct{constructor(){super(),this.setAttribute("position",new pt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new pt([0,2,0,0,2,0],2))}},tv=new ru,Ya=class{constructor(e){this._mesh=new yt(tv,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ev)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var rl=class extends xi{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let e=new nn;e.deleteAttribute("uv");let t=new xn({side:sn}),n=new xn,s=new yi(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let r=new yt(e,t);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let a=new Es(e,n,6),o=new Bt;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);let c=new yt(e,Nr(50));c.position.set(-16.116,14.37,8.208),c.scale.set(.1,2.428,2.739),this.add(c);let l=new yt(e,Nr(50));l.position.set(-16.109,18.021,-8.207),l.scale.set(.1,2.425,2.751),this.add(l);let h=new yt(e,Nr(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);let u=new yt(e,Nr(43));u.position.set(-.462,8.89,14.52),u.scale.set(4.38,5.441,.088),this.add(u);let f=new yt(e,Nr(20));f.position.set(3.235,11.486,-12.541),f.scale.set(2.5,2,.1),this.add(f);let d=new yt(e,Nr(100));d.position.set(0,20,0),d.scale.set(1,.1,1),this.add(d)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function Nr(i){return new Aa({color:0,emissive:16777215,emissiveIntensity:i})}function au(i,e){if(e===Ch)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===Rr||e===Wa){let t=i.getIndex();if(t===null){let r=[],a=i.getAttribute("position");if(a!==void 0){for(let o=0;o<a.count;o++)r.push(o);i.setIndex(r),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}let n=t.count-2,s=[];if(e===Rr)for(let r=1;r<=n;r++)s.push(t.getX(0)),s.push(t.getX(r)),s.push(t.getX(r+1));else for(let r=0;r<n;r++)r%2===0?(s.push(t.getX(r)),s.push(t.getX(r+1)),s.push(t.getX(r+2))):(s.push(t.getX(r+2)),s.push(t.getX(r+1)),s.push(t.getX(r)));return s.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles."),i.setIndex(s),i.clearGroups(),i}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}function lp(i){let e=new Map,t=new Map,n=i.clone();return hp(i,n,function(s,r){e.set(r,s),t.set(s,r)}),n.traverse(function(s){if(!s.isSkinnedMesh)return;let r=s,a=e.get(s),o=a.skeleton.bones;r.skeleton=a.skeleton.clone(),r.bindMatrix.copy(a.bindMatrix),r.skeleton.bones=o.map(function(c){return t.get(c)}),r.bind(r.skeleton,r.bindMatrix)}),n}function hp(i,e,t){t(i,e);for(let n=0;n<i.children.length;n++)hp(i.children[n],e.children[n],t)}var al=class extends vi{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new du(t)}),this.register(function(t){return new pu(t)}),this.register(function(t){return new Su(t)}),this.register(function(t){return new Tu(t)}),this.register(function(t){return new Eu(t)}),this.register(function(t){return new gu(t)}),this.register(function(t){return new bu(t)}),this.register(function(t){return new xu(t)}),this.register(function(t){return new _u(t)}),this.register(function(t){return new fu(t)}),this.register(function(t){return new vu(t)}),this.register(function(t){return new mu(t)}),this.register(function(t){return new Mu(t)}),this.register(function(t){return new yu(t)}),this.register(function(t){return new hu(t)}),this.register(function(t){return new ol(t,_t.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new ol(t,_t.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new wu(t)})}load(e,t,n,s){let r=this,a;if(this.resourcePath!=="")a=this.resourcePath;else if(this.path!==""){let l=qi.extractUrlBase(e);a=qi.resolveURL(l,this.path)}else a=qi.extractUrlBase(e);this.manager.itemStart(e);let o=function(l){s?s(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new vr(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,a,function(h){t(h),r.manager.itemEnd(e)},o)}catch(h){o(h)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,s){let r,a={},o={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===mp){try{a[_t.KHR_BINARY_GLTF]=new Au(e)}catch(u){s&&s(u);return}r=JSON.parse(a[_t.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let l=new Fu(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){let u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[u.name]=u,a[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){let u=r.extensionsUsed[h],f=r.extensionsRequired||[];switch(u){case _t.KHR_MATERIALS_UNLIT:a[u]=new uu;break;case _t.KHR_DRACO_MESH_COMPRESSION:a[u]=new Ru(r,this.dracoLoader);break;case _t.KHR_TEXTURE_TRANSFORM:a[u]=new Cu;break;case _t.KHR_MESH_QUANTIZATION:a[u]=new Pu;break;default:f.indexOf(u)>=0&&o[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(a),l.setPlugins(o),l.parse(n,s)}parseAsync(e,t){let n=this;return new Promise(function(s,r){n.parse(e,t,s,r)})}};function nv(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}function Kt(i,e,t){let n=i.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}var _t={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"},hu=class{constructor(e){this.parser=e,this.name=_t.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,s=t.length;n<s;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n="light:"+e,s=t.cache.get(n);if(s)return s;let r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e],l,h=new Ge(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],En);let u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new Wi(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new yi(h),l.distance=u;break;case"spot":l=new La(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),Ai(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),s=Promise.resolve(l),t.cache.add(n,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],o=(r.extensions&&r.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(c){return n._getNodeRef(t.cache,o,c)})}},uu=class{constructor(){this.name=_t.KHR_MATERIALS_UNLIT}getMaterialType(){return hn}extendParams(e,t,n){let s=[];e.color=new Ge(1,1,1),e.opacity=1;let r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){let a=r.baseColorFactor;e.color.setRGB(a[0],a[1],a[2],En),e.opacity=a[3]}r.baseColorTexture!==void 0&&s.push(n.assignTexture(e,"map",r.baseColorTexture,Vt))}return Promise.all(s)}},fu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}},du=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(s.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){let r=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Re(r,r)}return Promise.all(s)}},pu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}},mu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(s)}},gu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_SHEEN}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];if(t.sheenColor=new Ge(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){let r=n.sheenColorFactor;t.sheenColor.setRGB(r[0],r[1],r[2],En)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,Vt)),n.sheenRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(s)}},bu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&s.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(s)}},xu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_VOLUME}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let r=n.attenuationColor||[1,1,1];return t.attenuationColor=new Ge().setRGB(r[0],r[1],r[2],En),Promise.all(s)}},_u=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_IOR}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5,t.ior===0&&(t.ior=1e3)),Promise.resolve()}},vu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));let r=n.specularColorFactor||[1,1,1];return t.specularColor=new Ge().setRGB(r[0],r[1],r[2],En),n.specularColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,Vt)),Promise.all(s)}},yu=class{constructor(e){this.parser=e,this.name=_t.EXT_MATERIALS_BUMP}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&s.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(s)}},Mu=class{constructor(e){this.parser=e,this.name=_t.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Kt(this.parser,e,this.name)!==null?_n:null}extendMaterialParams(e,t){let n=Kt(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&s.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(s)}},Su=class{constructor(e){this.parser=e,this.name=_t.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,s=n.textures[e];if(!s.extensions||!s.extensions[this.name])return null;let r=s.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,a)}},Tu=class{constructor(e){this.parser=e,this.name=_t.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let a=r.extensions[t],o=s.images[a.source],c=n.textureLoader;if(o.uri){let l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,a.source,c)}},Eu=class{constructor(e){this.parser=e,this.name=_t.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let a=r.extensions[t],o=s.images[a.source],c=n.textureLoader;if(o.uri){let l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,a.source,c)}},ol=class{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let s=n.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),a=this.parser.options.meshoptDecoder;if(!a||!a.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(o){let c=s.byteOffset||0,l=s.byteLength||0,h=s.count,u=s.byteStride,f=new Uint8Array(o,c,l);return a.decodeGltfBufferAsync?a.decodeGltfBufferAsync(h,u,f,s.mode,s.filter).then(function(d){return d.buffer}):a.ready.then(function(){let d=new ArrayBuffer(h*u);return a.decodeGltfBuffer(new Uint8Array(d),h,u,f,s.mode,s.filter),d})})}else return null}},wu=class{constructor(e){this.name=_t.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let s=t.meshes[n.mesh];for(let l of s.primitives)if(l.mode!==Kn.TRIANGLES&&l.mode!==Kn.TRIANGLE_STRIP&&l.mode!==Kn.TRIANGLE_FAN&&l.mode!==void 0)return null;let a=n.extensions[this.name].attributes,o=[],c={};for(let l in a)o.push(this.parser.getDependency("accessor",a[l]).then(h=>(c[l]=h,c[l])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(l=>{let h=l.pop(),u=h.isGroup?h.children:[h],f=l[0].count,d=[];for(let _ of u){let y=new ct,g=new k,p=new Ot,E=new k(1,1,1),m=new Es(_.geometry,_.material,f);for(let v=0;v<f;v++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,v),c.ROTATION&&p.fromBufferAttribute(c.ROTATION,v),c.SCALE&&E.fromBufferAttribute(c.SCALE,v),m.setMatrixAt(v,y.compose(g,p,E));let M=null;for(let v in c)if(v==="_COLOR_0"){let S=c[v];m.instanceColor=new Bi(S.array,S.itemSize,S.normalized)}else if(v!=="TRANSLATION"&&v!=="ROTATION"&&v!=="SCALE"){if(M===null){let T=m.geometry;M=new Ct,M.name=T.name;for(let x in T.attributes)M.setAttribute(x,T.attributes[x]);for(let x in T.morphAttributes)M.morphAttributes[x]=T.morphAttributes[x];T.index!==null&&M.setIndex(T.index),M.morphTargetsRelative=T.morphTargetsRelative;for(let x of T.groups)M.addGroup(x.start,x.count,x.materialIndex);T.boundingBox!==null&&(M.boundingBox=T.boundingBox.clone()),T.boundingSphere!==null&&(M.boundingSphere=T.boundingSphere.clone()),M.drawRange.start=T.drawRange.start,M.drawRange.count=T.drawRange.count,M.userData=Object.assign({},T.userData),m.geometry=M}let S=c[v];M.setAttribute(v,new Bi(S.array,S.itemSize,S.normalized))}Bt.prototype.copy.call(m,_),this.parser.assignFinalMaterial(m),d.push(m)}return h.isGroup?(h.clear(),h.add(...d),h):d[0]}))}},mp="glTF",Ja=12,up={JSON:1313821514,BIN:5130562},Au=class{constructor(e){this.name=_t.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,Ja),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==mp)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");let s=this.header.length-Ja,r=new DataView(e,Ja),a=0;for(;a<s;){let o=r.getUint32(a,!0);a+=4;let c=r.getUint32(a,!0);if(a+=4,c===up.JSON){let l=new Uint8Array(e,Ja+a,o);this.content=n.decode(l)}else if(c===up.BIN){let l=Ja+a;this.body=e.slice(l,l+o)}a+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}},Ru=class{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=_t.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},c={},l={};for(let h in a){let u=Lu[h]||h.toLowerCase();o[u]=a[h]}for(let h in e.attributes){let u=Lu[h]||h.toLowerCase();if(a[h]!==void 0){let f=n.accessors[e.attributes[h]],d=Ur[f.componentType];l[u]=d.name,c[u]=f.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,f){s.decodeDracoFile(h,function(d){for(let _ in d.attributes){let y=d.attributes[_],g=c[_];g!==void 0&&(y.normalized=g)}u(d)},o,l,En,f)})})}},Cu=class{constructor(){this.name=_t.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){let n=Math.cos(e.rotation),s=Math.sin(e.rotation);e.matrix.set(e.repeat.x*n,e.repeat.y*s,e.offset.x,-e.repeat.x*s,e.repeat.y*n,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}},Pu=class{constructor(){this.name=_t.KHR_MESH_QUANTIZATION}},cl=class extends _i{constructor(e,t,n,s){super(e,t,n,s)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let a=0;a!==s;a++)t[a]=n[r+a];return t}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=o*2,l=o*3,h=s-t,u=(n-t)/h,f=u*u,d=f*u,_=e*l,y=_-l,g=-2*d+3*f,p=d-f,E=1-g,m=p-f+u;for(let M=0;M!==o;M++){let v=a[y+M+o],S=a[y+M+c]*h,T=a[_+M+o],x=a[_+M]*h;r[M]=E*v+m*S+g*T+p*x}return r}},iv=new Ot,Iu=class extends cl{interpolate_(e,t,n,s){let r=super.interpolate_(e,t,n,s);return iv.fromArray(r).normalize().toArray(r),r}},Kn={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},Ur={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},fp={9728:Xt,9729:It,9984:pc,9985:Er,9986:Ds,9987:Bn},dp={33071:Xn,33648:sr,10497:ss},ou={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Lu={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},fs={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},sv={CUBICSPLINE:void 0,LINEAR:Ms,STEP:ys},cu={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function rv(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new xn({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Si})),i.DefaultMaterial}function Us(i,e,t){for(let n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Ai(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function av(i,e,t){let n=!1,s=!1,r=!1;for(let l=0,h=e.length;l<h;l++){let u=e[l];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(s=!0),u.COLOR_0!==void 0&&(r=!0),n&&s&&r)break}if(!n&&!s&&!r)return Promise.resolve(i);let a=[],o=[],c=[];for(let l=0,h=e.length;l<h;l++){let u=e[l];if(n){let f=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):i.attributes.position;a.push(f)}if(s){let f=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):i.attributes.normal;o.push(f)}if(r){let f=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):i.attributes.color;c.push(f)}}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c)]).then(function(l){let h=l[0],u=l[1],f=l[2];return n&&(i.morphAttributes.position=h),s&&(i.morphAttributes.normal=u),r&&(i.morphAttributes.color=f),i.morphTargetsRelative=!0,i})}function ov(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){let t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,s=t.length;n<s;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function cv(i){let e,t=i.extensions&&i.extensions[_t.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+lu(t.attributes):e=i.indices+":"+lu(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,s=i.targets.length;n<s;n++)e+=":"+lu(i.targets[n]);return e}function lu(i){let e="",t=Object.keys(i).sort();for(let n=0,s=t.length;n<s;n++)e+=t[n]+":"+i[t[n]]+";";return e}function Du(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function lv(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":i.search(/\.ktx2($|\?)/i)>0||i.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}var hv=new ct,Fu=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new nv,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,s=-1,r=!1,a=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){let o=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(o)===!0;let c=o.match(/Version\/(\d+)/);s=n&&c?parseInt(c[1],10):-1,r=o.indexOf("Firefox")>-1,a=r?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&s<17||r&&a<98?this.textureLoader=new Cs(this.options.manager):this.textureLoader=new Da(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new vr(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(a){return a._markDefs&&a._markDefs()}),Promise.all(this._invokeAll(function(a){return a.beforeRoot&&a.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(a){let o={scene:a[0][s.scene||0],scenes:a[0],animations:a[1],cameras:a[2],asset:s.asset,parser:n,userData:{}};return Us(r,o,s),Ai(o,s),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(o)})).then(function(){for(let c of o.scenes)c.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){let a=t[s].joints;for(let o=0,c=a.length;o<c;o++)e[a[o]].isBone=!0}for(let s=0,r=e.length;s<r;s++){let a=e[s];a.mesh!==void 0&&(this._addNodeRef(this.meshCache,a.mesh),a.skin!==void 0&&(n[a.mesh].isSkinnedMesh=!0)),a.camera!==void 0&&this._addNodeRef(this.cameraCache,a.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let s=n.clone(),r=(a,o)=>{let c=this.associations.get(a);c!=null&&this.associations.set(o,c);for(let[l,h]of a.children.entries())r(h,o.children[l])};return r(n,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let s=e(t[n]);if(s)return s}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let s=0;s<t.length;s++){let r=e(t[s]);r&&n.push(r)}return n}getDependency(e,t){let n=e+":"+t,s=this.cache.get(n);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(n,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,a){return n.getDependency(e,a)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[_t.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(r,a){n.load(qi.resolveURL(t.uri,s.path),r,void 0,function(){a(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){let s=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+s)})}loadAccessor(e){let t=this,n=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){let a=ou[s.type],o=Ur[s.componentType],c=s.normalized===!0,l=new o(s.count*a);return Promise.resolve(new St(l,a,c))}let r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(a){let o=a[0],c=ou[s.type],l=Ur[s.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,f=s.byteOffset||0,d=s.bufferView!==void 0?n.bufferViews[s.bufferView].byteStride:void 0,_=s.normalized===!0,y,g;if(d&&d!==u){let p=Math.floor(f/d),E="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+p+":"+s.count,m=t.cache.get(E);m||(y=new l(o,p*d,s.count*d/h),m=new hr(y,d/h),t.cache.add(E,m)),g=new ur(m,c,f%d/h,_)}else o===null?y=new l(s.count*c):y=new l(o,f,s.count*c),g=new St(y,c,_);if(s.sparse!==void 0){let p=ou.SCALAR,E=Ur[s.sparse.indices.componentType],m=s.sparse.indices.byteOffset||0,M=s.sparse.values.byteOffset||0,v=new E(a[1],m,s.sparse.count*p),S=new l(a[2],M,s.sparse.count*c);o!==null&&(g=new St(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let T=0,x=v.length;T<x;T++){let C=v[T];if(g.setX(C,S[T*c]),c>=2&&g.setY(C,S[T*c+1]),c>=3&&g.setZ(C,S[T*c+2]),c>=4&&g.setW(C,S[T*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=_}return g})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,a=t.images[r],o=this.textureLoader;if(a.uri){let c=n.manager.getHandler(a.uri);c!==null&&(o=c)}return this.loadTextureImage(e,r,o)}loadTextureImage(e,t,n){let s=this,r=this.json,a=r.textures[e],o=r.images[t],c=(o.uri||o.bufferView)+":"+a.sampler;if(this.textureCache[c])return this.textureCache[c];let l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=a.name||o.name||"",h.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(h.name=o.uri);let f=(r.samplers||{})[a.sampler]||{};return h.magFilter=fp[f.magFilter]||It,h.minFilter=fp[f.minFilter]||Bn,h.wrapS=dp[f.wrapS]||ss,h.wrapT=dp[f.wrapT]||ss,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Xt&&h.minFilter!==It,s.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){let n=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());let a=s.images[e],o=self.URL||self.webkitURL,c=a.uri||"",l=!1;if(a.bufferView!==void 0)c=n.getDependency("bufferView",a.bufferView).then(function(u){l=!0;let f=new Blob([u],{type:a.mimeType});return c=o.createObjectURL(f),c});else if(a.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let h=Promise.resolve(c).then(function(u){return new Promise(function(f,d){let _=f;t.isImageBitmapLoader===!0&&(_=function(y){let g=new jt(y);g.needsUpdate=!0,f(g)}),t.load(qi.resolveURL(u,r.path),_,void 0,d)})}).then(function(u){return l===!0&&o.revokeObjectURL(c),Ai(u,a),u.userData.mimeType=a.mimeType||lv(a.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,s){let r=this;return this.getDependency("texture",n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),r.extensions[_t.KHR_TEXTURE_TRANSFORM]){let o=n.extensions!==void 0?n.extensions[_t.KHR_TEXTURE_TRANSFORM]:void 0;if(o){let c=r.associations.get(a);a=r.extensions[_t.KHR_TEXTURE_TRANSFORM].extendTexture(a,o),r.associations.set(a,c)}}return s!==void 0&&(a.colorSpace=s),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let o="PointsMaterial:"+n.uuid,c=this.cache.get(o);c||(c=new gr,An.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(o,c)),n=c}else if(e.isLine){let o="LineBasicMaterial:"+n.uuid,c=this.cache.get(o);c||(c=new mr,An.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(o,c)),n=c}if(s||r||a){let o="ClonedMaterial:"+n.uuid+":";s&&(o+="derivative-tangents:"),r&&(o+="vertex-colors:"),a&&(o+="flat-shading:");let c=this.cache.get(o);c||(c=n.clone(),r&&(c.vertexColors=!0),a&&(c.flatShading=!0),s&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(o,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return xn}loadMaterial(e){let t=this,n=this.json,s=this.extensions,r=n.materials[e],a,o={},c=r.extensions||{},l=[];if(c[_t.KHR_MATERIALS_UNLIT]){let u=s[_t.KHR_MATERIALS_UNLIT];a=u.getMaterialType(),l.push(u.extendParams(o,r,t))}else{let u=r.pbrMetallicRoughness||{};if(o.color=new Ge(1,1,1),o.opacity=1,Array.isArray(u.baseColorFactor)){let f=u.baseColorFactor;o.color.setRGB(f[0],f[1],f[2],En),o.opacity=f[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(o,"map",u.baseColorTexture,Vt)),o.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,o.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(o,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(o,"roughnessMap",u.metallicRoughnessTexture))),a=this._invokeOne(function(f){return f.getMaterialType&&f.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(f){return f.extendMaterialParams&&f.extendMaterialParams(e,o)})))}r.doubleSided===!0&&(o.side=pn);let h=r.alphaMode||cu.OPAQUE;if(h===cu.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,h===cu.MASK&&(o.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&a!==hn&&(l.push(t.assignTexture(o,"normalMap",r.normalTexture)),o.normalScale=new Re(1,1),r.normalTexture.scale!==void 0)){let u=r.normalTexture.scale;o.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&a!==hn&&(l.push(t.assignTexture(o,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&a!==hn){let u=r.emissiveFactor;o.emissive=new Ge().setRGB(u[0],u[1],u[2],En)}return r.emissiveTexture!==void 0&&a!==hn&&l.push(t.assignTexture(o,"emissiveMap",r.emissiveTexture,Vt)),Promise.all(l).then(function(){let u=new a(o);return r.name&&(u.name=r.name),Ai(u,r),t.associations.set(u,{materials:e}),r.extensions&&Us(s,u,r),u})}createUniqueName(e){let t=Ft.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,s=this.primitiveCache;function r(o){return n[_t.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(c){return pp(c,o,t)})}let a=[];for(let o=0,c=e.length;o<c;o++){let l=e[o],h=cv(l),u=s[h];if(u)a.push(u.promise);else{let f;l.extensions&&l.extensions[_t.KHR_DRACO_MESH_COMPRESSION]?f=r(l):f=pp(new Ct,l,t),l.mode===Kn.TRIANGLE_STRIP?f=f.then(d=>au(d,Wa)):l.mode===Kn.TRIANGLE_FAN&&(f=f.then(d=>au(d,Rr))),s[h]={primitive:l,promise:f},a.push(f)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,s=this.extensions,r=n.meshes[e],a=r.primitives,o=[];for(let c=0,l=a.length;c<l;c++){let h=a[c].material===void 0?rv(this.cache):this.getDependency("material",a[c].material);o.push(h)}return o.push(t.loadGeometries(a)),Promise.all(o).then(async function(c){let l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let d=0,_=h.length;d<_;d++){let y=h[d],g=a[d],p,E=l[d];if(g.mode===Kn.TRIANGLES||g.mode===Kn.TRIANGLE_STRIP||g.mode===Kn.TRIANGLE_FAN||g.mode===void 0){let m=r.isSkinnedMesh===!0,M=y.hasAttribute("skinIndex")&&y.hasAttribute("skinWeight");m&&M===!1&&console.warn("THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled."),p=m&&M?new aa(y,E):new yt(y,E),p.isSkinnedMesh===!0&&p.normalizeSkinWeights()}else if(g.mode===Kn.LINES)p=new ca(y,E);else if(g.mode===Kn.LINE_STRIP)p=new ws(y,E);else if(g.mode===Kn.LINE_LOOP)p=new la(y,E);else if(g.mode===Kn.POINTS)p=new ha(y,E);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(p.geometry.morphAttributes).length>0&&ov(p,r),p.name=t.createUniqueName(r.name||"mesh_"+e),Ai(p,r),g.extensions&&Us(s,p,g),t.assignFinalMaterial(p),u.push(p)}for(let d=0,_=u.length;d<_;d++)t.associations.set(u[d],{meshes:e,primitives:d});if(u.length===1)return r.extensions&&Us(s,u[0],r),u[0];let f=new tn;r.extensions&&Us(s,f,r),t.associations.set(f,{meshes:e});for(let d=0,_=u.length;d<_;d++)f.add(u[d]);return f})}loadCamera(e){let t,n=this.json.cameras[e],s=n[n.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new Wt(Dh.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):n.type==="orthographic"&&(t=new Mi(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Ai(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let s=0,r=t.joints.length;s<r;s++)n.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(s){let r=s.pop(),a=s,o=[],c=[];for(let l=0,h=a.length;l<h;l++){let u=a[l];if(u){o.push(u);let f=new ct;r!==null&&f.fromArray(r.array,l*16),c.push(f)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new oa(o,c)})}loadAnimation(e){let t=this.json,n=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,a=[],o=[],c=[],l=[],h=[];for(let u=0,f=s.channels.length;u<f;u++){let d=s.channels[u],_=s.samplers[d.sampler],y=d.target,g=y.node,p=s.parameters!==void 0?s.parameters[_.input]:_.input,E=s.parameters!==void 0?s.parameters[_.output]:_.output;y.node!==void 0&&(a.push(this.getDependency("node",g)),o.push(this.getDependency("accessor",p)),c.push(this.getDependency("accessor",E)),l.push(_),h.push(y))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){let f=u[0],d=u[1],_=u[2],y=u[3],g=u[4],p=[];for(let m=0,M=f.length;m<M;m++){let v=f[m],S=d[m],T=_[m],x=y[m],C=g[m];if(v===void 0)continue;v.updateMatrix&&v.updateMatrix();let P=n._createAnimationTracks(v,S,T,x,C);if(P)for(let U=0;U<P.length;U++)p.push(P[U])}let E=new Ca(r,void 0,p);return Ai(E,s),E})}createNodeMesh(e){let t=this.json,n=this,s=t.nodes[e];return s.mesh===void 0?null:n.getDependency("mesh",s.mesh).then(function(r){let a=n._getNodeRef(n.meshCache,s.mesh,r);return s.weights!==void 0&&a.traverse(function(o){if(o.isMesh)for(let c=0,l=s.weights.length;c<l;c++)o.morphTargetInfluences[c]=s.weights[c]}),a})}loadNode(e){let t=this.json,n=this,s=t.nodes[e],r=n._loadNodeShallow(e),a=[],o=s.children||[];for(let l=0,h=o.length;l<h;l++)a.push(n.getDependency("node",o[l]));let c=s.skin===void 0?Promise.resolve(null):n.getDependency("skin",s.skin);return Promise.all([r,Promise.all(a),c]).then(function(l){let h=l[0],u=l[1],f=l[2];f!==null&&h.traverse(function(d){d.isSkinnedMesh&&d.bind(f,hv)});for(let d=0,_=u.length;d<_;d++)h.add(u[d]);if(h.userData.pivot!==void 0&&u.length>0){let d=h.userData.pivot,_=u[0];h.pivot=new k().fromArray(d),h.position.x-=d[0],h.position.y-=d[1],h.position.z-=d[2],_.position.set(0,0,0),delete h.userData.pivot}return h})}_loadNodeShallow(e){let t=this.json,n=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let r=t.nodes[e],a=r.name?s.createUniqueName(r.name):"",o=[],c=s._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&o.push(c),r.camera!==void 0&&o.push(s.getDependency("camera",r.camera).then(function(l){return s._getNodeRef(s.cameraCache,r.camera,l)})),s._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){o.push(l)}),this.nodeCache[e]=Promise.all(o).then(function(l){let h;if(r.isBone===!0?h=new fr:l.length>1?h=new tn:l.length===1?h=l[0]:h=new Bt,h!==l[0])for(let u=0,f=l.length;u<f;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=a),Ai(h,r),r.extensions&&Us(n,h,r),r.matrix!==void 0){let u=new ct;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!s.associations.has(h))s.associations.set(h,{});else if(r.mesh!==void 0&&s.meshCache.refs[r.mesh]>1){let u=s.associations.get(h);s.associations.set(h,{...u})}return s.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],s=this,r=new tn;n.name&&(r.name=s.createUniqueName(n.name)),Ai(r,n),n.extensions&&Us(t,r,n);let a=n.nodes||[],o=[];for(let c=0,l=a.length;c<l;c++)o.push(s.getDependency("node",a[c]));return Promise.all(o).then(function(c){for(let h=0,u=c.length;h<u;h++){let f=c[h];f.parent!==null?r.add(lp(f)):r.add(f)}let l=h=>{let u=new Map;for(let[f,d]of s.associations)(f instanceof An||f instanceof jt)&&u.set(f,d);return h.traverse(f=>{let d=s.associations.get(f);d!=null&&u.set(f,d)}),u};return s.associations=l(r),r})}_createAnimationTracks(e,t,n,s,r){let a=[],o=e.name?e.name:e.uuid,c=[];function l(d){d.morphTargetInfluences&&c.push(d.name?d.name:d.uuid)}fs[r.path]===fs.weights?(l(e),e.isGroup&&e.children.forEach(l)):c.push(o);let h;switch(fs[r.path]){case fs.weights:h=Hi;break;case fs.rotation:h=Gi;break;case fs.translation:case fs.scale:h=os;break;default:n.itemSize===1?h=Hi:h=os;break}let u=s.interpolation!==void 0?sv[s.interpolation]:Ms,f=this._getArrayFromAccessor(n);for(let d=0,_=c.length;d<_;d++){let y=new h(c[d]+"."+fs[r.path],t.array,f,u);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(y),a.push(y)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let n=Du(t.constructor),s=new Float32Array(t.length);for(let r=0,a=t.length;r<a;r++)s[r]=t[r]*n;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){let s=this instanceof Gi?Iu:cl;return new s(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function uv(i,e,t){let n=e.attributes,s=new wn;if(n.POSITION!==void 0){let o=t.json.accessors[n.POSITION],c=o.min,l=o.max;if(c!==void 0&&l!==void 0){if(s.set(new k(c[0],c[1],c[2]),new k(l[0],l[1],l[2])),o.normalized){let h=Du(Ur[o.componentType]);s.min.multiplyScalar(h),s.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let r=e.targets;if(r!==void 0){let o=new k,c=new k;for(let l=0,h=r.length;l<h;l++){let u=r[l];if(u.POSITION!==void 0){let f=t.json.accessors[u.POSITION],d=f.min,_=f.max;if(d!==void 0&&_!==void 0){if(c.setX(Math.max(Math.abs(d[0]),Math.abs(_[0]))),c.setY(Math.max(Math.abs(d[1]),Math.abs(_[1]))),c.setZ(Math.max(Math.abs(d[2]),Math.abs(_[2]))),f.normalized){let y=Du(Ur[f.componentType]);c.multiplyScalar(y)}o.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(o)}i.boundingBox=s;let a=new Cn;s.getCenter(a.center),a.radius=s.min.distanceTo(s.max)/2,i.boundingSphere=a}function pp(i,e,t){let n=e.attributes,s=[];function r(a,o){return t.getDependency("accessor",a).then(function(c){i.setAttribute(o,c)})}for(let a in n){let o=Lu[a]||a.toLowerCase();o in i.attributes||s.push(r(n[a],o))}if(e.indices!==void 0&&!i.index){let a=t.getDependency("accessor",e.indices).then(function(o){i.setIndex(o)});s.push(a)}return bt.workingColorSpace!==En&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${bt.workingColorSpace}" not supported.`),Ai(i,e),uv(i,e,t),Promise.all(s).then(function(){return e.targets!==void 0?av(i,e.targets,t):i})}var gp=(function(){var i="b9H79Tebbbe8Fv9Gbb9Gvuuuuueu9Giuuub9Geueu9Giuuueuixkbeeeddddillviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbeY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVbdE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbiL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtblK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WboY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbrl79IV9Rbwq:VZkdbk:XYi5ud9:du8Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaicefhxcj;abad9Uc;WFbGcjdadca0EhmaialfgPar9Rgoadfhsavaoadz:jjjjbgzceVhHcbhOdndninaeaO9nmeaPax9RaD6mdamaeaO9RaOamfgoae6EgAcsfglc9WGhCabaOad2fhXaAcethQaxaDfhiaOaeaoaeao6E9RhLalcl4cifcd4hKazcj;cbfaAfhYcbh8AazcjdfhEaHh3incbh5dnawTmbaxa8Acd4fRbbh5kcbh8Eazcj;cbfhqinaih8Fdndndndna5a8Ecet4ciGgoc9:fPdebdkaPa8F9RaA6mrazcj;cbfa8EaA2fa8FaAz:jjjjb8Aa8FaAfhixdkazcj;cbfa8EaA2fcbaAz:kjjjb8Aa8FhixekaPa8F9RaK6mva8FaKfhidnaCTmbaPai9RcK6mbaocdtc:q:G:cjbfcj:G:cjbawEhaczhrcbhlinargoc9Wfghaqfhrdndndndndndnaaa8Fahco4fRbbalcoG4ciGcdtfydbPDbedvivvvlvkar9cb83bwar9cb83bbxlkarcbaiRbdai8Xbb9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbaqaofgrcGfcbaicdfa8J9c8N1:NfghRbbag9cjjjjjw:dg8J9qE86bbarcVfcbaha8J9c8M1:NfghRbbag9cjjjjjl:dg8J9qE86bbarc7fcbaha8J9c8L1:NfghRbbag9cjjjjjd:dg8J9qE86bbarctfcbaha8J9c8K1:NfghRbbag9cjjjjje:dg8J9qE86bbarc91fcbaha8J9c8J1:NfghRbbag9cjjjj;ab:dg8J9qE86bbarc4fcbaha8J9cg1:NfghRbbag9cjjjja:dg8J9qE86bbarc93fcbaha8J9ch1:NfghRbbag9cjjjjz:dgg9qE86bbarc94fcbahag9ca1:NfghRbbai8Xbe9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbarc95fcbaha8J9c8N1:NfgiRbbag9cjjjjjw:dg8J9qE86bbarc96fcbaia8J9c8M1:NfgiRbbag9cjjjjjl:dg8J9qE86bbarc97fcbaia8J9c8L1:NfgiRbbag9cjjjjjd:dg8J9qE86bbarc98fcbaia8J9c8K1:NfgiRbbag9cjjjjje:dg8J9qE86bbarc99fcbaia8J9c8J1:NfgiRbbag9cjjjj;ab:dg8J9qE86bbarc9:fcbaia8J9cg1:NfgiRbbag9cjjjja:dg8J9qE86bbarcufcbaia8J9ch1:NfgiRbbag9cjjjjz:dgg9qE86bbaiag9ca1:NfhixikaraiRblaiRbbghco4g8Ka8KciSg8KE86bbaqaofgrcGfaiclfa8Kfg8KRbbahcl4ciGg8La8LciSg8LE86bbarcVfa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc7fa8Ka8Lfg8KRbbahciGghahciSghE86bbarctfa8Kahfg8KRbbaiRbeghco4g8La8LciSg8LE86bbarc91fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc4fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc93fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc94fa8Kahfg8KRbbaiRbdghco4g8La8LciSg8LE86bbarc95fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc96fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc97fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc98fa8KahfghRbbaiRbigico4g8Ka8KciSg8KE86bbarc99faha8KfghRbbaicl4ciGg8Ka8KciSg8KE86bbarc9:faha8KfghRbbaicd4ciGg8Ka8KciSg8KE86bbarcufaha8KfgrRbbaiciGgiaiciSgiE86bbaraifhixdkaraiRbwaiRbbghcl4g8Ka8KcsSg8KE86bbaqaofgrcGfaicwfa8Kfg8KRbbahcsGghahcsSghE86bbarcVfa8KahfghRbbaiRbeg8Kcl4g8La8LcsSg8LE86bbarc7faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarctfaha8KfghRbbaiRbdg8Kcl4g8La8LcsSg8LE86bbarc91faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc4faha8KfghRbbaiRbig8Kcl4g8La8LcsSg8LE86bbarc93faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc94faha8KfghRbbaiRblg8Kcl4g8La8LcsSg8LE86bbarc95faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc96faha8KfghRbbaiRbvg8Kcl4g8La8LcsSg8LE86bbarc97faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc98faha8KfghRbbaiRbog8Kcl4g8La8LcsSg8LE86bbarc99faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc9:faha8KfghRbbaiRbrgicl4g8Ka8KcsSg8KE86bbarcufaha8KfgrRbbaicsGgiaicsSgiE86bbaraifhixekarai8Pbw83bwarai8Pbb83bbaiczfhikdnaoaC9pmbalcdfhlaoczfhraPai9RcL0mekkaoaC6moaimexokaCmva8FTmvkaqaAfhqa8Ecefg8Ecl9hmbkdndndndnawTmbasa8Acd4fRbbgociGPlbedrbkaATmdaza8Afh8Fazcj;cbfhhcbh8EaEhaina8FRbbhraahocbhlinaoahalfRbbgqce4cbaqceG9R7arfgr86bbaoadfhoaAalcefgl9hmbkaacefhaa8Fcefh8FahaAfhha8Ecefg8Ecl9hmbxikkaATmeaza8Afhaazcj;cbfhhcbhoceh8EaYh8FinaEaofhlaa8Vbbhrcbhoinala8FaofRbbcwtahaofRbbgqVc;:FiGce4cbaqceG9R7arfgr87bbaladfhlaLaocefgofmbka8FaQfh8FcdhoaacdfhaahaQfhha8EceGhlcbh8EalmbxdkkaATmbaocl4h8Eaza8AfRbbhqcwhoa3hlinalRbbaotaqVhqalcefhlaocwfgoca9hmbkcbhhaEh8FaYhainazcj;cbfahfRbbhrcwhoaahlinalRbbaotarVhralaAfhlaocwfgoca9hmbkara8E94aq7hqcbhoa8Fhlinalaqao486bbalcefhlaocwfgoca9hmbka8Fadfh8FaacefhaahcefghaA9hmbkkaEclfhEa3clfh3a8Aclfg8Aad6mbkaXazcjdfaAad2z:jjjjb8AazazcjdfaAcufad2fadz:jjjjb8AaAaOfhOaihxaimbkc9:hoxdkcbc99aPax9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaok:ysezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecjez:kjjjb8Aav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk:Lvoeue99dud99eud99dndnadcl9hmbaeTmeindndnabcdfgd8Sbb:Yab8Sbbgi:Ygl:l:tabcefgv8Sbbgo:Ygr:l:tgwJbb;:9cawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai86bbdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad86bbdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad86bbabclfhbaecufgembxdkkaeTmbindndnabclfgd8Ueb:Yab8Uebgi:Ygl:l:tabcdfgv8Uebgo:Ygr:l:tgwJb;:FSawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai87ebdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad87ebdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad87ebabcwfhbaecufgembkkk:4ioiue99dud99dud99dnaeTmbcbhiabhlindndnal8Uebgv:YgoJ:ji:1Salcof8UebgrciVgw:Y:vgDNJbbbZJbbb:;avcu9kEMgq:lJbbb9p9DTmbaq:Ohkxekcjjjj94hkkalclf8Uebhvalcdf8UebhxalarcefciGcetfak87ebdndnax:YgqaDNJbbbZJbbb:;axcu9kEMgm:lJbbb9p9DTmbam:Ohxxekcjjjj94hxkabaiarciGgkfcd7cetfax87ebdndnav:YgmaDNJbbbZJbbb:;avcu9kEMgP:lJbbb9p9DTmbaP:Ohvxekcjjjj94hvkalarcufciGcetfav87ebdndnawaw2:ZgPaPMaoaoN:taqaqN:tamamN:tgoJbbbbaoJbbbb9GE:raDNJbbbZMgD:lJbbb9p9DTmbaD:Ohrxekcjjjj94hrkalakcetfar87ebalcwfhlaiclfhiaecufgembkkk9mbdnadcd4ae2gdTmbinababydbgecwtcw91:Yaece91cjjj98Gcjjj;8if::NUdbabclfhbadcufgdmbkkk:Tvirud99eudndnadcl9hmbaeTmeindndnabRbbgiabcefgl8Sbbgvabcdfgo8Sbbgrf9R:YJbbuJabcifgwRbbgdce4adVgDcd4aDVgDcl4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax86bbdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao86bbdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai86bbdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad86bbabclfhbaecufgembxdkkaeTmbindndnab8Vebgiabcdfgl8Uebgvabclfgo8Uebgrf9R:YJbFu9habcofgw8Vebgdce4adVgDcd4aDVgDcl4aDVgDcw4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax87ebdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao87ebdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai87ebdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad87ebabcwfhbaecufgembkkk9teiucbcbyd:K:G:cjbgeabcifc98GfgbBd:K:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;LeeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiclfaeclfydbBdbaicwfaecwfydbBdbaicxfaecxfydbBdbaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk;aeedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdbaicxfalBdbaicwfalBdbaiclfalBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabkk83dbcj:Gdk8Kbbbbdbbblbbbwbbbbbbbebbbdbbblbbbwbbbbc:K:Gdkl8W:qbb",e="b9H79TebbbeKl9Gbb9Gvuuuuueu9Giuuub9Geueuixkbbebeeddddilve9Weeeviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbdY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVblE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtboK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbrL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WbwY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbDl79IV9Rbqq:W9Dklbzik94evu8Jjjjjbcz9Rhbcbheincbhdcbhiinabcwfadfaicjuaead4ceGglE86bbaialfhiadcefgdcw9hmbkaeai86b:q:W:cjbaecitab8Piw83i:q:G:cjbaecefgecjd9hmbkk:JBl8Aud97dur978Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaialfgxar9RhodnadTgmmbavaoad;8qbbkaicefhPcj;abad9Uc;WFbGcjdadca0EhsdndndnadTmbaoadfhzcbhHinaeaH9nmdaxaP9RaD6miabaHad2fhOaPaDfhAasaeaH9RaHasfae6EgCcsfgocl4cifcd4hXavcj;cbfaoc9WGgQcetfhLavcj;cbfaQci2fhKavcj;cbfaQfhYcbh8Aaoc;ab6hEincbh3dnawTmbaPa8Acd4fRbbh3kcbh5avcj;cbfh8Eindndndndna3a5cet4ciGgoc9:fPdebdkaxaA9RaQ6mwdnaQTmbavcj;cbfa5aQ2faAaQ;8qbbkaAaCfhAxdkaQTmeavcj;cbfa5aQ2fcbaQ;8kbxekaxaA9RaX6moaoclVcbawEhraAaXfhocbhidnaEmbaxao9Rc;Gb6mbcbhlina8EalfhidndndndndndnaAalco4fRbbgqciGarfPDbedibledibkaipxbbbbbbbbbbbbbbbbpklbxlkaiaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiaopbbbpklbaoczfhoxekaiaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcd4ciGarfPDbedibledibkaiczfpxbbbbbbbbbbbbbbbbpklbxlkaiczfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiczfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiczfaopbbbpklbaoczfhoxekaiczfaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcl4ciGarfPDbedibledibkaicafpxbbbbbbbbbbbbbbbbpklbxlkaicafaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaicafaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaicafaopbbbpklbaoczfhoxekaicafaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqco4arfPDbedibledibkaic8Wfpxbbbbbbbbbbbbbbbbpklbxlkaic8Wfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaoclffaqRb:q:W:cjbfhoxikaic8Wfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaocwffaqRb:q:W:cjbfhoxdkaic8Wfaopbbbpklbaoczfhoxekaic8WfaopbbdaoRbbgicitpbi:q:G:cjbaiRb:q:W:cjbgipsaoRbegqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbaiaocdffaqRb:q:W:cjbfhokalc;abfhialcjefaQ0meaihlaxao9Rc;Fb0mbkkdnaiaQ9pmbaici4hlinaxao9RcK6mwa8EaifhqdndndndndndnaAaico4fRbbalcoG4ciGarfPDbedibledibkaqpxbbbbbbbbbbbbbbbbpkbbxlkaqaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaoclffagRb:q:W:cjbfhoxikaqaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaocwffagRb:q:W:cjbfhoxdkaqaopbbbpkbbaoczfhoxekaqaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpkbbahaocdffagRb:q:W:cjbfhokalcdfhlaiczfgiaQ6mbkkaohAaoTmoka8EaQfh8Ea5cefg5cl9hmbkdndndndnawTmbaza8Acd4fRbbglciGPlbedwbkaQTmdavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep9Ta8Fpxeeeeeeeeeeeeeeeegap9op9Hp9rg8Fa8Jp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ugap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp9Ugap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp9Ugap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9AbbbaladfhlaoczfgoaQ6mbxikkaQTmeavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep:nea8Fpxebebebebebebebebgap9op:bep9rg8Fa8Jp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oegap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp:oegap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp:oegap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9AbbbaladfhlaoczfgoaQ6mbxdkkaQTmbcbhocbalcl4gl9Rc8FGhiavcjdfa8Afhrava8Afpbdbhainaravcj;cbfaofpblbg8JaYaofpblbg8KpmbzeHdOiAlCvXoQrLg8LaLaofpblbg8MaKaofpblbg8NpmbzeHdOiAlCvXoQrLgypmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Faap9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8LaypmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwKDYq8AkEx3m5P8Es8Fg8Ja8Ma8NpmwKDYq8AkEx3m5P8Es8Fg8KpmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9AbbbaradfhraoczfgoaQ6mbkka8Aclfg8Aad6mbkdnaCad2goTmbaOavcjdfao;8qbbkdnammbavavcjdfaCcufad2fad;8qbbkaCaHfhHc9:hoaAhPaAmbxlkkaeTmbaDalfhrcbhocuhlinaralaD9RglfaD6mdasaeao9Raoasfae6Eaofgoae6mbkaial9RhPkcbc99axaP9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaokwbz:bjjjbkNsezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecje;8kbav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk;Toio97eue97aec98Ghedndnadcl9hmbaeTmecbhdinababpbbbgicKp:RecKp:Sep;6eglaicwp:RecKp:Sep;6ealp;Geaiczp:RecKp:Sep;6egvp;Gep;Kep;Legopxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgwp9op9rp;Keglpxbb;:9cbb;:9cbb;:9cbb;:9calalp;Meaoaop;Meavaravawp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFbbbFbbbFbbbFbbbp9oaipxbbbFbbbFbbbFbbbFp9op9qalavp;Mearp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaoavp;Mearp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgDaDpbbbgipxbbbbbbFFbbbbbbFFgwp9oabpbbbgoaipmbediwDqkzHOAKY8AEgvczp:Reczp:Sep;6eglaoaipmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;6eavczp:Sep;6egvp;Gealp;Gep;Kep;Legipxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgqp9op9rp;Keglpxb;:FSb;:FSb;:FSb;:FSalalp;Meaiaip;Meavaravaqp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbp9oaiavp;Mearp;Keczp:Rep9qgialavp;Mearp;KepxFFbbFFbbFFbbFFbbp9oglpmwDKYqk8AExm35Ps8E8Fp9qpkbbabaoawp9oaialpmbezHdiOAlvCXorQLp9qpkbbabcafhbadclfgdae6mbkkk;2ileue97euo97dnaec98GgiTmbcbheinabcKfpx:ji:1S:ji:1S:ji:1S:ji:1SabpbbbglabczfgvpbbbgopmlvorxmPsCXQL358E8Fgrczp:Segwpxibbbibbbibbbibbbp9qp;6egDp;NegqaDaDp;MegDaDp;KealaopmbediwDqkzHOAKY8AEgDczp:Reczp:Sep;6eglalp;MeaDczp:Sep;6egoaop;Mearczp:Reczp:Sep;6egrarp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jep;Mepxbbn0bbn0bbn0bbn0gDp;KepxFFbbFFbbFFbbFFbbgkp9oaqaop;MeaDp;Keczp:Rep9qgoaqalp;MeaDp;Keakp9oaqarp;MeaDp;Keczp:Rep9qgDpmwDKYqk8AExm35Ps8E8Fglp5eawclp:RegqpEi:T:j83ibavalp5baqpEd:T:j83ibabcwfaoaDpmbezHdiOAlvCXorQLgDp5eaqpEe:T:j83ibabaDp5baqpEb:T:j83ibabcafhbaeclfgeai6mbkkkuee97dnadcd4ae2c98GgeTmbcbhdinababpbbbgicwp:Recwp:Sep;6eaicep:SepxbbjFbbjFbbjFbbjFp9opxbbjZbbjZbbjZbbjZp:Uep;Mepkbbabczfhbadclfgdae6mbkkk:Sodw97euaec98Ghedndnadcl9hmbaeTmecbhdinabpxbbuJbbuJbbuJbbuJabpbbbgicKp:TeglaicYp:Tep9qgvcdp:Teavp9qgvclp:Teavp9qgop;6ep;Negvaicwp:RecKp:SegraipxFbbbFbbbFbbbFbbbgwp9ogDp:Uep;6ep;Mepxbbn0bbn0bbn0bbn0gqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9oavaDarp:Xeaiczp:RecKp:Segip:Uep;6ep;Meaqp;Keawp9op9qavaDaraip:Uep:Xep;6ep;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qavaoalcep:Rep9oalpxebbbebbbebbbebbbp9op9qp;6ep;Meaqp;KecKp:Rep9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgkpxbFu9hbFu9hbFu9hbFu9habpbbbglakpbbbgrpmlvorxmPsCXQL358E8Fgvczp:TegqavcHp:Tep9qgicdp:Teaip9qgiclp:Teaip9qgicwp:Teaip9qgop;6ep;NegialarpmbediwDqkzHOAKY8AEgDpxFFbbFFbbFFbbFFbbglp9ograDczp:Segwp:Ueavczp:Reczp:SegDp:Xep;6ep;Mepxbbn0bbn0bbn0bbn0gvp;Kealp9oaiarawaDp:Uep:Xep;6ep;Meavp;Keczp:Rep9qgwaiaoaqcep:Rep9oaqpxebbbebbbebbbebbbp9op9qp;6ep;Meavp;Keczp:ReaiaDarp:Uep;6ep;Meavp;Kealp9op9qgipmwDKYqk8AExm35Ps8E8FpkbbabawaipmbezHdiOAlvCXorQLpkbbabcafhbadclfgdae6mbkkk9teiucbcbydj:G:cjbgeabcifc98GfgbBdj:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikkxebcj:Gdklz:zbb",t=new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,3,2,0,0,5,3,1,0,1,12,1,0,10,22,2,12,0,65,0,65,0,65,0,252,10,0,0,11,7,0,65,0,253,15,26,11]),n=new Uint8Array([32,0,65,2,1,106,34,33,3,128,11,4,13,64,6,253,10,7,15,116,127,5,8,12,40,16,19,54,20,9,27,255,113,17,42,67,24,23,146,148,18,14,22,45,70,69,56,114,101,21,25,63,75,136,108,28,118,29,73,115]);if(typeof WebAssembly!="object")return{supported:!1};var s=WebAssembly.validate(t)?o(e):o(i),r,a=WebAssembly.instantiate(s,{}).then(function(p){r=p.instance,r.exports.__wasm_call_ctors()});function o(p){for(var E=new Uint8Array(p.length),m=0;m<p.length;++m){var M=p.charCodeAt(m);E[m]=M>96?M-97:M>64?M-39:M+4}for(var v=0,m=0;m<p.length;++m)E[v++]=E[m]<60?n[E[m]]:(E[m]-60)*64+E[++m];return E.buffer.slice(0,v)}function c(p,E,m,M,v,S,T){var x=p.exports.sbrk,C=M+3&-4,P=x(C*v),U=x(S.length),L=new Uint8Array(p.exports.memory.buffer);L.set(S,U);var F=E(P,M,v,U,S.length);if(F==0&&T&&T(P,C,v),m.set(L.subarray(P,P+M*v)),x(P-x(0)),F!=0)throw new Error("Malformed buffer data: "+F)}var l={NONE:"",OCTAHEDRAL:"meshopt_decodeFilterOct",QUATERNION:"meshopt_decodeFilterQuat",EXPONENTIAL:"meshopt_decodeFilterExp",COLOR:"meshopt_decodeFilterColor"},h={ATTRIBUTES:"meshopt_decodeVertexBuffer",TRIANGLES:"meshopt_decodeIndexBuffer",INDICES:"meshopt_decodeIndexSequence"},u=[],f=0;function d(p){var E={object:new Worker(p),pending:0,requests:{}};return E.object.onmessage=function(m){var M=m.data;E.pending-=M.count,E.requests[M.id][M.action](M.value),delete E.requests[M.id]},E}function _(p){for(var E="self.ready = WebAssembly.instantiate(new Uint8Array(["+new Uint8Array(s)+"]), {}).then(function(result) { result.instance.exports.__wasm_call_ctors(); return result.instance; });self.onmessage = "+g.name+";"+c.toString()+g.toString(),m=new Blob([E],{type:"text/javascript"}),M=URL.createObjectURL(m),v=u.length;v<p;++v)u[v]=d(M);for(var v=p;v<u.length;++v)u[v].object.postMessage({});u.length=p,URL.revokeObjectURL(M)}function y(p,E,m,M,v){for(var S=u[0],T=1;T<u.length;++T)u[T].pending<S.pending&&(S=u[T]);return new Promise(function(x,C){var P=new Uint8Array(m),U=++f;S.pending+=p,S.requests[U]={resolve:x,reject:C},S.object.postMessage({id:U,count:p,size:E,source:P,mode:M,filter:v},[P.buffer])})}function g(p){var E=p.data;self.ready.then(function(m){if(!E.id)return self.close();try{var M=new Uint8Array(E.count*E.size);c(m,m.exports[E.mode],M,E.count,E.size,E.source,m.exports[E.filter]),self.postMessage({id:E.id,count:E.count,action:"resolve",value:M},[M.buffer])}catch(v){self.postMessage({id:E.id,count:E.count,action:"reject",value:v})}})}return{ready:a,supported:!0,useWorkers:function(p){_(p)},decodeVertexBuffer:function(p,E,m,M,v){c(r,r.exports.meshopt_decodeVertexBuffer,p,E,m,M,r.exports[l[v]])},decodeIndexBuffer:function(p,E,m,M){c(r,r.exports.meshopt_decodeIndexBuffer,p,E,m,M)},decodeIndexSequence:function(p,E,m,M){c(r,r.exports.meshopt_decodeIndexSequence,p,E,m,M)},decodeGltfBuffer:function(p,E,m,M,v,S){c(r,r.exports[h[v]],p,E,m,M,r.exports[l[S]])},decodeGltfBufferAsync:function(p,E,m,M,v){return u.length>0?y(p,E,m,h[M],l[v]):a.then(function(){var S=new Uint8Array(p*E);return c(r,r.exports[h[M]],S,p,E,m,r.exports[l[v]]),S})}}})();var zn=(i,e=0,t=1)=>Math.min(t,Math.max(e,i)),Yn=(i,e,t)=>(t=zn((t-i)/(e-i)),t*t*(3-2*t)),Nu=Math.PI*2,ds=i=>new Ge(i).convertSRGBToLinear(),vt={START:-1600,DEPLOYED:-900,ALERT_END:0,HIT_ALERT:[6320,8320],RETRACT:[13600,14500]},bp=[5980,6150,6320],ll={side:.054,top:.072,bottom:.088,radius:.11},ci=1,fv=30*Math.PI/180,hl=.016;function dv(i,e,t,n,s=32,r=.035){let a=[[i,-t],[i,e],[-i,e],[-i,-t]],o=a.length,c=a.map((h,u)=>{let f=a[(u+o-1)%o],d=a[(u+1)%o],_=h[0]-f[0],y=h[1]-f[1],g=Math.hypot(_,y);_/=g,y/=g;let p=d[0]-h[0],E=d[1]-h[1],m=Math.hypot(p,E);p/=m,E/=m;let M=Math.acos(zn(_*p+y*E,-1,1)),v=n*Math.tan(M/2),S=[h[0]-_*v,h[1]-y*v],T=[h[0]+p*v,h[1]+E*v];return{a:S,b:T,cx:S[0]-y*n,cy:S[1]+_*n,turn:M,d2:[p,E]}}),l=[];for(let h=0;h<o;h++){let u=c[h],f=Math.atan2(u.a[1]-u.cy,u.a[0]-u.cx);for(let m=0;m<=s;m++){let M=f+u.turn*m/s;l.push({x:u.cx+n*Math.cos(M),y:u.cy+n*Math.sin(M),nx:Math.cos(M),ny:Math.sin(M)})}let d=c[(h+1)%o],_=u.b[0],y=u.b[1],g=d.a[0],p=d.a[1],E=Math.max(1,Math.ceil(Math.hypot(g-_,p-y)/r));for(let m=1;m<E;m++)l.push({x:_+(g-_)*m/E,y:y+(p-y)*m/E,nx:u.d2[1],ny:-u.d2[0]})}return l}function pv(i,e,t,n,s,r,a){let o=(f,d)=>{for(let _ of[e,t]){let y=1+r,g=1+a,p=f*(i-n),E=d*(_-s),m=f*n,M=d*s;if(f*i<y||d*_<g||y>p&&g>E&&((y-p)/m)**2+((g-E)/M)**2>1)return!1}return!0},c=1/i,l=1/Math.min(e,t),h=1,u=3;for(let f=0;f<40;f++){let d=(h+u)/2;o(c*d,l*d)?u=d:h=d}return{sx:c*u,sy:l*u}}function mv(i){let e={gasket:{col:ds("#0a0b0d"),rough:.74,metal:0,ao:.5,env:.5},bead:{col:ds("#1c2027"),rough:.35,metal:.9,ao:1,env:.55,key:1},wall:{col:ds("#16191e"),rough:.4,metal:.85,ao:1,env:.9},lip:{col:ds("#16191e"),rough:.38,metal:.85,ao:1,env:1},face:{col:ds("#16191e"),rough:.35,metal:.85,ao:1,env:1},groove:{col:ds("#16191e"),rough:.5,metal:.85,ao:.55,env:.6},inlay:{col:ds("#7a3a14"),rough:.72,metal:.1,ao:.6,env:.5,key:-1},plate:{col:ds("#16191e"),rough:.4,metal:.85,ao:1,env:1}},t=[],n=(S,T,x,C,P,U,L=U.ao,F=U.ao)=>{let N=x-S,D=C-T,V=Math.hypot(N,D),q=-D/V,ee=N/V,G=[];for(let te=0;te<=P;te++){let ce=te/P;G.push({o:S+N*ce,d:T+D*ce,no:q,nd:ee,m:U,ao:L+(F-L)*ce})}t.push(G)},s=(S,T,x,C,P,U,L,F=()=>L.ao)=>{let N=[];for(let D=0;D<=U;D++){let V=D/U,q=C+(P-C)*V;N.push({o:S+x*Math.cos(q),d:T+x*Math.sin(q),no:Math.cos(q),nd:Math.sin(q),m:L,ao:F(V)})}t.push(N)},r=Math.PI/180,a=.0024,o=.0016,c=o+.94*a,l=.5*a;n(0,0,c+a*Math.cos(200*r),l+a*Math.sin(200*r),1,e.gasket),s(c,l,a,200*r,60*r,14,e.bead,S=>.75+.25*Math.sin(Math.PI*Math.min(1,S*1.4))-.25*Yn(.75,1,S));let h=c+.5*a,u=l+.866*a,f=i-hl*.5,d=h+(f-u)*Math.tan(fv),_=d+hl*Math.cos(30*r);n(h,u,d,f,8,e.wall,.5,1),s(_,i-hl,hl,150*r,90*r,8,e.lip);let y=_+.0065,g=.0011,p=.0012,E=8e-4;n(_,i,y,i,2,e.face),n(y,i,y+g,i-g,1,e.groove,.7,.35),n(y+g,i-g,y+g+p,i-g,1,e.inlay),n(y+g+p,i-g,y+g+p+E,i-g+E,1,e.groove,.35,.7);let m=y+g+p+E,M=i-g+E,v=[];for(let S of[0,.006,.014,.025,.04,.06,.09,.13,.19,.27,.38,.5]){let T=m+S,x=M+.5*S*S,C=1*S,P=Math.hypot(C,1);v.push({o:T,d:x,no:-C/P,nd:1/P,m:e.plate,ao:S<.004?.85:1})}return t.push(v),{segs:t,lipO:_,D:i}}function gv(i){let e=new xi,t=new nn(16,9,16,8,8,8),n=[],s=t.attributes.position;for(let c=0;c<s.count;c++){let l=s.getY(c)/4.5,h=s.getZ(c)/8,u=.05+.16*Yn(-1,1,l)+.08*Yn(0,1,h);n.push(u*.85,u*.93,u*1.08)}t.setAttribute("color",new pt(n,3)),e.add(new yt(t,new hn({vertexColors:!0,side:sn})));let r=(c,l,h,u,f,d)=>{let _=new yt(new ki(c,l),new hn({color:new Ge(...h),side:pn}));_.position.set(u,f,d),_.lookAt(0,0,0),e.add(_)};r(9,.55,[34,35,38],-1.9,1.75,6.4),r(12,5,[3.2,3.5,4],.3,-4.2,2.6),r(2.2,5,[2.2,2.4,2.8],6,.3,3),r(9,5,[.9,1,1.25],0,0,-6.5);let a=new us(i),o=a.fromScene(e,0,.1,50);return a.dispose(),e.traverse(c=>{c.geometry&&c.geometry.dispose(),c.material&&c.material.dispose()}),o}var bv=`
attribute vec2 aPN; attribute vec4 aMat; attribute vec3 aH;
uniform float uWinPhi;
varying vec2 vPN; varying vec4 vMat; varying vec3 vH; varying vec3 vObj; varying vec3 vWinL;
`,xv=`
vMat = aMat; vH = aH; vObj = position; vPN = aPN;
vWinL = mat3( modelViewMatrix ) * normalize( vec3( -aPN * cos( uWinPhi ), -sin( uWinPhi ) ) );
`,_v=`
uniform vec2 uRes; uniform vec4 uVig; uniform vec2 uSideDir;
uniform vec3 uWinCol; uniform float uWin; uniform float uKey;
uniform vec3 uAlertPos; uniform vec3 uAlertCol; uniform float uAlert;
uniform vec3 uSpillPos; uniform vec3 uSpillCol; uniform float uSpill;
varying vec2 vPN; varying vec4 vMat; varying vec3 vH; varying vec3 vObj; varying vec3 vWinL;
float ckHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float ckNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( ckHash( i ), ckHash( i + vec2( 1, 0 ) ), f.x ), mix( ckHash( i + vec2( 0, 1 ) ), ckHash( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float ckSmudge( vec3 p ) { return 0.65 * ckNoise( p.xy * 7.0 + 3.1 ) + 0.35 * ckNoise( p.xy * 13.0 - 7.7 ); }   // large, soft wear (>= 80 px)
`,vv=`
{
  // three only fills this in when the scene has its own lights (this one has none)
  material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / max( material.dfg.x + material.dfg.y, 1e-3 ) - 1.0 );
  IncidentLight il; il.visible = true;
  float paint = vH.y < -0.5 ? 0.12 : 1.0;
  float side = mix( 0.42, 1.0, clamp( 0.5 + 0.5 * dot( normalize( vPN ), uSideDir ), 0.0, 1.0 ) );
  float fall = 0.22 + 0.78 * exp( -vH.x * 2.4 );
  PhysicalMaterial mSoft = material; mSoft.roughness = max( material.roughness, 0.62 );
  il.direction = normalize( vWinL );
  // broad wash: the whole window is a big area light right behind the sleeve
  il.color = uWinCol * ( uWin * side * fall );
  RE_Direct( il, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, mSoft, reflectedLight );
  // narrow key on the machined ring only: the thin highlight line on the top / left edges
  if ( vH.y > 0.0 ) { il.color = uWinCol * ( uKey * vH.y * side * side ); RE_Direct( il, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }
  if ( uAlert > 0.0 ) {   // broad red wash on the metal; kept off the thin ring at the glass so it never reads as an outline
    PhysicalMaterial mWide = material; mWide.roughness = max( material.roughness, 0.74 );
    vec3 la = uAlertPos - geometryPosition; float da = length( la );
    il.direction = la / da; il.color = uAlertCol * ( uAlert * paint * smoothstep( 0.06, 0.4, vH.x ) / ( 0.25 + da * da ) );
    RE_Direct( il, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, mWide, reflectedLight );
  }
  if ( uSpill > 0.0 ) {
    vec3 ls = uSpillPos - geometryPosition; float ds = length( ls );
    il.direction = ls / ds; il.color = uSpillCol * ( uSpill * paint / ( 0.2 + ds * ds ) );
    RE_Direct( il, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, mSoft, reflectedLight );
  }
  float cav = vMat.z;
  reflectedLight.indirectDiffuse *= cav; reflectedLight.indirectSpecular *= cav;
  reflectedLight.directSpecular *= cav; reflectedLight.directDiffuse *= cav;
}
`;function yv(i,e){let t=new xn({color:16777215,vertexColors:!0,roughness:.42,metalness:.85,envMap:i,envMapIntensity:1});return t.onBeforeCompile=n=>{Object.assign(n.uniforms,e),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
`+bv).replace("#include <begin_vertex>",`#include <begin_vertex>
`+xv),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
`+_v).replace("#include <color_fragment>",`#include <color_fragment>
 float ckS = ckSmudge( vObj ); diffuseColor.rgb *= 0.9 + 0.2 * ckS;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
 roughnessFactor = vMat.x * ( 0.88 + 0.24 * ckS );`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
 metalnessFactor = vMat.y;`).replace("#include <lights_fragment_maps>",`#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
 radiance *= vMat.w; iblIrradiance *= vMat.w;
#endif`).replace("#include <lights_fragment_end>",`#include <lights_fragment_end>
`+vv).replace("#include <opaque_fragment>",`{ vec2 sc = gl_FragCoord.xy / uRes * 2.0 - 1.0; float rr = length( sc * uVig.xy ); outgoingLight *= 1.0 - smoothstep( uVig.z, uVig.w, rr ); }
#include <opaque_fragment>`)},t.customProgramCacheKey=()=>"orbiterm-cockpit-v15",t}function xp(i={}){let e=i.container,t=i.fov||34,n=!!i.reduced,s=document.createElement("canvas");Object.assign(s.style,{position:"absolute",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"5"}),e.appendChild(s);let r=new Dr({canvas:s,alpha:!0,antialias:!0,premultipliedAlpha:!0,powerPreference:"high-performance",preserveDrawingBuffer:!!i.preserveDrawingBuffer});r.setClearColor(0,0),r.setPixelRatio(1),r.toneMapping=Is,r.toneMappingExposure=1;let a=new xi,o=new Wt(t,16/9,.05,10),c=gv(r),l={uRes:{value:new Re(1920,1080)},uVig:{value:new wt(1,1,.9,1.42)},uSideDir:{value:new Re(-.6,.8)},uWinPhi:{value:24*Math.PI/180},uWinCol:{value:new Ge(.8,.88,1)},uWin:{value:0},uKey:{value:0},uAlertPos:{value:new k},uAlertCol:{value:new Ge(1,.07,.04)},uAlert:{value:0},uSpillPos:{value:new k},uSpillCol:{value:new Ge(1,.48,.16)},uSpill:{value:0}},h={win:30,key:6,alert:28,spill:8,envI:1},u=yv(c.texture,l),f=null,d=null,_={w:0,h:0},y={hw:.5435,hh:.3057},g={sx:1.2,sy:1.3};function p(){d&&(f.remove(d),d.geometry.dispose()),f||(f=new tn,a.add(f));let L=Math.max(.5,_.w/Math.max(1,_.h));o.aspect=L,o.updateProjectionMatrix();let F=Math.tan(t*Math.PI/360),N=F*L;y={hw:N,hh:F};let D=(1-2*ll.side)*N*ci,V=(1-2*ll.top)*F*ci,q=(1-2*ll.bottom)*F*ci,ee=ll.radius*2*F*ci,G=dv(D,V,q,ee);g=pv(D/(N*ci),V/(F*ci),q/(F*ci),ee/(N*ci),ee/(F*ci),10/(_.w/2),10/(_.h/2));let te=.1*F,ce=mv(te),Le=G.length,Ce=ce.segs.flat(),Ne=Ce.length,ze=new Float32Array(Le*Ne*3),tt=new Float32Array(Le*Ne*3),Z=new Float32Array(Le*Ne*3),ae=new Float32Array(Le*Ne*2),he=new Float32Array(Le*Ne*4),Pe=new Float32Array(Le*Ne*3);for(let de=0;de<Le;de++){let ge=G[de];for(let xe=0;xe<Ne;xe++){let _e=Ce[xe],Me=de*Ne+xe;ze[Me*3]=ge.x+_e.o*ge.nx,ze[Me*3+1]=ge.y+_e.o*ge.ny,ze[Me*3+2]=_e.d,tt[Me*3]=_e.no*ge.nx,tt[Me*3+1]=_e.no*ge.ny,tt[Me*3+2]=_e.nd,Z[Me*3]=_e.m.col.r,Z[Me*3+1]=_e.m.col.g,Z[Me*3+2]=_e.m.col.b,ae[Me*2]=ge.nx,ae[Me*2+1]=ge.ny,he[Me*4]=_e.m.rough,he[Me*4+1]=_e.m.metal,he[Me*4+2]=_e.ao,he[Me*4+3]=_e.m.env,Pe[Me*3]=zn(_e.d/te,0,1.5),Pe[Me*3+1]=_e.m.key||0,Pe[Me*3+2]=_e.o+_e.d}}let Ae=[],De=0;for(let de of ce.segs){for(let ge=De;ge<De+de.length-1;ge++)for(let xe=0;xe<Le;xe++){let _e=(xe+1)%Le,Me=xe*Ne+ge,Ue=xe*Ne+ge+1,ve=_e*Ne+ge,ue=_e*Ne+ge+1;Ae.push(Me,Ue,ve,Ue,ue,ve)}De+=de.length}let Je=new Ct;Je.setAttribute("position",new St(ze,3)),Je.setAttribute("normal",new St(tt,3)),Je.setAttribute("color",new St(Z,3)),Je.setAttribute("aPN",new St(ae,2)),Je.setAttribute("aMat",new St(he,4)),Je.setAttribute("aH",new St(Pe,3)),Je.setIndex(Ae),d=new yt(Je,u),d.frustumCulled=!1,f.add(d),f.position.set(0,0,-ci)}function E(L,F,N){_={w:L,h:F};let D=i.maxInternalHeight||1440,V=i.maxInternalWidth||2560,q=Math.round(L*N),ee=Math.round(F*N),G=Math.min(1,D/ee,V/q);q=Math.max(2,Math.round(q*G)),ee=Math.max(2,Math.round(ee*G)),r.setSize(q,ee,!1),l.uRes.value.set(q,ee),p()}let m=-1030;function M(L){if(L<=vt.START)return{k:1,jy:0,jp:0};if(L<m){let q=(L-vt.START)/(m-vt.START);return{k:1-q*q*(2.2-1.2*q),jy:0,jp:0}}let F=L-m,N=.08*Math.sin(Math.PI*F/75)*Math.exp(-F/40),D=.0032*Math.sin(Nu*F/95)*Math.exp(-F/60),V=.0022*Math.sin(Nu*F/110+.6)*Math.exp(-F/70);return{k:-N*.5,jy:D,jp:V}}function v(L){let F=vt.RETRACT[0],N=vt.RETRACT[1],D=.02*Math.sin(Math.PI*zn((L-F)/160)),V=zn((L-F-110)/(N-F-110)),q=V*V*V*(2.4-1.4*V);return-D*(1-V)+1.15*q}let S=L=>{let F=0,N=D=>.5-.5*Math.cos(Nu*1.5*(L-D)/1e3);L>=vt.DEPLOYED&&L<vt.ALERT_END+150&&(F=(.04+.96*N(vt.DEPLOYED-333))*(1-Yn(vt.ALERT_END-120,vt.ALERT_END+150,L))*Yn(vt.DEPLOYED,vt.DEPLOYED+120,L)),L>=vt.HIT_ALERT[0]&&L<vt.HIT_ALERT[1]&&(F=Math.max(F,.85*(1-Yn(vt.HIT_ALERT[0],vt.HIT_ALERT[1],L))*(.06+.94*N(vt.HIT_ALERT[0]-333))));for(let D of bp)L>=D&&(F=Math.max(F,.55*Math.exp(-(L-D)/140)));return F};function T(L,F){if(F.px!=null)return F.px;let N=zn(F.glow/(L>=8500?.35:1));if(N<=0)return 0;let D=1-N,V=.5-Math.sin(Math.asin(zn(1-2*D,-1,1))/3),q=10+130*V;return 6.5*(L>=8500?1:.05+.95*Yn(0,900,L))/(2*Math.tan(17*Math.PI/180)*q)*1080}let x=new k;function C(L,F={}){if(!f)return;let N=0,D=1,V=0,q=0,ee=[0,0,0,0,0];n?D=Yn(vt.START,vt.START+200,L)*(L<vt.RETRACT[0]?1:1-Yn(vt.RETRACT[0],vt.RETRACT[1],L)):(D=Yn(vt.START,vt.START+120,L)*(1-Yn(vt.RETRACT[1]-120,vt.RETRACT[1]-20,L)),L<vt.RETRACT[0]?{k:N,jy:V,jp:q}=M(L):N=v(L),ee=F.shake||ee),f.scale.set(1+(g.sx-1)*N,1+(g.sy-1)*N,1),o.position.set(ee[3]*2.5,ee[4]*2.5+V,0),o.rotation.set(ee[0]+q,ee[1],ee[2]),o.updateMatrixWorld(!0);let G=0;for(let Ne of bp)L>=Ne&&(G+=Math.exp(-(L-Ne)/110)*(Ne===6320?1.6:1));G=zn(G,0,1.5),l.uWin.value=h.win*(1+.4*G),l.uKey.value=h.key*(1+.5*G),u.envMapIntensity=h.envI,l.uWinCol.value.setRGB(.8+.12*zn(G),.88-.02*zn(G),1-.14*zn(G));let te=n?L>=vt.DEPLOYED&&L<0||L>=vt.HIT_ALERT[0]&&L<vt.HIT_ALERT[1]?.35:0:S(L);l.uAlert.value=te*h.alert,l.uAlertPos.value.copy(x.set(.12*Math.sin(L*.0021),.36,-.5)).applyMatrix4(o.matrixWorldInverse);let ce=F.ship,Le=0;if(ce&&ce.glow>0){let Ne=T(L,ce),ze=Ne<60?.1*zn(Ne/60):.1+.9*Yn(60,300,Ne);Le=zn(ce.glow)*ze;let tt=ci+.45;x.set(ce.nx*y.hw*tt,ce.ny*y.hh*tt,-tt).applyMatrix4(o.matrixWorldInverse),l.uSpillPos.value.copy(x)}l.uSpill.value=Le*h.spill;let Ce=!n&&(L>=vt.RETRACT[1]-1||L<vt.START-1)||n&&D<=.001;s.style.opacity=String(D),s.style.visibility=Ce?"hidden":"visible",Ce||r.render(a,o)}function P(){d&&d.geometry.dispose(),u.dispose(),c.dispose(),r.dispose(),s.remove()}let U=()=>{};return E(i.width||e.clientWidth||1920,i.height||e.clientHeight||1080,i.dpr||1),{canvas:s,render:C,resize:E,setLabel:U,setLockLabel:U,dispose:P,T:vt,tune:h,get root(){return f}}}var Nt={LOCK_START:vt.START,FRAME_DEPLOYED:vt.DEPLOYED,FRAME_RETRACT:vt.RETRACT,START:0,LOOPS_END:4800,SWING_END:5500,SHOTS:[5920,6090,6260],HITS:[5980,6150,6320],SHAKE:[6320,6570],FLYBY:8e3,LEAVE:[6900,9100],SEAL:[11400,13800],END:14500},Or=[{x:.335,y:.355,strength:.55},{x:.665,y:.6,strength:.6},{x:.515,y:.47,strength:1}],Uu=60,ps=34,_p=-.6,Yt=(i,e=0,t=1)=>Math.min(t,Math.max(e,i)),gt=(i,e,t)=>(t=Yt((t-i)/(e-i)),t*t*(3-2*t));var Dn=(i,e,t)=>i+(e-i)*t;function qu(i){let e=i>>>0;return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}var Jn=6.5,vp=37,Qn=Math.PI/180,Xu=i=>(i=Yt(i),i*i*i*(10-15*i+6*i*i)),pl=(i,e,t,n)=>gt(i,e,n)*(1-gt(e,t,n)),Mv=[18,18,30],Sv=[2.8,2.8,3.3],Tv=[.35*Qn,-.35*Qn,0],Ev=[.3,.3,.55],Ou=(i,e,t)=>{let n=2*Math.PI*i,s=n*Math.sqrt(1-e*e);return Math.exp(-e*n*t)*Math.sin(s*t)/s},ms=class{constructor(e,t,n,s,r){this.k1=t/(Math.PI*e),this.k2=1/(2*Math.PI*e)**2,this.k3=n*t/(2*Math.PI*e),this.xp=s.slice(),this.y=s.slice(),this.yd=(r||s.map(()=>0)).slice()}step(e,t){let n=Math.max(this.k2,e*e/2+e*this.k1/2,e*this.k1);for(let s=0;s<t.length;s++){let r=(t[s]-this.xp[s])/e;this.y[s]+=e*this.yd[s],this.yd[s]+=e*(t[s]+this.k3*r-this.y[s]-this.k1*this.yd[s])/n,this.xp[s]=t[s]}return this.y}},kr=(i,e)=>[i[0]-e[0],i[1]-e[1],i[2]-e[2]],ks=(i,e)=>[i[0]+e[0],i[1]+e[1],i[2]+e[2]],en=(i,e)=>[i[0]*e,i[1]*e,i[2]*e],ml=(i,e)=>i[0]*e[0]+i[1]*e[1]+i[2]*e[2],to=(i,e)=>[i[1]*e[2]-i[2]*e[1],i[2]*e[0]-i[0]*e[2],i[0]*e[1]-i[1]*e[0]],ju=i=>Math.hypot(i[0],i[1],i[2]),Sn=i=>{let e=ju(i)||1;return[i[0]/e,i[1]/e,i[2]/e]},yp=Sn([1,.1,0]),Mp=Sn([0,.55,-.83]),Sp=[15.71,11.69,-75.79],wv=[-7.82,7.86,-54.3],Bu=16.52,Av=-.6846,ul=-6.2778,Pi=4e3,ku=5450,fl=[0,.9,-11.5];function zr(i,e){let t=i/Pi,n=Av+ul*t,s=Math.cos(n),r=Math.sin(n),a=kr(wv,Sp),o=ks(en(yp,s),en(Mp,r)),c=ks(en(yp,-r),en(Mp,s));return e===0?ks(ks(Sp,en(a,t)),en(o,Bu)):e===1?en(ks(a,en(c,Bu*ul)),1e3/Pi):en(o,-Bu*ul*ul*(1e3/Pi)**2)}var Rv=zr(Pi,0),Cv=zr(Pi,1),Pv=zr(Pi,2);function gl(i){if(i<=Pi)return zr(Math.max(0,i),0);if(i<=ku){let e=(ku-Pi)/1e3,t=(i-Pi)/(ku-Pi),n=t*t,s=n*t,r=s*t,a=r*t,o=1-10*s+15*r-6*a,c=t-6*s+8*r-3*a,l=.5*n-1.5*s+1.5*r-.5*a,h=10*s-15*r+6*a;return[0,1,2].map(u=>o*Rv[u]+c*Cv[u]*e+l*Pv[u]*e*e+h*fl[u])}return[fl[0],fl[1],fl[2]+.8*Xu((i-5900)/1e3)]}function zu(i){let e=gl(i+170),t=gl(i+190);return Sn(kr(t,e))}var bl=9300,Br=2,zs=null;function xl(){if(zs)return zs;let i=bl+1,e=.001,t=new Float64Array(i*3),n=new ms(1.6,.5,.5,gl(0),zr(0,1)),s=null,r=null,a=null,o=[0,0,0];for(let T=0;T<i;T++){let x;if(T<=6900)x=n.step(e,gl(T)).slice(),T===6900&&(a=x.slice(),r=Sn(en(a,-1)),s=new ms(.8,.7,0,[0,0]));else{let C=[58*Qn*gt(7040,7400,T),-24*Qn*gt(7150,7700,T)],P=s.step(e,C),U=Rp(r,P[0],P[1]),L=40*gt(7120,7320,T);for(let F=0;F<3;F++)o[F]+=(L*U[F]-.8*o[F])*e;for(let F=0;F<3;F++)a[F]+=o[F]*e;x=a.slice()}t.set(x,T*3)}let c=T=>[t[Math.min(i-1,Math.max(0,T))*3],t[Math.min(i-1,Math.max(0,T))*3+1],t[Math.min(i-1,Math.max(0,T))*3+2]],l=Math.floor(i/Br)+1,h={pos:new Float32Array(l*3),quat:new Float64Array(l*4),thr:new Float32Array(l),retro:new Float32Array(l),alpha:new Float32Array(l*3),speed:new Float32Array(l)},u=Sn(en(c(0),-1)),f=new ms(1,.65,0,zu(0)),d=new ms(.7,.8,0,[0]),_=new ms(3,.45,0,[.9]),y=.9,g=0,p=[],E=15,m=zu(0);for(let T=0;T<i;T++){let x=c(T),C=c(T-E),P=c(T+E),U=c(T-2*E),L=c(T+2*E),F=en(kr(P,C),1e3/(2*E)),N=en(ks(kr(P,en(x,2)),C),1e6/(E*E)),D=T,V;if(D<=6900){let he=gt(3900,5100,D),Pe=Sn(en(x,-1)),Ae=zu(D),De=Sn([Ae[0]*(1-he)+Pe[0]*he,Ae[1]*(1-he)+Pe[1]*he,Ae[2]*(1-he)+Pe[2]*he]);V=Sn(f.step(e,De).slice())}else V=Iv(r,D),f.y=V.slice(),f.xp=V.slice(),f.yd=[0,0,0];m=V;let q=kr([0,1,0],en(V,V[1]));ju(q)<.001&&(q=[0,0,-1]),q=Sn(q);let ee=Sn(to(q,V)),G=ml(N,V),te=ml(N,ee),ce=D>6900?35*Qn:72*Qn,Le=Yt(Math.atan2(te,vp),-ce,ce)*(D>6900?1:1-gt(3700,4500,D)),Ce=d.step(e,[Le])[0],Ne=.7+G/40+.3*Math.min(1,Math.abs(te)/vp);D>6900&&(Ne=D<7120?Dn(.7,.35,gt(6900,7050,D)):Dn(.35,2,gt(7120,7200,D))*(1-.55*gt(7900,8700,D))+.8*.55*gt(7900,8700,D)*0),Ne=Yt(Ne,.2,2.4);let ze=Ne>y?.09:.22;y+=(Ne-y)*(1-Math.exp(-e/ze));let tt=Yt(_.step(e,[y])[0],.15,2.6),Z=Yt((-G-15)/50,0,1.3),ae=Z>g?.06:.15;if(g+=(Z-g)*(1-Math.exp(-e/ae)),T%Br===0){let he=T/Br,Pe=Math.cos(Ce),Ae=Math.sin(Ce),De=Sn([q[0]*Pe+ee[0]*Ae,q[1]*Pe+ee[1]*Ae,q[2]*Pe+ee[2]*Ae]),Je=Sn(to(De,V)),de=to(V,Je);_l.makeBasis(Ri.set(...Je),Bs.set(...de),Qa.set(...V)),Qt.setFromRotationMatrix(_l),he>0&&p[he-1]&&p[he-1][0]*Qt.x+p[he-1][1]*Qt.y+p[he-1][2]*Qt.z+p[he-1][3]*Qt.w<0&&Qt.set(-Qt.x,-Qt.y,-Qt.z,-Qt.w),p[he]=[Qt.x,Qt.y,Qt.z,Qt.w],h.pos.set(x,he*3),h.quat.set(p[he],he*4),h.thr[he]=tt,h.retro[he]=g,h.speed[he]=ju(F)}}let M=T=>new Ot(h.quat[T*4],h.quat[T*4+1],h.quat[T*4+2],h.quat[T*4+3]),v=T=>{let x=M(Math.max(0,T-3)),P=M(Math.min(l-1,T+3)).multiply(x.invert());P.w<0&&P.set(-P.x,-P.y,-P.z,-P.w);let U=Math.hypot(P.x,P.y,P.z)||1e-12,L=2*Math.atan2(U,P.w),F=(Math.min(l-1,T+3)-Math.max(0,T-3))*Br/1e3;return new k(P.x/U,P.y/U,P.z/U).multiplyScalar(L/F)},S=[];for(let T=0;T<l;T++)S[T]=v(T);for(let T=0;T<l;T++){let x=S[Math.min(l-1,T+3)].clone().sub(S[Math.max(0,T-3)]).divideScalar((Math.min(l-1,T+3)-Math.max(0,T-3))*Br/1e3).applyQuaternion(M(T).invert());h.alpha.set([x.x,x.y,x.z],T*3)}return zs=h,zs.p0=c(0),h}function Rp(i,e,t){let n=kr([0,1,0],en(i,i[1]));n=Sn(n);let s=Math.cos(e),r=Math.sin(e),a=Sn(ks(en(i,s),en(n,r))),o=Math.cos(t),c=Math.sin(t),l=[0,1,0],h=to(l,a),u=ml(l,a);return Sn([a[0]*o+h[0]*c+l[0]*u*(1-o),a[1]*o+h[1]*c+l[1]*u*(1-o),a[2]*o+h[2]*c+l[2]*u*(1-o)])}var dl=null;function Iv(i,e){if(!dl){dl=[];let t=new ms(.8,.7,0,[0,0]);for(let n=6900;n<=bl;n++){let s=t.step(.001,[58*Qn*gt(7040,7400,n),-24*Qn*gt(7150,7700,n)]);dl[n]=Rp(i,s[0],s[1])}}return dl[Math.min(bl,Math.max(6900,Math.round(e)))]}var Ri=new k,Zn=new k,Qa=new k,Bs=new k,Ci=new k,Tp=new k,_l=new ct,Qt=new Ot,vl=new k(0,1,0),Cp=new k(0,0,1),Lv=new k(1,0,0),Ep=new Ot,wp=new Ot,Hn=(i,e,t,n)=>.6*Math.sin(2*Math.PI*e*i/1e3+n)+.4*Math.sin(2*Math.PI*t*i/1e3+n*1.7+1);function yl(i,e){let t=xl();i=Yt(i,0,bl);let n=i/Br,s=Math.min(Math.floor(n),t.thr.length-2),r=n-s;return e.pos.set(Dn(t.pos[s*3],t.pos[s*3+3],r),Dn(t.pos[s*3+1],t.pos[s*3+4],r),Dn(t.pos[s*3+2],t.pos[s*3+5],r)),e.quat&&(Ep.set(t.quat[s*4],t.quat[s*4+1],t.quat[s*4+2],t.quat[s*4+3]),wp.set(t.quat[s*4+4],t.quat[s*4+5],t.quat[s*4+6],t.quat[s*4+7]),e.quat.copy(Ep).slerp(wp,r)),e.thr=Dn(t.thr[s],t.thr[s+1],r),e.retro=Dn(t.retro[s],t.retro[s+1],r),e.speed=Dn(t.speed[s],t.speed[s+1],r),e.alpha&&e.alpha.set(t.alpha[s*3],t.alpha[s*3+1],t.alpha[s*3+2]),e}var $n={pos:new k,quat:new Ot,thr:1,retro:0,speed:0,alpha:new k},Mn=8500,Dv=11330,eo=(i,e)=>{let t=Yt((i-Mn)/(Dv-Mn),0,1),n=Math.pow(t,1.25),s=1-n;return e.set(s*s*-71.8+2*s*n*-21.8+n*n*98.7,s*s*23.5+2*s*n*37.9+n*n*66.6,s*s*-110+2*s*n*-200+n*n*-330)},Hu=new k,Gu=new k,Ap=new k;function Fv(i,e){eo(i,e.pos),eo(i-60,Hu),eo(i+60,Gu),eo(i,Ap),Zn.copy(Gu).sub(Hu).normalize();let t=Gu.add(Hu).sub(Ap.multiplyScalar(2)),n=vl.clone().addScaledVector(Zn,-vl.dot(Zn)).normalize(),s=new k().crossVectors(n,Zn).normalize(),r=.65*Math.tanh(t.dot(s)/4);return n.applyAxisAngle(Zn,r),Ci.crossVectors(n,Zn).normalize(),Tp.crossVectors(Zn,Ci),_l.makeBasis(Ci,Tp,Zn),e.quat.setFromRotationMatrix(_l),e.qTrail.copy(e.quat),e.throttle=.95,e.retro=0,e.speed=20,e}var Nv=i=>1;function Za(i,e={pos:new k,quat:new Ot,qTrail:new Ot,throttle:1,retro:0,speed:0}){if(i>=Mn)return Fv(i,e);yl(i,$n),e.pos.copy($n.pos),e.quat.copy($n.quat),e.retro=$n.retro,e.speed=$n.speed,Zn.set(0,0,1).applyQuaternion(e.quat);let t=0,n=0,s=0,r=0;for(let d=0;d<3;d++){let _=(i-Nt.SHOTS[d])/1e3;_>0&&_<1.5&&(t+=Mv[d]*Ou(2.2,.45,_),n+=Sv[d]*Ou(4,.5,_),s+=Tv[d]*Ou(4,.5,_)/.0218),r+=Ev[d]*pl(Nt.SHOTS[d]+40,Nt.SHOTS[d]+110,Nt.SHOTS[d]+300,i)}let a=Xu((i-6160)/90)*(1-Xu((i-6260)/60)),o=gt(5400,5600,i)*(1-gt(6850,6900,i)),c=pl(6900,7060,7220,i);e.pos.addScaledVector(Zn,-t+.12*a),e.pos.x+=.1*o*Hn(i,.7,1.3,.3),e.pos.y+=.1*o*Hn(i,.9,1.7,2.1),e.pos.z+=.07*o*Hn(i,.6,1.1,4),e.pos.x+=0*c,e.pos.y-=.25*c,e.pos.z-=.2*c;let l=n+3.5*Qn*c-1*Qn*a-8*Qn*pl(4950,5200,5500,i),h=.3*Qn*Yt($n.retro+Math.max(0,$n.thr-1.3));l+=h*Hn(i,8.3,10.7,.5);let u=h*Hn(i,9.1,11.3,1.9);Qt.setFromAxisAngle(Lv,l),e.quat.multiply(Qt),s&&(Qt.setFromAxisAngle(Cp,s),e.quat.multiply(Qt)),u&&(Qt.setFromAxisAngle(vl,u),e.quat.multiply(Qt));let f=1+.04*Math.sin(2*Math.PI*12.3*i/1e3+Math.sin(i*.013)*3);return e.pos.x+=Ku(i),i>7e3&&e.pos.z>-4.8&&(e.pos.z=-4.8),e.throttle=Math.max(.12,($n.thr+r)*f),e.qTrail.copy(e.quat),e}var Ku=i=>7.5*(1-gt(0,1e3,i)),Uv=i=>Dn(.05,1,gt(0,900,i)),Vu={pos:new k};function Ov(i,e){if(i>=Mn)return eo(i,e);if(i<0){let t=zr(0,1);return xl(),e.set(zs.p0[0]+t[0]*i/1e3,zs.p0[1]+t[1]*i/1e3,zs.p0[2]+t[2]*i/1e3),e.x+=Ku(0),e}return Vu.quat=null,yl(i,Vu),e.copy(Vu.pos),e.x+=Ku(i),e}function Os(i,e=256){let t=document.createElement("canvas");t.width=t.height=e;let n=t.getContext("2d");i(n,e);let s=new fa(t);return s.colorSpace=Vt,s.generateMipmaps=!0,s.minFilter=Bn,s}function $a(i,e,t){let n=i.createRadialGradient(e/2,e/2,0,e/2,e/2,e/2);for(let[s,r]of t)n.addColorStop(s,`rgba(255,255,255,${r})`);i.fillStyle=n,i.fillRect(0,0,e,e)}var Bv={glow:()=>Os((i,e)=>$a(i,e,[[0,1],[.08,.75],[.2,.3],[.4,.07],[.6,.015],[.8,.002],[1,0]])),star:()=>Os((i,e)=>{$a(i,e,[[0,1],[.1,.7],[.25,.2],[.45,.04],[.7,.005],[1,0]]),i.globalCompositeOperation="lighter";for(let t=0;t<4;t++){i.save(),i.translate(e/2,e/2),i.rotate(t*Math.PI/4+.2);let n=t%2?.34:.5,s=i.createLinearGradient(-e*n,0,e*n,0);s.addColorStop(0,"rgba(255,255,255,0)"),s.addColorStop(.5,"rgba(255,255,255,0.95)"),s.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=s,i.fillRect(-e*n,-e*.012,e*n*2,e*.024),i.restore()}}),puff:()=>Os((i,e)=>{$a(i,e,[[0,.9],[.3,.5],[.6,.15],[1,0]]);let t=qu(9);i.globalCompositeOperation="destination-out";for(let n=0;n<70;n++){let s=t()*e,r=t()*e,a=e*(.03+.07*t()),o=i.createRadialGradient(s,r,0,s,r,a);o.addColorStop(0,"rgba(0,0,0,0.35)"),o.addColorStop(1,"rgba(0,0,0,0)"),i.fillStyle=o,i.fillRect(s-a,r-a,a*2,a*2)}}),core:()=>Os((i,e)=>$a(i,e,[[0,1],[.15,1],[.3,.35],[.5,.05],[1,0]])),jet:()=>Os((i,e)=>{let t=i.createImageData(e,e);for(let n=0;n<e;n++)for(let s=0;s<e;s++){let r=(e-1-n)/(e-1),a=s/(e-1)-.5,o=.03+.32*r,c=Math.pow(1-r,2)*Math.exp(-(a*a)/(2*o*o*.5))*(.4+.6*Math.min(1,r*12)),l=(n*e+s)*4;t.data[l]=t.data[l+1]=t.data[l+2]=255,t.data[l+3]=Math.round(255*Math.min(1,c))}i.putImageData(t,0,0)},128),ring:()=>Os((i,e)=>{let t=i.createRadialGradient(e/2,e/2,e*.3,e/2,e/2,e/2);t.addColorStop(0,"rgba(255,255,255,0)"),t.addColorStop(.55,"rgba(255,255,255,0.9)"),t.addColorStop(.72,"rgba(255,255,255,0.1)"),t.addColorStop(.9,"rgba(255,255,255,0.003)"),t.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=t,i.fillRect(0,0,e,e)}),flash:()=>Os((i,e)=>{$a(i,e,[[0,1],[.07,.85],[.18,.35],[.38,.06],[.6,.01],[.85,.001],[1,0]]);let t=qu(5);i.globalCompositeOperation="lighter";for(let n=0;n<11;n++){i.save(),i.translate(e/2,e/2),i.rotate(t()*Math.PI*2);let s=e*(.25+t()*.25),r=i.createLinearGradient(0,0,s,0);r.addColorStop(0,"rgba(255,255,255,0.9)"),r.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=r,i.beginPath(),i.moveTo(0,-e*.014),i.lineTo(s,0),i.lineTo(0,e*.014),i.fill(),i.restore()}})},kv=`
  uniform vec2 uScale; uniform float uRot; varying vec2 vUv;
  void main(){
    vUv = uv; vec4 mv = modelViewMatrix * vec4(0.,0.,0.,1.);
    float c = cos(uRot), s = sin(uRot); vec2 p = position.xy * uScale; p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
    mv.xy += p; gl_Position = projectionMatrix * mv;
  }`,zv=`
  uniform sampler2D uMap; uniform vec2 uGrid; uniform float uFrame; uniform vec3 uTint; uniform float uIntensity, uPremult, uNormal; varying vec2 vUv;
  void main(){
    float f = floor(uFrame); float col = mod(f, uGrid.x); float row = floor(f / uGrid.x);
    vec2 uv = (vec2(col, uGrid.y - 1. - row) + vUv) / uGrid;
    vec4 t = texture2D(uMap, uv); vec3 c = mix(t.rgb * t.a, t.rgb, uPremult) * uTint * uIntensity;
    gl_FragColor = uNormal > .5 ? vec4(c, t.a * uIntensity) : vec4(c, max(c.r, max(c.g, c.b)));
  }`,Pp={blending:Na,blendEquation:Ti,blendSrc:Xi,blendDst:Xi,blendSrcAlpha:Xi,blendDstAlpha:Xi},Hv=new ki(1,1),Yu=class{constructor(e,t,n=!1){this.mat=new un({vertexShader:kv,fragmentShader:zv,transparent:!0,depthWrite:!1,depthTest:!0,...n?{blending:Na,blendEquation:Ti,blendSrc:Xi,blendDst:Tr,blendSrcAlpha:Xi,blendDstAlpha:Tr}:Pp,uniforms:{uPremult:{value:0},uNormal:{value:n?1:0},uMap:{value:null},uGrid:{value:new Re(1,1)},uFrame:{value:0},uTint:{value:new Ge(1,1,1)},uIntensity:{value:1},uScale:{value:new Re(1,1)},uRot:{value:0}}}),this.mesh=new yt(Hv,this.mat),this.mesh.frustumCulled=!1,this.mesh.visible=!1,this.mesh.renderOrder=10,this.atlas=e,t.add(this.mesh),this.apply()}apply(){let e=this.atlas;this.mat.uniforms.uMap.value=e.tex,this.mat.uniforms.uPremult.value=e.proc?0:1,this.mat.uniforms.uGrid.value.set(e.grid[0],e.grid[1])}place(e,t,{rot:n=0,tint:s,intensity:r=1,age:a=0,aspect:o=1}={}){let c=this.atlas,l=this.mat.uniforms,h=a*c.fps;h=c.loop?h%c.frames:Math.min(h,c.frames-1),this.mesh.position.copy(e),l.uScale.value.set(t*o,t),l.uRot.value=n,l.uFrame.value=h,l.uIntensity.value=r,s&&l.uTint.value.copy(s),this.mesh.visible=r>.002&&t>0}hide(){this.mesh.visible=!1}},Gv=`
  attribute vec2 aUv; attribute vec4 aCol; attribute vec2 aPar; varying vec2 vUv; varying vec4 vCol; varying vec2 vPar;
  void main(){ vUv = aUv; vCol = aCol; vPar = aPar; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,Vv=`
  varying vec2 vUv; varying vec4 vCol; varying vec2 vPar;
  void main(){
    float along = pow(max(1. - vUv.x, 0.), vPar.x) * smoothstep(0., 0.04, vUv.x + 0.0001);
    float across = exp(-vUv.y * vUv.y * vPar.y);
    float v = along * across;
    // hot (whiter) core
    vec3 c = vCol.rgb * vCol.a * v + vec3(1.0, 0.85, 0.7) * vCol.a * 0.35 * v * v * v;
    gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
  }`,Ju=class{constructor(e,t,n){this.max=e,this.n=t,this.count=0;let s=e*t*2;this.pos=new Float32Array(s*3),this.uv=new Float32Array(s*2),this.col=new Float32Array(s*4),this.par=new Float32Array(s*2);let r=new Uint32Array(e*(t-1)*6),a=0;for(let c=0;c<e;c++)for(let l=0;l<t-1;l++){let h=(c*t+l)*2;r.set([h,h+1,h+2,h+1,h+3,h+2],a),a+=6}let o=new Ct;o.setAttribute("position",new St(this.pos,3).setUsage(Cr)),o.setAttribute("aUv",new St(this.uv,2).setUsage(Cr)),o.setAttribute("aCol",new St(this.col,4).setUsage(Cr)),o.setAttribute("aPar",new St(this.par,2).setUsage(Cr)),o.setIndex(new St(r,1)),this.geo=o,this.mesh=new yt(o,new un({vertexShader:Gv,fragmentShader:Vv,transparent:!0,depthWrite:!1,depthTest:!0,side:pn,...Pp})),this.mesh.frustumCulled=!1,this.mesh.renderOrder=9,n.add(this.mesh)}begin(){this.count=0}add(e,t,n,s,r,a=1.5,o=6){if(this.count>=this.max||e.length<2)return;let c=this.n,l=this.count++,h=e.length;for(let u=0;u<c;u++){let f=Math.min(u,h-1),d=e[f],_=u<h?t[f]:0,y=e[Math.max(0,f-1)],g=e[Math.min(h-1,f+1)];Ri.subVectors(g,y),Ci.subVectors(d,n).cross(Ri),Ci.lengthSq()<1e-12&&Ci.set(0,1,0),Ci.normalize().multiplyScalar(_*.5);let p=(l*c+u)*2,E=Math.min(1,u/(h-1));for(let m=0;m<2;m++){let M=p+m,v=m?1:-1;this.pos[M*3]=d.x+Ci.x*v,this.pos[M*3+1]=d.y+Ci.y*v,this.pos[M*3+2]=d.z+Ci.z*v,this.uv[M*2]=E,this.uv[M*2+1]=v,this.col[M*4]=s.r,this.col[M*4+1]=s.g,this.col[M*4+2]=s.b,this.col[M*4+3]=r,this.par[M*2]=a,this.par[M*2+1]=o}}}end(){let e=this.n*2;for(let t=this.count;t<this.max;t++){let n=t*e;this.col.fill(0,n*4,(n+e)*4),this.pos.fill(0,n*3,(n+e)*3)}for(let t of["position","aUv","aCol","aPar"])this.geo.attributes[t].needsUpdate=!0}},Ip="varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";function Wu(i,e){return new un({vertexShader:Ip,fragmentShader:i,uniforms:e,depthTest:!1,depthWrite:!1,blending:On})}var Wv=`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr, uKnee; varying vec2 vUv;
  vec3 pf(vec3 c){ c = min(c, vec3(40.)); float br = max(c.r, max(c.g, c.b)); float rq = clamp(br - uThr + uKnee, 0., 2.*uKnee); rq = rq*rq/(4.*uKnee + 1e-4); float w = max(rq, br - uThr) / max(br, 1e-4); return c * w; }
  void main(){ vec3 a = pf(texture2D(tSrc, vUv + uTexel*vec2(-.5,-.5)).rgb) + pf(texture2D(tSrc, vUv + uTexel*vec2(.5,-.5)).rgb) + pf(texture2D(tSrc, vUv + uTexel*vec2(-.5,.5)).rgb) + pf(texture2D(tSrc, vUv + uTexel*vec2(.5,.5)).rgb); gl_FragColor = vec4(a*.25, 1.); }`,qv=`uniform sampler2D tSrc; uniform vec2 uHalf; varying vec2 vUv;
  void main(){ vec3 s = texture2D(tSrc, vUv).rgb*4.; s += texture2D(tSrc, vUv - uHalf).rgb; s += texture2D(tSrc, vUv + uHalf).rgb; s += texture2D(tSrc, vUv + vec2(uHalf.x, -uHalf.y)).rgb; s += texture2D(tSrc, vUv - vec2(uHalf.x, -uHalf.y)).rgb; gl_FragColor = vec4(s/8., 1.); }`,Xv=`uniform sampler2D tLow, tHigh; uniform vec2 uHalf; uniform float uMixLow; varying vec2 vUv;
  void main(){ vec2 h = uHalf; vec3 s = texture2D(tLow, vUv + vec2(-h.x*2., 0.)).rgb; s += texture2D(tLow, vUv + vec2(-h.x, h.y)).rgb*2.; s += texture2D(tLow, vUv + vec2(0., h.y*2.)).rgb; s += texture2D(tLow, vUv + vec2(h.x, h.y)).rgb*2.; s += texture2D(tLow, vUv + vec2(h.x*2., 0.)).rgb; s += texture2D(tLow, vUv + vec2(h.x, -h.y)).rgb*2.; s += texture2D(tLow, vUv + vec2(0., -h.y*2.)).rgb; s += texture2D(tLow, vUv + vec2(-h.x, -h.y)).rgb*2.;
    gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + s/12. * uMixLow, 1.); }`,jv=`uniform sampler2D tScene, tBloom; uniform float uBloom, uExposure, uGain; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec4 s = texture2D(tScene, vUv) * uGain; vec3 b = texture2D(tBloom, vUv).rgb * uBloom * uGain;
    gl_FragColor = vec4(s.rgb + b, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb += (hash(gl_FragCoord.xy) - .5) / 255.;   // dither, hides banding in the glow
    gl_FragColor.rgb = max(gl_FragColor.rgb, 0.);
    float cov = max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b));
    gl_FragColor.a = clamp(max(s.a, cov), 0., 1.);               // glow = additive light => it also adds coverage (premultiplied-valid)
    gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(gl_FragColor.a));
  }`,Zu=class{constructor(e=5){this.levels=e,this.rt=[],this.up=[],this.quad=new Ya}resize(e,t){this.dispose();let n={type:Ln,format:vn,minFilter:It,magFilter:It,depthBuffer:!1},s=Math.max(2,e>>1),r=Math.max(2,t>>1);for(let a=0;a<this.levels;a++)this.rt.push(new ln(s,r,n)),a<this.levels-1&&this.up.push(new ln(s,r,n)),s=Math.max(2,s>>1),r=Math.max(2,r>>1);this.pre=Wu(Wv,{tSrc:{value:null},uTexel:{value:new Re(1/e,1/t)},uThr:{value:1},uKnee:{value:.6}}),this.down=Wu(qv,{tSrc:{value:null},uHalf:{value:new Re}}),this.upm=Wu(Xv,{tLow:{value:null},tHigh:{value:null},uHalf:{value:new Re},uMixLow:{value:1}})}run(e,t){let n=this.quad,s=this.levels;n.material=this.pre,this.pre.uniforms.tSrc.value=t,e.setRenderTarget(this.rt[0]),n.render(e),n.material=this.down;for(let a=1;a<s;a++){let o=this.rt[a-1];this.down.uniforms.tSrc.value=o.texture,this.down.uniforms.uHalf.value.set(.5/o.width,.5/o.height),e.setRenderTarget(this.rt[a]),n.render(e)}n.material=this.upm;let r=this.rt[s-1].texture;for(let a=s-2;a>=0;a--){let o=a===s-2?this.rt[s-1]:this.up[a+1];this.upm.uniforms.tLow.value=o.texture,this.upm.uniforms.tHigh.value=this.rt[a].texture,this.upm.uniforms.uHalf.value.set(.5/o.width,.5/o.height),e.setRenderTarget(this.up[a]),n.render(e)}return this.up[0].texture}dispose(){for(let e of[...this.rt,...this.up])e.dispose();this.rt=[],this.up=[]}};function Kv(){let i=new tn,e=new xn({color:1777188,metalness:.8,roughness:.42}),t=new xn({color:1053206,metalness:.75,roughness:.5}),n=new xn({color:9383688,metalness:.35,roughness:.5,emissive:12730636,emissiveIntensity:.3}),s=new _n({color:329743,metalness:.1,roughness:.04,clearcoat:1,clearcoatRoughness:.03,emissive:1059402,emissiveIntensity:.5}),r=new hn({color:new Ge(3.2,1.25,.25),toneMapped:!1}),a=new hn({color:new Ge(2.4,2.2,1.8),toneMapped:!1}),o=new hn({color:new Ge(5,1.9,.5),toneMapped:!1}),c=(y,g,p=0,E=0,m=0)=>{let M=new yt(y,g);return M.position.set(p,E,m),i.add(M),M},l=[[.3,-3],[.52,-2.7],[.62,-1.9],[.62,-.6],[.55,.6],[.42,1.7],[.22,2.6],[.07,3.05],[0,3.12]].map(([y,g])=>new Re(y,g)),h=new Ta(l,28);h.rotateX(Math.PI/2),h.scale(1,.62,1),c(h,e),c(new _r(1,24,16),s,0,.3,.75).scale.set(.34,.26,.95);let f=new as;f.moveTo(.3,1.1),f.lineTo(2.9,-2.05),f.lineTo(2.9,-2.75),f.lineTo(.45,-2.45),f.closePath();let d=new Sa(f,{depth:.09,bevelEnabled:!0,bevelSize:.03,bevelThickness:.03,bevelSegments:2});d.rotateX(Math.PI/2),d.translate(0,.02,0);let _=new Ea(new as([new Re(.62,.35),new Re(2.35,-1.65),new Re(2.35,-1.95),new Re(.7,-1.2)]));_.rotateX(-Math.PI/2);for(let y of[1,-1]){let g=c(d,t);g.scale.x=y;let p=c(_,n,0,0,0);p.scale.x=y,p.position.y=.065;let E=c(new As(.075,.1,2.7,12),e,y*1.95,-.02,.15);E.rotation.x=Math.PI/2;let m=c(new As(.1,.075,.25,12),n,y*1.95,-.02,1.62);m.rotation.x=Math.PI/2;let M=c(new nn(.07,1.05,1),e,y*.62,.45,-2.3);M.rotation.z=-y*.32,M.rotation.x=-.12;let v=c(new As(.36,.3,2,20),e,y*.88,-.05,-2.15);v.rotation.x=Math.PI/2;let S=c(new wa(.3,.05,8,24),n,y*.88,-.05,-3.12),T=c(new pa(.27,20),o,y*.88,-.05,-3.14);T.rotation.y=Math.PI,c(new nn(.18,.16,.8),t,y*.5,-.08,.3)}for(let y of[1,-1]){c(new nn(.035,.03,1.5),r,y*.24,.255,.3);let g=c(new nn(1.7,.02,.035),r,y*1.55,.075,-.9);g.rotation.y=y*.62,c(new _r(.05,8,6),a,y*2.95,0,-2.35),c(new nn(.05,.4,.04),r,y*.62+y*.12,.62,-2.5).rotation.z=-y*.32}return c(new nn(.06,.03,1.2),r,0,.395,-1.6),c(new nn(.2,.12,2.6),t,0,.36,-1.3),c(new nn(.5,.05,1.3),n,0,.12+.22,-1).scale.set(.4,1,1),i.userData.engines=[new k(-.88,-.05,-3.2),new k(.88,-.05,-3.2)],i.userData.muzzles=[new k(-1.95,-.02,1.78),new k(1.95,-.02,1.78),new k(0,-.05,3.2)],i}var Ml=class i{static create(e,t={}){return new i(e,t)}constructor(e,{dpr:t=1,seed:n=7}={}){let s=document.createElement("canvas");s.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",e.appendChild(s),this.canvas=s,this.g=s.getContext("2d"),this.dpr=t,this.container=e,this.hits=[],this.lt=null,this.sealT=[Nt.SEAL[0],Nt.SEAL[1]],this.seed=n,this.w=0,this.h=0}fit(){let e=Math.round((this.container.clientWidth||innerWidth)*this.dpr),t=Math.round((this.container.clientHeight||innerHeight)*this.dpr);(e!==this.w||t!==this.h)&&(this.w=this.canvas.width=e,this.h=this.canvas.height=t)}hit(e){let t=qu(this.seed+this.hits.length*97),n=8+Math.round(e.strength*9),s=[];for(let r=0;r<n;r++){let a=r/n*Math.PI*2+t()*.5,o=[[0,0]],c=0,l=a,h=.1+.26*e.strength*(.5+t());for(;c<h;)c+=.012+t()*.02,l+=(t()-.5)*.35,o.push([Math.cos(l)*c,Math.sin(l)*c]);s.push(o)}this.hits.push({...e,rays:s,ring:.03+.05*e.strength})}light(e){this.lt=e}seal(e){this.sealT=[e.from,e.to]}dispose(){this.canvas.remove()}render(e){this.fit();let t=this.g,n=this.w,s=this.h;t.clearRect(0,0,n,s);let r=1-gt(this.sealT[0],this.sealT[1],e);if(!(r<=0))for(let a of this.hits){let o=e-a.at;if(o<0)continue;let c=1-Math.pow(1-Yt(o/160),3),l=a.x*n,h=a.y*s;t.save(),t.translate(l,h),t.lineCap="round",t.lineJoin="round";let u=this.lt?this.lt.intensity:0;for(let f of[a.rays])for(let d of f){let _=Math.max(2,Math.floor(d.length*c));for(let y=1;y<_;y++)t.strokeStyle=`rgba(235,245,255,${(.85-y/d.length*.5)*r})`,t.lineWidth=Math.max(.6,(3.2-y*.22)*(s/1080)),t.shadowColor=`rgba(255,130,40,${.9*u*r})`,t.shadowBlur=10*u,t.beginPath(),t.moveTo(d[y-1][0]*s,d[y-1][1]*s),t.lineTo(d[y][0]*s,d[y][1]*s),t.stroke()}t.strokeStyle=`rgba(255,255,255,${.5*r})`,t.lineWidth=1.4*(s/1080),t.beginPath(),t.arc(0,0,a.ring*s*c,0,Math.PI*2),t.stroke(),t.fillStyle=`rgba(210,225,245,${.25*r*a.strength})`,t.beginPath(),t.arc(0,0,.018*s*(.6+a.strength),0,Math.PI*2),t.fill(),t.restore()}}};function Yv(i={}){let e=i.container||document.body,t=!!i.reduced,n=i.maxInternalHeight||1440,s=i.maxInternalWidth||2560,r={w:i.width||e.clientWidth||innerWidth,h:i.height||e.clientHeight||innerHeight},a=i.dpr||devicePixelRatio||1,o=document.createElement("canvas");Object.assign(o.style,{position:"absolute",inset:"0",width:"100%",height:"100%",pointerEvents:"none"}),e.append(o);let c=new Dr({canvas:o,alpha:!0,premultipliedAlpha:!0,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!!i.preserveDrawingBuffer});c.setClearColor(0,0),c.autoClear=!1,c.setPixelRatio(1),c.toneMapping=i.agx?Ua:Is,c.toneMappingExposure=1;let l=new xi,h=new us(c);l.environment=h.fromScene(new rl,.04).texture,l.environmentIntensity=.3,h.dispose();let u=new Wt(ps,16/9,.02,500);l.add(u);let f=new Wi(16758391,2.4);f.position.set(8,9,12),l.add(f),l.add(f.target);let d=new Wi(5929128,1.1);d.position.set(-9,5,-16),l.add(d);let _=new Pa(4864560,657932,.45);l.add(_);let y=new Wi(16767408,.9);y.position.set(-2,1,10),l.add(y);let g=new tn;l.add(g);let p=Kv();g.add(p);let E={engines:p.userData.engines,muzzles:p.userData.muzzles},m=[0,1,2,3].map(()=>{let re=new yi(16742938,0,0,2);return g.add(re),re}),M={},v={exhaust:["glow",1,1,24,!0],exhaustBack:["glow",1,1,24,!0],smoke:["glow",1,1,24,!1],glow:["glow",1,1,24,!0],muzzle:["star",1,1,24,!1],bolt:["glow",1,1,24,!0],impact:["flash",1,1,24,!1],ring:["ring",1,1,24,!1],core:["core",1,1,24,!0],puff:["puff",1,1,24,!1],jet:["jet",1,1,24,!1]};for(let[re,[je,He,Xe,Ze,$e]]of Object.entries(v))M[re]={tex:Bv[je](),grid:[He,Xe],frames:He*Xe,fps:Ze,loop:$e,proc:!0};let S=new tn;l.add(S);let T=(re,je)=>new Yu(M[re],S,je),x=re=>[0,1,2,3].map(re),C=x(()=>T("exhaust")),P=x(()=>T("exhaustBack")),U=x(()=>T("glow")),L=(re,je)=>Array.from({length:re},je),F=Nt.HITS.map(()=>T("impact")),N=L(4,()=>T("glow")),D=L(4,()=>T("core")),V=L(4,()=>T("glow")),q=L(4,()=>T("glow")),ee=L(4,()=>T("ring")),G=L(3,()=>T("puff",!0)),te=null,ce=!1,Le=new yi(16754784,0,0,2);l.add(Le);let Ce=L(16,()=>T("jet")),Ne=L(16,()=>T("glow")),ze=L(2,()=>T("glow")),tt=L(2,()=>T("glow")),Z=L(2,()=>T("exhaust")),ae=()=>[...C,...P,...U,...F,...N,...D,...V,...q,...ee,...G,...Ce,...Ne,...ze,...tt,...Z],he=new Ju(44,24,l),Pe,Ae=new Zu(5),De,Je=new Ya,de=2,ge=2,xe=Or.map((re,je)=>({...re,at:Nt.HITS[je]})),_e=new Set,Me=-1,Ue=null,ve=null,ue={},me=null,B={frames:0,last:0,times:[]};function W(re,je,He=a){r.w=re,r.h=je;let Xe=Math.round(re*He),Ze=Math.round(je*He),$e=Math.min(1,n/Ze,s/Xe);Xe=Math.max(2,Math.round(Xe*$e)),Ze=Math.max(2,Math.round(Ze*$e)),de=Xe,ge=Ze,c.setSize(Xe,Ze,!1),u.aspect=Xe/Ze,u.updateProjectionMatrix(),Pe&&Pe.dispose(),Pe=new ln(Xe,Ze,{type:Ln,format:vn,samples:4,depthBuffer:!0,minFilter:It,magFilter:It}),Ae.resize(Xe,Ze),le&&le.resize(re,je,He),De||(De=new un({vertexShader:Ip,fragmentShader:jv,uniforms:{tScene:{value:null},tBloom:{value:null},uBloom:{value:.9},uExposure:{value:1},uGain:{value:1}},depthTest:!1,depthWrite:!1,blending:On}))}let le=null;W(r.w,r.h),i.frame!==!1&&(le=xp({container:e,reduced:t,dpr:a,fov:ps,label:i.lockLabel||"",width:r.w,height:r.h,maxInternalHeight:n,maxInternalWidth:s,preserveDrawingBuffer:!!i.preserveDrawingBuffer}));function A(re){Ue&&Ue.dispose&&Ue.dispose(),Ue=re,re.seal({from:Nt.SEAL[0],to:Nt.SEAL[1]});for(let je of xe)re.hit({x:je.x,y:je.y,strength:je.strength,at:je.at});me&&me.setCracks&&re.hits&&(me.setSeal({from:Nt.SEAL[0],to:Nt.SEAL[1]}),me.setCracks(re))}let b={dpr:Math.min(a,2),maxWidth:2560,reduced:t,glints:!1,warm:!1};function w(){let re=He=>(A(He?He.create(e,b):Ml.create(e,b)),ue.cracksKind=He?"real":"stub",!!He),je=He=>new Promise(Xe=>{if(!He||i.glassUrl===!1)return Xe(He);let Ze=()=>{window.Glass&&(me=window.Glass.create(e,{dpr:Math.min(a,2),maxWidth:1920,reduced:t,atlas:i.glassAtlas,frostUrl:i.frostUrl,preserveDrawingBuffer:!!i.preserveDrawingBuffer}),me.ok?(me.setSeal({from:Nt.SEAL[0],to:Nt.SEAL[1]}),me.setCracks(Ue)):me=null),Xe(He)};if(window.Glass)return Ze();let $e=document.createElement("script");$e.src=(i.glassUrl||"../cracks/glass.js")+"?v="+Date.now(),$e.onload=Ze,$e.onerror=()=>Xe(He),document.head.appendChild($e)});return i.cracksUrl===!1?Promise.resolve(re(null)):window.Cracks?je(re(window.Cracks)):new Promise(He=>{let Xe=document.createElement("script");Xe.src=(i.cracksUrl||"../cracks/cracks.js")+"?v="+Date.now(),Xe.onload=()=>He(je(re(window.Cracks))),Xe.onerror=()=>He(re(null)),document.head.appendChild(Xe)})}ve=w();function I(re,je={}){let He=je.length||6,Xe=(je.nose||"+z").toLowerCase(),Ze=new tn,$e=re;Ze.add($e);let Mt={"+x":[1,0,0],"-x":[-1,0,0],"+y":[0,1,0],"-y":[0,-1,0],"+z":[0,0,1],"-z":[0,0,-1]},fn=new k(...Mt[Xe]);if(Ze.quaternion.setFromUnitVectors(fn,Cp),je.up){let J=new Ot().setFromUnitVectors(new k(...Mt[je.up]).applyQuaternion(Ze.quaternion),vl);Ze.quaternion.premultiply(J)}re.traverse(J=>{J.material&&(Array.isArray(J.material)?J.material:[J.material]).forEach($=>{$.side=pn})}),Ze.updateMatrixWorld(!0);let nt=new wn().setFromObject(Ze),Pt=nt.getSize(new k),Lt=nt.getCenter(new k),zt=He/Pt.z,Dt=new tn;Dt.add(Ze),Ze.position.sub(Lt),Dt.scale.setScalar(zt);let Jt=Pt.clone().multiplyScalar(zt),R=je.engines||[[-.14,0,-.5],[.14,0,-.5]],j=je.muzzles||[[-.3,0,.3],[.3,0,.3],[0,0,.5]];E={engines:R.map(J=>new k(J[0]*He,J[1]*He,J[2]*He)),muzzles:j.map(J=>new k(J[0]*He,J[1]*He,J[2]*He))},g.remove(p),p.traverse(J=>{J.geometry&&J.geometry.dispose()}),p=Dt,g.add(p),g.position.set(0,0,0),g.quaternion.identity(),g.scale.setScalar(1),g.updateMatrixWorld(!0);let oe={engine:[],muzzle:[]};re.traverse(J=>{let $=/^(engine|muzzle)_(\d+)/.exec(J.name||"");$&&oe[$[1]].push([Number($[2]),J.getWorldPosition(new k)])});for(let J of["engine","muzzle"])if(oe[J].length){let $=oe[J].sort((Fe,Ve)=>Fe[0]-Ve[0]).map(Fe=>Fe[1]);E[J+"s"]=$}return E.engineScale=je.engineScale||1,g.userData.size=Jt,Dt}function z(re,je={}){let He=new al;return He.setMeshoptDecoder(gp),He.loadAsync(re).then(Xe=>I(Xe.scene,je))}function X(re){let je=new Cs,He=[];for(let[Xe,Ze]of Object.entries(re||{})){if(!M[Xe])continue;let $e=Ze.json||{},Mt=M[Xe],fn=nt=>{nt.colorSpace=Vt,nt.flipY=!0,nt.generateMipmaps=!1,nt.minFilter=It,nt.magFilter=It,nt.needsUpdate=!0,Mt.proc&&Mt.tex.dispose(),Mt.tex=nt,Mt.proc=!1,Mt.grid=$e.grid||[$e.columns||1,$e.rows||1],Mt.frames=$e.frames||Mt.grid[0]*Mt.grid[1],Mt.fps=$e.fps||24,Mt.loop=$e.loop!=null?$e.loop:Xe==="exhaust"||Xe==="bolt"||Xe==="exhaustBack",$e.intensity&&(Mt.intensity=$e.intensity)};if(Ze.texture)fn(Ze.texture);else if(Ze.image&&Ze.image.tagName){let nt=new jt(Ze.image);nt.needsUpdate=!0,fn(nt)}else Ze.url&&He.push(je.loadAsync(Ze.url).then(fn))}return Promise.all(He).then(()=>{for(let Xe of ae())Xe.apply()})}let ie=re=>(_e.add(re),()=>_e.delete(re)),O={pos:new k,quat:new Ot,qTrail:new Ot,throttle:1},K={pos:new k,quat:new Ot,qTrail:new Ot,throttle:1},Y=new Ge(1,.42,.1),fe=new Ge(1,.7,.35),ne=new Ge(1,.5,.16),Q=new k,pe=new k,we=(re,je)=>re*2*Math.tan(ps*Math.PI/360)*je;function Ie(re,je,He){let Xe=Math.tan(ps*Math.PI/360)*-_p,Ze=Xe*u.aspect;return He.set((re*2-1)*Ze,(1-je*2)*Xe,_p)}let H=[0,1,2,3].map(()=>new k),ye=[new k,new k],se=[[0,0],[1,1],[2,0],[2,1]],Se=[{p:[.06,0,.4],n:[1,0,0]},{p:[-.06,0,.4],n:[-1,0,0]},{p:[0,.06,.4],n:[0,1,0]},{p:[0,-.07,.4],n:[0,-1,0]},{p:[.14,.03,-.42],n:[1,0,0]},{p:[-.14,.03,-.42],n:[-1,0,0]},{p:[0,.09,-.42],n:[0,1,0]},{p:[0,-.05,-.42],n:[0,-1,0]},{p:[.27,.02,-.15],n:[0,1,0]},{p:[-.27,.02,-.15],n:[0,1,0]}],Te=Se.map(re=>Sn(to(re.p,en(re.n,-1)))),be=[];{xl();let re={pos:new k,quat:null,alpha:new k};for(let He=160;He<9e3;He+=80){yl(He,re);let Xe=re.alpha,Ze=Xe.length();if(Ze<4)continue;let $e=[Xe.x/Ze,Xe.y/Ze,Xe.z/Ze],Mt=Yt((Ze-4)/8),fn=Te.map((nt,Pt)=>[ml(nt,$e),Pt]).filter(nt=>nt[0]>.55).sort((nt,Pt)=>Pt[0]-nt[0]).slice(0,2);for(let[,nt]of fn)be.push({t:He,port:nt,s:Mt})}let je=(He,Xe,Ze,$e)=>{be.push({t:He,port:Ze,s:Xe},{t:He,port:$e,s:Xe})};[[0,.5,.2],[1,.5,.2],[2,.65,.3]].forEach(([He,Xe,Ze])=>{let $e=Nt.SHOTS[He];je($e+35,Xe,3,6),je($e+150,Ze,2,7)}),[5560,6020,6480,6750].forEach((He,Xe)=>je(He,.3,Xe%2?1:0,Xe%2?4:5)),be.sort((He,Xe)=>He.t-Xe.t)}let Be=[0,0,0,0,0];function ke(re){let je=[.45,.5,1],He=[140,140,230],Xe=0;for(let Lt=0;Lt<3;Lt++)re>=Nt.HITS[Lt]&&(Xe+=je[Lt]*Math.exp(-(re-Nt.HITS[Lt])/He[Lt]));let Ze=Math.min(1,Xe)**2;yl(re,$n);let $e=$n.pos.length(),Mt=.16*$n.retro*gt(25,12,$e)+.6*gt(9,4.5,$e)*gt(6,20,$n.speed),fn=Ze*Hn(re,19.1,31.7,.2)+Mt*Hn(re,7.1,8.7,.2),nt=Ze*Hn(re,17.3,27.9,1.1)+Mt*Hn(re,7.7,9.1,1.3),Pt=Ze*Hn(re,23.3,13.7,2.3)+Mt*Hn(re,8.3,7.3,2.1);return Be[0]=.01*fn,Be[1]=.012*nt,Be[2]=.006*Pt,Be[3]=.004*Ze*Hn(re,21.3,29.1,.9),Be[4]=.004*Ze*Hn(re,18.7,25.3,1.7),Be}let ht=(re,je,He)=>new Ge(Dn(re[0],je[0],He),Dn(re[1],je[1],He),Dn(re[2],je[2],He)),st=re=>re>.6?ht([1,.4,.1],[1,.75,.45],Yt((re-.6)/.6)):ht([.7,.15,.03],[1,.4,.1],Yt(re/.6)),Gt=[1,.7,.45],Tt=[.62,.58,.55];function Gn(re){re=Number(re)||0;let je=performance.now();if(Me>=0&&re>Me){for(let $e of xe)if($e.at>Me&&$e.at<=re)for(let Mt of _e)Mt({x:$e.x,y:$e.y,strength:$e.strength,at:$e.at})}Me=re,c.setRenderTarget(Pe),c.clear(!0,!0,!0),he.begin();let He=0,Xe=0;for(let $e of ae())$e.hide();g.visible=!1;for(let $e of m)$e.intensity=0;if(!t&&re>=0&&re<Nt.END){let $e=ke(re);if(u.rotation.set($e[0],$e[1],$e[2]),u.position.set($e[3],$e[4],0),u.updateMatrixWorld(!0),!i.noShip&&(re<8450||re>=Mn&&re<11400)){Za(re,O);let nt=O.pos.length(),Pt=O.throttle,Lt=O.retro,zt=re>=Mn?Nv(re):Uv(re),Dt=re>=Mn?gt(Mn,Mn+300,re)*(1-gt(10930,11330,re))*.4:gt(0,800,re);g.scale.setScalar(zt),g.visible=O.pos.z<-.35,g.position.copy(O.pos),g.quaternion.copy(O.quat),g.updateMatrixWorld(!0);let Jt=gt(6,18,nt)*gt(-.5,-5,O.pos.z),R=gt(30,8,nt)*(1-.92*gt(14,6,nt));{let Ee=Jn*zt/(2*Math.tan(ps*Math.PI/360)*Math.max(nt,.1))*1080,it=re>=Mn;Xe=it?gt(95,55,Ee):0;let ft=it?1-gt(10930,11330,re):1;te||(te=[],g.traverse(Qe=>{Qe.material&&(Array.isArray(Qe.material)?Qe.material:[Qe.material]).forEach(rt=>te.push({m:rt,em:rt.emissiveIntensity!=null?rt.emissiveIntensity:0,tr:rt.transparent,op:rt.opacity}))}));for(let Qe of te){Qe.m.emissiveIntensity!=null&&(Qe.m.emissiveIntensity=Qe.em*(1-.5*Xe));let rt=ft<.999||Qe.tr;Qe.m.transparent!==rt&&(Qe.m.transparent=rt,Qe.m.needsUpdate=!0),Qe.m.opacity=Qe.op*ft}ce=Ee<15}let j=gt(14,6,nt);He=j,f.intensity=2.4*(1-.55*j),y.intensity=.9*(1-.7*j);let oe=Math.min(4,E.engines.length),J=2/oe;m.forEach((Ee,it)=>{if(it>=oe){Ee.intensity=0;return}Ee.position.copy(E.engines[it]).add(Q.set(0,0,-.8)),Ee.intensity=(1.5+8*R)*Pt*J}),f.target.position.copy(O.pos),Zn.set(0,0,1).applyQuaternion(O.quat);let $=Zn.dot(pe.copy(O.pos).negate().normalize()),Fe=gt(.4,.85,Math.sqrt(Math.max(0,1-$*$))),Ve=gt(.1,-.55,$),Oe=gt(-.1,.55,$),Ke=1+.8*pl(7120,7140,7200,re),Ye=1;for(let Ee=0;Ee<4;Ee++){if(Ee>=oe)continue;H[Ee].copy(E.engines[Ee]).multiplyScalar(zt).applyQuaternion(O.quat).add(O.pos);let it=H[Ee].length(),ft=1+.35*gt(6900,7700,re),Qe=E.engineScale*J**.5*zt*(re>=Mn?.45:1),rt=Math.max(3*Qe*Math.min(Pt,1.6)*ft,it*.045*Qe),kt=Math.max(1.5*Qe*Math.min(Pt,1.4),it*.02*Qe);Ye=kt,Ri.set(0,0,-1).applyQuaternion(O.quat),Q.copy(H[Ee]).project(u),pe.copy(H[Ee]).add(Ri).project(u);let qe=Math.atan2(pe.y-Q.y,(pe.x-Q.x)*u.aspect);Bs.copy(H[Ee]).addScaledVector(Ri,rt*.425),C[Ee].place(Bs,rt,{rot:qe,intensity:1.1*Fe*Jt*Dt*Math.min(1.2,.5+Pt*.5),age:(re>=Mn?8.5:re/1e3)+Ee*.21}),P[Ee].place(H[Ee],kt*1.5,{intensity:1.6*Ve*Jt*Ke*Dt,age:(re>=Mn?8.5:re/1e3)+Ee*.13}),U[Ee].place(H[Ee],Math.max(1.6*Qe*Math.min(Pt,1.4),it*.03*Qe),{intensity:.35*Jt*Dt*Math.min(1.3,.4+Pt*.6),tint:Y,age:0});let Zt=150+100*gt(6900,7800,re),xt=[],on=[],dn=22;Qa.copy(H[Ee]).sub(O.pos);for(let Rn=0;Rn<dn;Rn++){let Ki=re-Rn/(dn-1)*Zt,Et=Ov(Ki,new k).add(Qa);xt.push(Et),on.push(Math.max(.14*Qe*(1-Rn/(dn-1)),Et.length()*.0016*(1-Rn/(dn-1))))}ce||he.add(xt,on,u.position,Y,.4*Math.min(1,.3+Pt*.6)*Jt*Dt,1.6,5)}for(let Ee=0;Ee<2&&!(Lt<.02||Jn*zt/(2*Math.tan(ps*Math.PI/360)*Math.max(nt,.1))*1080<40);Ee++){let it=Ee?-1:1;Bs.set(it*.2*Jn*zt,-.02*Jn*zt,.28*Jn*zt).applyQuaternion(O.quat).add(O.pos);let ft=Bs.clone(),Qe=ft.length();tt[Ee].place(ft,Math.max(1.2*Ye,Qe*.012),{intensity:Math.min(.45,.35*Lt)*Oe*Jt,tint:new Ge(1,.8,.6),age:0}),Ri.set(0,0,1).applyQuaternion(O.quat),Q.copy(ft).project(u),pe.copy(ft).add(Ri).project(u);let rt=Math.atan2(pe.y-Q.y,(pe.x-Q.x)*u.aspect),kt=1.35*Lt;Qa.copy(ft).addScaledVector(Ri,kt*.425),Z[Ee].place(Qa,kt,{rot:rt,intensity:1.2*Lt*Fe*Jt,tint:new Ge(1,.85,.7),age:re/1e3+Ee*.3})}for(let Ee=0;Ee<2;Ee++){let it=0;for(let rt=0;rt<3;rt++)re>Nt.SHOTS[rt]&&(rt===2||rt===Ee)&&(it+=.8*Math.exp(-(re-Nt.SHOTS[rt])/1200));it=Math.min(1.4,it);let ft=0,Qe=Math.max(it,0);Qe+ft<.02||(Q.copy(E.muzzles[Ee%E.muzzles.length]).applyQuaternion(O.quat).add(O.pos),ze[Ee].place(Q,Jn*Dn(.09,.11,ft)*(1+ft*.2),{intensity:(1.2*Qe+1.3*ft)*Jt,tint:ft>.05?new Ge(1,.75,.45):st(Qe),age:0}))}let ot=0,ut=Jn*zt/(2*Math.tan(ps*Math.PI/360)*Math.max(nt,.1))*1080;for(let Ee of be){if(ut<40)break;let it=re-Ee.t;if(it<0)break;if(it>90)continue;if(ot>=16)break;let ft=Se[Ee.port],Qe=new k(...ft.p).multiplyScalar(Jn*zt).applyQuaternion(O.quat).add(O.pos),rt=new k(...ft.n).applyQuaternion(O.quat),kt=it/1e3,qe=.6*(.06*Jn+30*kt),Zt=Math.pow(1-it/90,2),xt=Math.abs(rt.dot(Ri.copy(Qe).normalize())),on=gt(.6,.9,xt);Q.copy(Qe).project(u),pe.copy(Qe).add(rt).project(u);let dn=Math.atan2(pe.y-Q.y,(pe.x-Q.x)*u.aspect)-Math.PI/2;Bs.copy(Qe).addScaledVector(rt,qe*.5),Ce[ot].place(Bs,qe,{rot:dn,intensity:Math.min(.3,.3*Ee.s*Zt)*(1-on)*Jt,tint:new Ge(.85,.9,1),age:0}),Ne[ot].place(Qe,Math.max(qe*.6,.03*Jn),{intensity:Math.min(.3,(it<30?.3*(1-it/30):0)*Ee.s+.3*Ee.s*Zt*on)*Jt,tint:new Ge(.85,.9,1),age:0}),ot++}Ue&&Ue.light&&(Q.copy(O.pos).project(u),Ue.light({x:Yt(Q.x*.5+.5),y:Yt(.5-Q.y*.5),intensity:Yt(R*Math.min(Pt,1.2)*.6+.08),color:"#ff8a1f"}))}let Mt=se.map(([nt,Pt])=>{let Lt=Nt.SHOTS[nt];Za(Lt,K);let zt=E.muzzles[Pt%E.muzzles.length].clone().applyQuaternion(K.quat).add(K.pos),Dt=Ie(Or[nt].x,Or[nt].y,new k);return{m:zt,tg:Dt,dir:Dt.clone().sub(zt).normalize()}}),fn=[[5810,5920],[5980,6090],[6120,6260]];{let nt=0,Pt=null;se.forEach(([Lt],zt)=>{let Dt=re-Nt.SHOTS[Lt];if(Dt>=0&&Dt<400){let Jt=(Lt===2?1.5:1)*420*Math.exp(-Dt/35);Jt>nt&&(nt=Jt,Pt=Mt[zt].m)}}),Le.intensity=nt,Pt&&Le.position.copy(Pt).add(Q.set(0,.25,.35))}se.forEach(([nt,Pt],Lt)=>{let zt=Nt.SHOTS[nt],Dt=re-zt,{m:Jt,tg:R}=Mt[Lt],j=nt===2?1.4:1,[oe,J]=fn[nt];if(re>=oe&&re<J){let Fe=(re-oe)/(J-oe);Za(re,K),Q.copy(E.muzzles[Pt%E.muzzles.length]).applyQuaternion(K.quat).add(K.pos),V[Lt].place(Q,Jn*Dn(.02,.04,Fe),{intensity:Fe*Fe*(nt===2?1.1:.8)*(1+.1*Math.sin(2*Math.PI*30*re/1e3)),tint:new Ge(1,.6,.25),age:0})}Dt>=0&&Dt<150&&q[Lt].place(Jt,Jn*.06,{intensity:1.8*Math.exp(-Dt/30),tint:new Ge(1,.8,.5),age:0});let $=[[5920,5980],[6090,6150],[6260,6320]][nt];if(re>=$[0]&&re<$[1]&&Dt>0&&Dt<Uu){let Fe=ft=>Jt.clone().lerp(R,Yt(ft/Uu)),Ve=Fe(Dt),Oe=Fe(Dt-30),Ke=2*Math.tan(ps*Math.PI/360)*Ve.length()/1080,Ye=gt($[0],$[0]+6,re)*(1-gt($[1]-8,$[1],re));Q.copy(Ve).applyMatrix4(u.matrixWorldInverse),pe.copy(Oe).applyMatrix4(u.matrixWorldInverse);let ot=Math.atan2(Q.y-pe.y,Q.x-pe.x),ut=Yt(Dt/Uu),Ee=46+38*ut*ut,it=Ee/3.6;N[Lt].place(Ve,it*Ke,{rot:ot,aspect:3.6,intensity:1*Ye,tint:new Ge(1,.5,.16),age:0}),D[Lt].place(Ve,it*.38*Ke,{rot:ot,aspect:4.2,intensity:2.2*Ye,tint:new Ge(1,.94,.82),age:0})}});for(let nt=0;nt<3;nt++){if(re-Nt.HITS[nt]<0)continue;let Lt=Or[nt].strength,zt=Ie(Or[nt].x,Or[nt].y,new k)}}else u.rotation.set(0,0,0),u.position.set(0,0,0),u.updateMatrixWorld(!0);he.end(),t||c.render(l,u);let Ze=Ae.run(c,Pe.texture);if(De.uniforms.uGain.value=re>=Mn?1-Yt((re-10900)/400,0,1):1,De.uniforms.uBloom.value=.9*(1-.7*He)*(1-.5*Xe),De.uniforms.tScene.value=Pe.texture,De.uniforms.tBloom.value=Ze,c.setRenderTarget(null),Je.material=De,Je.render(c),Ue&&Ue.render(re),me&&me.render(re),le){let $e=re>=0?ke(re):[0,0,0,0,0],Mt=null;if(!t&&!i.noShip&&re>=0&&(re<8450||re>=Mn&&re<11400)){Za(re,K);let fn=K.pos.clone().project(u),nt=K.pos.length();Mt={nx:Yt(fn.x,-1.3,1.3),ny:Yt(fn.y,-1.3,1.3),glow:(1-gt(10,140,nt))*(re>=Mn?.35:1)}}le.render(re,{shake:[$e[0],$e[1],$e[2],$e[3],$e[4]],ship:Mt})}if(i.measure){let $e=c.getContext();$e.getParameter($e.VERSION),B.times.push(performance.now()-je)}}let Vn=0,li=0;function Wn(re=0,je){li=performance.now()-re;let He=()=>{let Xe=performance.now()-li;Gn(Xe),je&&je(Xe),Xe<Nt.END?Vn=requestAnimationFrame(He):ui()};Vn=requestAnimationFrame(He)}function hi(){cancelAnimationFrame(Vn)}function ui(){hi(),le&&le.dispose(),me&&me.dispose(),Ue&&Ue.dispose&&Ue.dispose();for(let re of ae())re.mat.dispose();for(let re of Object.values(M))re.tex.dispose();he.geo.dispose(),he.mesh.material.dispose(),Ae.dispose(),Pe.dispose(),c.dispose(),o.remove()}function mn(re){let je=ke(re);return[je[1]*1e3,je[0]*1e3]}return Object.assign(ue,{canvas:o,cockpit:le,setLockLabel:re=>le&&le.setLabel(re),render:Gn,loadShip:z,bake:xl,debug:{get cracks(){return Ue},get glass(){return me}},shipInfo:()=>({size:g.userData.size,engines:E.engines.map(re=>re.toArray()),muzzles:E.muzzles.map(re=>re.toArray())}),play:Wn,stop:hi,resize:W,dispose:ui,setShip:I,setSprites:X,setCracks:A,onHit:ie,shakePx:mn,hits:xe,T:Nt,stats:B,renderer:c,camera:u,scene:l,poseAt:Za,get internalSize(){return[de,ge]},cracksKind:ue.cracksKind||"stub",cracksReady:ve}),ue}window.AttackSceneV3=$u;})();
