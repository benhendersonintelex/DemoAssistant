/* Demo Pacer: Trials module (phase 1). Loaded after the main script in index.html. */
(function(){
  'use strict';
  var A = null, sb = null, el = null, toast = null, S = null;
  var $ = function(s){ return document.querySelector(s); };

  /* ---------- reference lists ---------- */
  var STAGES = [['requested','Requested'],['planning','Planning'],['kickoff','Kickoff'],['active','Active'],['review','Review'],['decision','Decision'],['won','Won'],['lost','Lost'],['stalled','Stalled']];
  var HEALTH = [['green','Green'],['amber','Amber'],['red','Red']];
  var TYPES = [['dedicated','Dedicated demo copy'],['sandbox','Shared sandbox'],['hybrid','Both']];
  var ROLES = [['sponsor','Executive sponsor'],['champion','Champion'],['evaluator','Evaluator / end user'],['buyer','Economic buyer'],['blocker','Skeptic / blocker'],['other','Other']];
  var PRIORITIES = [['must','Must have'],['should','Should have'],['nice','Nice to have']];
  var RESULTS = [['untested','Not tested'],['pass','Pass'],['partial','Partial'],['fail','Fail']];
  var SENTIMENTS = [['positive','Positive'],['neutral','Neutral'],['negative','Negative']];
  var ACT_TYPES = [['call','Call'],['kickoff','Kickoff'],['training','Training / onboarding'],['checkin','Check-in'],['email','Email'],['issue','Issue / support'],['readout','Readout'],['other','Other']];
  var SEVERITY = [['low','Low'],['medium','Medium'],['high','High']];
  var ENV_STATUS = [['requested','Requested'],['building','Being built'],['ready','Ready'],['in_use','In use'],['expired','Expired'],['torn_down','Torn down']];
  var ENV_KINDS = [['dedicated','Dedicated demo copy'],['sandbox','Shared sandbox']];
  var SIDES = [['us','Our team'],['customer','Customer']];
  var ENTRY = [
    ['sponsor','A named executive sponsor is engaged'],
    ['decision','A decision date has been agreed'],
    ['criteria','Success criteria are agreed in writing, or will be before kickoff'],
    ['users','Test users are identified and have time to take part'],
    ['competition','We know who else is being evaluated'],
    ['envtype','The environment type (dedicated copy or shared sandbox) is agreed'],
    ['readout','The decision maker will attend the final readout']
  ];
  var CLOSEOUT = [
    ['teardown','Environment torn down, or returned to the pool'],
    ['users','Sandbox users released'],
    ['access','Customer access revoked'],
    ['sfdc','Salesforce opportunity updated'],
    ['outcome','Outcome, reasons and lessons recorded'],
    ['handoff','Hand-off notes shared with implementation or customer success'],
    ['summary','Trial summary shared with the AE']
  ];

  var BUILTIN = [
    {
      id:'builtin:dedicated', builtin:true, name:'UX trial on a dedicated demo copy (2 weeks)',
      description:'Starter plan. Edit the criteria for each customer before kickoff.',
      trial_type:'dedicated', duration_days:14,
      criteria:[
        {title:'A new user completes their first task without training', description:'Test users get through a typical task using only what is on screen.', priority:'must'},
        {title:'Users can raise a record from a phone', description:'A first-time user completes the key mobile task in the time agreed with the customer.', priority:'must'},
        {title:'Users can find and update an existing record', description:'Search or filters get them to the right record without help.', priority:'must'},
        {title:'The customer can see their own information in a report or dashboard', description:'An evaluator opens or builds a view that answers one of their real questions.', priority:'should'},
        {title:'Users rate the overall ease of use at the agreed score', description:'Agree the score and how it is collected before kickoff.', priority:'should'}
      ],
      milestones:[
        {title:'Kickoff: scope and success criteria agreed', offset:0, side:'us'},
        {title:'Environment ready and test logins checked', offset:1, side:'us'},
        {title:'User onboarding session', offset:2, side:'us'},
        {title:'Week 1 check-in', offset:7, side:'us'},
        {title:'Feedback session with the evaluators', offset:10, side:'us'},
        {title:'Final readout and criteria scoring', offset:13, side:'us'}
      ]
    },
    {
      id:'builtin:sandbox', builtin:true, name:'UX trial in the shared sandbox (1 week)',
      description:'Starter plan for a lighter, self-guided trial in the generic sandbox.',
      trial_type:'sandbox', duration_days:7,
      criteria:[
        {title:'Users sign in and find their way around unaided', description:'Each test user reaches the area they care about without help.', priority:'must'},
        {title:'Users complete the one scenario the customer cares most about', description:'Agree the scenario at kickoff and write it here.', priority:'must'},
        {title:'Users rate the overall ease of use at the agreed score', description:'Agree the score and how it is collected before kickoff.', priority:'should'}
      ],
      milestones:[
        {title:'Kickoff: scenarios and success criteria agreed', offset:0, side:'us'},
        {title:'Sandbox logins issued and tested', offset:0, side:'us'},
        {title:'Guided walkthrough', offset:1, side:'us'},
        {title:'Mid-point check-in', offset:4, side:'us'},
        {title:'Final feedback session and scoring', offset:6, side:'us'}
      ]
    }
  ];

  /* ---------- small helpers ---------- */
  function lab(list, key){ for(var i=0;i<list.length;i++){ if(list[i][0] === key) return list[i][1]; } return key || ''; }
  function p2(n){ return (n<10?'0':'')+n; }
  function todayStr(){ var d = new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function parseD(s){ if(!s) return null; var a = String(s).slice(0,10).split('-'); if(a.length < 3) return null; return new Date(+a[0], +a[1]-1, +a[2]); }
  function addDays(s, n){ var d = parseD(s) || new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function diffDays(a, b){ var da = parseD(a), db = parseD(b); if(!da || !db) return null; return Math.round((db - da)/86400000); }
  function fdate(s){ var d = parseD(s); if(!d) return ''; try{ return d.toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'}); }catch(e){ return String(s); } }
  function safeUrl(u){ u = String(u||'').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
  function me(){ return A.state.user.id; }
  function myName(){ var p = A.state.profile; return (p && (p.display_name || p.email)) || (A.state.user && A.state.user.email) || ''; }
  function isLead(){ return !!(A.state.profile && A.state.profile.is_lead); }
  function trialTitle(t){ return (t.account_name || 'Untitled account') + (t.opportunity_name ? ' - ' + t.opportunity_name : ''); }
  function isClosed(t){ return t.stage === 'won' || t.stage === 'lost'; }
  function canEdit(t){ return !!(t && (t.owner_id === me() || (t.collaborator_ids||[]).indexOf(me()) >= 0 || isLead())); }
  function canDeleteTrial(t){ return !!(t && (t.owner_id === me() || isLead())); }
  function findTrial(id){ for(var i=0;i<S.trials.length;i++){ if(S.trials[i].id === id) return S.trials[i]; } return null; }
  function findEnv(id){ for(var i=0;i<S.envs.length;i++){ if(S.envs[i].id === id) return S.envs[i]; } return null; }
  function itemsOf(kind){ return S.items.filter(function(i){ return i.kind === kind; }); }
  function allTemplates(){ return BUILTIN.concat(S.templates); }
  function findTemplate(id){ var l = allTemplates(); for(var i=0;i<l.length;i++){ if(l[i].id === id) return l[i]; } return null; }
  function errMsg(e){ return (e && e.message) ? e.message : 'Something went wrong.'; }

  /* ---------- small UI builders ---------- */
  function btn(label, cls, fn){ var b = el('button', cls, label); b.type = 'button'; if(fn) b.addEventListener('click', fn); return b; }
  function selectEl(options, value, onChange, disabled){
    var s = el('select','sel');
    options.forEach(function(o){ var op = el('option', null, o[1]); op.value = o[0]; s.appendChild(op); });
    s.value = value;
    if(disabled) s.disabled = true;
    s.addEventListener('change', function(){ onChange(s.value); });
    return s;
  }
  function block(title, hint){
    var b = el('section','block');
    if(title) b.appendChild(el('h2', null, title));
    if(hint) b.appendChild(el('p','hint', hint));
    return b;
  }
  function badge(text, cls){ return el('span', 'badge' + (cls ? ' '+cls : ''), text); }
  function fieldInput(label, type, value, onInput, opts){
    opts = opts || {};
    var w = el('label','fld'); w.appendChild(document.createTextNode(label));
    var inp;
    if(type === 'textarea'){ inp = el('textarea'); inp.rows = opts.rows || 3; }
    else { inp = el('input'); inp.type = type; }
    inp.value = (value == null) ? '' : value;
    if(opts.placeholder) inp.placeholder = opts.placeholder;
    if(opts.disabled) inp.disabled = true;
    inp.addEventListener('input', function(){ onInput(inp.value); });
    w.appendChild(inp);
    return w;
  }
  function fieldSelect(label, options, value, onChange, disabled){
    var w = el('label','fld'); w.appendChild(document.createTextNode(label));
    w.appendChild(selectEl(options, value, onChange, disabled));
    return w;
  }
  function checkRow(label, checked, onChange, disabled){
    var w = el('label','tick');
    var c = el('input'); c.type = 'checkbox'; c.checked = !!checked; c.disabled = !!disabled;
    c.addEventListener('change', function(){ onChange(c.checked); });
    w.appendChild(c); w.appendChild(el('span', null, label));
    return w;
  }
  function emptyNote(text){ return el('div','empty', text); }

  /* generic form dialog */
  function formDialog(o){
    var dlg = document.createElement('dialog'); dlg.className = 'fdlg';
    var form = el('form');
    form.appendChild(el('h2', null, o.title));
    if(o.intro) form.appendChild(el('p','hint', o.intro));
    var inputs = {};
    var vals = o.values || {};
    var api = {
      get:function(k){ var i = inputs[k]; return !i ? '' : (i.type === 'checkbox' ? i.checked : i.value); },
      set:function(k, v){ if(inputs[k]) inputs[k].value = v; },
      setOptions:function(k, options, selected){
        var s = inputs[k]; if(!s) return;
        s.innerHTML = '';
        options.forEach(function(op){ var o2 = el('option', null, op[1]); o2.value = op[0]; s.appendChild(o2); });
        if(selected !== undefined) s.value = selected;
      }
    };
    (o.fields || []).forEach(function(f){
      var wrap, inp;
      if(f.type === 'checkbox'){
        wrap = el('label','chk'); inp = el('input'); inp.type = 'checkbox';
        inp.checked = !!(vals[f.key] !== undefined ? vals[f.key] : f.def);
        wrap.appendChild(inp); wrap.appendChild(document.createTextNode(' ' + f.label));
      } else {
        wrap = el('label','fld'); wrap.appendChild(document.createTextNode(f.label + (f.required ? ' *' : '')));
        if(f.type === 'textarea'){ inp = el('textarea'); inp.rows = f.rows || 4; }
        else if(f.type === 'select'){
          inp = el('select','sel');
          (f.options || []).forEach(function(op){ var o2 = el('option', null, op[1]); o2.value = op[0]; inp.appendChild(o2); });
        } else { inp = el('input'); inp.type = f.type || 'text'; if(f.type === 'number'){ inp.step = 'any'; inp.min = '0'; } }
        if(f.placeholder) inp.placeholder = f.placeholder;
        var v = vals[f.key]; if(v === undefined || v === null) v = (f.def !== undefined ? f.def : '');
        inp.value = v;
        wrap.appendChild(inp);
        if(f.hint) wrap.appendChild(el('span','hint2', f.hint));
      }
      inputs[f.key] = inp;
      if(f.onChange) inp.addEventListener('change', function(){ f.onChange(inp.value, api); });
      form.appendChild(wrap);
    });
    var err = el('p','msg bad'); form.appendChild(err);
    var acts = el('div','actions');
    var submit = el('button','btn', o.submitLabel || 'Save'); submit.type = 'submit';
    var cancel = btn('Cancel','ghost', function(){ close(); });
    acts.appendChild(submit); acts.appendChild(cancel);
    if(o.danger){
      var dg = btn(o.danger.label, 'ghost danger', function(){
        var out = collect(); if(out === null) return;
        Promise.resolve(o.danger.onClick(out)).then(function(res){ if(res !== false) close(); });
      });
      acts.appendChild(dg);
    }
    form.appendChild(acts);
    dlg.appendChild(form);

    function close(){ try{ if(dlg.close) dlg.close(); }catch(e){} if(dlg.parentNode) dlg.parentNode.removeChild(dlg); }
    function collect(){
      var out = {}, missing = null;
      (o.fields || []).forEach(function(f){
        var inp = inputs[f.key], v;
        if(f.type === 'checkbox') v = inp.checked;
        else if(f.type === 'number'){ var n = parseFloat(inp.value); v = isFinite(n) ? n : null; }
        else v = inp.value;
        if(f.required && !missing && (v === '' || v === null || (typeof v === 'string' && !v.trim()))) missing = f;
        out[f.key] = v;
      });
      if(missing){ err.textContent = missing.label + ' is required.'; return null; }
      err.textContent = '';
      return out;
    }
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var out = collect(); if(out === null) return;
      submit.disabled = true;
      Promise.resolve(o.onSubmit(out)).then(function(res){
        if(res === false){ submit.disabled = false; return; }
        close();
      }, function(){ submit.disabled = false; });
    });
    dlg.addEventListener('close', function(){ if(dlg.parentNode) dlg.parentNode.removeChild(dlg); });
    document.body.appendChild(dlg);
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
    var first = form.querySelector('input,textarea,select');
    if(first && first.focus) first.focus();
    return dlg;
  }

  /* ---------- state + loading ---------- */
  function resetState(){
    S = {
      trials:[], templates:[], envs:[], sus:[], items:[], itemsLoaded:false,
      cur:null, tab:'trials', sub:'list', dtab:'overview',
      loaded:false, loadP:null, error:'',
      filters:{scope:'all', status:'open', q:''}, showTemplates:false,
      envFilter:{kind:'all', status:'active'}, openEnv:{},
      dirty:false, saving:false, queued:false, saveT:null, lastBump:0
    };
  }
  async function loadTrials(){
    var r = await sb.from('trials').select('*').order('updated_at', {ascending:false});
    if(r.error) throw r.error;
    S.trials = r.data || [];
  }
  async function loadTemplates(){
    var r = await sb.from('trial_templates').select('*').order('created_at', {ascending:false});
    if(r.error) throw r.error;
    S.templates = r.data || [];
  }
  async function loadEnvs(){
    var rs = await Promise.all([
      sb.from('environments').select('*').order('created_at', {ascending:false}),
      sb.from('sandbox_users').select('*').order('username', {ascending:true})
    ]);
    if(rs[0].error) throw rs[0].error;
    if(rs[1].error) throw rs[1].error;
    S.envs = rs[0].data || [];
    S.sus = rs[1].data || [];
  }
  function ensureLoaded(force){
    if(S.loaded && !force) return Promise.resolve();
    if(S.loadP) return S.loadP;
    S.error = '';
    S.loadP = Promise.all([loadTrials(), loadTemplates(), loadEnvs()]).then(function(){
      S.loaded = true; S.loadP = null;
    }, function(e){
      S.error = 'Could not load trials. ' + errMsg(e) + ' If this is a new setup, run schema_trials.sql in Supabase.';
      S.loadP = null;
    });
    return S.loadP;
  }
  async function loadItems(id){
    var r = await sb.from('trial_items').select('*').eq('trial_id', id).order('position', {ascending:true}).order('created_at', {ascending:true});
    if(r.error){ toast('Could not load the trial details: ' + errMsg(r.error)); return; }
    if(S.cur && S.cur.id === id){ S.items = r.data || []; S.itemsLoaded = true; }
  }

  /* ---------- item + trial saving ---------- */
  function setStatus(text, bad){
    var s = $('#trialSave'); if(s){ s.textContent = text; s.className = 'savestat' + (bad ? ' bad' : ''); }
  }
  var SAVE_COLS = ['collaborator_ids','account_name','opportunity_name','sfdc_url','psc_name','ae_name','trial_type','stage','health','start_date','end_date','criteria_locked_at','entry_check','outcome','closeout'];
  function patchTrial(fields, delay){
    if(!S.cur) return;
    Object.keys(fields).forEach(function(k){ S.cur[k] = fields[k]; });
    S.dirty = true;
    setStatus('Unsaved changes');
    clearTimeout(S.saveT);
    S.saveT = setTimeout(saveTrial, delay == null ? 900 : delay);
  }
  async function saveTrial(){
    clearTimeout(S.saveT);
    var t = S.cur;
    if(!t || !S.dirty || !canEdit(t)) return true;
    if(S.saving){ S.queued = true; return false; }
    if(!String(t.account_name || '').trim()){ setStatus('Account name is required to save.', true); return false; }
    S.saving = true; S.dirty = false; setStatus('Saving...');
    var payload = {};
    SAVE_COLS.forEach(function(c){ payload[c] = t[c]; });
    payload.sfdc_url = payload.sfdc_url || null;
    payload.start_date = payload.start_date || null;
    payload.end_date = payload.end_date || null;
    var ok = false;
    try{
      var r = await sb.from('trials').update(payload).eq('id', t.id).select().single();
      if(r.error) throw r.error;
      Object.keys(r.data).forEach(function(k){ t[k] = r.data[k]; });
      ok = true; setStatus('All changes saved');
    }catch(e){
      S.dirty = true; setStatus('Could not save. Check your connection and try again.', true);
    }
    S.saving = false;
    if(S.queued){ S.queued = false; return saveTrial(); }
    return ok;
  }
  function bump(){
    // Make the trial rise to the top of lists after item changes. Failure is harmless.
    var t = S.cur; if(!t || !canEdit(t)) return;
    var now = Date.now(); if(now - S.lastBump < 5000) return;
    S.lastBump = now;
    sb.from('trials').update({health:t.health}).eq('id', t.id).select().single().then(function(r){
      if(r && r.data){ t.updated_at = r.data.updated_at; }
    }, function(){});
  }
  function nextPos(kind){
    var m = 0; S.items.forEach(function(i){ if(i.kind === kind && i.position > m) m = i.position; });
    return m + 1;
  }
  async function addItem(kind, data){
    var r = await sb.from('trial_items').insert({trial_id:S.cur.id, kind:kind, data:data, position:nextPos(kind)}).select().single();
    if(r.error){ toast('Could not save: ' + errMsg(r.error)); return null; }
    S.items.push(r.data); bump();
    return r.data;
  }
  async function saveItem(it, data){
    var r = await sb.from('trial_items').update({data:data}).eq('id', it.id).select().single();
    if(r.error){ toast('Could not save: ' + errMsg(r.error)); return null; }
    for(var i=0;i<S.items.length;i++){ if(S.items[i].id === it.id) S.items[i] = r.data; }
    bump();
    return r.data;
  }
  async function removeItem(it){
    var r = await sb.from('trial_items').delete().eq('id', it.id);
    if(r.error){ toast('Could not delete: ' + errMsg(r.error)); return false; }
    S.items = S.items.filter(function(i){ return i.id !== it.id; });
    bump();
    return true;
  }
  function merge(a, b){ var o = {}; Object.keys(a || {}).forEach(function(k){ o[k] = a[k]; }); Object.keys(b || {}).forEach(function(k){ o[k] = b[k]; }); return o; }

  /* =====================================================================
     RENDER ROUTER
     ===================================================================== */
  function render(){
    var head = $('#tvHead'), body = $('#tvBody');
    if(!head || !body || !S) return;
    head.innerHTML = ''; body.innerHTML = '';
    if(S.error) body.appendChild(el('div','banner', S.error));
    if(!S.loaded){ if(!S.error) body.appendChild(el('p','hint','Loading...')); return; }
    if(S.tab === 'envs'){ renderEnvs(head, body); return; }
    if(S.sub === 'detail' && S.cur){ renderDetail(head, body); return; }
    if(S.showTemplates){ renderTemplates(head, body); return; }
    renderList(head, body);
  }

  /* =====================================================================
     TRIAL LIST
     ===================================================================== */
  function dateFlag(t){
    if(isClosed(t) || !t.end_date) return null;
    var d = diffDays(todayStr(), t.end_date);
    if(d === null) return null;
    if(d < 0) return {cls:'bad', text:'ended ' + (-d) + (d === -1 ? ' day ago' : ' days ago')};
    if(d === 0) return {cls:'warn', text:'ends today'};
    if(d <= 3) return {cls:'warn', text:'ends in ' + d + (d === 1 ? ' day' : ' days')};
    return null;
  }
  function filteredTrials(){
    var uid = me(), q = S.filters.q.trim().toLowerCase();
    return S.trials.filter(function(t){
      if(S.filters.scope === 'mine' && !(t.owner_id === uid || (t.collaborator_ids || []).indexOf(uid) >= 0)) return false;
      if(S.filters.status === 'open' && isClosed(t)) return false;
      if(S.filters.status === 'closed' && !isClosed(t)) return false;
      if(q){
        var hay = ((t.account_name||'') + ' ' + (t.opportunity_name||'') + ' ' + (t.psc_name||'') + ' ' + (t.ae_name||'')).toLowerCase();
        if(hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function trialRow(t){
    var item = el('div','item');
    var main = el('div','imain');
    var ttl = el('div','ittl');
    var dot = el('span','hdot ' + t.health); dot.title = 'Health: ' + lab(HEALTH, t.health);
    ttl.appendChild(dot); ttl.appendChild(el('span', null, trialTitle(t)));
    ttl.appendChild(badge(lab(STAGES, t.stage), t.stage === 'won' ? 'ok' : (t.stage === 'lost' ? 'bad' : '')));
    ttl.appendChild(badge(lab(TYPES, t.trial_type)));
    main.appendChild(ttl);
    var bits = [];
    if(t.psc_name) bits.push('PSC: ' + t.psc_name);
    if(t.ae_name) bits.push('AE: ' + t.ae_name);
    if(t.start_date || t.end_date) bits.push(fdate(t.start_date) + ' to ' + fdate(t.end_date));
    var meta = el('div','imeta', bits.join('  |  '));
    var fl = dateFlag(t);
    if(fl){ meta.appendChild(document.createTextNode(bits.length ? '  |  ' : '')); meta.appendChild(el('span','flag ' + fl.cls, fl.text)); }
    main.appendChild(meta);
    item.appendChild(main);
    var acts = el('div','acts');
    acts.appendChild(btn('Open','btn', function(){ openTrial(t.id); }));
    var u = safeUrl(t.sfdc_url);
    if(u){ var a = el('a','ghost','Salesforce'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; acts.appendChild(a); }
    item.appendChild(acts);
    return item;
  }
  function renderListRows(box){
    box.innerHTML = '';
    var list = filteredTrials();
    if(!list.length){ box.appendChild(emptyNote(S.trials.length ? 'No trials match these filters.' : 'No trials yet. Start one with New trial.')); return; }
    list.forEach(function(t){ box.appendChild(trialRow(t)); });
  }
  function renderList(head, body){
    var top = el('div','libhead');
    var tb = el('div');
    tb.appendChild(el('h2', null, 'Trials'));
    tb.appendChild(el('p', null, 'Customer trials and user-experience evaluations. Salesforce stays the source of truth for the deal; each trial links to its record.'));
    var right = el('div','actions');
    right.appendChild(btn('Templates','ghost', function(){ S.showTemplates = true; render(); }));
    right.appendChild(btn('New trial','btn', function(){ openNewTrial(null); }));
    top.appendChild(tb); top.appendChild(right);
    head.appendChild(top);

    var box = el('div');
    var f = el('div','filters');
    f.appendChild(selectEl([['all','All trials'],['mine','My trials']], S.filters.scope, function(v){ S.filters.scope = v; renderListRows(box); }));
    f.appendChild(selectEl([['open','Open'],['closed','Won and lost'],['all','All stages']], S.filters.status, function(v){ S.filters.status = v; renderListRows(box); }));
    var q = el('input','sel'); q.type = 'search'; q.placeholder = 'Search account, opportunity, PSC or AE'; q.value = S.filters.q;
    q.addEventListener('input', function(){ S.filters.q = q.value; renderListRows(box); });
    f.appendChild(q);
    head.appendChild(f);
    renderListRows(box);
    body.appendChild(box);
  }

  /* =====================================================================
     TEMPLATES
     ===================================================================== */
  function renderTemplates(head, body){
    var top = el('div','libhead');
    var tb = el('div');
    tb.appendChild(el('h2', null, 'Trial templates'));
    tb.appendChild(el('p', null, 'Reusable plans with starter criteria and milestones. To make your own, open a trial and choose Save as template.'));
    var right = el('div','actions');
    right.appendChild(btn('Back to trials','ghost', function(){ S.showTemplates = false; render(); }));
    top.appendChild(tb); top.appendChild(right);
    head.appendChild(top);
    allTemplates().forEach(function(t){
      var item = el('div','item');
      var main = el('div','imain');
      var ttl = el('div','ittl'); ttl.appendChild(el('span', null, t.name));
      if(t.builtin) ttl.appendChild(badge('Starter'));
      else ttl.appendChild(badge(t.visibility === 'team' ? 'Shared' : 'Private'));
      main.appendChild(ttl);
      main.appendChild(el('div','imeta', lab(TYPES, t.trial_type) + '  |  ' + t.duration_days + ' days  |  ' + (t.criteria || []).length + ' criteria  |  ' + (t.milestones || []).length + ' milestones' + (t.description ? '  |  ' + t.description : '')));
      item.appendChild(main);
      var acts = el('div','acts');
      acts.appendChild(btn('Use','btn', function(){ openNewTrial(t.id); }));
      if(!t.builtin && t.owner_id === me()){
        acts.appendChild(btn(t.visibility === 'team' ? 'Make private' : 'Share with team','ghost', async function(){
          var v = t.visibility === 'team' ? 'private' : 'team';
          var r = await sb.from('trial_templates').update({visibility:v}).eq('id', t.id).select().single();
          if(r.error){ toast('Could not update: ' + errMsg(r.error)); return; }
          t.visibility = v; render();
        }));
      }
      if(!t.builtin && (t.owner_id === me() || isLead())){
        acts.appendChild(btn('Delete','ghost danger', async function(){
          if(!confirm('Delete the template "' + t.name + '"? Trials already created from it are not affected.')) return;
          var r = await sb.from('trial_templates').delete().eq('id', t.id);
          if(r.error){ toast('Could not delete: ' + errMsg(r.error)); return; }
          S.templates = S.templates.filter(function(x){ return x.id !== t.id; }); render();
        }));
      }
      item.appendChild(acts);
      body.appendChild(item);
    });
  }

  /* =====================================================================
     NEW TRIAL
     ===================================================================== */
  function openNewTrial(templateId){
    var tpl = templateId ? findTemplate(templateId) : null;
    var tplOptions = [['','Start from scratch']].concat(allTemplates().map(function(t){ return [t.id, t.name]; }));
    formDialog({
      title:'New trial',
      intro:'Names only. Deal value, stage and close date stay in Salesforce.',
      submitLabel:'Create trial',
      values:{
        template: tpl ? tpl.id : '', trial_type: tpl ? tpl.trial_type : 'dedicated',
        duration: tpl ? tpl.duration_days : 14, start_date: todayStr(), psc_name: myName()
      },
      fields:[
        {key:'account_name', label:'Account name', type:'text', required:true},
        {key:'opportunity_name', label:'Opportunity name', type:'text', required:true},
        {key:'sfdc_url', label:'Salesforce opportunity link', type:'url', placeholder:'https://...'},
        {key:'psc_name', label:'PSC', type:'text'},
        {key:'ae_name', label:'AE', type:'text'},
        {key:'template', label:'Start from', type:'select', options:tplOptions, onChange:function(v, f){
          var t2 = findTemplate(v); if(t2){ f.set('trial_type', t2.trial_type); f.set('duration', t2.duration_days); }
        }},
        {key:'trial_type', label:'Trial type', type:'select', options:TYPES},
        {key:'start_date', label:'Start date', type:'date'},
        {key:'duration', label:'Length in days', type:'number'}
      ],
      onSubmit:createTrial
    });
  }
  async function createTrial(v){
    var tpl = v.template ? findTemplate(v.template) : null;
    var start = v.start_date || todayStr();
    var dur = Math.max(1, Math.round(v.duration || 14));
    var url = String(v.sfdc_url || '').trim();
    if(url && !safeUrl(url)){ toast('The Salesforce link must start with http:// or https://'); return false; }
    var row = {
      account_name:String(v.account_name).trim(), opportunity_name:String(v.opportunity_name || '').trim(),
      sfdc_url:url || null, psc_name:String(v.psc_name || '').trim() || null, ae_name:String(v.ae_name || '').trim() || null,
      trial_type:v.trial_type, start_date:start, end_date:addDays(start, dur), stage:'planning', health:'green'
    };
    var r = await sb.from('trials').insert(row).select().single();
    if(r.error){ toast('Could not create the trial: ' + errMsg(r.error)); return false; }
    var t = r.data;
    var rows = [], pos = 0;
    if(tpl){
      (tpl.criteria || []).forEach(function(c){
        pos++; rows.push({trial_id:t.id, kind:'criterion', position:pos, data:{title:c.title, description:c.description || '', priority:c.priority || 'must', result:'untested', evidence:''}});
      });
      (tpl.milestones || []).forEach(function(m, i){
        rows.push({trial_id:t.id, kind:'task', position:i+1, data:{title:m.title, due:addDays(start, m.offset || 0), done:false, side:m.side || 'us', owner:row.psc_name || '', milestone:true}});
      });
    }
    if(rows.length){
      var ir = await sb.from('trial_items').insert(rows);
      if(ir.error) toast('The trial was created, but the template items could not be added: ' + errMsg(ir.error));
    }
    S.trials.unshift(t);
    S.showTemplates = false;
    openTrial(t.id);
    return true;
  }

  function openTrial(id){
    var t = findTrial(id); if(!t) return;
    S.cur = t; S.sub = 'detail'; S.dtab = 'overview'; S.items = []; S.itemsLoaded = false; S.dirty = false;
    render();
    loadItems(id).then(function(){ if(S.cur && S.cur.id === id) render(); });
  }
  function closeTrial(){
    return saveTrial().then(function(){ S.sub = 'list'; S.cur = null; S.items = []; S.itemsLoaded = false; render(); });
  }

  /* =====================================================================
     TRIAL DETAIL
     ===================================================================== */
  function rerender(){ var y = window.pageYOffset || 0; render(); try{ window.scrollTo(0, y); }catch(e){} }
  function getItem(id){ for(var i=0;i<S.items.length;i++){ if(S.items[i].id === id) return S.items[i]; } return null; }
  async function updateItem(id, patch){ var it = getItem(id); if(!it) return null; return saveItem(it, merge(it.data, patch)); }

  function critCounts(priority){
    var c = {total:0, pass:0, partial:0, fail:0, untested:0};
    itemsOf('criterion').forEach(function(i){
      if(priority && i.data.priority !== priority) return;
      c.total++; var r = i.data.result || 'untested'; c[r] = (c[r] || 0) + 1;
    });
    return c;
  }
  function stats(){
    var tasks = itemsOf('task'), today = todayStr(), mins = 0;
    itemsOf('activity').forEach(function(a){ mins += (+a.data.minutes || 0); });
    var overdue = tasks.filter(function(x){ return !x.data.done && x.data.due && x.data.due < today; }).length;
    var openBlockers = itemsOf('blocker').filter(function(b){ return b.data.status !== 'resolved'; }).length;
    var ppl = itemsOf('participant');
    return {
      must:critCounts('must'), all:critCounts(null), overdue:overdue, openBlockers:openBlockers, mins:mins,
      people:ppl.length, ready:ppl.filter(function(p){ return p.data.login_ready; }).length,
      onboarded:ppl.filter(function(p){ return p.data.onboarded; }).length,
      tasksDone:tasks.filter(function(x){ return x.data.done; }).length, tasksTotal:tasks.length
    };
  }
  function statBox(value, label, cls){
    var d = el('div','stat' + (cls ? ' ' + cls : '')); d.appendChild(el('b', null, String(value))); d.appendChild(el('span', null, label)); return d;
  }
  function hoursText(mins){ if(!mins) return '0 h'; var h = mins/60; return (Math.round(h*10)/10) + ' h'; }

  function renderDetail(head, body){
    var t = S.cur, edit = canEdit(t);
    var top = el('div','libhead');
    var left = el('div');
    left.appendChild(btn('Back to trials','ghost', closeTrial));
    var h = el('h2', null, trialTitle(t)); h.style.marginTop = '12px'; S.titleEl = h; left.appendChild(h);
    var sub = el('p');
    var bits = [];
    if(t.psc_name) bits.push('PSC: ' + t.psc_name);
    if(t.ae_name) bits.push('AE: ' + t.ae_name);
    if(t.start_date || t.end_date) bits.push(fdate(t.start_date) + ' to ' + fdate(t.end_date));
    sub.appendChild(document.createTextNode(bits.join('  |  ')));
    var u = safeUrl(t.sfdc_url);
    if(u){ sub.appendChild(document.createTextNode(bits.length ? '  |  ' : '')); var a = el('a','link','Open in Salesforce'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; sub.appendChild(a); }
    left.appendChild(sub);
    var right = el('div','actions');
    right.appendChild(selectEl(STAGES, t.stage, function(v){
      var oc = merge(t.outcome, {});
      if(v === 'won' || v === 'lost'){ oc.decision = v; patchTrial({stage:v, outcome:oc}, 300); }
      else patchTrial({stage:v}, 300);
    }, !edit));
    right.appendChild(selectEl(HEALTH.map(function(x){ return [x[0], 'Health: ' + x[1]]; }), t.health, function(v){ patchTrial({health:v}, 300); }, !edit));
    var st = el('span','savestat', edit ? 'All changes saved' : 'View only'); st.id = 'trialSave'; right.appendChild(st);
    top.appendChild(left); top.appendChild(right);
    head.appendChild(top);

    var s = {
      crit:itemsOf('criterion').length, ppl:itemsOf('participant').length, plan:itemsOf('task').length,
      act:itemsOf('activity').length, fb:itemsOf('feedback').length + itemsOf('blocker').length
    };
    var tabs = [['overview','Overview'],['criteria','Criteria (' + s.crit + ')'],['people','People (' + s.ppl + ')'],['plan','Plan (' + s.plan + ')'],['activity','Activity (' + s.act + ')'],['feedback','Feedback and blockers (' + s.fb + ')'],['envs','Environments'],['outcome','Outcome and close-out']];
    var nav = el('div','subtabs');
    tabs.forEach(function(x){
      var b = btn(x[1], null, function(){ S.dtab = x[0]; render(); });
      b.setAttribute('aria-current', S.dtab === x[0] ? 'page' : 'false');
      nav.appendChild(b);
    });
    head.appendChild(nav);

    if(!edit) body.appendChild(el('div','banner','You can view this trial but not edit it. Ask the owner to add you as a support PSC.'));
    if(!S.itemsLoaded){ body.appendChild(el('p','hint','Loading...')); return; }
    var box = el('div'); body.appendChild(box);
    ({overview:tabOverview, criteria:tabCriteria, people:tabPeople, plan:tabPlan, activity:tabActivity, feedback:tabFeedback, envs:tabTrialEnvs, outcome:tabOutcome})[S.dtab](box, t, edit);
  }

  /* ----- overview ----- */
  function tabOverview(box, t, edit){
    var st = stats();
    var snap = block('At a glance');
    var sc = el('div','score');
    sc.appendChild(statBox(st.must.pass + ' of ' + st.must.total, 'must-have criteria passed', st.must.fail ? 'bad' : ''));
    sc.appendChild(statBox(st.all.untested, 'criteria not yet tested'));
    sc.appendChild(statBox(st.overdue, 'overdue tasks', st.overdue ? 'bad' : ''));
    sc.appendChild(statBox(st.openBlockers, 'open blockers', st.openBlockers ? 'warn' : ''));
    sc.appendChild(statBox(st.ready + ' of ' + st.people, 'users with logins ready'));
    sc.appendChild(statBox(hoursText(st.mins), 'time logged'));
    snap.appendChild(sc);
    var fl = dateFlag(t); if(fl) snap.appendChild(el('p','flag ' + fl.cls, 'This trial ' + fl.text + '.'));
    box.appendChild(snap);

    var det = block('Trial details', 'Names and dates only. Deal value, stage and forecast stay in Salesforce.');
    var g = el('div','grid2');
    g.appendChild(fieldInput('Account name','text', t.account_name, function(v){ patchTrial({account_name:v}); if(S.titleEl) S.titleEl.textContent = trialTitle(t); }, {disabled:!edit}));
    g.appendChild(fieldInput('Opportunity name','text', t.opportunity_name, function(v){ patchTrial({opportunity_name:v}); if(S.titleEl) S.titleEl.textContent = trialTitle(t); }, {disabled:!edit}));
    g.appendChild(fieldInput('Salesforce opportunity link','url', t.sfdc_url || '', function(v){ patchTrial({sfdc_url:v.trim()}); }, {disabled:!edit, placeholder:'https://...'}));
    g.appendChild(fieldSelect('Trial type', TYPES, t.trial_type, function(v){ patchTrial({trial_type:v}); }, !edit));
    g.appendChild(fieldInput('PSC','text', t.psc_name || '', function(v){ patchTrial({psc_name:v}); }, {disabled:!edit}));
    g.appendChild(fieldInput('AE','text', t.ae_name || '', function(v){ patchTrial({ae_name:v}); }, {disabled:!edit}));
    g.appendChild(fieldInput('Start date','date', t.start_date || '', function(v){ patchTrial({start_date:v || null}); }, {disabled:!edit}));
    g.appendChild(fieldInput('End date','date', t.end_date || '', function(v){ patchTrial({end_date:v || null}); }, {disabled:!edit}));
    det.appendChild(g);
    box.appendChild(det);

    var col = block('Support PSCs', 'People ticked here can edit this trial. Team leads can always edit.');
    var profs = Object.keys(A.state.profiles).map(function(id){ return A.state.profiles[id]; }).filter(function(p){ return p.id !== t.owner_id; });
    var canShare = (t.owner_id === me() || isLead());
    if(!profs.length) col.appendChild(el('p','hint','No teammates have signed in yet.'));
    profs.forEach(function(p){
      var on = (t.collaborator_ids || []).indexOf(p.id) >= 0;
      col.appendChild(checkRow(p.display_name || p.email, on, function(chk){
        var list = (S.cur.collaborator_ids || []).filter(function(x){ return x !== p.id; });
        if(chk) list.push(p.id);
        patchTrial({collaborator_ids:list});
      }, !canShare));
    });
    col.appendChild(el('p','hint','Owner: ' + A.ownerName(t.owner_id)));
    box.appendChild(col);

    var ec = block('Entry check', 'Answer these before agreeing to a trial. A trial with no agreed exit criteria is free consulting.');
    var checks = merge(t.entry_check && t.entry_check.checks, {});
    ENTRY.forEach(function(e){
      ec.appendChild(checkRow(e[1], !!checks[e[0]], function(chk){
        var cur = merge(S.cur.entry_check, {}); cur.checks = merge(cur.checks, {}); cur.checks[e[0]] = chk; patchTrial({entry_check:cur});
      }, !edit));
    });
    var row2 = el('div','grid2');
    row2.appendChild(fieldSelect('Decision', [['pending','Pending'],['go','Go'],['nogo','No-go']], (t.entry_check && t.entry_check.decision) || 'pending', function(v){
      var cur = merge(S.cur.entry_check, {}); cur.decision = v; patchTrial({entry_check:cur});
    }, !edit));
    ec.appendChild(row2);
    ec.appendChild(fieldInput('Notes', 'textarea', (t.entry_check && t.entry_check.notes) || '', function(v){
      var cur = merge(S.cur.entry_check, {}); cur.notes = v; patchTrial({entry_check:cur});
    }, {disabled:!edit, rows:2}));
    box.appendChild(ec);

    var act = block('Actions');
    var acts = el('div','actions');
    acts.appendChild(btn('Export trial summary (PDF)','btn', exportSummary));
    if(edit) acts.appendChild(btn('Save as template','ghost', saveAsTemplate));
    if(canDeleteTrial(t)) acts.appendChild(btn('Delete trial','ghost danger', deleteTrial));
    act.appendChild(acts);
    box.appendChild(act);
  }

  async function deleteTrial(){
    var t = S.cur;
    if(!confirm('Delete the trial for "' + trialTitle(t) + '" and everything recorded against it? This cannot be undone.')) return;
    var r = await sb.from('trials').delete().eq('id', t.id);
    if(r.error){ toast('Could not delete: ' + errMsg(r.error)); return; }
    S.trials = S.trials.filter(function(x){ return x.id !== t.id; });
    S.envs.forEach(function(e){ if(e.trial_id === t.id) e.trial_id = null; });
    S.sus.forEach(function(u){ if(u.assigned_trial_id === t.id){ u.assigned_trial_id = null; u.assigned_to = null; u.assigned_on = null; } });
    S.cur = null; S.sub = 'list'; S.dirty = false; S.items = []; render();
  }
  function saveAsTemplate(){
    var t = S.cur;
    formDialog({
      title:'Save as template',
      intro:'Saves this trial\'s criteria and milestones (with dates relative to the start) so others can reuse them.',
      values:{name:t.account_name + ' trial plan', visibility:'team'},
      fields:[
        {key:'name', label:'Template name', type:'text', required:true},
        {key:'description', label:'Description', type:'text'},
        {key:'visibility', label:'Who can use it', type:'select', options:[['team','Everyone on the team'],['private','Only me']]}
      ],
      submitLabel:'Save template',
      onSubmit:async function(v){
        var start = t.start_date || todayStr();
        var criteria = itemsOf('criterion').map(function(c){ return {title:c.data.title, description:c.data.description || '', priority:c.data.priority || 'must'}; });
        var milestones = itemsOf('task').filter(function(x){ return x.data.milestone; }).map(function(x){
          var off = x.data.due ? diffDays(start, x.data.due) : 0; return {title:x.data.title, offset:off === null ? 0 : off, side:x.data.side || 'us'};
        });
        var dur = (t.start_date && t.end_date) ? Math.max(1, diffDays(t.start_date, t.end_date)) : 14;
        var r = await sb.from('trial_templates').insert({name:v.name.trim(), description:(v.description || '').trim() || null, trial_type:t.trial_type, duration_days:dur, visibility:v.visibility, criteria:criteria, milestones:milestones}).select().single();
        if(r.error){ toast('Could not save the template: ' + errMsg(r.error)); return false; }
        S.templates.unshift(r.data); toast('Template saved.');
        return true;
      }
    });
  }

  /* ----- criteria ----- */
  function resultClass(r){ return 'res res-' + (r || 'untested'); }
  function tabCriteria(box, t, edit){
    var locked = !!t.criteria_locked_at;
    var head = block('Success criteria', 'The things the customer\'s users will try, and how you will judge them. Agree these before the trial starts.');
    var c = critCounts(null);
    var sc = el('div','score');
    PRIORITIES.forEach(function(p){
      var k = critCounts(p[0]);
      if(!k.total) return;
      sc.appendChild(statBox(k.pass + ' of ' + k.total, p[1].toLowerCase() + ' passed' + (k.partial ? ', ' + k.partial + ' partial' : '') + (k.fail ? ', ' + k.fail + ' failed' : ''), k.fail && p[0] === 'must' ? 'bad' : ''));
    });
    if(c.total) head.appendChild(sc);
    var lk = el('div','banner' + (locked ? ' ok' : ''));
    if(locked){
      lk.appendChild(el('strong', null, 'Criteria locked on ' + fdate(t.criteria_locked_at)));
      lk.appendChild(el('div', null, 'You can still record results. Changing, adding or removing a criterion needs a reason, which is added to the change log below.'));
      if(edit && (t.owner_id === me() || isLead())){
        var ul = btn('Unlock','ghost', async function(){
          if(!confirm('Unlock the criteria? The unlock is recorded in the change log.')) return;
          await addItem('criteria_change', {action:'unlocked', criterion:'', reason:'Criteria unlocked', by:myName(), at:new Date().toISOString()});
          patchTrial({criteria_locked_at:null}, 100); rerender();
        });
        ul.style.marginTop = '8px'; lk.appendChild(ul);
      }
    } else {
      lk.appendChild(el('strong', null, 'Criteria are not locked yet'));
      lk.appendChild(el('div', null, 'Lock them at kickoff, once the customer has agreed. After that, every change is logged so the goalposts cannot quietly move.'));
      if(edit){
        var lb = btn('Lock criteria','btn', async function(){
          if(!itemsOf('criterion').length){ toast('Add at least one criterion first.'); return; }
          if(!confirm('Lock the criteria now? Later changes will need a reason and will be logged.')) return;
          await addItem('criteria_change', {action:'locked', criterion:'', reason:'Criteria locked at kickoff', by:myName(), at:new Date().toISOString()});
          patchTrial({criteria_locked_at:new Date().toISOString()}, 100); rerender();
        });
        lb.style.marginTop = '8px'; lk.appendChild(lb);
      }
    }
    head.appendChild(lk);
    if(edit){ var ab = btn('Add criterion','ghost', function(){ criterionDialog(null); }); ab.style.marginTop = '14px'; head.appendChild(ab); }
    box.appendChild(head);

    var list = block();
    var crit = itemsOf('criterion');
    if(!crit.length) list.appendChild(emptyNote('No criteria yet. Add the scenarios the customer\'s users will try.'));
    PRIORITIES.forEach(function(p){
      var group = crit.filter(function(i){ return (i.data.priority || 'must') === p[0]; });
      if(!group.length) return;
      list.appendChild(el('h3','grp', p[1]));
      group.forEach(function(it){
        var row = el('div','crit');
        var top = el('div','crittop');
        top.appendChild(el('strong', null, it.data.title));
        if(edit) top.appendChild(btn(locked ? 'Amend' : 'Edit','ghost', function(){ criterionDialog(it); }));
        row.appendChild(top);
        if(it.data.description) row.appendChild(el('div','imeta', it.data.description));
        var ctl = el('div','critctl');
        var sel = selectEl(RESULTS, it.data.result || 'untested', async function(v){ await updateItem(it.id, {result:v}); rerender(); }, !edit);
        sel.className = 'sel ' + resultClass(it.data.result);
        ctl.appendChild(sel);
        var ta = el('textarea'); ta.rows = 2; ta.placeholder = 'Evidence or comment (what happened, who said what)'; ta.value = it.data.evidence || ''; ta.disabled = !edit;
        ta.addEventListener('change', function(){ updateItem(it.id, {evidence:ta.value}); });
        ctl.appendChild(ta);
        row.appendChild(ctl);
        list.appendChild(row);
      });
    });
    box.appendChild(list);

    var log = itemsOf('criteria_change');
    if(log.length){
      var lg = block('Change log', 'Every change made to the criteria after they were locked.');
      log.slice().reverse().forEach(function(l){
        var d = l.data;
        lg.appendChild(el('div','logrow', new Date(d.at || l.created_at).toLocaleDateString() + '  |  ' + (d.by || '') + '  |  ' + (d.action || '') + (d.criterion ? ': ' + d.criterion : '') + (d.reason ? '  |  Reason: ' + d.reason : '')));
      });
      box.appendChild(lg);
    }
  }
  function criterionDialog(it){
    var locked = !!S.cur.criteria_locked_at, isNew = !it;
    var fields = [
      {key:'title', label:'Criterion', type:'text', required:true, placeholder:'e.g. A first-time user raises an incident on a phone in under 3 minutes'},
      {key:'description', label:'What good looks like', type:'textarea', rows:3},
      {key:'priority', label:'Priority', type:'select', options:PRIORITIES}
    ];
    if(locked) fields.push({key:'reason', label:'Reason for the change', type:'text', required:true, hint:'The criteria are locked, so this change is recorded in the change log.'});
    formDialog({
      title:isNew ? 'Add criterion' : (locked ? 'Amend criterion' : 'Edit criterion'),
      fields:fields, values:it ? it.data : {priority:'must'}, submitLabel:'Save',
      onSubmit:async function(v){
        var data = {title:v.title.trim(), description:(v.description || '').trim(), priority:v.priority};
        var res;
        if(isNew) res = await addItem('criterion', merge(data, {result:'untested', evidence:''}));
        else res = await updateItem(it.id, data);
        if(!res) return false;
        if(locked) await addItem('criteria_change', {action:isNew ? 'added' : 'amended', criterion:data.title, reason:v.reason.trim(), by:myName(), at:new Date().toISOString()});
        rerender(); return true;
      },
      danger:isNew ? null : {label:'Remove', onClick:async function(v){
        if(locked && !String(v.reason || '').trim()){ toast('Add a reason for the change first.'); return false; }
        if(!confirm('Remove this criterion?')) return false;
        var title = it.data.title;
        var ok = await removeItem(getItem(it.id)); if(!ok) return false;
        if(locked) await addItem('criteria_change', {action:'removed', criterion:title, reason:v.reason.trim(), by:myName(), at:new Date().toISOString()});
        rerender(); return true;
      }}
    });
  }

  /* ----- generic item dialog (people, tasks, activity, feedback, blockers) ----- */
  var ITEM_DEFS = {
    participant:{
      noun:'person',
      def:function(){ return {role:'evaluator', login_ready:false, onboarded:false}; },
      fields:[
        {key:'name', label:'Name', type:'text', required:true},
        {key:'role', label:'Role in the trial', type:'select', options:ROLES},
        {key:'title', label:'Job title', type:'text'},
        {key:'last_contact', label:'Last contact', type:'date'},
        {key:'login_ready', label:'Login set up and tested', type:'checkbox'},
        {key:'onboarded', label:'Attended onboarding', type:'checkbox'},
        {key:'notes', label:'Notes', type:'textarea', rows:3}
      ]
    },
    task:{
      noun:'task',
      def:function(){ return {side:'us', milestone:false, done:false, owner:(S.cur && S.cur.psc_name) || ''}; },
      fields:[
        {key:'title', label:'Task or milestone', type:'text', required:true},
        {key:'milestone', label:'This is a milestone', type:'checkbox'},
        {key:'side', label:'Who owns it', type:'select', options:SIDES},
        {key:'owner', label:'Owner (name)', type:'text'},
        {key:'due', label:'Due date', type:'date'},
        {key:'done', label:'Done', type:'checkbox'}
      ]
    },
    activity:{
      noun:'activity',
      def:function(){ return {date:todayStr(), type:'call', by:myName()}; },
      fields:[
        {key:'date', label:'Date', type:'date', required:true},
        {key:'type', label:'Type', type:'select', options:ACT_TYPES},
        {key:'summary', label:'What happened', type:'textarea', rows:4, required:true},
        {key:'minutes', label:'Time spent (minutes)', type:'number'}
      ]
    },
    feedback:{
      noun:'feedback entry',
      def:function(){ return {date:todayStr(), sentiment:'neutral'}; },
      fields:[
        {key:'date', label:'Date', type:'date'},
        {key:'from', label:'From (name)', type:'text'},
        {key:'sentiment', label:'Sentiment', type:'select', options:SENTIMENTS},
        {key:'text', label:'What they said', type:'textarea', rows:4, required:true}
      ]
    },
    blocker:{
      noun:'blocker',
      def:function(){ return {severity:'medium', status:'open'}; },
      fields:[
        {key:'title', label:'Blocker', type:'text', required:true, placeholder:'e.g. Two users cannot sign in'},
        {key:'severity', label:'Severity', type:'select', options:SEVERITY},
        {key:'status', label:'Status', type:'select', options:[['open','Open'],['resolved','Resolved']]},
        {key:'notes', label:'Notes', type:'textarea', rows:3}
      ]
    }
  };
  function itemDialog(kind, it){
    var d = ITEM_DEFS[kind], isNew = !it;
    formDialog({
      title:(isNew ? 'Add ' : 'Edit ') + d.noun,
      fields:d.fields, values:it ? it.data : d.def(), submitLabel:'Save',
      onSubmit:async function(v){
        var res;
        if(isNew){
          var data = merge(d.def(), v);
          if(kind === 'blocker' && data.status === 'resolved') data.resolved_on = todayStr();
          res = await addItem(kind, data);
        } else {
          var patch = merge(v, {});
          if(kind === 'blocker') patch.resolved_on = v.status === 'resolved' ? (it.data.resolved_on || todayStr()) : null;
          res = await updateItem(it.id, patch);
        }
        if(!res) return false;
        rerender(); return true;
      },
      danger:isNew ? null : {label:'Delete', onClick:async function(){
        if(!confirm('Delete this ' + d.noun + '?')) return false;
        var ok = await removeItem(getItem(it.id)); if(ok) rerender(); return ok;
      }}
    });
  }
  function addButton(label, kind){ var b = btn(label, 'ghost', function(){ itemDialog(kind, null); }); b.style.marginBottom = '12px'; return b; }
  function editBtn(kind, it){ return btn('Edit','ghost', function(){ itemDialog(kind, it); }); }

  /* ----- people ----- */
  function tabPeople(box, t, edit){
    var b = block('People', 'Everyone who will use the trial, plus the sponsor and the decision maker. Track whether their login works and whether they have been onboarded.');
    var st = stats();
    if(edit) b.appendChild(addButton('Add person','participant'));
    var list = itemsOf('participant');
    if(!list.length) b.appendChild(emptyNote('No one added yet.'));
    else b.appendChild(el('p','hint', st.people + ' people. ' + st.ready + ' with logins ready, ' + st.onboarded + ' onboarded.'));
    list.forEach(function(it){
      var d = it.data, item = el('div','item');
      var main = el('div','imain');
      var ttl = el('div','ittl'); ttl.appendChild(el('span', null, d.name)); ttl.appendChild(badge(lab(ROLES, d.role)));
      main.appendChild(ttl);
      var bits = [];
      if(d.title) bits.push(d.title);
      if(d.last_contact) bits.push('last contact ' + fdate(d.last_contact));
      var su = S.sus.filter(function(u){ return u.assigned_trial_id === t.id && String(u.assigned_to || '').trim().toLowerCase() === String(d.name || '').trim().toLowerCase(); })[0];
      if(su) bits.push('sandbox login: ' + su.username);
      if(bits.length) main.appendChild(el('div','imeta', bits.join('  |  ')));
      if(d.notes) main.appendChild(el('div','imeta', d.notes));
      item.appendChild(main);
      var acts = el('div','acts');
      acts.appendChild(checkRow('Login ready', d.login_ready, async function(v){ await updateItem(it.id, {login_ready:v}); rerender(); }, !edit));
      acts.appendChild(checkRow('Onboarded', d.onboarded, async function(v){ await updateItem(it.id, {onboarded:v}); rerender(); }, !edit));
      if(edit) acts.appendChild(editBtn('participant', it));
      item.appendChild(acts);
      b.appendChild(item);
    });
    box.appendChild(b);
  }

  /* ----- plan: milestones and tasks ----- */
  function tabPlan(box, t, edit){
    var b = block('Plan', 'Milestones and tasks for both sides. Overdue items are flagged.');
    var st = stats();
    if(edit) b.appendChild(addButton('Add task or milestone','task'));
    var tasks = itemsOf('task').slice().sort(function(a, c){
      if(!!a.data.done !== !!c.data.done) return a.data.done ? 1 : -1;
      return String(a.data.due || '9999').localeCompare(String(c.data.due || '9999'));
    });
    if(!tasks.length) b.appendChild(emptyNote('No tasks yet.'));
    else b.appendChild(el('p','hint', st.tasksDone + ' of ' + st.tasksTotal + ' done.'));
    var today = todayStr();
    tasks.forEach(function(it){
      var d = it.data, item = el('div','item');
      var main = el('div','imain');
      var ttl = el('div','ittl');
      ttl.appendChild(checkRow(d.title, d.done, async function(v){ await updateItem(it.id, {done:v}); rerender(); }, !edit));
      if(d.milestone) ttl.appendChild(badge('Milestone','tpl'));
      ttl.appendChild(badge(lab(SIDES, d.side)));
      main.appendChild(ttl);
      var meta = el('div','imeta', (d.owner ? 'Owner: ' + d.owner + '  |  ' : '') + (d.due ? 'Due ' + fdate(d.due) : 'No due date'));
      if(!d.done && d.due && d.due < today){ meta.appendChild(document.createTextNode('  |  ')); meta.appendChild(el('span','flag bad','overdue')); }
      main.appendChild(meta);
      item.appendChild(main);
      if(edit){ var acts = el('div','acts'); acts.appendChild(editBtn('task', it)); item.appendChild(acts); }
      b.appendChild(item);
    });
    box.appendChild(b);
  }

  /* ----- activity ----- */
  function tabActivity(box, t, edit){
    var b = block('Activity log', 'Calls, training sessions, check-ins and anything else you did for this trial. Time spent adds up so you can see the effort.');
    var st = stats();
    if(edit) b.appendChild(addButton('Log activity','activity'));
    var list = itemsOf('activity').slice().sort(function(a, c){ return String(c.data.date || '').localeCompare(String(a.data.date || '')); });
    if(!list.length) b.appendChild(emptyNote('Nothing logged yet.'));
    else b.appendChild(el('p','hint', list.length + ' entries, ' + hoursText(st.mins) + ' in total.'));
    list.forEach(function(it){
      var d = it.data, item = el('div','item');
      var main = el('div','imain');
      var ttl = el('div','ittl'); ttl.appendChild(el('span', null, fdate(d.date))); ttl.appendChild(badge(lab(ACT_TYPES, d.type)));
      if(d.minutes) ttl.appendChild(badge(d.minutes + ' min'));
      main.appendChild(ttl);
      main.appendChild(el('div','body', d.summary));
      if(d.by) main.appendChild(el('div','imeta','Logged by ' + d.by));
      item.appendChild(main);
      if(edit){ var acts = el('div','acts'); acts.appendChild(editBtn('activity', it)); item.appendChild(acts); }
      b.appendChild(item);
    });
    box.appendChild(b);
  }

  /* ----- feedback and blockers ----- */
  function tabFeedback(box, t, edit){
    var fb = block('Feedback', 'What users and stakeholders have said. Use their own words where you can.');
    if(edit) fb.appendChild(addButton('Add feedback','feedback'));
    var list = itemsOf('feedback').slice().sort(function(a, c){ return String(c.data.date || '').localeCompare(String(a.data.date || '')); });
    if(!list.length) fb.appendChild(emptyNote('No feedback captured yet.'));
    list.forEach(function(it){
      var d = it.data, item = el('div','item');
      var main = el('div','imain');
      var ttl = el('div','ittl');
      ttl.appendChild(el('span', null, (d.from || 'Unknown') + ', ' + fdate(d.date)));
      ttl.appendChild(badge(lab(SENTIMENTS, d.sentiment), d.sentiment === 'positive' ? 'ok' : (d.sentiment === 'negative' ? 'bad' : '')));
      main.appendChild(ttl); main.appendChild(el('div','body', d.text));
      item.appendChild(main);
      if(edit){ var acts = el('div','acts'); acts.appendChild(editBtn('feedback', it)); item.appendChild(acts); }
      fb.appendChild(item);
    });
    box.appendChild(fb);

    var bl = block('Blockers', 'Anything stopping users from getting on with the trial: logins, access, confusion, data.');
    if(edit) bl.appendChild(addButton('Add blocker','blocker'));
    var blist = itemsOf('blocker').slice().sort(function(a, c){
      var ao = a.data.status === 'resolved' ? 1 : 0, co = c.data.status === 'resolved' ? 1 : 0; return ao - co;
    });
    if(!blist.length) bl.appendChild(emptyNote('No blockers raised.'));
    blist.forEach(function(it){
      var d = it.data, item = el('div','item');
      var main = el('div','imain');
      var ttl = el('div','ittl'); ttl.appendChild(el('span', null, d.title));
      ttl.appendChild(badge(lab(SEVERITY, d.severity), d.severity === 'high' ? 'bad' : ''));
      ttl.appendChild(badge(d.status === 'resolved' ? 'Resolved' : 'Open', d.status === 'resolved' ? 'ok' : 'warnb'));
      main.appendChild(ttl);
      if(d.notes) main.appendChild(el('div','imeta', d.notes));
      item.appendChild(main);
      if(edit){
        var acts = el('div','acts');
        acts.appendChild(btn(d.status === 'resolved' ? 'Reopen' : 'Mark resolved','ghost', async function(){
          var res = d.status !== 'resolved';
          await updateItem(it.id, {status:res ? 'resolved' : 'open', resolved_on:res ? todayStr() : null}); rerender();
        }));
        acts.appendChild(editBtn('blocker', it));
        item.appendChild(acts);
      }
      bl.appendChild(item);
    });
    box.appendChild(bl);
  }

  /* ----- environments for this trial ----- */
  function tabTrialEnvs(box, t, edit){
    var b = block('Environments', 'The demo copy or sandbox this trial runs on. The full register of every environment is under the Environments tab.');
    var linked = S.envs.filter(function(e){ return e.trial_id === t.id; });
    if(edit){
      var acts = el('div','actions'); acts.style.marginBottom = '12px';
      acts.appendChild(btn('New environment for this trial','ghost', function(){ envDialog(null, {trial_id:t.id}); }));
      var free = S.envs.filter(function(e){ return !e.trial_id && e.status !== 'torn_down'; });
      if(free.length){
        var sel = selectEl([['','Link an existing environment...']].concat(free.map(function(e){ return [e.id, e.name + ' (' + lab(ENV_KINDS, e.kind) + ')']; })), '', async function(v){
          if(!v) return;
          var r = await sb.from('environments').update({trial_id:t.id}).eq('id', v).select().single();
          if(r.error){ toast('Could not link: ' + errMsg(r.error)); return; }
          replaceEnv(r.data); rerender();
        });
        acts.appendChild(sel);
      }
      b.appendChild(acts);
    }
    if(!linked.length) b.appendChild(emptyNote('No environment linked yet.'));
    linked.forEach(function(e){ b.appendChild(envRow(e, {compact:true, canUnlink:edit})); });
    box.appendChild(b);

    var users = S.sus.filter(function(u){ return u.assigned_trial_id === t.id; });
    var ub = block('Sandbox logins', 'Logins from the shared sandbox that are assigned to this trial. Release them when the trial ends so nobody else gets the same one.');
    if(edit) ub.appendChild(btn('Assign a sandbox login','ghost', function(){ assignDialog({trialId:t.id}); }));
    if(!users.length) ub.appendChild(emptyNote('No sandbox logins assigned.'));
    users.forEach(function(u){
      var env = findEnv(u.environment_id);
      var item = el('div','item');
      var main = el('div','imain');
      main.appendChild(el('div','ittl', u.username + (u.persona ? ' (' + u.persona + ')' : '')));
      main.appendChild(el('div','imeta', (env ? env.name : 'Unknown environment') + '  |  ' + (u.assigned_to ? 'given to ' + u.assigned_to : 'not yet given to anyone') + (u.assigned_on ? '  |  since ' + fdate(u.assigned_on) : '')));
      item.appendChild(main);
      if(edit){ var a2 = el('div','acts'); a2.appendChild(btn('Release','ghost', function(){ releaseUser(u); })); item.appendChild(a2); }
      ub.appendChild(item);
    });
    box.appendChild(ub);
  }

  /* ----- outcome and close-out ----- */
  function tabOutcome(box, t, edit){
    var oc = t.outcome || {};
    var b = block('Outcome', 'Record what happened and why. This feeds the trial summary.');
    var g = el('div','grid2');
    g.appendChild(fieldSelect('Decision', [['pending','Pending'],['won','Won'],['lost','Lost'],['nodecision','No decision']], oc.decision || 'pending', function(v){
      var cur = merge(S.cur.outcome, {}); cur.decision = v;
      if(v === 'won' || v === 'lost') patchTrial({outcome:cur, stage:v}); else patchTrial({outcome:cur});
    }, !edit));
    g.appendChild(fieldInput('Competitor in the evaluation','text', oc.competitor || '', function(v){ var cur = merge(S.cur.outcome, {}); cur.competitor = v; patchTrial({outcome:cur}); }, {disabled:!edit}));
    b.appendChild(g);
    [['recommendation','Recommendation','What you recommend now, based on the results.'],['reasons','Why it was won or lost','The real reasons, in the customer\'s words where possible.'],['lessons','Lessons learned','What you would repeat or change next time.']].forEach(function(f){
      b.appendChild(fieldInput(f[1], 'textarea', oc[f[0]] || '', function(v){ var cur = merge(S.cur.outcome, {}); cur[f[0]] = v; patchTrial({outcome:cur}); }, {disabled:!edit, rows:3, placeholder:f[2]}));
    });
    var st = stats();
    var sc = el('div','score');
    sc.appendChild(statBox(st.must.pass + ' of ' + st.must.total, 'must-have criteria passed', st.must.fail ? 'bad' : ''));
    sc.appendChild(statBox(st.all.pass + ' of ' + st.all.total, 'all criteria passed'));
    sc.appendChild(statBox(st.all.fail, 'criteria failed', st.all.fail ? 'bad' : ''));
    b.appendChild(sc);
    var ex = btn('Export trial summary (PDF)','btn', exportSummary); b.appendChild(ex);
    box.appendChild(b);

    var co = block('Close-out checklist', 'Run through this when the trial ends so nothing is left running or open.');
    var cc = merge(t.closeout && t.closeout.checks, {});
    CLOSEOUT.forEach(function(c){
      co.appendChild(checkRow(c[1], !!cc[c[0]], function(chk){
        var cur = merge(S.cur.closeout, {}); cur.checks = merge(cur.checks, {}); cur.checks[c[0]] = chk; patchTrial({closeout:cur});
      }, !edit));
    });
    co.appendChild(fieldInput('Hand-off notes','textarea', (t.closeout && t.closeout.notes) || '', function(v){
      var cur = merge(S.cur.closeout, {}); cur.notes = v; patchTrial({closeout:cur});
    }, {disabled:!edit, rows:3}));
    var envs = S.envs.filter(function(e){ return e.trial_id === t.id; });
    var still = envs.filter(function(e){ return e.status !== 'torn_down'; });
    var users = S.sus.filter(function(u){ return u.assigned_trial_id === t.id; });
    if(still.length) co.appendChild(el('div','banner', 'Still linked and not torn down: ' + still.map(function(e){ return e.name; }).join(', ')));
    if(users.length) co.appendChild(el('div','banner', users.length + ' sandbox login(s) are still assigned to this trial.'));
    box.appendChild(co);
  }

  /* =====================================================================
     TRIAL SUMMARY PDF
     ===================================================================== */
  function exportSummary(){
    if(!(window.jspdf && window.jspdf.jsPDF)){ toast('The PDF library did not load, so export is unavailable.'); return; }
    var t = S.cur, clean = A.clean;
    try{
      var doc = new window.jspdf.jsPDF({unit:'mm', format:'a4', compress:true});
      var W = 210, H = 297, M = 18, CW = W - M*2, y = M;
      var INK = [25,23,61], MUTED = [110,106,145], ACC = [90,68,224], LINE = [220,217,240];
      var lhOf = function(size){ return size*0.3528*1.4; };
      var ensure = function(h){ if(y + h > H - M - 6){ doc.addPage(); y = M; } };
      var para = function(str, size, style, color, x, w, after){
        color = color || INK; x = (x == null) ? M : x; w = w || (CW - (x - M));
        doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]);
        var lh = lhOf(size), lines = doc.splitTextToSize(clean(str) || ' ', w);
        for(var i=0;i<lines.length;i++){ ensure(lh); doc.text(lines[i], x, y + lh*0.75); y += lh; }
        y += after || 0;
      };
      var heading = function(txt){
        ensure(16); y += 5; para(txt, 14, 'bold', INK, M, CW, 1);
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(M, y, M + CW, y); y += 3;
      };
      var st = stats(), oc = t.outcome || {};

      para(trialTitle(t), 20, 'bold', INK, M, CW, 1.5);
      var meta = [];
      if(t.psc_name) meta.push('PSC: ' + t.psc_name);
      if(t.ae_name) meta.push('AE: ' + t.ae_name);
      meta.push(lab(TYPES, t.trial_type));
      if(t.start_date || t.end_date) meta.push(fdate(t.start_date) + ' to ' + fdate(t.end_date));
      para(meta.join('   |   '), 10, 'normal', MUTED, M, CW, 0.5);
      para('Stage: ' + lab(STAGES, t.stage) + '   |   Health: ' + lab(HEALTH, t.health) + (oc.decision && oc.decision !== 'pending' ? '   |   Decision: ' + lab([['won','Won'],['lost','Lost'],['nodecision','No decision']], oc.decision) : ''), 10, 'normal', MUTED, M, CW, 0.5);
      var u = safeUrl(t.sfdc_url); if(u) para('Salesforce: ' + u, 9, 'normal', MUTED, M, CW, 0.5);
      para('Prepared ' + new Date().toLocaleDateString() + ' by ' + myName(), 9, 'normal', MUTED, M, CW, 2);

      if(oc.recommendation){ heading('Recommendation'); para(oc.recommendation, 11, 'normal', INK, M, CW, 2); }

      heading('Success criteria');
      para(st.must.pass + ' of ' + st.must.total + ' must-have criteria passed. ' + st.all.pass + ' of ' + st.all.total + ' criteria passed overall' + (st.all.fail ? ', ' + st.all.fail + ' failed' : '') + (st.all.untested ? ', ' + st.all.untested + ' not tested' : '') + '.', 10.5, 'normal', INK, M, CW, 2);
      var cx = M + CW - 46;
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      ensure(8); doc.text('Criterion', M, y + 3.5); doc.text('Priority', cx, y + 3.5); doc.text('Result', cx + 26, y + 3.5); y += 6;
      itemsOf('criterion').forEach(function(c){
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        var lines = doc.splitTextToSize(clean(c.data.title), cx - M - 4), lh = lhOf(10);
        var extra = c.data.evidence ? doc.splitTextToSize(clean(c.data.evidence), cx - M - 4) : [];
        var rowH = (lines.length + extra.length) * lh + 2.5;
        ensure(rowH);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        for(var i=0;i<lines.length;i++) doc.text(lines[i], M, y + lh*0.75 + i*lh);
        doc.text(clean(lab(PRIORITIES, c.data.priority)), cx, y + lh*0.75);
        doc.text(clean(lab(RESULTS, c.data.result || 'untested')), cx + 26, y + lh*0.75);
        if(extra.length){
          doc.setFontSize(9); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
          for(var j=0;j<extra.length;j++) doc.text(extra[j], M, y + lh*0.75 + (lines.length + j)*lh);
        }
        y += rowH; doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(M, y, M + CW, y); y += 1;
      });
      var chg = itemsOf('criteria_change').filter(function(l){ return l.data.action === 'added' || l.data.action === 'amended' || l.data.action === 'removed'; });
      if(chg.length){
        para('Criteria changed after kickoff: ' + chg.length, 9, 'normal', MUTED, M, CW, 1);
      }

      var fbs = itemsOf('feedback');
      if(fbs.length){
        heading('Feedback');
        fbs.slice().sort(function(a, c){ return String(a.data.date || '').localeCompare(String(c.data.date || '')); }).forEach(function(f){
          ensure(14);
          para((f.data.from || 'Unknown') + ', ' + fdate(f.data.date) + '   |   ' + lab(SENTIMENTS, f.data.sentiment), 8.5, 'normal', MUTED, M + 4, CW - 4, 0);
          para(f.data.text, 10.5, 'normal', INK, M + 4, CW - 4, 2.5);
        });
      }
      var bls = itemsOf('blocker');
      if(bls.length){
        heading('Blockers');
        bls.forEach(function(b2){ para('[' + (b2.data.status === 'resolved' ? 'Resolved' : 'Open') + ', ' + lab(SEVERITY, b2.data.severity) + '] ' + b2.data.title + (b2.data.notes ? ': ' + b2.data.notes : ''), 10, 'normal', INK, M + 4, CW - 4, 1.2); });
      }
      var ppl = itemsOf('participant');
      if(ppl.length){
        heading('People');
        ppl.forEach(function(p){ para(p.data.name + ' (' + lab(ROLES, p.data.role) + (p.data.title ? ', ' + p.data.title : '') + ')' + (p.data.onboarded ? ', onboarded' : ''), 10, 'normal', INK, M + 4, CW - 4, 1); });
      }
      heading('Effort');
      para(itemsOf('activity').length + ' activities logged, ' + hoursText(st.mins) + ' in total.', 10.5, 'normal', INK, M, CW, 2);
      if(oc.reasons){ heading('Why it was ' + (oc.decision === 'lost' ? 'lost' : (oc.decision === 'won' ? 'won' : 'decided'))); para(oc.reasons, 10.5, 'normal', INK, M, CW, 2); }
      if(oc.lessons){ heading('Lessons learned'); para(oc.lessons, 10.5, 'normal', INK, M, CW, 2); }

      var n = doc.getNumberOfPages();
      for(var p=1;p<=n;p++){
        doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text('Page ' + p + ' of ' + n, W - M, H - 10, {align:'right'});
      }
      var slug = clean(t.account_name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50) || 'trial';
      doc.save(slug + '-trial-summary-' + todayStr() + '.pdf');
    }catch(e){ toast('Could not build the PDF.'); }
  }

  /* =====================================================================
     ENVIRONMENT REGISTER
     ===================================================================== */
  function replaceEnv(row){
    var found = false;
    for(var i=0;i<S.envs.length;i++){ if(S.envs[i].id === row.id){ S.envs[i] = row; found = true; } }
    if(!found) S.envs.unshift(row);
  }
  function replaceUser(row){
    for(var i=0;i<S.sus.length;i++){ if(S.sus[i].id === row.id){ S.sus[i] = row; return; } }
    S.sus.push(row);
  }
  function envFlag(e){
    if(!e.expires_on || e.status === 'torn_down') return null;
    var d = diffDays(todayStr(), e.expires_on);
    if(d === null) return null;
    if(d < 0) return {cls:'bad', text:'expired ' + (-d) + (d === -1 ? ' day ago' : ' days ago') + ', needs tearing down'};
    if(d <= 3) return {cls:'warn', text:'expires ' + (d === 0 ? 'today' : 'in ' + d + (d === 1 ? ' day' : ' days'))};
    return null;
  }
  function envRow(e, opts){
    opts = opts || {};
    var item = el('div','item');
    var main = el('div','imain');
    var ttl = el('div','ittl'); ttl.appendChild(el('span', null, e.name)); ttl.appendChild(badge(lab(ENV_KINDS, e.kind)));
    if(opts.compact) ttl.appendChild(badge(lab(ENV_STATUS, e.status), e.status === 'torn_down' ? '' : 'tpl'));
    main.appendChild(ttl);
    var bits = [];
    if(e.version) bits.push('version ' + e.version);
    if(e.built_by) bits.push('built by ' + e.built_by + (e.built_on ? ' on ' + fdate(e.built_on) : ''));
    if(e.expires_on) bits.push('expires ' + fdate(e.expires_on));
    var meta = el('div','imeta', bits.join('  |  '));
    var fl = envFlag(e); if(fl){ meta.appendChild(document.createTextNode(bits.length ? '  |  ' : '')); meta.appendChild(el('span','flag ' + fl.cls, fl.text)); }
    main.appendChild(meta);
    var line2 = el('div','imeta');
    var u = safeUrl(e.url);
    if(u){ var a = el('a','link', e.url); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; line2.appendChild(a); }
    if(e.trial_id && !opts.compact){
      var tr = findTrial(e.trial_id);
      if(tr){ line2.appendChild(document.createTextNode((u ? '  |  ' : '') + 'Trial: ')); var tl = el('a','link', trialTitle(tr)); tl.href = '#'; tl.addEventListener('click', function(ev){ ev.preventDefault(); S.tab = 'trials'; markTabs(); S.showTemplates = false; openTrial(tr.id); }); line2.appendChild(tl); }
    }
    if(e.credentials_note) line2.appendChild(document.createTextNode((u || e.trial_id ? '  |  ' : '') + 'Logins kept in: ' + e.credentials_note));
    main.appendChild(line2);
    if(e.notes) main.appendChild(el('div','imeta', e.notes));
    item.appendChild(main);

    var acts = el('div','acts');
    if(!opts.compact){
      acts.appendChild(selectEl(ENV_STATUS, e.status, async function(v){
        var r = await sb.from('environments').update({status:v}).eq('id', e.id).select().single();
        if(r.error){ toast('Could not update: ' + errMsg(r.error)); return; }
        replaceEnv(r.data); rerender();
      }));
    }
    if(e.kind === 'sandbox' && !opts.compact){
      var n = S.sus.filter(function(x){ return x.environment_id === e.id; }).length;
      acts.appendChild(btn((S.openEnv[e.id] ? 'Hide users' : 'Users (' + n + ')'), 'ghost', function(){ S.openEnv[e.id] = !S.openEnv[e.id]; rerender(); }));
    }
    acts.appendChild(btn('Edit','ghost', function(){ envDialog(e, null); }));
    if(opts.canUnlink){
      acts.appendChild(btn('Unlink','ghost', async function(){
        var r = await sb.from('environments').update({trial_id:null}).eq('id', e.id).select().single();
        if(r.error){ toast('Could not unlink: ' + errMsg(r.error)); return; }
        replaceEnv(r.data); rerender();
      }));
    }
    item.appendChild(acts);
    if(e.kind === 'sandbox' && S.openEnv[e.id] && !opts.compact) item.appendChild(usersPanel(e));
    return item;
  }
  function usersPanel(e){
    var p = el('div','detail');
    var users = S.sus.filter(function(u){ return u.environment_id === e.id; });
    var free = users.filter(function(u){ return !u.assigned_trial_id; }).length;
    var top = el('div','actions');
    top.appendChild(el('strong', null, free + ' of ' + users.length + ' logins free'));
    top.appendChild(btn('Add logins','ghost', function(){ addUsersDialog(e); }));
    p.appendChild(top);
    if(!users.length) p.appendChild(el('p','hint','No logins added yet. Add the usernames only, never the passwords.'));
    var ul = el('ul');
    users.forEach(function(u){
      var li = el('li');
      var tr = u.assigned_trial_id ? findTrial(u.assigned_trial_id) : null;
      li.appendChild(el('strong', null, u.username));
      li.appendChild(document.createTextNode((u.persona ? ' (' + u.persona + ')' : '') + '  |  ' + (tr ? 'assigned to ' + trialTitle(tr) + (u.assigned_to ? ', ' + u.assigned_to : '') + (u.assigned_on ? ', since ' + fdate(u.assigned_on) : '') : 'free') + '  '));
      if(u.assigned_trial_id) li.appendChild(btn('Release','ghost', function(){ releaseUser(u); }));
      else li.appendChild(btn('Assign','ghost', function(){ assignDialog({envId:e.id, userId:u.id}); }));
      li.appendChild(btn('Remove','ghost danger', async function(){
        if(!confirm('Remove the login "' + u.username + '" from the pool?')) return;
        var r = await sb.from('sandbox_users').delete().eq('id', u.id);
        if(r.error){ toast('Could not remove: ' + errMsg(r.error)); return; }
        S.sus = S.sus.filter(function(x){ return x.id !== u.id; }); rerender();
      }));
      ul.appendChild(li);
    });
    p.appendChild(ul);
    return p;
  }
  async function releaseUser(u){
    var r = await sb.from('sandbox_users').update({assigned_trial_id:null, assigned_to:null, assigned_on:null}).eq('id', u.id).select().single();
    if(r.error){ toast('Could not release: ' + errMsg(r.error)); return; }
    replaceUser(r.data); rerender();
  }
  function addUsersDialog(env){
    formDialog({
      title:'Add sandbox logins to ' + env.name,
      intro:'One per line: username, then optionally a role or persona after a comma. Usernames only. Never enter passwords here.',
      fields:[
        {key:'lines', label:'Logins', type:'textarea', rows:8, required:true, placeholder:'sandbox.user01, Supervisor\nsandbox.user02, Safety manager'}
      ],
      submitLabel:'Add logins',
      onSubmit:async function(v){
        var seen = {}, rows = [];
        String(v.lines).split('\n').forEach(function(line){
          var parts = line.split(/[,\t|]/); var name = (parts[0] || '').trim(); if(!name || seen[name.toLowerCase()]) return;
          seen[name.toLowerCase()] = true;
          rows.push({environment_id:env.id, username:name, persona:(parts[1] || '').trim() || null});
        });
        if(!rows.length){ toast('Enter at least one username.'); return false; }
        var r = await sb.from('sandbox_users').upsert(rows, {onConflict:'environment_id,username', ignoreDuplicates:true}).select();
        if(r.error){ toast('Could not add: ' + errMsg(r.error)); return false; }
        (r.data || []).forEach(replaceUser);
        S.openEnv[env.id] = true; rerender(); return true;
      }
    });
  }
  function assignDialog(o){
    var envs = S.envs.filter(function(e){ return e.kind === 'sandbox' && e.status !== 'torn_down'; });
    function freeUsers(envId){ return S.sus.filter(function(u){ return u.environment_id === envId && !u.assigned_trial_id; }); }
    function userOpts(envId){ return freeUsers(envId).map(function(u){ return [u.id, u.username + (u.persona ? ' (' + u.persona + ')' : '')]; }); }
    var envId = o.envId || (envs[0] && envs[0].id);
    if(!envs.length){ toast('There are no shared sandbox environments yet. Add one under Environments first.'); return; }
    if(!envId || !freeUsers(envId).length){
      var any = envs.filter(function(e){ return freeUsers(e.id).length; })[0];
      if(!any){ toast('There are no free sandbox logins. Add some or release one under Environments.'); return; }
      if(!o.envId) envId = any.id;
    }
    var openTrials = S.trials.filter(function(t){ return !isClosed(t); });
    var fields = [];
    if(!o.envId) fields.push({key:'env', label:'Sandbox', type:'select', options:envs.map(function(e){ return [e.id, e.name]; }), onChange:function(v, f){ f.setOptions('user', userOpts(v)); }});
    if(!o.userId) fields.push({key:'user', label:'Login', type:'select', options:userOpts(envId)});
    if(!o.trialId) fields.push({key:'trial', label:'Trial', type:'select', options:openTrials.map(function(t){ return [t.id, trialTitle(t)]; })});
    fields.push({key:'who', label:'Give it to (name)', type:'text', hint:'The customer user who will use this login.'});
    formDialog({
      title:'Assign a sandbox login', fields:fields, submitLabel:'Assign',
      values:{env:envId, user:o.userId || (userOpts(envId)[0] && userOpts(envId)[0][0]), trial:o.trialId || (openTrials[0] && openTrials[0].id)},
      onSubmit:async function(v){
        var uid2 = o.userId || v.user, tid = o.trialId || v.trial;
        if(!uid2 || !tid){ toast('Choose a login and a trial.'); return false; }
        var r = await sb.from('sandbox_users').update({assigned_trial_id:tid, assigned_to:(v.who || '').trim() || null, assigned_on:todayStr()}).eq('id', uid2).is('assigned_trial_id', null).select();
        if(r.error){ toast('Could not assign: ' + errMsg(r.error)); return false; }
        if(!r.data || !r.data.length){ toast('Someone assigned that login a moment ago. Pick another.'); loadEnvs().then(rerender); return false; }
        replaceUser(r.data[0]); rerender(); return true;
      }
    });
  }
  function envDialog(e, preset){
    var isNew = !e;
    var trialOpts = [['','Not linked to a trial']].concat(S.trials.filter(function(t){ return !isClosed(t) || (e && e.trial_id === t.id); }).map(function(t){ return [t.id, trialTitle(t)]; }));
    var vals = e ? merge(e, {trial_id:e.trial_id || ''}) : merge({kind:'dedicated', status:'requested', built_by:myName(), built_on:todayStr(), trial_id:''}, preset || {});
    formDialog({
      title:isNew ? 'New environment' : 'Edit environment',
      fields:[
        {key:'name', label:'Name', type:'text', required:true, placeholder:'e.g. Acme demo copy'},
        {key:'kind', label:'Type', type:'select', options:ENV_KINDS},
        {key:'url', label:'URL', type:'url', placeholder:'https://...'},
        {key:'version', label:'Version', type:'text'},
        {key:'status', label:'Status', type:'select', options:ENV_STATUS},
        {key:'trial_id', label:'Linked trial', type:'select', options:trialOpts},
        {key:'built_by', label:'Built by', type:'text'},
        {key:'built_on', label:'Built on', type:'date'},
        {key:'expires_on', label:'Expires or tear down by', type:'date'},
        {key:'credentials_note', label:'Where the logins are kept', type:'text', placeholder:'e.g. team password manager, folder "Trials"', hint:'Never paste passwords here. Record where they are kept.'},
        {key:'notes', label:'Notes', type:'textarea', rows:3}
      ],
      values:vals, submitLabel:'Save',
      onSubmit:async function(v){
        var url = String(v.url || '').trim();
        if(url && !safeUrl(url)){ toast('The URL must start with http:// or https://'); return false; }
        var row = {
          name:v.name.trim(), kind:v.kind, url:url || null, version:(v.version || '').trim() || null, status:v.status,
          trial_id:v.trial_id || null, built_by:(v.built_by || '').trim() || null, built_on:v.built_on || null, expires_on:v.expires_on || null,
          credentials_note:(v.credentials_note || '').trim() || null, notes:(v.notes || '').trim() || null
        };
        var r = isNew ? await sb.from('environments').insert(row).select().single() : await sb.from('environments').update(row).eq('id', e.id).select().single();
        if(r.error){ toast('Could not save: ' + errMsg(r.error)); return false; }
        replaceEnv(r.data); rerender(); return true;
      },
      danger:isNew ? null : {label:'Delete', onClick:async function(){
        if(!confirm('Delete "' + e.name + '" from the register? Its sandbox logins are removed too.')) return false;
        var r = await sb.from('environments').delete().eq('id', e.id);
        if(r.error){ toast('Could not delete: ' + errMsg(r.error) + ' (only the creator or a team lead can delete)'); return false; }
        S.envs = S.envs.filter(function(x){ return x.id !== e.id; });
        S.sus = S.sus.filter(function(x){ return x.environment_id !== e.id; });
        rerender(); return true;
      }}
    });
  }
  function renderEnvs(head, body){
    var top = el('div','libhead');
    var tb = el('div');
    tb.appendChild(el('h2', null, 'Environments'));
    tb.appendChild(el('p', null, 'Every dedicated demo copy and shared sandbox, who has it, and when it should come down.'));
    var right = el('div','actions');
    right.appendChild(btn('New environment','btn', function(){ envDialog(null, null); }));
    top.appendChild(tb); top.appendChild(right);
    head.appendChild(top);

    var live = S.envs.filter(function(e){ return e.status !== 'torn_down' && e.status !== 'expired'; });
    var copies = live.filter(function(e){ return e.kind === 'dedicated'; }).length;
    var pool = S.sus.filter(function(u){ var en = findEnv(u.environment_id); return en && en.status !== 'torn_down'; });
    var sc = el('div','score');
    sc.appendChild(statBox(copies, 'dedicated copies in use'));
    sc.appendChild(statBox(pool.filter(function(u){ return !u.assigned_trial_id; }).length + ' of ' + pool.length, 'sandbox logins free'));
    var due = S.envs.filter(function(e){ var f = envFlag(e); return f && f.cls === 'bad'; }).length;
    sc.appendChild(statBox(due, 'past their tear-down date', due ? 'bad' : ''));
    head.appendChild(sc);

    var box = el('div');
    var f = el('div','filters');
    f.appendChild(selectEl([['all','All types'],['dedicated','Dedicated copies'],['sandbox','Shared sandboxes']], S.envFilter.kind, function(v){ S.envFilter.kind = v; fill(); }));
    f.appendChild(selectEl([['active','Not torn down'],['all','All statuses'],['torn_down','Torn down']], S.envFilter.status, function(v){ S.envFilter.status = v; fill(); }));
    head.appendChild(f);
    function fill(){
      box.innerHTML = '';
      var list = S.envs.filter(function(e){
        if(S.envFilter.kind !== 'all' && e.kind !== S.envFilter.kind) return false;
        if(S.envFilter.status === 'active' && e.status === 'torn_down') return false;
        if(S.envFilter.status === 'torn_down' && e.status !== 'torn_down') return false;
        return true;
      });
      if(!list.length){ box.appendChild(emptyNote(S.envs.length ? 'No environments match these filters.' : 'No environments registered yet. Add the demo copies and sandboxes you run trials on.')); return; }
      list.forEach(function(e){ box.appendChild(envRow(e, {})); });
    }
    fill();
    body.appendChild(box);
  }

  /* =====================================================================
     PUBLIC API
     ===================================================================== */
  function markTabs(){
    var tabs = document.querySelectorAll('#tabs button');
    for(var i=0;i<tabs.length;i++){ tabs[i].setAttribute('aria-current', tabs[i].dataset.tab === S.tab ? 'page' : 'false'); }
  }
  function init(api){
    A = api; sb = api.sb; el = api.el; toast = api.toast;
    resetState();
  }
  function show(tab, home){
    if(!A || !S) return;
    S.tab = tab;
    markTabs();
    if(tab === 'trials' && home && S.sub === 'detail'){
      saveTrial().then(function(){ S.sub = 'list'; S.cur = null; S.items = []; S.itemsLoaded = false; render(); });
    } else if(tab === 'trials' && home){ S.showTemplates = false; }
    if(tab === 'trials' && S.sub === 'detail' && !S.cur) S.sub = 'list';
    render();
    ensureLoaded().then(render);
  }
  function reset(){ clearTimeout(S && S.saveT); resetState(); }
  window.addEventListener('beforeunload', function(e){ if(S && S.dirty){ e.preventDefault(); e.returnValue = ''; } });
  window.DPTrials = {init:init, show:show, reset:reset};
})();
