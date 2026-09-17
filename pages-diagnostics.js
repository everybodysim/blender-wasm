(() => {
  const panel = document.createElement('div');
  panel.id = 'pages-diagnostics';
  panel.innerHTML = '<div class="pd-title">Blender startup diagnostics</div><div id="pd-status">Running checks…</div><div id="pd-log"></div>';
  Object.assign(panel.style, {
    position:'fixed', top:'12px', right:'12px', zIndex:'2147483647', width:'min(420px,calc(100vw - 24px))',
    maxHeight:'70vh', overflow:'auto', padding:'14px', boxSizing:'border-box', borderRadius:'10px',
    background:'rgba(10,12,16,.96)', color:'#fff', font:'13px/1.45 monospace', boxShadow:'0 8px 30px rgba(0,0,0,.45)',
    border:'1px solid rgba(255,255,255,.18)'
  });
  document.documentElement.appendChild(panel);
  const status = panel.querySelector('#pd-status');
  const logEl = panel.querySelector('#pd-log');
  const rows = {};
  const add = (name, value, detail='') => {
    let row = rows[name];
    if (!row) {
      row = document.createElement('div');
      row.style.cssText='padding:3px 0;border-bottom:1px solid rgba(255,255,255,.08)';
      logEl.appendChild(row); rows[name]=row;
    }
    row.textContent = `${value ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`;
    row.style.color = value ? '#9fe3a7' : '#ff9b9b';
  };
  const info = (name, detail) => {
    let row = rows[name];
    if (!row) { row=document.createElement('div'); row.style.cssText='padding:3px 0;border-bottom:1px solid rgba(255,255,255,.08)'; logEl.appendChild(row); rows[name]=row; }
    row.textContent=`• ${name} — ${detail}`; row.style.color='#ddd';
  };
  window.addEventListener('error', e => info('JavaScript error', `${e.message || 'unknown'}${e.filename ? ` @ ${e.filename}:${e.lineno}` : ''}`));
  window.addEventListener('unhandledrejection', e => info('Unhandled promise', e.reason?.stack || String(e.reason)));
  add('Cross-origin isolation', !!window.crossOriginIsolated, String(window.crossOriginIsolated));
  add('SharedArrayBuffer', typeof SharedArrayBuffer !== 'undefined', typeof SharedArrayBuffer);
  add('Atomics', typeof Atomics !== 'undefined', typeof Atomics);
  add('Web Workers', typeof Worker !== 'undefined', typeof Worker);
  add('WebAssembly', typeof WebAssembly !== 'undefined', typeof WebAssembly);
  add('WebGPU API', !!navigator.gpu, navigator.gpu ? 'available' : 'missing');
  info('Hardware threads', navigator.hardwareConcurrency || 'unknown');
  info('User agent', navigator.userAgent);
  if (navigator.gpu) {
    navigator.gpu.requestAdapter().then(adapter => {
      add('WebGPU adapter', !!adapter, adapter ? `${adapter.info?.vendor || 'unknown'} / ${adapter.info?.architecture || 'unknown'}` : 'no adapter');
      if (adapter) {
        try {
          const limits = adapter.limits;
          info('WebGPU max buffer', `${Math.round((limits.maxBufferSize || 0)/1048576)} MB`);
        } catch {}
      }
    }).catch(err => info('WebGPU adapter error', err?.stack || String(err)));
  }
  if (typeof Worker !== 'undefined' && typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated) {
    try {
      const workerSource = `self.onmessage=e=>{try{const a=new Int32Array(e.data);Atomics.add(a,0,1);self.postMessage('ok')}catch(err){self.postMessage('error:'+err.message)}}`;
      const blob = new Blob([workerSource], {type:'text/javascript'});
      const worker = new Worker(URL.createObjectURL(blob));
      const shared = new SharedArrayBuffer(4);
      const started = performance.now();
      const timer = setTimeout(() => { add('Thread smoke test', false, 'worker timed out'); worker.terminate(); }, 4000);
      worker.onmessage = e => { clearTimeout(timer); worker.terminate(); add('Thread smoke test', e.data === 'ok', `${e.data} in ${Math.round(performance.now()-started)} ms`); };
      worker.onerror = e => { clearTimeout(timer); worker.terminate(); add('Thread smoke test', false, e.message || 'worker error'); };
      worker.postMessage(shared);
    } catch (err) { add('Thread smoke test', false, err?.stack || String(err)); }
  } else {
    add('Thread smoke test', false, 'skipped because required APIs/isolation are missing');
  }
  status.textContent = 'If Blender stays on “loading Blender…”, leave this panel visible and send me what it says.';
})();
