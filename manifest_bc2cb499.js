(()=>{
const MIN=60000;
let _seed=11;const rnd=()=>(_seed=(_seed*16807)%2147483647)/2147483647;
const now=()=>Date.now();
const T0=now();
let _uid=1;const uid=()=>'x'+(_uid++);
let _hk=2040,_mt=1180;

const PROPS=[{id:'pune',name:'Voyage Grand',city:'Pune',rooms:100},{id:'goa',name:'Voyage Bay',city:'Goa',rooms:64},{id:'blr',name:'Voyage Heights',city:'Bengaluru',rooms:140}];
const ROLES={
 manager:{name:'Amit Shah',title:'Hotel Manager',home:'dashboard'},
 ops:{name:'Kiran Naik',title:'Operations Manager',home:'dashboard'},
 frontdesk:{name:'Neha Kulkarni',title:'Front Desk',home:'rooms',nav:['dashboard','rooms','maint','issues','log']},
 hksup:{name:'Sunita Pawar',title:'Housekeeping Supervisor',home:'hk',nav:['dashboard','rooms','tasks','hk','staff','issues','log']},
 msup:{name:'Rahul Deshpande',title:'Maintenance Supervisor',home:'maint',nav:['dashboard','rooms','tasks','maint','staff','issues','log']},
 hkstaff:{name:'Priya Deshmukh',title:'Housekeeping Staff',mobile:true,staffId:'H01'},
 tech:{name:'Rakesh Jadhav',title:'Technician',mobile:true,staffId:'M01'},
};
const STAFF0=[
['H01','Priya Deshmukh','Housekeeping','Room Attendant',['Suites','VIP turndown'],1,'Available',9],
['H02','Sneha Patil','Housekeeping','Room Attendant',['Deep clean'],1,'Available',7],
['H03','Kavita Jadhav','Housekeeping','Room Attendant',['Standard'],1,'Busy',6],
['H04','Anjali More','Housekeeping','Room Attendant',['Standard','Twin rooms'],2,'Available',8],
['H05','Pooja Shinde','Housekeeping','Room Attendant',['Standard'],2,'Available',5],
['H06','Meena Gaikwad','Housekeeping','Senior Attendant',['Suites','Inspection'],3,'Available',7],
['H07','Rekha Kale','Housekeeping','Room Attendant',['Standard'],4,'Available',6],
['H08','Lata Chavan','Housekeeping','Room Attendant',['Suites','VIP turndown'],5,'Available',8],
['H09','Swati Joshi','Housekeeping','Room Attendant',['Standard'],3,'Offline',0],
['H10','Deepa Salunkhe','Housekeeping','Room Attendant',['Deep clean'],4,'On Leave',0],
['M01','Rakesh Jadhav','Maintenance','Technician',['HVAC','Electrical'],2,'Available',3],
['M02','Vikram Rane','Maintenance','Technician',['Electrical','AV','Appliance'],3,'Busy',2],
['M03','Sunil More','Maintenance','Chief Engineer',['Safety','Gas','General'],'B1','Available',2],
['M04','Farhan Shaikh','Maintenance','Plumber',['Plumbing'],'—','On Leave',0],
['M05','Ganesh Pawar','Maintenance','Technician',['Plumbing','Carpentry'],'—','Offline',0],
['U01','Sunita Pawar','Supervisors','Housekeeping Supervisor',['Inspection','Scheduling'],'All floors','Available',11],
['U02','Rahul Deshpande','Supervisors','Maintenance Supervisor',['Escalations','Vendors'],'All floors','Available',1],
['G01','Amit Shah','Managers','Hotel Manager',[],'All floors','Available',0],
['G02','Kiran Naik','Managers','Operations Manager',[],'All floors','Available',0],
['G03','Neha Kulkarni','Managers','Front Office Lead',[],'Lobby','Available',0],
];
const GUESTS=['Rohan Mehta','Anita Rao','David Chen','Sara Iyer','Kabir Malhotra','Emily Clarke','Arjun Nair','Fatima Sheikh','Vivek Menon','Ishita Kapoor','Tom Becker','Meera Pillai','Nikhil Bose','Aarav Gupta','Lena Hoffmann','Ravi Kulkarni','Sofia Rossi','Harsh Vora','Priyanka Sen','James Park','Yuki Tanaka','Omar Haddad','Neil Dsouza','Tara Singh'];
const typeOf=n=>n===20?'Suite':n>=17?'Executive':n>=11?'Deluxe Twin':'Deluxe King';
const cleanMins=t=>t==='Suite'?50:t==='Executive'?40:30;

const S={rooms:{},staff:{},tasks:{},log:[],notes:[],toasts:[],traces:[],agents:{},
 flags:{live:true,aiDown:false,offline:false},role:'manager',property:'pune',
 base:{ai:128,manual:6,overrides:3},ui:{report:null,notif:false,drawer:null}};
const subs=new Set();const emit=()=>subs.forEach(f=>f());
function useOps(){const [,f]=React.useReducer(x=>x+1,0);React.useEffect(()=>{subs.add(f);return()=>subs.delete(f)},[]);return S}

STAFF0.forEach(([id,name,cat,role,skills,floor,avail,done])=>S.staff[id]={id,name,cat,role,skills,floor,avail,done});
S.agents={
 orch:{id:'orch',name:'Orchestrator',desc:'Receives events and routes work to the right agent',processed:412,success:99.8,last:'Routed checkout · Room 116 to Room Readiness',lastTs:T0-40000,current:null},
 rr:{id:'rr',name:'Room Readiness',desc:'Detects checkouts, sets room status and cleaning urgency',processed:96,success:100,last:'Marked Room 520 DIRTY (High)',lastTs:T0-9*MIN,current:null},
 hk:{id:'hk',name:'Housekeeping',desc:'Matches attendants to rooms and tracks cleaning',processed:143,success:97.9,last:'Assigned Lata Chavan to Room 520',lastTs:T0-8*MIN,current:null},
 mt:{id:'mt',name:'Maintenance',desc:'Classifies issues, sets severity and SLA, finds technicians',processed:38,success:94.7,last:'Assigned Vikram Rane to Room 305',lastTs:T0-4*MIN,current:null},
};

// ---------- rooms
for(let f=1;f<=5;f++)for(let n=1;n<=20;n++){
 const id=`${f}${String(n).padStart(2,'0')}`,type=typeOf(n),x=rnd();
 const status=x<.6?'Occupied':x<.69?'Dirty':x<.75?'Cleaning':x<.79?'Clean':'Ready';
 const r={id,floor:f,type,status,guest:null,vip:false,dueOut:false,arrival:null,note:null};
 if(status==='Occupied'){r.guest=GUESTS[Math.floor(rnd()*GUESTS.length)];r.dueOut=rnd()<.28;r.vip=type==='Suite'&&rnd()<.5}
 if(status!=='Occupied'&&rnd()<.72)r.arrival={name:GUESTS[Math.floor(rnd()*GUESTS.length)],ts:T0+Math.round(40+rnd()*380)*MIN,vip:type==='Suite'||rnd()<.12};
 S.rooms[id]=r;
}
const ov=(id,p)=>Object.assign(S.rooms[id],p);
ov('101',{status:'Occupied',guest:'Rohan Mehta',dueOut:true,arrival:{name:'Kavya Reddy',ts:T0+150*MIN,vip:false}});
ov('107',{status:'Dirty',guest:null,arrival:{name:'Sara Iyer',ts:T0+170*MIN,vip:false}});
ov('112',{status:'Dirty',guest:null,arrival:null});
ov('116',{status:'Occupied',guest:'Omar Haddad',dueOut:false});
ov('118',{status:'Cleaning',guest:null,arrival:{name:'Emily Clarke',ts:T0+55*MIN,vip:false}});
ov('204',{status:'Occupied',guest:'Anita Rao',dueOut:false,vip:false});
ov('215',{status:'Maintenance',guest:null,arrival:null,note:'Shower drain blocked'});
ov('220',{status:'Occupied',guest:'Tom Becker',dueOut:false});
ov('305',{status:'Occupied',guest:'David Chen',dueOut:false});
ov('309',{status:'Occupied',guest:'Meera Pillai'});
ov('312',{status:'Occupied',guest:'James Park'});
ov('402',{status:'Ready',guest:null,arrival:{name:'Mr. & Mrs. Kapoor',ts:T0+75*MIN,vip:true}});
ov('410',{status:'Occupied',guest:'Yuki Tanaka'});
ov('413',{status:'Blocked',guest:null,arrival:null,note:'Carpet replacement — awaiting parts'});
ov('507',{status:'Out of Service',guest:null,arrival:null,note:'Bathroom renovation until 3 Oct'});
ov('520',{status:'Dirty',guest:null,vip:false,arrival:{name:'Lena Hoffmann',ts:T0+100*MIN,vip:true}});

function roomPriority(r){
 if(!r.arrival)return 'Low';
 const m=(r.arrival.ts-now())/MIN;
 if(m<120||(r.arrival.vip&&m<240))return 'High';
 if(m<360)return 'Medium';return 'Low';
}
function prioWhy(r){
 if(!r.arrival)return 'No arrival booked today';
 const m=Math.round((r.arrival.ts-now())/MIN);const h=m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m} min`;
 return (r.arrival.vip?'VIP arrival':'Next guest arrives')+' in '+h;
}

// ---------- tasks
function mkTask(o){
 const cl=o.type!=='Maintenance';
 const t={id:cl?`HK-${++_hk}`:`MT-${++_mt}`,created:now(),assignee:null,ai:true,started:null,done:null,breached:false,escalated:false,blocked:null,...o};
 if(cl&&!t.sla)t.sla=cleanMins(S.rooms[t.room].type);
 S.tasks[t.id]=t;return t;
}
const floorCleaners=f=>Object.values(S.staff).filter(s=>s.cat==='Housekeeping'&&s.floor===f&&(s.avail==='Available'||s.avail==='Busy'));
Object.values(S.rooms).forEach(r=>{
 const exp=cleanMins(r.type);
 if(['Dirty','Cleaning','Clean'].includes(r.status)){
  const pool=floorCleaners(r.floor).filter(s=>s.id!=='H01');
  const c=pool[Math.floor(rnd()*pool.length)];
  const t={type:'Cleaning',room:r.id,prio:roomPriority(r),created:T0-Math.round(10+rnd()*50)*MIN};
  if(r.status==='Dirty'){if(rnd()<.4||!c){t.status='Unassigned'}else{t.status='Assigned';t.assignee=c.id}}
  if(r.status==='Cleaning'){t.status='Cleaning';t.assignee=c?c.id:'H02';t.started=now()-Math.round(4+rnd()*(exp-8))*MIN}
  if(r.status==='Clean'){t.status='Inspection Required';t.assignee=c?c.id:'H04';t.started=now()-(exp+8)*MIN}
  if(rnd()<.12)t.ai=false;
  if(t.status==='Unassigned'||t.status==='Assigned')t.created=now()-Math.round(3+rnd()*15)*MIN;
  mkTask(t);
 }
 if(r.status==='Ready'&&rnd()<.6){mkTask({type:'Cleaning',room:r.id,prio:'Medium',status:'Completed',assignee:(floorCleaners(r.floor).filter(s=>s.id!=='H01')[0]||{id:'H05'}).id,created:T0-Math.round(90+rnd()*120)*MIN,started:T0-80*MIN,done:T0-Math.round(20+rnd()*40)*MIN})}
});
// fix specific cleaning tasks
Object.values(S.tasks).filter(t=>['107','112','118','520'].includes(t.room)).forEach(t=>delete S.tasks[t.id]);
mkTask({type:'Cleaning',room:'107',prio:roomPriority(S.rooms['107']),status:'Assigned',assignee:'H01',created:T0-6*MIN});
mkTask({type:'Cleaning',room:'112',prio:'Low',status:'Assigned',assignee:'H01',created:T0-3*MIN});
const t118=mkTask({type:'Cleaning',room:'118',prio:'High',status:'Cleaning',assignee:'H03',created:T0-62*MIN,started:T0-48*MIN,breached:true});
mkTask({type:'Cleaning',room:'520',prio:'High',status:'Assigned',assignee:'H08',created:T0-8*MIN});
mkTask({type:'Inspection',room:'402',prio:'High',status:'Completed',assignee:'U01',created:T0-40*MIN,started:T0-22*MIN,done:T0-12*MIN,sla:20,title:'VIP pre-arrival inspection'});
mkTask({type:'Inspection',room:'520',prio:'High',status:'Assigned',assignee:'U01',created:T0-8*MIN,sla:20,title:'VIP pre-arrival inspection'});

const MT=(o)=>mkTask({type:'Maintenance',...o,prio:o.severity});
MT({room:'305',desc:'Burning smell from the wall socket near the desk',category:'Safety / Electrical',severity:'Critical',aiSeverity:'High',forced:true,sla:10,assignee:'M02',status:'In repair',created:T0-4*MIN,started:T0-2*MIN,escalated:true,why:'The description mentions a burning smell from an electrical socket.',sevWhy:'Fire, smoke and gas reports are always treated as Critical by the hotel safety rule.',conf:'High',reporter:'Neha Kulkarni',match:'Vikram Rane — Electrical skill, on Floor 3, nearest qualified technician'});
MT({room:'220',desc:'Toilet keeps running and won\'t stop flushing',category:'Plumbing',severity:'Medium',sla:60,assignee:null,status:'Unassigned',created:T0-22*MIN,escalated:true,noTech:true,why:'The description mentions a toilet that keeps flushing.',sevWhy:'The guest can still use the room, but water waste will continue until fixed.',conf:'High',reporter:'Sneha Patil',match:'No plumber on shift. Farhan Shaikh is on leave and Ganesh Pawar is offline until 14:00.'});
MT({room:'215',desc:'Shower drain is blocked, water not going down',category:'Plumbing',severity:'Medium',sla:60,assignee:null,status:'Blocked',blocked:'No plumber on shift until 14:00',created:T0-95*MIN,breached:true,noTech:true,why:'The description mentions a blocked shower drain.',sevWhy:'The room is vacant, so no guest is affected right now.',conf:'High',reporter:'Anjali More',match:'No plumber on shift.'});
MT({room:'410',desc:'Bathroom light keeps flickering',category:'Electrical',severity:'Medium',sla:60,assignee:'M02',status:'Assigned',created:T0-18*MIN,why:'The description mentions a flickering light.',sevWhy:'Affects comfort but not safety.',conf:'High',reporter:'Front Desk',match:'Vikram Rane — Electrical skill, queued after Room 305'});
MT({room:'312',desc:'TV remote not working',category:'IT / AV',severity:'Low',sla:120,assignee:'M02',status:'Assigned',created:T0-41*MIN,why:'The description mentions the TV remote.',sevWhy:'Minor inconvenience; a replacement remote usually fixes it.',conf:'High',reporter:'Front Desk',match:'Vikram Rane — AV skill'});
MT({room:'116',desc:'Something is wrong with the balcony door',category:'General',severity:'Medium',sla:60,assignee:'M03',status:'Assigned',created:T0-26*MIN,fallback:true,needsReview:true,why:'Default classification applied while AI was unavailable.',sevWhy:'Default priority. Queued for human review.',conf:'None',reporter:'Omar Haddad (guest call)',match:'Sunil More — general maintenance, available'});
MT({room:'309',desc:'Mini-fridge is not cooling',category:'Appliance',severity:'Low',sla:120,assignee:'M02',status:'Assigned',created:T0-12*MIN,why:'The description mentions the mini-fridge.',sevWhy:'Guest comfort item, not urgent.',conf:'High',reporter:'Housekeeping',match:'Vikram Rane — Appliance skill'});
MT({room:'208',desc:'AC making a loud rattling noise',category:'HVAC',severity:'High',sla:30,assignee:'M01',status:'Completed',created:T0-150*MIN,started:T0-140*MIN,done:T0-118*MIN,why:'The description mentions the air-conditioning unit.',sevWhy:'Noise affects guest sleep and comfort.',conf:'High',reporter:'Front Desk',match:'Rakesh Jadhav — HVAC skill'});
MT({room:'503',desc:'Door lock card reader not responding',category:'Access / Locks',severity:'High',sla:30,assignee:'M03',status:'Completed',created:T0-200*MIN,started:T0-195*MIN,done:T0-178*MIN,why:'The description mentions the door lock.',sevWhy:'The guest cannot enter the room.',conf:'High',reporter:'Front Desk',match:'Sunil More — General'});
S.rooms['215'].maint=true;['220','305','410','312','116','309'].forEach(id=>S.rooms[id].maint=true);

// ---------- seed log
function log(type,actor,kind,room,action,result,ts=now()){S.log.unshift({id:uid(),ts,type,actor,kind,room,action,result});if(S.log.length>500)S.log.pop()}
const nm=id=>id?S.staff[id]?.name:null;
Object.values(S.tasks).forEach(t=>{
 const c=t.created;
 if(t.type==='Cleaning'){
  log('Guest checkout received','PMS','System',t.room,'Guest checked out','Event queued',c-60000);
  log('Room status changed','Room Readiness Agent','AI Agent',t.room,'OCCUPIED → DIRTY','Priority '+t.prio,c-50000);
  log('Task created','Housekeeping Agent','AI Agent',t.room,`Cleaning task ${t.id} created`,t.prio+' priority',c);
  if(t.assignee)log('Cleaner assigned',t.ai?'Housekeeping Agent':'Sunita Pawar',t.ai?'AI Agent':'Supervisor',t.room,`Assigned ${nm(t.assignee)}`,t.ai?'Assigned automatically':'Manual assignment',c+30000);
  if(t.started)log('Cleaning started',nm(t.assignee),'Staff',t.room,'CLEANING started','In progress',t.started);
  if(t.done)log('Task completed',nm(t.assignee),'Staff',t.room,`${t.id} completed`,'Room READY',t.done);
 }else if(t.type==='Maintenance'){
  log('Maintenance issue reported',t.reporter,'Staff',t.room,`“${t.desc}”`,'Sent to Maintenance Agent',c);
  if(t.fallback){log('AI unavailable','Maintenance Agent','System',t.room,'Classification service did not respond','Default classification applied',c+4000)}
  else{log('AI category generated','Maintenance Agent','AI Agent',t.room,'Category: '+t.category,t.why,c+4000);
  log('AI severity generated','Maintenance Agent','AI Agent',t.room,'Severity: '+(t.aiSeverity||t.severity).toUpperCase(),'SLA '+t.sla+' min',c+5000)}
  if(t.forced)log('Safety rule applied','Safety Rules','System',t.room,'Severity HIGH → CRITICAL','Gas / fire / smoke is always Critical',c+6000);
  if(t.assignee)log('Technician assigned','Maintenance Agent','AI Agent',t.room,`Assigned ${nm(t.assignee)}`,t.match,c+8000);
  if(t.noTech)log('No technician available','Maintenance Agent','AI Agent',t.room,'No Plumbing technician available','Escalated to Rahul Deshpande',c+8000);
  if(t.done)log('Task completed',nm(t.assignee),'Staff',t.room,`${t.id} resolved`,'Repair completed',t.done);
 }
});
log('SLA breached','System','System','118',`${t118.id} exceeded 30 min cleaning time`,'Flagged to Sunita Pawar',T0-18*MIN);
log('AI unavailable','System','System',null,'Classification service not responding','Fallback rules active',T0-27*MIN);
log('AI service restored','System','System',null,'Classification service responding','Normal operation',T0-24*MIN);
log('Human override','Sunita Pawar','Supervisor','214','Reassigned from Pooja Shinde → Anjali More by Sunita Pawar','Applied',T0-33*MIN);
S.log.sort((a,b)=>b.ts-a.ts);

const note=(level,title,room,body,ts,read=false)=>S.notes.push({id:uid(),ts,level,title,room,body,read});
note('critical','Critical maintenance issue reported — Room 305','305','Burning smell from wall socket. Vikram Rane responding.',T0-4*MIN);
note('warning','No technician available for Room 220','220','Plumbing. Escalated to Rahul Deshpande.',T0-22*MIN);
note('warning','Cleaning task overdue — Room 118','118','Kavita Jadhav · 18 min over expected time. Next guest in 55 min.',T0-18*MIN);
note('info','VIP room requires priority cleaning — Room 520','520','Lena Hoffmann arrives in 1h 40m. Lata Chavan assigned.',T0-8*MIN);
note('success','Room 402 ready for guest arrival','402','VIP inspection passed.',T0-12*MIN,true);
note('warning','AI service temporarily unavailable','','Resolved after 3 min. 1 issue queued for review.',T0-27*MIN,true);

// ---------- helpers
function toast(level,title,body){const t={id:uid(),level,title,body};S.toasts.push(t);setTimeout(()=>{S.toasts=S.toasts.filter(x=>x!==t);emit()},level==='critical'?9000:5000)}
function notify(level,title,room,body,withToast=true){S.notes.unshift({id:uid(),ts:now(),level,title,room,body,read:false});if(withToast)toast(level,title,body)}
function agent(id,action,room){const a=S.agents[id];a.last=action;a.lastTs=now();a.processed++;a.current=room?'Room '+room:null;setTimeout(()=>{if(a.current==='Room '+room){a.current=null;emit()}},5000)}
const me=()=>ROLES[S.role].name;
const active=t=>!['Completed','Cancelled'].includes(t.status);
const loadOf=sid=>Object.values(S.tasks).filter(t=>t.assignee===sid&&active(t)).length;
function refreshAvail(sid){const s=S.staff[sid];if(!s||s.avail==='Offline'||s.avail==='On Leave')return;s.avail=Object.values(S.tasks).some(t=>t.assignee===sid&&['Cleaning','In repair'].includes(t.status))?'Busy':'Available'}
Object.keys(S.staff).forEach(refreshAvail);
function pickCleaner(floor,any){
 const c=Object.values(S.staff).filter(s=>s.cat==='Housekeeping'&&(s.avail==='Available'||(any&&s.avail==='Busy')));
 if(!c.length)return null;
 return c.map(s=>({s,score:loadOf(s.id)*2+(s.floor===floor?0:3)})).sort((a,b)=>a.score-b.score)[0].s;
}
function deadline(t){return (t.type==='Cleaning'&&t.started?t.started:t.created)+t.sla*MIN}
function seq(fns,gap){const ctx={};fns.forEach((f,i)=>setTimeout(()=>{f(ctx);emit()},i*gap))}

// ---------- flows
function checkout(id){
 const r=S.rooms[id];if(!r||r.status!=='Occupied'||S.flags.offline)return;
 const tr={id:uid(),kind:'checkout',room:id,title:'Guest checked out',ts:now(),steps:[]};S.traces.unshift(tr);
 const step=(stage,title,detail)=>tr.steps.push({stage,title,detail,ts:now()});
 const guest=r.guest;r.dueOut=false;
 seq([
  ()=>{step('event','Guest checked out',`${guest} · Room ${id} · from PMS`);log('Guest checkout received','PMS','System',id,`${guest} checked out`,'Event queued')},
  ()=>{step('orch','Orchestrator','Checkout event routed to Room Readiness');agent('orch',`Routed checkout · Room ${id} to Room Readiness`,id);log('Event routed','Orchestrator','AI Agent',id,'Checkout routed to Room Readiness Agent','Routed')},
  c=>{r.status='Dirty';r.guest=null;r.vip=false;c.p=roomPriority(r);const w=prioWhy(r);step('rr','Room Readiness Agent',`Marked DIRTY · ${c.p} priority · ${w}`);agent('rr',`Marked Room ${id} DIRTY (${c.p})`,id);log('Room status changed','Room Readiness Agent','AI Agent',id,'OCCUPIED → DIRTY',`${c.p} priority · ${w}`)},
  c=>{c.t=mkTask({type:'Cleaning',room:id,prio:c.p,status:'Unassigned'});step('hk','Housekeeping Agent','Looking for an available attendant');agent('hk',`Created ${c.t.id} for Room ${id}`,id);log('Task created','Housekeeping Agent','AI Agent',id,`Cleaning task ${c.t.id} created`,c.p+' priority')},
  c=>{const s=pickCleaner(r.floor);step('task','Task created',`${c.t.id} · Cleaning · ${c.p} · ${c.t.sla} min`);
   if(s){c.t.assignee=s.id;c.t.status='Assigned';step('person',s.name,`Assigned automatically · ${s.floor===r.floor?'on Floor '+s.floor:'nearest available, Floor '+s.floor} · ${loadOf(s.id)-1} other tasks`);agent('hk',`Assigned ${s.name} to Room ${id}`,id);log('Cleaner assigned','Housekeeping Agent','AI Agent',id,`Assigned ${s.name}`,'Assigned automatically')}
   else{step('person','No attendant available','Task queued. Supervisor notified.');log('No staff available','Housekeeping Agent','AI Agent',id,'No available attendant','Queued · Sunita Pawar notified');notify('warning',`No housekeeping staff available — Room ${id}`,id,'Task queued until an attendant is free.')}
   c.done=true;if(c.t.assignee&&c.t.assignee!=='H01')setTimeout(()=>{startCleaning(c.t.id);emit();setTimeout(()=>{finishCleaning(c.t.id);emit();setTimeout(()=>{passInspection(c.t.id);emit()},9000)},16000)},7000)}
 ],1300);
}
function startCleaning(tid,actor){const t=S.tasks[tid];if(!t||t.status!=='Assigned')return;t.status='Cleaning';t.started=now();S.rooms[t.room].status='Cleaning';refreshAvail(t.assignee);log('Room status changed',actor||nm(t.assignee),'Staff',t.room,'DIRTY → CLEANING','Cleaning started')}
function finishCleaning(tid,actor){const t=S.tasks[tid];if(!t||t.status!=='Cleaning')return;t.status='Inspection Required';S.rooms[t.room].status='Clean';refreshAvail(t.assignee);S.staff[t.assignee]&&S.staff[t.assignee].done++;agent('hk',`Room ${t.room} cleaned · inspection requested`,t.room);log('Room status changed',actor||nm(t.assignee),'Staff',t.room,'CLEANING → CLEAN',`Took ${Math.max(1,Math.round((now()-t.started)/MIN))} min · inspection required`)}
function passInspection(tid,actor){const t=S.tasks[tid];if(!t||t.status!=='Inspection Required')return;t.status='Completed';t.done=now();const r=S.rooms[t.room];r.status='Ready';agent('rr',`Room ${t.room} marked READY`,t.room);log('Task completed',actor||'Sunita Pawar',actor?'Supervisor':'Supervisor',t.room,'CLEAN → READY','Room ready for next guest');if(r.arrival&&r.arrival.ts-now()<240*MIN)notify('success',`Room ${t.room} ready for guest arrival`,t.room,`${r.arrival.name} arrives at ${hm(r.arrival.ts)}.`,false)}

function classify(desc,aiDown){
 const d=' '+desc.toLowerCase()+' ',h=r=>r.test(d);
 if(h(/gas|smoke|fire|burning|spark|flame/)){const gas=h(/gas/);return{category:gas?'Safety / Gas':h(/socket|spark|wire|plug/)?'Safety / Electrical':'Safety / Fire',severity:'Critical',aiSeverity:aiDown?null:'High',forced:true,sla:10,skill:'Safety',why:gas?'The description mentions a gas smell, which may indicate a leak.':'The description mentions smoke, fire or a burning smell.',sevWhy:'Gas, fire and smoke reports are always treated as Critical by the hotel safety rule, regardless of the AI estimate.',conf:aiDown?'Rule':'High',fallback:aiDown,needsReview:false}}
 if(aiDown)return{category:'General',severity:'Medium',sla:60,skill:'General',why:'Default classification applied while AI was unavailable.',sevWhy:'Default priority. Queued for human review.',conf:'None',fallback:true,needsReview:true};
 const R=[
  [/\bac\b|a\/c|air ?con|cooling|not cool|heat|hvac|thermostat|too hot/,'HVAC','High',30,'HVAC','The description mentions an air-conditioning cooling problem.','The issue affects guest comfort and may require prompt attention.'],
  [/leak|water|sink|toilet|flush|drain|shower|tap|pipe/,'Plumbing','Medium',60,'Plumbing','The description mentions water, a leak or a bathroom fixture.','The guest can still use the room, but the problem may get worse if left.'],
  [/light|bulb|power|socket|switch|electric/,'Electrical','Medium',60,'Electrical','The description mentions lighting or power.','Affects comfort but is not a safety risk.'],
  [/\btv\b|wifi|wi-fi|remote|internet|phone/,'IT / AV','Low',120,'AV','The description mentions in-room technology.','Minor inconvenience for the guest.'],
  [/door|lock|key card|keycard|card/,'Access / Locks','High',30,'General','The description mentions a door or lock.','The guest may not be able to secure or enter the room.'],
  [/fridge|kettle|safe|dryer|minibar/,'Appliance','Low',120,'Appliance','The description mentions an in-room appliance.','Guest comfort item, not urgent.'],
 ];
 for(const [re,category,severity,sla,skill,why,sevWhy] of R)if(h(re))return{category,severity,sla,skill,why,sevWhy,conf:'High',fallback:false,needsReview:false};
 return{category:'General',severity:'Medium',sla:60,skill:'General',why:'The description doesn\'t match a specific trade, so it was treated as general maintenance.',sevWhy:'Standard priority until a technician confirms.',conf:'Low',fallback:false,needsReview:true};
}
function findTech(skill){
 const pool=Object.values(S.staff).filter(s=>s.cat==='Maintenance'&&s.avail==='Available'&&(s.skills.includes(skill)||(skill==='General'&&s.skills.includes('General'))));
 return pool.sort((a,b)=>loadOf(a.id)-loadOf(b.id))[0]||null;
}
function createIssue(roomId,desc,reporter){
 const aiDown=S.flags.aiDown,c=classify(desc,aiDown),r=S.rooms[roomId];
 let tech=c.skill==='Safety'?S.staff.M03:findTech(c.skill);
 if(c.skill==='Safety'&&S.staff.M03.avail!=='Available'&&S.staff.M03.avail!=='Busy')tech=findTech('Electrical');
 const t=mkTask({type:'Maintenance',room:roomId,desc,...c,prio:c.severity,status:tech?'Assigned':'Unassigned',assignee:tech?tech.id:null,reporter:reporter||me(),noTech:!tech,escalated:!tech||c.severity==='Critical',
  match:tech?`${tech.name} — ${c.skill==='Safety'?'on-call emergency responder':c.skill+' skill'}, available${typeof tech.floor==='number'?', on Floor '+tech.floor:''}`:`No available technician with ${c.skill} skills. Escalated to Rahul Deshpande.`});
 r.maint=true;if(r.status==='Ready'||r.status==='Clean')r.status='Maintenance';
 const tr={id:uid(),kind:'issue',room:roomId,title:'Maintenance issue reported',ts:now(),steps:[]};S.traces.unshift(tr);
 const step=(stage,title,detail)=>tr.steps.push({stage,title,detail,ts:now()});
 step('event','Issue reported',`“${desc}” · Room ${roomId}`);
 step('orch','Orchestrator','Issue routed to Maintenance Agent');
 step('mt','Maintenance Agent',c.fallback&&!c.forced?'AI unavailable · default classification applied':`${c.category} · ${(c.aiSeverity||c.severity)} · ${c.sla} min SLA`);
 if(c.forced)step('rule','Safety rule',`${c.aiSeverity?c.aiSeverity.toUpperCase()+' → ':''}CRITICAL · immediate escalation`);
 step('task','Task created',`${t.id} · Maintenance · ${c.severity}`);
 step('person',tech?tech.name:'No technician available',tech?'Assigned automatically':'Escalated to Rahul Deshpande');
 log('Maintenance issue reported',t.reporter,'Staff',roomId,`“${desc}”`,'Sent to Maintenance Agent');
 log('Event routed','Orchestrator','AI Agent',roomId,'Issue routed to Maintenance Agent','Routed');
 if(c.fallback&&!c.forced){log('AI unavailable','Maintenance Agent','System',roomId,'Classification service did not respond','Default classification applied · queued for review');S.agents.mt.last=`Fallback classification · Room ${roomId}`;S.agents.mt.lastTs=now()}
 else{log('AI category generated','Maintenance Agent','AI Agent',roomId,'Category: '+c.category,c.why);log('AI severity generated','Maintenance Agent','AI Agent',roomId,'Severity: '+(c.aiSeverity||c.severity).toUpperCase(),'SLA '+c.sla+' min')}
 if(c.forced)log('Safety rule applied','Safety Rules','System',roomId,`Severity ${c.aiSeverity?c.aiSeverity.toUpperCase():'DEFAULT'} → CRITICAL`,'Gas / fire / smoke is always Critical');
 agent('orch',`Routed issue · Room ${roomId} to Maintenance`,roomId);
 if(tech){agent('mt',`Assigned ${tech.name} to Room ${roomId}`,roomId);log('Technician assigned','Maintenance Agent','AI Agent',roomId,`Assigned ${tech.name}`,t.match)}
 else{agent('mt',`No technician for Room ${roomId} · escalated`,roomId);log('No technician available','Maintenance Agent','AI Agent',roomId,`No ${c.skill} technician available`,'Escalated to Rahul Deshpande');notify('warning',`No technician available for Room ${roomId}`,roomId,`${c.category}. Escalated to Rahul Deshpande.`)}
 if(c.severity==='Critical'){log('Escalation','Maintenance Agent','AI Agent',roomId,'Emergency response started','Rahul Deshpande, Security desk and Duty Manager notified');notify('critical',`Critical maintenance issue reported — Room ${roomId}`,roomId,`${c.category}. ${tech?tech.name+' responding.':''} Supervisor notified.`)}
 if(c.fallback&&!c.forced)notify('warning','AI classification unavailable — Room '+roomId,roomId,'Default priority applied. Needs human review.',false);
 emit();return t;
}

function setTask(t,patch,type,action,result){Object.assign(t,patch);log(type,me(),S.role.includes('staff')||S.role==='tech'?'Staff':'Supervisor',t.room,action,result||'Applied');S.base.overrides+=type==='Human override'?1:0;Object.keys(S.staff).forEach(refreshAvail);emit()}
const A={
 reassign(t,sid){const from=nm(t.assignee)||'Unassigned';setTask(t,{assignee:sid,ai:false,status:t.status==='Unassigned'?'Assigned':t.status,noTech:false},'Human override',`Reassigned from ${from} → ${nm(sid)} by ${me()}`)},
 priority(t,p){const f=t.type==='Maintenance'?'Severity':'Priority';const from=t.prio;setTask(t,{prio:p,severity:t.type==='Maintenance'?p:t.severity},'Human override',`${f} changed from ${from.toUpperCase()} → ${p.toUpperCase()} by ${me()}`)},
 category(t,c){const from=t.category;setTask(t,{category:c,needsReview:false},'Human override',`Category changed from ${from} → ${c} by ${me()}`)},
 confirm(t){setTask(t,{needsReview:false},'AI classification confirmed',`Classification confirmed by ${me()}`,`${t.category} · ${t.severity}`)},
 escalate(t){setTask(t,{escalated:true},'Escalation',`Escalated by ${me()}`,'Supervisor notified');notify('warning',`Escalated — Room ${t.room}`,t.room,`${t.id} escalated by ${me()}.`,false)},
 block(t,reason){setTask(t,{status:'Blocked',blocked:reason||'Marked blocked'},'Task blocked',`${t.id} marked BLOCKED by ${me()}`,reason||'No reason given')},
 cancel(t){setTask(t,{status:'Cancelled',done:now()},'Task cancelled',`${t.id} cancelled by ${me()}`)},
 restart(t){setTask(t,{status:t.assignee?'Assigned':'Unassigned',started:null,blocked:null,created:now(),breached:false},'Task restarted',`${t.id} restarted by ${me()}`,'SLA timer reset')},
 start(t){if(t.type==='Cleaning'){startCleaning(t.id,me());emit()}else setTask(t,{status:t.type==='Maintenance'?'In repair':'Cleaning',started:now()},'Task started',`${t.id} started by ${me()}`,t.type==='Maintenance'?'Repair in progress':'In progress')},
 complete(t){
  if(t.type==='Cleaning'&&t.status==='Cleaning'){finishCleaning(t.id,me());emit();return}
  if(t.type==='Cleaning'&&t.status==='Inspection Required'){passInspection(t.id,me());emit();return}
  const r=S.rooms[t.room];setTask(t,{status:'Completed',done:now()},'Task completed',`${t.id} completed by ${me()}`,t.type==='Maintenance'?'Repair completed':'Done');
  if(t.type==='Maintenance'){if(!Object.values(S.tasks).some(x=>x.room===t.room&&x.type==='Maintenance'&&active(x)))r.maint=false;if(r.status==='Maintenance')r.status='Ready';S.staff[t.assignee]&&S.staff[t.assignee].done++}
  if(t.type==='Cleaning'){r.status='Ready'}
  Object.keys(S.staff).forEach(refreshAvail);emit()},
 avail(sid,v){const s=S.staff[sid];const from=s.avail;s.avail=v;log('Availability changed',me(),'Supervisor',null,`${s.name}: ${from} → ${v}`,'Used for AI assignment');emit()},
 roomStatus(id,to){const r=S.rooms[id];const from=r.status;r.status=to;log('Room status changed',me(),'Supervisor',id,`${from.toUpperCase()} → ${to.toUpperCase()}`,'Manual change');emit()},
};

// ---------- live loop
function hm(ts){const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
setInterval(()=>{
 Object.values(S.tasks).forEach(t=>{if(!active(t)||t.breached||t.status==='Blocked'||t.status==='Inspection Required')return;if(t.type==='Cleaning'&&!t.started)return;
  if(now()>deadline(t)){t.breached=true;log('SLA breached','System','System',t.room,`${t.id} passed its ${t.sla} min SLA`,t.type==='Maintenance'?'Escalated to Rahul Deshpande':'Flagged to Sunita Pawar');
   notify(t.prio==='Critical'?'critical':'warning',t.type==='Maintenance'?`SLA breached — Room ${t.room}`:`Cleaning task overdue — Room ${t.room}`,t.room,`${t.id} · ${nm(t.assignee)||'Unassigned'}`,t.prio==='Critical');emit()}});
},4000);
let tick=0;
setInterval(()=>{
 if(!S.flags.live||S.flags.offline)return;tick++;
 const ts=Object.values(S.tasks).filter(t=>t.type==='Cleaning'&&t.assignee!=='H01'&&t.room!=='118');
 const opts=[];
 const cl=ts.filter(t=>t.status==='Cleaning');if(cl.length)opts.push(()=>finishCleaning(cl[0].id));
 const ins=ts.filter(t=>t.status==='Inspection Required');if(ins.length)opts.push(()=>passInspection(ins[0].id));
 const as=ts.filter(t=>t.status==='Assigned');if(as.length)opts.push(()=>startCleaning(as[0].id));
 const un=ts.filter(t=>t.status==='Unassigned');if(un.length)opts.push(()=>{const t=un[0],s=pickCleaner(S.rooms[t.room].floor);if(s){t.assignee=s.id;t.status='Assigned';agent('hk',`Assigned ${s.name} to Room ${t.room}`,t.room);log('Cleaner assigned','Housekeeping Agent','AI Agent',t.room,`Assigned ${s.name}`,'Assigned automatically')}});
 const due=Object.values(S.rooms).filter(r=>r.status==='Occupied'&&r.dueOut&&r.id!=='101');if(due.length&&tick%3===0)opts.push(()=>checkout(due[Math.floor(Math.random()*due.length)].id));
 if(opts.length){opts[Math.floor(Math.random()*opts.length)]();emit()}
},14000);

Object.assign(window,{S,useOps,emit,MIN,ROLES,PROPS,A,checkout,createIssue,classify,deadline,roomPriority,prioWhy,loadOf,active,nmOf:nm,hm,startCleaning,finishCleaning,passInspection,notify,toast,opsLog:log});
})();
