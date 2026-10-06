(()=>{
const {useState,useEffect,useRef}=React;
const {Button,Card,Avatar}=window.AirbnbDesignSystem_019df1;
const IP={
dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
bed:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
tasks:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
brush:'<path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
nodes:'<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5l-5.2 5.6M12 11.5l5.2 5.6"/>',
users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
bar:'<path d="M18 20V10M12 20V4M6 20v-6"/>',
sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
down:'<path d="M6 9l6 6 6-6"/>',right:'<path d="M9 18l6-6-6-6"/>',left:'<path d="M15 18l-6-6 6-6"/>',
x:'<path d="M18 6L6 18M6 6l12 12"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
bolt:'<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',play:'<path d="M6 4l14 8-14 8V4z"/>',pause:'<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
wifioff:'<path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="M20 6L9 17l-5-5"/>',
alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
flame:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
building:'<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M16 9h3a2 2 0 0 1 2 2v10M9 7h3M9 11h3M9 15h3"/>',
refresh:'<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
cloudoff:'<path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3M1 1l22 22"/>',
lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
userx:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M18 8l5 5M23 8l-5 5"/>',
star:'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
flask:'<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
phone:'<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
dl:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
};
function Icon({n,s=18,c='currentColor',w=1.8,style}){return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}} dangerouslySetInnerHTML={{__html:IP[n]||''}}></svg>}

function useNow(ms=1000){const [n,set]=useState(Date.now());useEffect(()=>{const i=setInterval(()=>set(Date.now()),ms);return()=>clearInterval(i)},[ms]);return n}
const pad=n=>String(n).padStart(2,'0');
function ago(ts,n=Date.now()){const m=Math.floor((n-ts)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';return Math.floor(m/60)+'h '+(m%60)+'m ago'}
function dur(ms){const m=Math.max(0,Math.round(ms/60000));return m<60?m+' min':Math.floor(m/60)+'h '+(m%60)+'m'}
function mmss(ms){const a=Math.abs(ms),m=Math.floor(a/60000),s=Math.floor(a/1000)%60;return (m>=60?Math.floor(m/60)+':'+pad(m%60):pad(m))+':'+pad(s)}

const TONE={ok:['#17693f','#e4f3ea'],info:['#2657a0','#e7eefa'],warn:['#874e00','#fcefd6'],high:['#a8430a','#fde8da'],crit:['#ffffff','#c13515'],critSoft:['#a82b10','#fde9e5'],neutral:['#3f3f3f','#efefef'],muted:['#6a6a6a','#f5f5f5'],teal:['#17635e','#e0f1ef'],plum:['#653886','#f1e9f7'],ink:['#ffffff','#222222'],line:['#222222','#ffffff']};
const ROOM_TONE={Occupied:'neutral',Dirty:'warn',Cleaning:'info',Clean:'teal',Ready:'ok','Out of Service':'muted',Maintenance:'plum',Blocked:'muted'};
const TASK_TONE={Unassigned:'warn',Assigned:'neutral',Cleaning:'info','In repair':'info','Inspection Required':'teal',Completed:'ok',Blocked:'critSoft',Cancelled:'muted'};
const PRIO_TONE={Critical:'crit',High:'high',Medium:'line',Low:'muted'};
function Pill({tone='neutral',icon,children,style,title}){const [fg,bg]=TONE[tone]||TONE.neutral;return <span className="pill" title={title} style={{color:fg,background:bg,border:tone==='line'?'1px solid #c1c1c1':'none',...style}}>{icon&&<Icon n={icon} s={12} w={2.2}/>}{children}</span>}
const RoomStatus=({s})=><Pill tone={ROOM_TONE[s]} icon={s==='Blocked'||s==='Out of Service'?'lock':s==='Maintenance'?'wrench':null}>{s}</Pill>;
const TaskStatus=({s})=><Pill tone={TASK_TONE[s]} icon={s==='Blocked'?'lock':null}>{s}</Pill>;
const Prio=({p})=><Pill tone={PRIO_TONE[p]} icon={p==='Critical'?'alert':null}>{p}</Pill>;
const AssignTag=({ai})=>ai?<Pill tone="muted" icon="bolt" title="Assigned by an AI agent">AI assigned</Pill>:<Pill tone="muted" icon="user" title="Assigned by a person">Manual</Pill>;
function Dot({c,pulse}){return <span className={pulse?'dot pulse':'dot'} style={{background:c}}></span>}
const AVAIL_C={Available:'#17693f',Busy:'#2657a0',Offline:'#929292','On Leave':'#c1c1c1'};
const Avail=({a})=><span className="row g6 small" style={{color:'var(--color-body)'}}><Dot c={AVAIL_C[a]}/>{a}</span>;

function SLA({t,big}){
 const n=useNow();if(!t.sla)return null;
 if(t.status==='Completed')return <span className="small muted num">{t.breached?'Missed SLA':'Met SLA'}</span>;
 if(t.status==='Cancelled')return <span className="small muted">—</span>;
 if(t.type==='Cleaning'&&!t.started)return <span className="small muted num">{t.sla} min</span>;
 if(t.status==='Inspection Required')return <span className="small muted">Awaiting inspection</span>;
 const dl=deadline(t),rem=dl-n,frac=rem/(t.sla*60000);
 const tone=rem<0?'crit':frac<.25?'high':'neutral';
 if(big)return <div className="col g6"><div className="num" style={{fontSize:36,fontWeight:700,letterSpacing:-1,color:rem<0?'#c13515':frac<.25?'#a8430a':'var(--color-ink)'}}>{rem<0?'+':''}{mmss(rem)}</div><div className="bar"><i style={{width:Math.max(0,Math.min(100,(1-frac)*100))+'%',background:rem<0?'#c13515':frac<.25?'#d9772b':'#222'}}></i></div><div className="small muted">{rem<0?`SLA breached ${dur(-rem)} ago`:`Respond by ${hm(dl)} · ${t.sla} min SLA`}</div></div>;
 return <Pill tone={tone} icon="clock" style={{fontVariantNumeric:'tabular-nums'}}>{rem<0?'Breached +'+mmss(rem):mmss(rem)+' left'}</Pill>;
}
function Elapsed({from,exp}){const n=useNow(5000);if(!from)return <span className="muted">—</span>;const e=n-from,over=exp&&e>exp*60000;return <span className="num" style={{color:over?'#c13515':'inherit',fontWeight:over?600:400}}>{dur(e)}</span>}

function KPI({label,value,sub,tone,icon,onClick,alert}){
 return <Card padded={false} hover={!!onClick} onClick={onClick} style={{padding:16,cursor:onClick?'pointer':'default',border:alert?'2px solid #c13515':'1px solid #dddddd',background:alert?'#fff8f6':'#fff',display:'flex',flexDirection:'column',gap:6,minWidth:0}}>
  <div className="row g6 small" style={{color:alert?'#a82b10':'var(--color-muted)',fontWeight:500}}>{icon&&<Icon n={icon} s={15}/>}<span className="ell">{label}</span></div>
  <div className="num" style={{fontSize:30,fontWeight:600,letterSpacing:-.6,lineHeight:1.05,color:alert?'#c13515':'var(--color-ink)'}}>{value}</div>
  {sub&&<div className="small ell" style={{color:tone?TONE[tone][0]:'var(--color-muted)'}}>{sub}</div>}
 </Card>;
}
function Panel({title,sub,right,children,pad=true,style,bodyStyle}){return <Card padded={false} style={{display:'flex',flexDirection:'column',minWidth:0,background:'#fff',border:'1px solid #dddddd',...style}}>
 {title&&<div className="phead"><div className="col" style={{gap:2,minWidth:0}}><div className="ptitle">{title}</div>{sub&&<div className="small muted">{sub}</div>}</div><div className="row g8">{right}</div></div>}
 <div style={{padding:pad?'4px 20px 20px':0,minWidth:0,...bodyStyle}}>{children}</div></Card>}
function PageHead({title,sub,right,back}){return <div className="row" style={{justifyContent:'space-between',gap:16,flexWrap:'wrap',alignItems:'flex-end'}}><div className="col g4" style={{flex:'1 1 420px',minWidth:0}}>{back&&<button className="link row g4 small" onClick={back.go}><Icon n="left" s={14}/>{back.label}</button>}<h1 className="pt">{title}</h1>{sub&&<div className="muted">{sub}</div>}</div><div className="row g8" style={{flexWrap:'wrap'}}>{right}</div></div>}
function Seg({value,options,onChange,size}){return <div className="seg">{options.map(o=>{const v=typeof o==='string'?o:o.v,l=typeof o==='string'?o:o.l;return <button key={v} className={value===v?'on':''} onClick={()=>onChange(v)}>{l}</button>})}</div>}
function Sel({value,onChange,options,label,style}){return <label className="selw" style={style}>{label&&<span>{label}</span>}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=>{const v=typeof o==='string'?o:o.v,l=typeof o==='string'?o:o.l;return <option key={v} value={v}>{l}</option>})}</select><Icon n="down" s={14}/></label>}
function Chip({on,onClick,children,icon}){return <button className={'chip'+(on?' on':'')} onClick={onClick}>{icon&&<Icon n={icon} s={14}/>}{children}</button>}
function Empty({icon='check',title,body,action}){return <div className="empty"><div className="eicon"><Icon n={icon} s={20}/></div><div style={{fontWeight:600}}>{title}</div>{body&&<div className="small muted" style={{maxWidth:320,textAlign:'center'}}>{body}</div>}{action}</div>}
const Skel=({h=14,w='100%',r=6})=><div className="skel" style={{height:h,width:w,borderRadius:r}}></div>;
function Person({id,sub,size=28}){const s=S.staff[id];if(!s)return <span className="row g8 muted"><span className="avph" style={{width:size,height:size}}><Icon n="userx" s={14}/></span>Unassigned</span>;return <span className="row g8" style={{minWidth:0}}><Avatar name={s.name} size={size}/><span className="col" style={{minWidth:0}}><span className="ell" style={{fontWeight:500}}>{s.name}</span>{sub&&<span className="small muted ell">{sub}</span>}</span></span>}
function Btn({v='secondary',sz='sm',icon,children,style,...p}){return <Button variant={v} size="sm" style={{height:sz==='xs'?32:40,padding:sz==='xs'?'0 12px':'0 16px',fontSize:14,...(v==='secondary'?{borderColor:'#c1c1c1'}:{}),...style}} {...p}>{icon&&<Icon n={icon} s={16}/>}{children}</Button>}

function Drawer({open,onClose,title,sub,children,footer,width=520}){if(!open)return null;return <div className="scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="drawer" style={{width}}>
 <div className="dhead"><div className="col g4" style={{minWidth:0}}><div style={{fontSize:20,fontWeight:600}}>{title}</div>{sub&&<div className="small muted">{sub}</div>}</div><button className="ib" onClick={onClose} aria-label="Close"><Icon n="x"/></button></div>
 <div className="dbody">{children}</div>{footer&&<div className="dfoot">{footer}</div>}</div></div>}
function Modal({open,onClose,children,width=560}){if(!open)return null;return <div className="scrim center" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal" style={{width}}>{children}</div></div>}

const KIND_C={'AI Agent':'#222222','System':'#929292','Staff':'#2657a0','Supervisor':'#a8430a'};
function KindTag({k}){return <span className="row g6 small" style={{color:'var(--color-body)',whiteSpace:'nowrap'}}>{k==='AI Agent'?<Icon n="bolt" s={13}/>:<Dot c={KIND_C[k]}/>}{k}</span>}
function Timeline({events,max=40,compact}){if(!events.length)return <Empty icon="list" title="No activity yet" body="Events for this item will appear here."/>;
 return <div className="tl">{events.slice(0,max).map(e=><div key={e.id} className="tli"><div className="tlt num">{hm(e.ts)}</div><div className="tld" style={{background:e.type==='SLA breached'||e.type==='Safety rule applied'?'#c13515':e.type==='Human override'?'#a8430a':KIND_C[e.kind]}}></div><div className="col" style={{gap:2,minWidth:0}}><div style={{fontWeight:500}}>{e.action}</div><div className="small muted">{e.actor}{e.room&&!compact?` · Room ${e.room}`:''}{e.result?` · ${e.result}`:''}</div></div></div>)}</div>}

function AIPanel({t,editable=true}){
 const [ov,setOv]=useState(false);const [sev,setSev]=useState(t.severity);const [cat,setCat]=useState(t.category);
 const tech=S.staff[t.assignee];
 return <Panel title={<span className="row g8"><Icon n="bolt" s={16}/>AI decision</span>} sub={`Maintenance Agent · ${hm(t.created)}`} right={t.fallback?<Pill tone="warn" icon="cloudoff">Fallback</Pill>:t.needsReview?<Pill tone="warn">Needs human review</Pill>:<Pill tone="muted">Confidence: {t.conf}</Pill>}>
  <div className="col g16">
   {t.fallback&&!t.forced&&<div className="alert warn"><Icon n="cloudoff" s={18}/><div>AI classification is temporarily unavailable. A default priority has been applied and the issue has been queued for review.</div></div>}
   <div className="aigrid">
    <div className="k">Category</div><div className="col g4"><div style={{fontSize:18,fontWeight:600}}>{t.category}</div><div className="small" style={{color:'var(--color-body)'}}><b>Because</b> {t.why}</div></div>
    <div className="k">Severity</div><div className="col g4"><div><Prio p={t.severity}/></div><div className="small" style={{color:'var(--color-body)'}}><b>Reason</b> {t.sevWhy}</div>
     {t.forced&&<div className="alert crit small" style={{marginTop:4}}><Icon n="shield" s={16}/><div><b>Safety rule applied.</b> {t.aiSeverity?`The AI estimated ${t.aiSeverity}. `:''}Gas, fire and smoke are always Critical.</div></div>}</div>
    <div className="k">SLA</div><div className="col g4"><div style={{fontWeight:600}}>{t.sla} minutes</div><div className="small muted">Respond by {hm(t.created+t.sla*60000)}</div></div>
    <div className="k">Technician</div><div className="col g4">{tech?<Person id={tech.id} sub={tech.role}/>:<span className="row g6" style={{color:'#a82b10',fontWeight:600}}><Icon n="userx" s={16}/>No technician available</span>}<div className="small" style={{color:'var(--color-body)'}}>{t.match}</div></div>
   </div>
   {editable&&t.status!=='Completed'&&(!ov?<div className="row g8" style={{flexWrap:'wrap'}}>{t.needsReview&&<Btn v="primary" icon="check" onClick={()=>A.confirm(t)}>Confirm classification</Btn>}<Btn icon="sliders" onClick={()=>setOv(true)}>Override classification</Btn></div>
   :<div className="ovbox col g12"><div style={{fontWeight:600}}>Override AI classification</div><div className="row g12" style={{flexWrap:'wrap'}}>
     <Sel label="Category" value={cat} onChange={setCat} options={['HVAC','Plumbing','Electrical','IT / AV','Access / Locks','Appliance','General','Safety / Gas','Safety / Electrical','Safety / Fire']}/>
     <Sel label="Severity" value={sev} onChange={setSev} options={['Critical','High','Medium','Low']}/></div>
     {t.forced&&sev!=='Critical'&&<div className="alert warn small"><Icon n="shield" s={16}/><div>This is a safety issue. Lowering severity below Critical is recorded and flagged to the Hotel Manager.</div></div>}
     <div className="small muted">Your change is recorded in the audit log with your name.</div>
     <div className="row g8"><Btn v="primary" onClick={()=>{if(cat!==t.category)A.category(t,cat);if(sev!==t.severity)A.priority(t,sev);setOv(false)}}>Apply override</Btn><Btn v="tertiary" onClick={()=>setOv(false)}>Cancel</Btn></div></div>)}
  </div></Panel>;
}

function Popover({open,onClose,children,style}){const r=useRef();useEffect(()=>{if(!open)return;const h=e=>{if(r.current&&!r.current.contains(e.target))onClose()};setTimeout(()=>document.addEventListener('mousedown',h));return()=>document.removeEventListener('mousedown',h)},[open]);if(!open)return null;return <div ref={r} className="pop" style={style}>{children}</div>}

Object.assign(window,{Icon,useNow,ago,dur,mmss,TONE,ROOM_TONE,TASK_TONE,Pill,RoomStatus,TaskStatus,Prio,AssignTag,Dot,Avail,AVAIL_C,SLA,Elapsed,KPI,Panel,PageHead,Seg,Sel,Chip,Empty,Skel,Person,Btn,Drawer,Modal,KindTag,Timeline,AIPanel,Popover});
})();
