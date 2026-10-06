(()=>{
const {useState,useMemo}=React;

function RoomChip({r,t,sev}){
 const p=sev||(t&&t.prio)||(r&&roomPriority(r));const br=t&&t.breached;
 const st={Critical:{background:'#c13515',color:'#fff',borderColor:'#c13515'},High:{background:'#fde8da',color:'#a8430a',borderColor:'#f3c3a2'},Medium:{background:'#fff',color:'#222',borderColor:'#c1c1c1'},Low:{background:'#f5f5f5',color:'#6a6a6a',borderColor:'#ebebeb'}}[p]||{};
 const fresh=t&&Date.now()-Math.max(t.created,t.started||0)<6000;
 return <button className={'rchip num'+(fresh?' fresh':'')} style={{...st,outline:br?'2px solid #c13515':'none',outlineOffset:1}} title={`Room ${r.id}${t?' · '+t.id:''}${br?' · overdue':''}`} onClick={()=>t&&t.type==='Maintenance'?go('issue/'+t.id):go('room/'+r.id)}>{r.id}{(r.arrival&&r.arrival.vip)||r.vip?<Icon n="star" s={10} w={2.4}/>:null}</button>;
}
function Lane({title,icon,stages}){
 return <div className="lane"><div className="lanet row g8"><Icon n={icon} s={16}/><b>{title}</b></div>
  <div className="stages">{stages.map((s,i)=><React.Fragment key={s.k}>
   <div className={'stage'+(s.warn&&s.items.length?' swarn':'')}>
    <div className="row" style={{justifyContent:'space-between',alignItems:'baseline'}}><span className="small" style={{fontWeight:600}}>{s.k}</span><span className="num" style={{fontSize:20,fontWeight:600,color:s.warn&&s.items.length?'#a82b10':'inherit'}}>{s.items.length}</span></div>
    <div className="small muted row g4" style={{minHeight:16}}>{s.ai?<Icon n="bolt" s={11}/>:null}{s.agent}</div>
    <div className="chips">{s.items.slice(0,s.max||8).map(x=><RoomChip key={x.k} r={x.r} t={x.t} sev={x.sev}/>)}{s.items.length>(s.max||8)&&<span className="small muted" style={{alignSelf:'center'}}>+{s.items.length-(s.max||8)}</span>}{!s.items.length&&<span className="small muted">—</span>}</div>
   </div>{i<stages.length-1&&<div className="conn"><Icon n="right" s={14} c="#929292"/></div>}</React.Fragment>)}</div></div>;
}
function turnoverStages(){
 const rooms=Object.values(S.rooms),ts=Object.values(S.tasks).filter(t=>t.type==='Cleaning');
 const tk=r=>ts.filter(t=>t.room===r.id&&active(t)).sort((a,b)=>b.created-a.created)[0];
 const m=(arr)=>arr.map(r=>({k:r.id,r,t:tk(r)}));
 const dirty=rooms.filter(r=>r.status==='Dirty');
 return [
  {k:'Due out',agent:'Awaiting checkout',items:m(rooms.filter(r=>r.status==='Occupied'&&r.dueOut)),max:6},
  {k:'Dirty',agent:'Room Readiness',ai:1,items:m(dirty.filter(r=>!tk(r)||tk(r).status==='Unassigned')),warn:1},
  {k:'Cleaner assigned',agent:'Housekeeping Agent',ai:1,items:m(dirty.filter(r=>tk(r)&&tk(r).status==='Assigned'))},
  {k:'Cleaning',agent:'Attendant',items:m(rooms.filter(r=>r.status==='Cleaning'))},
  {k:'Inspection',agent:'Supervisor',items:m(rooms.filter(r=>r.status==='Clean'))},
  {k:'Ready',agent:'Room Readiness',ai:1,items:m(rooms.filter(r=>r.status==='Ready').sort((a,b)=>(a.arrival?a.arrival.ts:9e15)-(b.arrival?b.arrival.ts:9e15))),max:6},
 ];
}
function maintStages(){
 const ts=Object.values(S.tasks).filter(t=>t.type==='Maintenance'),m=a=>a.map(t=>({k:t.id,r:S.rooms[t.room],t,sev:t.severity}));
 const today=Date.now()-12*3600000;
 return [
  {k:'Reported',agent:'Needs review',ai:1,items:m(ts.filter(t=>active(t)&&t.needsReview)),warn:1},
  {k:'Awaiting technician',agent:'Escalated',items:m(ts.filter(t=>active(t)&&!t.assignee&&t.status!=='Blocked')),warn:1},
  {k:'Technician assigned',agent:'Maintenance Agent',ai:1,items:m(ts.filter(t=>t.status==='Assigned'))},
  {k:'In repair',agent:'Technician',items:m(ts.filter(t=>t.status==='In repair'))},
  {k:'Blocked',agent:'Needs a person',items:m(ts.filter(t=>t.status==='Blocked')),warn:1},
  {k:'Completed',agent:'Today',items:m(ts.filter(t=>t.status==='Completed'&&t.done>today))},
 ];
}

function AttentionList({items,max=6}){
 if(!items.length)return <Empty icon="check" title="Nothing needs you right now" body="Agents are handling all open work. New exceptions will appear here."/>;
 return <div className="col">{items.slice(0,max).map(a=><div key={a.t.id} className={'att'+(a.level===0?' acrit':'')}>
  <span className="nic" style={a.level===0?{background:'#c13515',color:'#fff'}:a.level===1?{background:'#fde8da',color:'#a8430a'}:{background:'#f2f2f2',color:'#222'}}><Icon n={a.icon} s={16} w={2}/></span>
  <div className="col" style={{flex:1,minWidth:0,gap:2}}><b className="ell" style={{color:a.level===0?'#a82b10':'inherit'}}>{a.title}</b><span className="small muted ell">{a.body}</span></div>
  {a.t.sla&&a.t.type==='Maintenance'&&<SLA t={a.t}/>}
  <Btn sz="xs" v={a.level===0?'primary':'secondary'} onClick={a.fn}>{a.cta}</Btn></div>)}</div>;
}

function FloorMap(){
 const rooms=Object.values(S.rooms);
 return <div className="col g8">{[5,4,3,2,1].map(f=><div key={f} className="frow"><span className="small muted num" style={{width:24}}>F{f}</span><div className="fcells">{rooms.filter(r=>r.floor===f).map(r=>{const [fg,bg]=TONE[ROOM_TONE[r.status]];const hatch=r.status==='Blocked'||r.status==='Out of Service';
  return <button key={r.id} className="fcell num" title={`Room ${r.id} · ${r.status}${r.guest?' · '+r.guest:''}`} onClick={()=>go('room/'+r.id)} style={{color:fg,background:hatch?'repeating-linear-gradient(135deg,#f2f2f2 0 4px,#e2e2e2 4px 8px)':bg}}>{r.id.slice(1)}{r.maint&&<i className="mk"></i>}</button>})}</div></div>)}
  <div className="row g16 small muted" style={{flexWrap:'wrap',marginTop:4}}>{Object.keys(ROOM_TONE).map(s=><span key={s} className="row g6"><span className="sw" style={{background:s==='Blocked'||s==='Out of Service'?'repeating-linear-gradient(135deg,#f2f2f2 0 3px,#d8d8d8 3px 6px)':TONE[ROOM_TONE[s]][1],borderColor:TONE[ROOM_TONE[s]][0]+'55'}}></span>{s}</span>)}<span className="row g6"><i className="mk" style={{position:'static'}}></i>Open maintenance</span></div></div>;
}

function Dashboard(){
 useNow(5000);
 const rooms=Object.values(S.rooms),ts=Object.values(S.tasks),cnt=s=>rooms.filter(r=>r.status===s).length;
 const att=getAttention(),mo=ts.filter(t=>t.type==='Maintenance'&&active(t)),crit=mo.filter(t=>t.severity==='Critical'),over=ts.filter(t=>active(t)&&t.breached);
 const crew=Object.values(S.staff).filter(s=>s.cat==='Housekeeping'||s.cat==='Maintenance'),avail=crew.filter(s=>s.avail==='Available'),onShift=crew.filter(s=>s.avail==='Available'||s.avail==='Busy');
 const clTs=ts.filter(t=>t.type==='Cleaning');
 const aiCount=S.base.ai+ts.filter(t=>t.ai).length,all=aiCount+S.base.manual+ts.filter(t=>!t.ai).length;
 const prop=PROPS.find(p=>p.id===S.property);
 const busyAgents=Object.values(S.agents).filter(a=>a.current);
 return <div className="page">
  <PageHead title="Command center" sub={`${prop.name}, ${prop.city} · ${att.length?`${att.length} item${att.length>1?'s':''} need${att.length>1?'':'s'} attention`:'Everything is running automatically'}`}
   right={<><Btn icon="logout" onClick={()=>{const r=rooms.find(r=>r.status==='Occupied'&&r.dueOut);if(r){checkout(r.id);toast('info',`Checkout received — Room ${r.id}`,'Follow it on the Live operations board or in AI Operations.')}}}>Simulate checkout</Btn><Btn v="primary" icon="plus" onClick={()=>openReport()}>Report issue</Btn></>}/>
  <div className="kgrid">
   <KPI label="Occupied" icon="bed" value={cnt('Occupied')} sub={`${rooms.filter(r=>r.status==='Occupied'&&r.dueOut).length} due out today`} onClick={()=>go('rooms')}/>
   <KPI label="Dirty" icon="brush" value={cnt('Dirty')} sub={`${clTs.filter(t=>t.status==='Unassigned').length} waiting for attendant`} tone={clTs.some(t=>t.status==='Unassigned')?'warn':null} onClick={()=>go('hk')}/>
   <KPI label="Cleaning" icon="refresh" value={cnt('Cleaning')} sub={`${clTs.filter(t=>t.status==='Cleaning'&&t.breached).length} over expected time`} tone={clTs.some(t=>t.status==='Cleaning'&&t.breached)?'high':null} onClick={()=>go('hk')}/>
   <KPI label="Ready" icon="check" value={cnt('Ready')} sub={`${rooms.filter(r=>r.status==='Ready'&&r.arrival).length} held for today’s arrivals`} tone="ok" onClick={()=>go('rooms')}/>
   <KPI label="Maintenance issues" icon="wrench" value={mo.length} sub={`${mo.filter(t=>!t.assignee).length} without technician`} tone={mo.some(t=>!t.assignee)?'high':null} onClick={()=>go('maint')}/>
   <KPI label="Critical issues" icon="flame" value={crit.length} alert={crit.length>0} sub={crit.length?'Emergency response active':'None right now'} tone={crit.length?'critSoft':null} onClick={()=>go('maint')}/>
   <KPI label="Overdue tasks" icon="clock" value={over.length} sub={over.length?'Past SLA or expected time':'All on time'} tone={over.length?'high':'ok'} onClick={()=>go('tasks')}/>
   <KPI label="Available staff" icon="users" value={avail.length} sub={`of ${onShift.length} on shift`} onClick={()=>go('staff')}/>
  </div>
  <div className="g2-1">
   <Panel title="Needs attention" sub="Exceptions the agents can’t resolve on their own" right={<button className="link small" onClick={()=>go('issues')}>View all {att.length}</button>}><AttentionList items={att} max={5}/></Panel>
   <Panel title="Autonomy today" sub="How much ran without a person">
    <div className="col g16"><div className="row g12" style={{alignItems:'baseline'}}><span className="num" style={{fontSize:48,fontWeight:700,letterSpacing:-1.5,lineHeight:1}}>{Math.round(aiCount/all*100)}%</span><span className="muted">{aiCount} of {all} tasks assigned by agents</span></div>
     <div className="bar" style={{height:8}}><i style={{width:aiCount/all*100+'%',background:'#222'}}></i></div>
     <div className="dl"><div>Human overrides</div><div className="num">{S.base.overrides}</div><div>Avg. time to assign</div><div className="num">8 sec</div><div>Escalations open</div><div className="num">{ts.filter(t=>active(t)&&t.escalated).length}</div></div>
     <div className="col g6"><span className="small" style={{fontWeight:600}}>Processing now</span>{busyAgents.length?busyAgents.map(a=><span key={a.id} className="row g8 small"><Dot c="#222" pulse/>{a.name} · {a.current}</span>):<span className="small muted row g8"><Dot c="#17693f"/>All agents idle, listening for events</span>}</div></div>
   </Panel>
  </div>
  <div className="g2-1">
   <Panel title="Live operations" sub="Rooms move left to right as agents and staff act" right={<Pill tone={S.flags.live?'ok':'muted'} icon={S.flags.live?null:'pause'}>{S.flags.live?<><Dot c="#17693f" pulse/>Live</>:'Paused'}</Pill>}>
    <div className="col g16"><Lane title="Room turnover" icon="brush" stages={turnoverStages()}/><Lane title="Maintenance" icon="wrench" stages={maintStages()}/>
    <div className="row g16 small muted" style={{flexWrap:'wrap'}}><span className="row g6"><span className="rchip sm" style={{background:'#fde8da',borderColor:'#f3c3a2'}}></span>High</span><span className="row g6"><span className="rchip sm" style={{background:'#fff',borderColor:'#c1c1c1'}}></span>Medium</span><span className="row g6"><span className="rchip sm" style={{background:'#f5f5f5',borderColor:'#ebebeb'}}></span>Low</span><span className="row g6"><span className="rchip sm" style={{background:'#c13515',borderColor:'#c13515'}}></span>Critical</span><span className="row g6"><span className="rchip sm" style={{outline:'2px solid #c13515',background:'#fff'}}></span>Overdue</span><span className="row g6"><Icon n="star" s={11}/>VIP</span></div></div>
   </Panel>
   <Panel title="Agent activity" sub="Latest decisions" right={<button className="link small" onClick={()=>go('ai')}>AI Operations</button>}><Timeline events={S.log} max={9}/></Panel>
  </div>
  <Panel title="Property at a glance" sub="Every room by floor. Select a room for details."><FloorMap/></Panel>
 </div>;
}

// ------------ Rooms
function Rooms(){
 const [f,setF]=useState({floor:'All',status:'All',type:'All',prio:'All',vip:false,soon:false,maint:false,q:''});const [view,setView]=useState('grid');
 useNow(15000);const set=(k,v)=>setF({...f,[k]:v});
 const rooms=Object.values(S.rooms);
 const clTask=r=>Object.values(S.tasks).find(t=>t.room===r.id&&t.type==='Cleaning'&&active(t));
 const mTask=r=>Object.values(S.tasks).filter(t=>t.room===r.id&&t.type==='Maintenance'&&active(t)).sort((a,b)=>['Critical','High','Medium','Low'].indexOf(a.severity)-['Critical','High','Medium','Low'].indexOf(b.severity))[0];
 const list=rooms.filter(r=>(f.floor==='All'||r.floor==+f.floor)&&(f.status==='All'||r.status===f.status)&&(f.type==='All'||r.type===f.type)&&(f.prio==='All'||roomPriority(r)===f.prio)&&(!f.vip||r.vip||(r.arrival&&r.arrival.vip))&&(!f.soon||(r.arrival&&r.arrival.ts-Date.now()<2*3600000))&&(!f.maint||r.maint)&&(!f.q||r.id.includes(f.q)||(r.guest||'').toLowerCase().includes(f.q.toLowerCase())||(r.arrival&&r.arrival.name.toLowerCase().includes(f.q.toLowerCase()))));
 const any=f.floor!=='All'||f.status!=='All'||f.type!=='All'||f.prio!=='All'||f.vip||f.soon||f.maint||f.q;
 const reset=()=>setF({floor:'All',status:'All',type:'All',prio:'All',vip:false,soon:false,maint:false,q:''});
 return <div className="page">
  <PageHead title="Rooms" sub={`${rooms.length} rooms · ${rooms.filter(r=>r.status==='Ready').length} ready · ${rooms.filter(r=>['Dirty','Cleaning','Clean'].includes(r.status)).length} in turnover`} right={<Seg value={view} onChange={setView} options={[{v:'grid',l:'Grid'},{v:'list',l:'List'}]}/>}/>
  <div className="row g8" style={{flexWrap:'wrap'}}>{Object.keys(ROOM_TONE).map(s=>{const n=rooms.filter(r=>r.status===s).length;const on=f.status===s;return <button key={s} className={'stchip'+(on?' on':'')} onClick={()=>set('status',on?'All':s)}><span className="sw" style={{background:TONE[ROOM_TONE[s]][1],borderColor:TONE[ROOM_TONE[s]][0]+'66'}}></span>{s}<b className="num">{n}</b></button>})}</div>
  <div className="fbar"><div className="search sm"><Icon n="search" s={15} c="#6a6a6a"/><input placeholder="Room or guest" value={f.q} onChange={e=>set('q',e.target.value)}/></div>
   <Seg value={f.floor} onChange={v=>set('floor',v)} options={['All','1','2','3','4','5'].map(x=>({v:x,l:x==='All'?'All floors':'F'+x}))}/>
   <Sel value={f.type} onChange={v=>set('type',v)} options={[{v:'All',l:'All room types'},'Deluxe King','Deluxe Twin','Executive','Suite']}/>
   <Sel value={f.prio} onChange={v=>set('prio',v)} options={[{v:'All',l:'Any priority'},'High','Medium','Low']}/>
   <Chip on={f.vip} icon="star" onClick={()=>set('vip',!f.vip)}>VIP</Chip><Chip on={f.soon} icon="clock" onClick={()=>set('soon',!f.soon)}>Arriving &lt; 2h</Chip><Chip on={f.maint} icon="wrench" onClick={()=>set('maint',!f.maint)}>Maintenance open</Chip>
   {any&&<button className="link small" onClick={reset}>Clear filters</button>}</div>
  {!list.length?<Panel><Empty icon="search" title="No rooms match these filters" action={<Btn onClick={reset}>Clear filters</Btn>}/></Panel>:
  view==='grid'?[5,4,3,2,1].filter(fl=>list.some(r=>r.floor===fl)).map(fl=><div key={fl} className="col g8"><div className="small" style={{fontWeight:600}}>Floor {fl} <span className="muted" style={{fontWeight:400}}>· {list.filter(r=>r.floor===fl).length} rooms</span></div>
   <div className="rgrid">{list.filter(r=>r.floor===fl).map(r=>{const c=clTask(r),m=mTask(r),p=roomPriority(r);return <button key={r.id} className={'rtile'+(m&&m.severity==='Critical'?' tcrit':'')} onClick={()=>go('room/'+r.id)}>
    <div className="row" style={{justifyContent:'space-between'}}><span className="num" style={{fontSize:20,fontWeight:600}}>{r.id}</span><RoomStatus s={r.status}/></div>
    <span className="small muted">{r.type}</span>
    <span className="small ell" style={{color:'var(--color-body)',minHeight:18}}>{r.guest?<>In house · {r.guest}</>:r.arrival?<>Arrives {hm(r.arrival.ts)} · {r.arrival.name}</>:r.note||'No arrival today'}</span>
    <span className="row g4" style={{flexWrap:'wrap',minHeight:22}}>{(r.vip||(r.arrival&&r.arrival.vip))&&<Pill tone="ink" icon="star">VIP</Pill>}{['Dirty','Cleaning','Clean'].includes(r.status)&&p!=='Low'&&<Prio p={p}/>}{c&&c.breached&&<Pill tone="critSoft" icon="clock">Overdue</Pill>}{m&&<Pill tone={m.severity==='Critical'?'crit':'plum'} icon="wrench">{m.category}</Pill>}</span></button>})}</div></div>)
  :<Panel pad={false}><div className="tscroll"><table className="tbl"><thead><tr><th>Room</th><th>Floor</th><th>Type</th><th>Status</th><th>Guest / reservation</th><th>Next check-in</th><th>Cleaning</th><th>Maintenance</th><th>Priority</th></tr></thead><tbody>{list.map(r=>{const c=clTask(r),m=mTask(r);return <tr key={r.id} onClick={()=>go('room/'+r.id)} className="click">
   <td><b className="num">{r.id}</b>{(r.vip||(r.arrival&&r.arrival.vip))&&<Icon n="star" s={12} style={{marginLeft:6}}/>}</td><td className="num">{r.floor}</td><td>{r.type}</td><td><RoomStatus s={r.status}/></td><td>{r.guest||<span className="muted">Vacant</span>}</td><td className="num">{r.arrival?`${hm(r.arrival.ts)} · ${r.arrival.name}`:<span className="muted">—</span>}</td>
   <td>{c?<TaskStatus s={c.status}/>:<span className="muted">—</span>}</td><td>{m?<span className="row g6"><Prio p={m.severity}/><span className="small">{m.category}</span></span>:<span className="muted">—</span>}</td><td><Prio p={roomPriority(r)}/></td></tr>})}</tbody></table></div></Panel>}
 </div>;
}

function RoomDetail({id}){
 useNow(10000);const r=S.rooms[id];
 if(!r)return <div className="page"><Panel><Empty icon="bed" title={`Room ${id} doesn’t exist`} action={<Btn onClick={()=>go('rooms')}>Back to rooms</Btn>}/></Panel></div>;
 const ts=Object.values(S.tasks).filter(t=>t.room===id),open=ts.filter(active),done=ts.filter(t=>!active(t)).sort((a,b)=>b.created-a.created);
 const ev=S.log.filter(e=>e.room===id),aiEv=ev.filter(e=>e.kind==='AI Agent'&&/status|category|severity|assigned|Cleaner|Technician/i.test(e.type));
 const p=roomPriority(r);
 return <div className="page">
  <PageHead back={{label:'Rooms',go:()=>go('rooms')}} title={<span className="row g12">Room {r.id}<RoomStatus s={r.status}/>{['Dirty','Cleaning','Clean'].includes(r.status)&&<Prio p={p}/>}</span>} sub={`${r.type} · Floor ${r.floor}${r.note?' · '+r.note:''}`}
   right={<>{r.status==='Occupied'&&<Btn icon="logout" onClick={()=>checkout(r.id)}>Simulate checkout</Btn>}{r.status==='Out of Service'||r.status==='Blocked'?<Btn onClick={()=>A.roomStatus(r.id,'Dirty')}>Return to service</Btn>:!['Occupied'].includes(r.status)&&<Btn icon="lock" onClick={()=>A.roomStatus(r.id,'Out of Service')}>Mark out of service</Btn>}<Btn v="primary" icon="wrench" onClick={()=>openReport(r.id)}>Report issue</Btn></>}/>
  <div className="g2-1">
   <div className="col g20">
    <div className="g2">
     <Panel title="Current guest"><div className="dl"><div>Guest</div><div>{r.guest||<span className="muted">Vacant</span>}{r.vip&&<Pill tone="ink" icon="star" style={{marginLeft:6}}>VIP</Pill>}</div><div>Departure</div><div>{r.guest?(r.dueOut?'Due out today':'Stays tonight'):'—'}</div></div></Panel>
     <Panel title="Upcoming reservation"><div className="dl"><div>Guest</div><div>{r.arrival?<>{r.arrival.name}{r.arrival.vip&&<Pill tone="ink" icon="star" style={{marginLeft:6}}>VIP</Pill>}</>:<span className="muted">None today</span>}</div><div>Check-in</div><div className="num">{r.arrival?`${hm(r.arrival.ts)} · in ${dur(r.arrival.ts-Date.now())}`:'—'}</div></div></Panel>
    </div>
    <Panel title="Open tasks" sub={open.length?`${open.length} in progress`:null}>{!open.length?<Empty icon="check" title="No open tasks" body="This room has no cleaning or maintenance work pending."/>:<div className="col g8">{open.map(t=><button key={t.id} className="trow" onClick={()=>t.type==='Maintenance'?go('issue/'+t.id):openTask(t.id)}><Icon n={t.type==='Maintenance'?'wrench':'brush'} s={16}/><span className="col" style={{alignItems:'flex-start',gap:2,minWidth:0}}><b>{t.type==='Maintenance'?t.desc:t.title||'Cleaning'}</b><span className="small muted">{t.id} · {nmOf(t.assignee)||'Unassigned'}</span></span><span style={{flex:1}}></span><Prio p={t.prio}/><TaskStatus s={t.status}/><SLA t={t}/></button>)}</div>}</Panel>
    <Panel title={<span className="row g8"><Icon n="bolt" s={16}/>AI decisions</span>} sub="What the agents decided for this room, in plain language">{!aiEv.length?<Empty icon="bolt" title="No AI decisions today"/>:<div className="col">{aiEv.slice(0,6).map(e=><div key={e.id} className="aiev"><span className="num small muted">{hm(e.ts)}</span><div className="col" style={{gap:2}}><b>{e.action}</b><span className="small" style={{color:'var(--color-body)'}}>{e.actor} · {e.result}</span></div></div>)}</div>}</Panel>
    <div className="g2">
     <Panel title="Housekeeping history">{done.filter(t=>t.type!=='Maintenance').length?<div className="col g8">{done.filter(t=>t.type!=='Maintenance').map(t=><div key={t.id} className="row g8 small"><span className="num muted">{hm(t.done||t.created)}</span><span>{t.title||'Cleaning'} · {nmOf(t.assignee)}</span><span style={{flex:1}}></span><TaskStatus s={t.status}/></div>)}</div>:<span className="small muted">No completed cleaning today.</span>}</Panel>
     <Panel title="Maintenance history">{done.filter(t=>t.type==='Maintenance').length?<div className="col g8">{done.filter(t=>t.type==='Maintenance').map(t=><div key={t.id} className="row g8 small"><span className="num muted">{hm(t.done||t.created)}</span><span className="ell">{t.desc}</span><span style={{flex:1}}></span><TaskStatus s={t.status}/></div>)}</div>:<span className="small muted">No resolved issues today.</span>}</Panel>
    </div>
   </div>
   <Panel title="Activity timeline" sub="Every event for this room"><Timeline events={ev} compact/></Panel>
  </div></div>;
}
Object.assign(window,{Dashboard,Rooms,RoomDetail,AttentionList,Lane,turnoverStages,maintStages,RoomChip});
})();
