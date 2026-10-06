(()=>{
const {useState,useEffect,useRef}=React;
const {Avatar}=window.AirbnbDesignSystem_019df1;

const NAV=[['dashboard','Dashboard','dash'],['rooms','Rooms','bed'],['tasks','Tasks','tasks'],['hk','Housekeeping','brush'],['maint','Maintenance','wrench'],['ai','AI Operations','nodes'],['staff','Staff','users'],['issues','Issues','flag'],['log','Activity Log','list'],['reports','Reports','bar'],['settings','Settings','sliders']];
S.route=localStorage.getItem('ops.route')||'dashboard';
const savedRole=localStorage.getItem('ops.role');if(savedRole&&ROLES[savedRole])S.role=savedRole;
function go(r){S.route=r;localStorage.setItem('ops.route',r);const m=document.querySelector('.main');if(m)m.scrollTop=0;window.scrollTo(0,0);emit()}
const openTask=id=>{S.ui.drawer={kind:'task',id};emit()};
const openStaff=id=>{S.ui.drawer={kind:'staff',id};emit()};
const openReport=room=>{S.ui.report={room:room||''};emit()};

function getAttention(){
 const out=[],seen=new Set(),add=(t,o)=>{if(seen.has(t.id))return;seen.add(t.id);out.push({t,...o})};
 const ts=Object.values(S.tasks).filter(active);
 ts.filter(t=>t.severity==='Critical'&&t.type==='Maintenance').forEach(t=>add(t,{level:0,icon:'flame',title:`Critical · ${t.category} — Room ${t.room}`,body:`“${t.desc}” · ${nmOf(t.assignee)?nmOf(t.assignee)+' responding':'Unassigned'}`,cta:'Open issue',fn:()=>go('issue/'+t.id)}));
 ts.filter(t=>t.noTech&&!t.assignee&&t.status!=='Blocked').forEach(t=>add(t,{level:1,icon:'userx',title:`No technician available — Room ${t.room}`,body:`${t.category} · “${t.desc}” · escalated to Rahul Deshpande`,cta:'Assign technician',fn:()=>openTask(t.id)}));
 ts.filter(t=>t.breached&&t.status!=='Blocked').forEach(t=>add(t,{level:1,icon:'clock',title:t.type==='Cleaning'?`Cleaning overdue — Room ${t.room}`:`SLA breached — Room ${t.room}`,body:`${t.id} · ${nmOf(t.assignee)||'Unassigned'}${S.rooms[t.room].arrival?` · next guest ${hm(S.rooms[t.room].arrival.ts)}`:''}`,cta:'Reassign',fn:()=>openTask(t.id)}));
 ts.filter(t=>t.needsReview).forEach(t=>add(t,{level:2,icon:'bolt',title:`Needs human review — Room ${t.room}`,body:t.fallback?'AI was unavailable. Default classification applied.':'Low confidence classification.',cta:'Review',fn:()=>go('issue/'+t.id)}));
 ts.filter(t=>t.status==='Blocked').forEach(t=>add(t,{level:2,icon:'lock',title:`Blocked — Room ${t.room}`,body:`${t.id} · ${t.blocked}`,cta:'Open',fn:()=>openTask(t.id)}));
 ts.filter(t=>t.type==='Cleaning'&&t.status==='Unassigned'&&t.prio==='High').forEach(t=>add(t,{level:2,icon:'star',title:`Priority room waiting for attendant — Room ${t.room}`,body:prioWhy(S.rooms[t.room]),cta:'Assign',fn:()=>openTask(t.id)}));
 return out.sort((a,b)=>a.level-b.level);
}

function Sidebar(){
 const role=ROLES[S.role],nav=NAV.filter(n=>!role.nav||role.nav.includes(n[0])),att=getAttention().length;
 const base=S.route.split('/')[0],cur=base==='room'?'rooms':base==='issue'?'maint':base;
 return <aside className="side">
  <div className="brand"><div className="logo"><Icon n="nodes" s={16} c="#fff" w={2.2}/></div><div className="col"><b>Voyage Ops</b><span className="small muted">Autonomous operations</span></div></div>
  {nav.map(([id,l,ic])=><button key={id} className={'nav'+(cur===id?' on':'')} onClick={()=>go(id)} title={l}><Icon n={ic}/><span className="nl">{l}</span>{id==='issues'&&att>0&&<span className="ct">{att}</span>}{id==='ai'&&<span className="nl" style={{marginLeft:'auto'}}><Dot c={S.flags.aiDown?'#d9772b':'#17693f'} pulse={!S.flags.aiDown}/></span>}</button>)}
  <div style={{flex:1}}></div>
  <div className="sidefoot nl small muted">Autonomy today<div className="num" style={{fontSize:20,fontWeight:600,color:'var(--color-ink)',marginTop:2}}>{autoRate()}%</div>of tasks handled without a person</div>
 </aside>;
}
function autoRate(){const ts=Object.values(S.tasks);const ai=S.base.ai+ts.filter(t=>t.ai).length,all=ai+S.base.manual+ts.filter(t=>!t.ai).length;return Math.round(ai/all*100)}

function TopBar(){
 const n=useNow(1000);const role=ROLES[S.role];const [m,setM]=useState(null);const [q,setQ]=useState('');
 const prop=PROPS.find(p=>p.id===S.property);const unread=S.notes.filter(x=>!x.read).length,crit=S.notes.some(x=>!x.read&&x.level==='critical');
 const res=q.trim().length<1?[]:[...Object.values(S.rooms).filter(r=>r.id.startsWith(q.trim())).slice(0,5).map(r=>({k:'r'+r.id,l:'Room '+r.id,s:r.type+' · '+r.status,fn:()=>go('room/'+r.id)})),
  ...Object.values(S.staff).filter(s=>s.name.toLowerCase().includes(q.toLowerCase())).slice(0,4).map(s=>({k:s.id,l:s.name,s:s.role+' · '+s.avail,fn:()=>openStaff(s.id)})),
  ...Object.values(S.tasks).filter(t=>t.id.toLowerCase().includes(q.toLowerCase())).slice(0,4).map(t=>({k:t.id,l:t.id,s:t.type+' · Room '+t.room,fn:()=>openTask(t.id)}))].slice(0,8);
 const d=new Date(n);
 return <header className="top">
  <div className="rel"><button className="tbtn" onClick={()=>setM(m==='prop'?null:'prop')}><Icon n="building" s={16}/><span className="col" style={{alignItems:'flex-start',lineHeight:1.2}}><b>{prop.name}</b><span className="small muted">{prop.city} · {prop.rooms} rooms</span></span><Icon n="down" s={14}/></button>
   <Popover open={m==='prop'} onClose={()=>setM(null)} style={{left:0,width:280}}><div className="poph">Switch property</div>{PROPS.map(p=><button key={p.id} className="popi" onClick={()=>{S.property=p.id;setM(null);if(p.id!=='pune')toast('info',`Switched to ${p.name}, ${p.city}`,'This prototype shows Voyage Grand demo data for every property.');emit()}}><span className="col"><b>{p.name}</b><span className="small muted">{p.city} · {p.rooms} rooms</span></span>{S.property===p.id&&<Icon n="check" s={16}/>}</button>)}</Popover></div>
  <div className="rel search"><Icon n="search" s={16} c="#6a6a6a"/><input placeholder="Search rooms, staff, tasks" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&res[0]){res[0].fn();setQ('')}if(e.key==='Escape')setQ('')}}/>
   {res.length>0&&<div className="pop" style={{left:0,right:0,top:44}}>{res.map(r=><button key={r.k} className="popi" onClick={()=>{r.fn();setQ('')}}><span className="col"><b>{r.l}</b><span className="small muted">{r.s}</span></span></button>)}</div>}
   {q.trim()&&!res.length&&<div className="pop" style={{left:0,right:0,top:44,padding:16}}><span className="small muted">No rooms, staff or tasks match “{q}”.</span></div>}</div>
  <div style={{flex:1}}></div>
  <button className={'tbtn status'+(S.flags.aiDown?' warn':'')} onClick={()=>go('ai')} title="AI system status"><Dot c={S.flags.offline?'#929292':S.flags.aiDown?'#d9772b':'#17693f'} pulse={!S.flags.aiDown&&!S.flags.offline}/><span className="hide-md">{S.flags.offline?'Offline':S.flags.aiDown?'AI degraded · fallback active':'AI agents active · 4/4'}</span></button>
  <div className="col hide-md" style={{alignItems:'flex-end',lineHeight:1.2}}><b className="num">{pad2(d.getHours())}:{pad2(d.getMinutes())}:{pad2(d.getSeconds())}</b><span className="small muted">{d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span></div>
  <div className="rel"><button className="ib" title="Demo controls" onClick={()=>setM(m==='demo'?null:'demo')}><Icon n="flask"/></button>
   <Popover open={m==='demo'} onClose={()=>setM(null)} style={{right:0,width:320}}><div className="poph">Demo controls</div>
    <button className="popi" onClick={()=>{const r=Object.values(S.rooms).find(r=>r.status==='Occupied'&&r.dueOut)||Object.values(S.rooms).find(r=>r.status==='Occupied');checkout(r.id);setM(null);go('ai')}}><span className="col"><b>Simulate guest checkout</b><span className="small muted">Journey 1 · watch it in AI Operations</span></span><Icon n="logout" s={16}/></button>
    <button className="popi" onClick={()=>{setM(null);openReport('204')}}><span className="col"><b>Report an issue</b><span className="small muted">Journeys 2–5</span></span><Icon n="wrench" s={16}/></button>
    <label className="popi"><span className="col"><b>Live simulation</b><span className="small muted">Agents act every ~15 s</span></span><input type="checkbox" checked={S.flags.live} onChange={e=>{S.flags.live=e.target.checked;emit()}}/></label>
    <label className="popi"><span className="col"><b>AI service unavailable</b><span className="small muted">Journey 5 · fallback classification</span></span><input type="checkbox" checked={S.flags.aiDown} onChange={e=>{S.flags.aiDown=e.target.checked;opsLog(e.target.checked?'AI unavailable':'AI service restored','System','System',null,e.target.checked?'Classification service not responding':'Classification service responding',e.target.checked?'Fallback rules active':'Normal operation');if(e.target.checked)notify('warning','AI service temporarily unavailable','', 'New issues get a default priority and are queued for review.');emit()}}/></label>
    <label className="popi"><span className="col"><b>Connection offline</b><span className="small muted">Offline state</span></span><input type="checkbox" checked={S.flags.offline} onChange={e=>{S.flags.offline=e.target.checked;S.flags.offAt=Date.now();emit()}}/></label>
   </Popover></div>
  <div className="rel"><button className={'ib'+(crit?' critb':'')} title="Notifications" onClick={()=>{S.ui.notif=!S.ui.notif;emit()}}><Icon n="bell"/>{unread>0&&<span className="badge">{unread}</span>}</button></div>
  <div className="rel"><button className="tbtn" onClick={()=>setM(m==='role'?null:'role')}><Avatar name={role.name} size={32}/><span className="col hide-md" style={{alignItems:'flex-start',lineHeight:1.2}}><b>{role.name}</b><span className="small muted">{role.title}</span></span><Icon n="down" s={14}/></button>
   <RoleMenu open={m==='role'} onClose={()=>setM(null)} style={{right:0}}/></div>
 </header>;
}
const pad2=n=>String(n).padStart(2,'0');
function RoleMenu({open,onClose,style}){return <Popover open={open} onClose={onClose} style={{width:300,...style}}><div className="poph">Preview as role</div>{Object.entries(ROLES).map(([k,r])=><button key={k} className="popi" onClick={()=>{S.role=k;localStorage.setItem('ops.role',k);onClose();if(!r.mobile)go(r.home);else emit()}}><span className="row g8"><Avatar name={r.name} size={28}/><span className="col"><b>{r.name}</b><span className="small muted">{r.title}{r.mobile?' · mobile app':''}</span></span></span>{S.role===k&&<Icon n="check" s={16}/>}</button>)}</Popover>}

const LV={critical:['crit','flame'],warning:['warn','alert'],info:['info','bell'],success:['ok','check']};
function NotifPanel(){
 const [tab,setTab]=useState('All');useNow(30000);if(!S.ui.notif)return null;
 const list=S.notes.filter(n=>tab==='All'||(tab==='Unread'&&!n.read)||(tab==='Critical'&&n.level==='critical'));
 const close=()=>{S.ui.notif=false;emit()};
 return <Drawer open onClose={close} title="Notifications" sub={`${S.notes.filter(n=>!n.read).length} unread`} width={440}>
  <div className="row" style={{justifyContent:'space-between',marginBottom:12}}><Seg value={tab} onChange={setTab} options={['All','Unread','Critical']}/><button className="link small" onClick={()=>{S.notes.forEach(n=>n.read=true);emit()}}>Mark all read</button></div>
  {!list.length&&<Empty icon="bell" title={tab==='Critical'?'No critical alerts':'You’re all caught up'} body="New alerts from agents and staff will appear here."/>}
  <div className="col g8">{list.map(n=>{const [tone,ic]=LV[n.level];const c=n.level==='critical';return <button key={n.id} className={'note'+(c?' ncrit':'')+(n.read?' read':'')} onClick={()=>{n.read=true;close();if(n.room)go('room/'+n.room)}}>
   <span className="nic" style={{background:TONE[tone][1],color:TONE[tone][0]}}><Icon n={ic} s={16} w={2}/></span>
   <span className="col" style={{gap:2,flex:1,minWidth:0,textAlign:'left'}}><span style={{fontWeight:c||!n.read?600:500}}>{n.title}</span>{n.body&&<span className="small" style={{color:'var(--color-body)'}}>{n.body}</span>}<span className="small muted">{ago(n.ts)}</span></span>{!n.read&&<Dot c={c?'#c13515':'#222'}/>}</button>})}</div>
 </Drawer>;
}
function Toasts(){return <div className="toasts">{S.toasts.map(t=>{const [tone,ic]=LV[t.level]||LV.info;return <div key={t.id} className={'toast '+t.level}><Icon n={ic} s={18} w={2}/><div className="col" style={{gap:2,flex:1}}><b>{t.title}</b>{t.body&&<span className="small">{t.body}</span>}</div><button className="ib sm" onClick={()=>{S.toasts=S.toasts.filter(x=>x!==t);emit()}}><Icon n="x" s={14}/></button></div>})}</div>}
function Banners(){return <>{S.flags.offline&&<div className="banner off"><Icon n="wifioff" s={18}/><span><b>You’re offline.</b> Showing last known status from {hm(S.flags.offAt||Date.now())}. Agents keep running on the server; your actions will sync when you reconnect.</span><button className="link" style={{color:'#fff'}} onClick={()=>{S.flags.offline=false;toast('success','Reconnected','Status is up to date.');emit()}}>Retry now</button></div>}
 {S.flags.aiDown&&!S.flags.offline&&<div className="banner ai"><Icon n="cloudoff" s={18}/><span><b>AI classification is temporarily unavailable.</b> New issues are still created with a default priority and queued for review. Safety rules for gas, fire and smoke stay active.</span></div>}</>}

function Settings(){return <div className="page"><PageHead title="Settings" sub="Property configuration, automation rules and integrations"/><Panel><Empty icon="sliders" title="Settings aren’t part of this prototype round" body="Planned: automation rules, safety keywords, SLA defaults per category, PMS integration and user permissions."/></Panel></div>}

function Router(){
 const [a,b]=S.route.split('/');
 const M={dashboard:Dashboard,rooms:Rooms,room:RoomDetail,hk:Housekeeping,maint:Maintenance,issue:IssueDetail,ai:AIOps,tasks:Tasks,staff:Staff,issues:Issues,log:ActivityLog,reports:Reports,settings:Settings};
 const C=M[a]||Dashboard;return <C id={b}/>;
}
function App(){
 useOps();const [loading,setL]=useState(true);useEffect(()=>{setTimeout(()=>setL(false),700)},[]);
 const role=ROLES[S.role];
 if(role.mobile)return <><MobileStage/><Toasts/></>;
 return <div className="app"><Sidebar/><div className="main"><TopBar/><Banners/>{loading?<LoadingPage/>:<Router/>}</div><NotifPanel/><GlobalDrawers/><ReportModal/><Toasts/></div>;
}
function LoadingPage(){return <div className="page"><div className="col g8"><Skel h={28} w={260}/><Skel h={14} w={380}/></div><div className="kgrid">{Array.from({length:8}).map((_,i)=><div key={i} className="skcard"><Skel h={12} w="60%"/><Skel h={28} w="40%"/><Skel h={10} w="80%"/></div>)}</div><div className="skcard" style={{height:260}}><Skel h={16} w={200}/><Skel h={180}/></div><div className="small muted">Connecting to live operations…</div></div>}

Object.assign(window,{go,openTask,openStaff,openReport,getAttention,autoRate,App,RoleMenu,NAV,LV});
})();
