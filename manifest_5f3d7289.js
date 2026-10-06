(()=>{
const {useState}=React;
const {Avatar}=window.AirbnbDesignSystem_019df1;

function ReassignList({t,onDone}){
 const cat=t.type==='Maintenance'?['Maintenance']:t.type==='Inspection'?['Supervisors','Housekeeping']:['Housekeeping'];
 const r=S.rooms[t.room];
 const list=Object.values(S.staff).filter(s=>cat.includes(s.cat)).map(s=>({s,load:loadOf(s.id),ok:s.avail==='Available'||s.avail==='Busy'})).sort((a,b)=>(b.ok-a.ok)||(a.load-b.load));
 return <div className="col" style={{border:'1px solid var(--color-hairline)',borderRadius:12,overflow:'hidden'}}>{list.map(({s,load,ok})=>{const cur=s.id===t.assignee;const skill=t.type==='Maintenance'&&t.skill&&s.skills.includes(t.skill);
  return <button key={s.id} disabled={!ok||cur} className="rrow" onClick={()=>{A.reassign(t,s.id);onDone&&onDone()}}>
   <Avatar name={s.name} size={32}/><span className="col" style={{flex:1,minWidth:0,textAlign:'left',gap:2}}><span className="row g6"><b>{s.name}</b>{cur&&<Pill tone="muted">Current</Pill>}{skill&&<Pill tone="ok">{t.skill}</Pill>}{s.floor===r.floor&&<Pill tone="muted">Same floor</Pill>}</span><span className="small muted">{s.role} · Floor {s.floor} · {s.skills.join(', ')||'—'}</span></span>
   <span className="col" style={{alignItems:'flex-end',gap:4}}><Avail a={s.avail}/><span className="small muted num">{ok?`${load} active task${load===1?'':'s'}`:'Skipped by AI'}</span></span></button>})}</div>;
}

function TaskDrawer({t}){
 const [re,setRe]=useState(false),[blk,setBlk]=useState(null),[cx,setCx]=useState(false);
 const r=S.rooms[t.room],close=()=>{S.ui.drawer=null;emit()};
 const ev=S.log.filter(e=>e.room===t.room&&e.ts>=t.created-120000);
 const act=active(t);
 const acts=[];
 if(t.status==='Assigned')acts.push(<Btn key="s" v="primary" icon="play" onClick={()=>A.start(t)}>{t.type==='Maintenance'?'Start repair':t.type==='Inspection'?'Start inspection':'Start cleaning'}</Btn>);
 if(t.status==='Cleaning'||t.status==='In repair')acts.push(<Btn key="c" v="primary" icon="check" onClick={()=>A.complete(t)}>{t.type==='Maintenance'?'Mark resolved':'Mark clean'}</Btn>);
 if(t.status==='Inspection Required')acts.push(<Btn key="i" v="primary" icon="check" onClick={()=>A.complete(t)}>Pass inspection · mark Ready</Btn>);
 if(t.type==='Inspection'&&t.status==='Assigned')acts.push(<Btn key="ic" icon="check" onClick={()=>A.complete(t)}>Manually complete</Btn>);
 return <Drawer open onClose={close} title={<span className="row g8">{t.id}<span className="muted" style={{fontWeight:400}}>· {t.title||t.type}</span></span>} sub={`Room ${t.room} · ${r.type} · Floor ${r.floor}`} width={560}
  footer={act?<div className="row g8" style={{flexWrap:'wrap'}}>{acts}{t.status!=='Blocked'&&<Btn icon="lock" onClick={()=>setBlk('')}>Mark blocked</Btn>}{!t.escalated&&<Btn icon="alert" onClick={()=>A.escalate(t)}>Escalate</Btn>}{(t.status==='Blocked'||t.breached)&&<Btn icon="refresh" onClick={()=>A.restart(t)}>Restart</Btn>}<div style={{flex:1}}></div>{!cx?<Btn v="tertiary" onClick={()=>setCx(true)}>Cancel task</Btn>:<span className="row g8"><span className="small">Cancel {t.id}?</span><Btn sz="xs" v="primary" onClick={()=>{A.cancel(t);setCx(false)}}>Yes, cancel</Btn><Btn sz="xs" onClick={()=>setCx(false)}>Keep</Btn></span>}</div>
   :<div className="row g8"><Btn icon="refresh" onClick={()=>A.restart(t)}>Restart task</Btn><span className="small muted">This task is {t.status.toLowerCase()}.</span></div>}>
  <div className="col g20">
   <div className="row g8" style={{flexWrap:'wrap'}}><TaskStatus s={t.status}/><Prio p={t.prio}/><AssignTag ai={t.ai}/><SLA t={t}/>{t.escalated&&<Pill tone="critSoft" icon="alert">Escalated</Pill>}</div>
   {t.status==='Blocked'&&<div className="alert warn"><Icon n="lock" s={18}/><div><b>Blocked.</b> {t.blocked}</div></div>}
   {blk!==null&&<div className="ovbox col g8"><b>Why is this task blocked?</b><div className="row g8" style={{flexWrap:'wrap'}}>{['Guest in room / DND','Waiting for parts','Room not accessible','Needs another trade'].map(x=><Chip key={x} on={blk===x} onClick={()=>setBlk(x)}>{x}</Chip>)}</div><div className="row g8"><Btn v="primary" disabled={!blk} onClick={()=>{A.block(t,blk);setBlk(null)}}>Mark blocked</Btn><Btn v="tertiary" onClick={()=>setBlk(null)}>Cancel</Btn></div></div>}
   {t.type==='Maintenance'&&<div className="quote">“{t.desc}”<div className="small muted" style={{marginTop:6,fontStyle:'normal'}}>Reported by {t.reporter} · {hm(t.created)} · <button className="link" onClick={()=>{close();go('issue/'+t.id)}}>Open full issue</button></div></div>}
   <div className="dl">
    <div>Created</div><div className="num">{hm(t.created)} · {ago(t.created)}</div>
    <div>Started</div><div className="num">{t.started?hm(t.started):'Not started'}</div>
    {t.type!=='Maintenance'&&<><div>Expected</div><div className="num">{t.started?hm(t.started+t.sla*MIN):t.sla+' min once started'}</div><div>Elapsed</div><div><Elapsed from={t.started} exp={t.sla}/></div></>}
    <div>Next guest</div><div>{r.arrival?`${r.arrival.name}${r.arrival.vip?' (VIP)':''} · ${hm(r.arrival.ts)}`:r.guest?`In house: ${r.guest}`:'No arrival today'}</div>
    {t.type==='Maintenance'&&<><div>Category</div><div>{t.category} {t.fallback&&<Pill tone="warn">Default</Pill>}</div></>}
   </div>
   <div className="col g8"><div className="row" style={{justifyContent:'space-between'}}><b>Assigned to</b>{act&&<button className="link small" onClick={()=>setRe(!re)}>{re?'Close':'Reassign'}</button>}</div>
    <Person id={t.assignee} sub={t.assignee?(t.ai?'Assigned automatically by '+(t.type==='Maintenance'?'Maintenance':'Housekeeping')+' Agent':'Assigned manually'):(t.noTech?'No qualified technician available':'Waiting for an available attendant')} size={36}/>
    {re&&<ReassignList t={t} onDone={()=>setRe(false)}/>}</div>
   {act&&<div className="col g8"><b>{t.type==='Maintenance'?'Severity':'Priority'}</b><Seg value={t.prio} onChange={p=>A.priority(t,p)} options={t.type==='Maintenance'?['Critical','High','Medium','Low']:['High','Medium','Low']}/><span className="small muted">Changes are recorded in the audit log as a human override.</span></div>}
   <div className="col g8"><b>Activity</b><Timeline events={ev} compact/></div>
  </div></Drawer>;
}

function StaffDrawer({s}){
 const close=()=>{S.ui.drawer=null;emit()};const ts=Object.values(S.tasks).filter(t=>t.assignee===s.id);const act=ts.filter(active);
 return <Drawer open onClose={close} title={<span className="row g12"><Avatar name={s.name} size={40}/>{s.name}</span>} sub={`${s.role} · ${s.cat}`}>
  <div className="col g20">
   <div className="col g8"><b>Availability</b><Seg value={s.avail} onChange={v=>A.avail(s.id,v)} options={['Available','Busy','Offline','On Leave']}/><span className="small muted">{s.avail==='Offline'||s.avail==='On Leave'?'Agents skip this person when assigning work.':'Agents can assign work to this person. Busy staff are only used when nobody else is free.'}</span></div>
   <div className="dl"><div>Location</div><div>{typeof s.floor==='number'?'Floor '+s.floor:s.floor}</div><div>Skills</div><div className="row g6" style={{flexWrap:'wrap'}}>{s.skills.length?s.skills.map(k=><Pill key={k} tone="muted">{k}</Pill>):'—'}</div><div>Completed today</div><div className="num">{s.done}</div><div>Current workload</div><div className="row g8"><div className="bar" style={{width:120}}><i style={{width:Math.min(100,act.length*25)+'%',background:act.length>=4?'#d9772b':'#222'}}></i></div><span className="num small">{act.length} active</span></div></div>
   <div className="col g8"><b>Current tasks</b>{!act.length?<Empty icon="tasks" title="No active tasks" body={s.avail==='Available'?'Ready for the next assignment.':undefined}/>:act.map(t=><button key={t.id} className="trow" onClick={()=>openTask(t.id)}><b className="num">Room {t.room}</b><span className="small muted">{t.id} · {t.type}</span><span style={{flex:1}}></span><Prio p={t.prio}/><TaskStatus s={t.status}/></button>)}</div>
   <div className="col g8"><b>Recent activity</b><Timeline events={S.log.filter(e=>e.actor===s.name||(e.action||'').includes(s.name))} max={12}/></div>
  </div></Drawer>;
}
function GlobalDrawers(){const d=S.ui.drawer;if(!d)return null;if(d.kind==='task'&&S.tasks[d.id])return <TaskDrawer t={S.tasks[d.id]} key={d.id}/>;if(d.kind==='staff'&&S.staff[d.id])return <StaffDrawer s={S.staff[d.id]} key={d.id}/>;return null}
Object.assign(window,{GlobalDrawers,ReassignList});
})();
