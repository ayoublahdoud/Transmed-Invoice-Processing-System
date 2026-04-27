<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transmed — Système Réel de Traitement des Factures</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #0D2B4E;
    --blue-dark: #1A4F8A;
    --blue-mid: #3BA8D4;
    --blue-light: #6DCFEC;
    --blue-pale: #E8F6FB;
    --accent: #00C9A7;
    --warn: #F59E0B;
    --danger: #EF4444;
    --text: #0F1923;
    --text-muted: #5A7080;
    --surface: #FFFFFF;
    --surface2: #F4F8FC;
    --border: #D0E4EF;
    --shadow: 0 4px 24px rgba(13,43,78,0.10);
    --radius: 14px;
    --radius-sm: 8px;
    --font: 'Sora', sans-serif;
    --mono: 'IBM Plex Mono', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--surface2); color: var(--text); min-height: 100vh; }

  /* HEADER */
  header {
    background: var(--navy); padding: 0 40px; height: 68px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
    border-bottom: 2px solid var(--blue-dark);
  }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-icon {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, var(--blue-mid), var(--blue-light));
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
  }
  .logo-text strong { font-size: 18px; font-weight: 700; color: #fff; display: block; }
  .logo-text span { font-size: 10px; color: var(--blue-light); letter-spacing: 1.5px; text-transform: uppercase; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .badge-real {
    background: rgba(0,201,167,0.15); border: 1px solid rgba(0,201,167,0.4);
    color: var(--accent); font-size: 11px; font-weight: 700;
    padding: 5px 12px; border-radius: 20px; letter-spacing: 0.5px;
    display: flex; align-items: center; gap: 6px;
  }
  .badge-real::before {
    content: ''; width: 7px; height: 7px; background: var(--accent);
    border-radius: 50%; animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }

  /* LAYOUT */
  main { max-width: 1300px; margin: 0 auto; padding: 28px 40px 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  /* CARD */
  .card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
  .card-header {
    padding: 18px 24px 14px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 13px; font-weight: 700; color: var(--navy); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.8px; }
  .card-title .icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; }

  /* UPLOAD */
  .upload-section { grid-column: 1 / -1; }
  .upload-zone {
    margin: 20px 24px; border: 2px dashed var(--blue-mid);
    border-radius: var(--radius); padding: 36px 24px; text-align: center;
    background: var(--blue-pale); cursor: pointer; transition: all 0.25s; position: relative;
  }
  .upload-zone:hover, .upload-zone.drag-over { background: rgba(59,168,212,0.12); border-color: var(--blue-dark); }
  .upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .upload-icon {
    width: 52px; height: 52px; background: linear-gradient(135deg, var(--blue-dark), var(--blue-mid));
    border-radius: 13px; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px; font-size: 22px;
  }
  .upload-title { font-size: 16px; font-weight: 600; color: var(--navy); margin-bottom: 6px; }
  .upload-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
  .format-tags { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .format-tag { background: var(--blue-dark); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; letter-spacing: 1px; font-family: var(--mono); }
  .ai-badge { background: linear-gradient(135deg, #7C3AED, #4F46E5); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.5px; }

  /* PROGRESS */
  .progress-bar { height: 3px; background: var(--border); overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--blue-dark), var(--accent)); transition: width 0.4s ease; width: 0%; }
  .processing-text { padding: 8px 24px 4px; font-size: 11px; color: var(--blue-dark); font-family: var(--mono); font-weight: 500; display: none; min-height: 26px; }

  /* STATS */
  .stats-section { grid-column: 1 / -1; }
  .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); }
  .stat-item { padding: 18px 20px; border-right: 1px solid var(--border); transition: background 0.2s; }
  .stat-item:last-child { border-right: none; }
  .stat-item:hover { background: var(--surface2); }
  .stat-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .stat-value { font-size: 28px; font-weight: 700; color: var(--navy); font-family: var(--mono); line-height: 1; margin-bottom: 3px; }
  .stat-sub { font-size: 10px; color: var(--text-muted); }

  /* PIPELINE */
  .pipeline-section { grid-column: 1; }
  .pipeline-steps { padding: 14px 20px 20px; }
  .step { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); opacity: 0.35; transition: all 0.4s; }
  .step:last-child { border-bottom: none; }
  .step.active { opacity: 1; }
  .step.done { opacity: 1; }
  .step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-family: var(--mono); font-weight: 600; flex-shrink: 0; background: var(--border); color: var(--text-muted); transition: all 0.4s; }
  .step.active .step-dot { background: linear-gradient(135deg, var(--blue-mid), var(--blue-light)); color: #fff; animation: spinPulse 1.2s infinite; }
  .step.done .step-dot { background: var(--accent); color: #fff; }
  @keyframes spinPulse { 0%,100%{box-shadow:0 0 0 4px rgba(59,168,212,0.2)} 50%{box-shadow:0 0 0 8px rgba(59,168,212,0.08)} }
  .step-info { flex: 1; }
  .step-name { font-size: 12px; font-weight: 600; color: var(--navy); margin-bottom: 2px; }
  .step-desc { font-size: 10px; color: var(--text-muted); font-family: var(--mono); }
  .step-status { font-size: 10px; font-weight: 700; padding: 3px 7px; border-radius: 4px; align-self: center; }
  .ss-wait { background: var(--border); color: var(--text-muted); }
  .ss-proc { background: rgba(59,168,212,0.15); color: var(--blue-dark); }
  .ss-done { background: rgba(0,201,167,0.15); color: #00A88C; }
  .ss-err { background: rgba(239,68,68,0.1); color: var(--danger); }

  /* EXTRACTED DATA PANEL */
  .extract-section { grid-column: 2; }
  .extract-body { padding: 16px 20px; }
  .extract-empty { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
  .extract-field { margin-bottom: 12px; }
  .extract-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 3px; }
  .extract-value { font-size: 14px; font-weight: 600; color: var(--navy); font-family: var(--mono); }
  .extract-value.amount { font-size: 20px; color: var(--blue-dark); }
  .extract-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .confidence-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .confidence-fill { height: 100%; border-radius: 3px; background: var(--accent); transition: width 0.5s; }
  .lines-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
  .lines-table th { background: var(--surface2); padding: 6px 8px; text-align: left; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); }
  .lines-table td { padding: 6px 8px; border-bottom: 1px solid var(--border); color: var(--navy); }
  .lines-table tr:last-child td { border-bottom: none; }
  .divider { height: 1px; background: var(--border); margin: 12px 0; }

  /* TABLE */
  .table-section { grid-column: 1 / -1; }
  .table-toolbar { display: flex; align-items: center; gap: 10px; }
  .filter-btn { font-family: var(--font); font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; transition: all 0.15s; color: var(--text-muted); }
  .filter-btn.active, .filter-btn:hover { background: var(--blue-dark); color: #fff; border-color: var(--blue-dark); }
  .refresh-btn { margin-left: auto; font-family: var(--font); font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 6px; border: 1px solid var(--blue-mid); background: var(--blue-pale); color: var(--blue-dark); cursor: pointer; }
  .refresh-btn:hover { background: var(--blue-mid); color: #fff; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { text-align: left; padding: 10px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
  tbody tr { border-bottom: 1px solid var(--border); transition: background 0.15s; cursor: pointer; animation: rowIn 0.3s ease both; }
  @keyframes rowIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  tbody tr:hover { background: var(--blue-pale); }
  tbody tr:last-child { border-bottom: none; }
  td { padding: 11px 14px; vertical-align: middle; }
  .file-cell { display: flex; align-items: center; gap: 9px; }
  .file-ext { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; font-family: var(--mono); flex-shrink: 0; }
  .ext-pdf{background:#FEE2E2;color:#DC2626} .ext-jpg,.ext-jpeg{background:#FEF3C7;color:#D97706} .ext-png{background:#D1FAE5;color:#059669} .ext-xml{background:#EDE9FE;color:#7C3AED}
  .file-name { font-weight: 500; color: var(--navy); font-size: 12px; }
  .file-size { font-size: 10px; color: var(--text-muted); font-family: var(--mono); }
  .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 12px; }
  .chip-ocr{background:rgba(59,168,212,0.12);color:var(--blue-dark)} .chip-doc{background:rgba(109,207,236,0.15);color:#1A7896} .chip-dup{background:rgba(239,68,68,0.1);color:var(--danger)}
  .status-dot { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; }
  .status-dot::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .s-ok::before{background:var(--accent)} .s-proc::before{background:var(--warn);animation:pulse 1.5s infinite} .s-dup::before{background:var(--danger)}
  .s-ok{color:#00A88C} .s-proc{color:var(--warn)} .s-dup{color:var(--danger)}
  .amount-cell { font-family: var(--mono); font-weight: 600; color: var(--navy); }
  .time-cell { font-family: var(--mono); font-size: 10px; color: var(--text-muted); }
  .empty-state { padding: 50px 24px; text-align: center; color: var(--text-muted); }
  .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
  .empty-title { font-size: 14px; font-weight: 600; color: var(--navy); opacity: 0.5; margin-bottom: 4px; }

  /* TOAST */
  .toast-container { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
  .toast { background: var(--navy); color: #fff; padding: 11px 16px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: var(--shadow); animation: toastIn 0.3s ease; max-width: 300px; border-left: 3px solid var(--accent); }
  .toast.warn{border-left-color:var(--warn)} .toast.error{border-left-color:var(--danger)}
  @keyframes toastIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toastOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(16px)} }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(13,43,78,0.5); z-index: 500; display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
  .modal-overlay.open { display: flex; }
  .modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-lg); width: 90%; max-width: 640px; max-height: 90vh; overflow-y: auto; }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); }
  .modal-body { padding: 20px 24px 24px; }

  @media(max-width:900px){
    main{grid-template-columns:1fr;padding:16px;gap:16px}
    .pipeline-section,.extract-section,.stats-section,.upload-section,.table-section{grid-column:1}
    .stats-grid{grid-template-columns:repeat(3,1fr)}
    header{padding:0 16px}
  }
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-icon">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L3 7V15L11 20L19 15V7L11 2Z" stroke="white" stroke-width="1.5" fill="none"/>
        <path d="M7 11H15M11 7V15" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="logo-text">
      <strong>TRANSMED</strong>
      <span>Invoice AI System — Production</span>
    </div>
  </div>
  <div class="header-right">
    <div class="badge-real">IA RÉELLE — Claude Opus</div>
  </div>
</header>

<main>
  <!-- UPLOAD -->
  <div class="card upload-section">
    <div class="card-header">
      <div class="card-title"><div class="icon" style="background:#E8F6FB">📥</div>Dépôt de Factures</div>
      <div style="display:flex;gap:8px">
        <span class="ai-badge">🤖 Claude AI</span>
        <span style="font-size:11px;color:var(--text-muted)">OCR · Extraction réelle</span>
      </div>
    </div>
    <div class="upload-zone" id="uploadZone">
      <input type="file" id="fileInput" multiple accept=".pdf,.jpg,.jpeg,.png,.xml" onchange="handleFiles(this.files)">
      <div class="upload-icon">📄</div>
      <div class="upload-title">Déposez vos factures — traitement IA réel</div>
      <div class="upload-sub">Claude Opus analyse chaque facture et extrait les données automatiquement</div>
      <div class="format-tags">
        <span class="format-tag">PDF</span>
        <span class="format-tag">JPEG</span>
        <span class="format-tag">PNG</span>
        <span class="format-tag">XML</span>
      </div>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
    <div class="processing-text" id="processingText"></div>
    <div style="height:10px"></div>
  </div>

  <!-- STATS -->
  <div class="card stats-section">
    <div class="card-header">
      <div class="card-title"><div class="icon" style="background:#E8F6FB">📊</div>Tableau de Bord</div>
      <span id="lastUpdate" style="font-size:10px;color:var(--text-muted);font-family:var(--mono)">—</span>
    </div>
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-label">Total</div><div class="stat-value" id="sTotal">—</div><div class="stat-sub">Factures traitées</div></div>
      <div class="stat-item"><div class="stat-label">OCR / IA</div><div class="stat-value" id="sOcr">—</div><div class="stat-sub">Pipeline Claude</div></div>
      <div class="stat-item"><div class="stat-label">Digital Repo</div><div class="stat-value" id="sDoc">—</div><div class="stat-sub">Stockage XML</div></div>
      <div class="stat-item"><div class="stat-label">Doublons</div><div class="stat-value" id="sDup">—</div><div class="stat-sub">SHA-256</div></div>
      <div class="stat-item"><div class="stat-label">Montant Total</div><div class="stat-value" id="sMontant" style="font-size:16px">—</div><div class="stat-sub">MAD (extrait IA)</div></div>
    </div>
  </div>

  <!-- PIPELINE -->
  <div class="card pipeline-section">
    <div class="card-header">
      <div class="card-title"><div class="icon" style="background:#E8F6FB">⚙️</div>Pipeline Temps Réel</div>
    </div>
    <div class="pipeline-steps" id="pipelineSteps">
      <div class="step" id="step-0"><div class="step-dot">01</div><div class="step-info"><div class="step-name">Réception & Validation MIME</div><div class="step-desc">Vérification format · taille · intégrité</div></div><span class="step-status ss-wait" id="ss-0">ATTENTE</span></div>
      <div class="step" id="step-1"><div class="step-dot">02</div><div class="step-info"><div class="step-name">SHA-256 Fingerprint</div><div class="step-desc">Empreinte cryptographique réelle</div></div><span class="step-status ss-wait" id="ss-1">ATTENTE</span></div>
      <div class="step" id="step-2"><div class="step-dot">03</div><div class="step-info"><div class="step-name">Déduplication</div><div class="step-desc">Vérification base de données Vercel KV</div></div><span class="step-status ss-wait" id="ss-2">ATTENTE</span></div>
      <div class="step" id="step-3"><div class="step-dot">04</div><div class="step-info"><div class="step-name">Upload Vercel Blob</div><div class="step-desc">Stockage sécurisé cloud</div></div><span class="step-status ss-wait" id="ss-3">ATTENTE</span></div>
      <div class="step" id="step-4"><div class="step-dot">05</div><div class="step-info"><div class="step-name">Analyse Claude AI (Réel)</div><div class="step-desc">OCR + extraction montants · dates · fournisseurs</div></div><span class="step-status ss-wait" id="ss-4">ATTENTE</span></div>
      <div class="step" id="step-5"><div class="step-dot">06</div><div class="step-info"><div class="step-name">Sauvegarde & Notification</div><div class="step-desc">Vercel KV · Routage documentaire</div></div><span class="step-status ss-wait" id="ss-5">ATTENTE</span></div>
    </div>
  </div>

  <!-- EXTRACTED DATA -->
  <div class="card extract-section">
    <div class="card-header">
      <div class="card-title"><div class="icon" style="background:#E8F6FB">🔍</div>Données Extraites — IA</div>
    </div>
    <div id="extractBody">
      <div class="extract-empty">
        <div style="font-size:32px;margin-bottom:10px;opacity:0.3">🤖</div>
        <div>Traitez une facture pour voir<br>l'extraction IA en temps réel</div>
      </div>
    </div>
  </div>

  <!-- TABLE -->
  <div class="card table-section">
    <div class="card-header">
      <div class="card-title"><div class="icon" style="background:#E8F6FB">📋</div>Factures Traitées</div>
      <div class="table-toolbar">
        <button class="filter-btn active" onclick="setFilter('all',this)">Toutes</button>
        <button class="filter-btn" onclick="setFilter('ocr_ia',this)">OCR / IA</button>
        <button class="filter-btn" onclick="setFilter('digital_repo',this)">Digital Repo</button>
        <button class="refresh-btn" onclick="loadInvoices()">↻ Actualiser</button>
      </div>
    </div>
    <div id="tableContainer">
      <div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Aucune facture</div><div style="font-size:12px;opacity:0.5">Déposez une vraie facture pour commencer</div></div>
    </div>
  </div>
</main>

<!-- MODAL DETAIL -->
<div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
  <div class="modal">
    <div class="modal-header">
      <div class="card-title">📄 Détail Facture</div>
      <button class="modal-close" onclick="document.getElementById('modalOverlay').classList.remove('open')">✕</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<div class="toast-container" id="toastContainer"></div>

<script>
const state = { invoices: [], filter: 'all', processing: false };

// ── PIPELINE STEPS (frontend animation only) ──
const STEP_LABELS = [
  'Validation MIME et format...',
  'Calcul fingerprint SHA-256...',
  'Vérification doublons (Vercel KV)...',
  'Upload sécurisé vers Vercel Blob...',
  'Analyse Claude AI — extraction données...',
  'Sauvegarde BDD et finalisation...'
];

async function animatePipelineUpTo(stepIndex, status = 'active') {
  for (let i = 0; i <= stepIndex; i++) {
    const el = document.getElementById(`step-${i}`);
    const ss = document.getElementById(`ss-${i}`);
    if (i < stepIndex) {
      el.className = 'step done';
      el.querySelector('.step-dot').textContent = '✓';
      ss.className = 'step-status ss-done';
      ss.textContent = 'OK';
    } else {
      el.className = `step ${status === 'active' ? 'active' : status === 'error' ? 'done' : 'done'}`;
      if (status === 'active') {
        ss.className = 'step-status ss-proc'; ss.textContent = 'EN COURS';
      } else if (status === 'error') {
        el.querySelector('.step-dot').textContent = '✕';
        ss.className = 'step-status ss-err'; ss.textContent = 'ERREUR';
      } else {
        el.querySelector('.step-dot').textContent = '✓';
        ss.className = 'step-status ss-done'; ss.textContent = 'OK';
      }
    }
  }
  const pt = document.getElementById('processingText');
  pt.style.display = 'block';
  pt.textContent = '⟳ ' + STEP_LABELS[Math.min(stepIndex, STEP_LABELS.length - 1)];
}

function resetPipeline() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`step-${i}`);
    el.className = 'step';
    el.querySelector('.step-dot').textContent = String(i+1).padStart(2,'0');
    const ss = document.getElementById(`ss-${i}`);
    ss.className = 'step-status ss-wait';
    ss.textContent = 'ATTENTE';
  }
  document.getElementById('processingText').style.display = 'none';
  updateProgress(0);
}

function updateProgress(p) { document.getElementById('progressFill').style.width = p + '%'; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── FILE HANDLING ──
async function handleFiles(files) {
  if (state.processing) return toast('⏳ Traitement en cours...', 'warn');
  for (const f of files) await processFileReal(f);
  document.getElementById('fileInput').value = '';
}

async function processFileReal(file) {
  state.processing = true;
  resetPipeline();

  try {
    // Animate steps 0-3 (client side visual)
    for (let i = 0; i <= 3; i++) {
      animatePipelineUpTo(i, 'active');
      updateProgress((i + 1) * 15);
      await sleep(400);
      if (i < 3) { animatePipelineUpTo(i, 'done'); }
    }

    // Step 4 — AI analysis (real API call)
    animatePipelineUpTo(4, 'active');
    updateProgress(70);
    document.getElementById('processingText').textContent = '🤖 Claude AI analyse votre facture...';

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();

    if (res.status === 409 && data.duplicate) {
      animatePipelineUpTo(2, 'error');
      updateProgress(100);
      document.getElementById('processingText').textContent = '⚠ Doublon détecté — fichier déjà traité';
      toast(`⚠ Doublon: ${file.name}`, 'warn');
      await loadInvoices();
      return;
    }

    if (!res.ok) throw new Error(data.error || 'Erreur API');

    // Step 5 — save
    animatePipelineUpTo(5, 'active');
    updateProgress(90);
    await sleep(300);
    animatePipelineUpTo(5, 'done');
    updateProgress(100);

    document.getElementById('processingText').textContent = '✅ Extraction IA réussie !';

    // Show extracted data
    renderExtracted(data.invoice);
    toast(`✅ Facture traitée — ${data.invoice.extracted?.fournisseur?.nom || file.name}`);

    await loadInvoices();
    await loadStats();

  } catch (err) {
    animatePipelineUpTo(4, 'error');
    document.getElementById('processingText').textContent = '❌ Erreur: ' + err.message;
    toast('❌ ' + err.message, 'error');
  } finally {
    state.processing = false;
    setTimeout(() => {
      document.getElementById('processingText').style.display = 'none';
      updateProgress(0);
    }, 4000);
  }
}

// ── RENDER EXTRACTED DATA ──
function renderExtracted(invoice) {
  const e = invoice.extracted;
  if (!e) return;
  const conf = Math.round((e.confiance || 0) * 100);
  const lines = (e.lignes || []).map(l => `
    <tr><td>${l.description}</td><td>${l.quantite}</td><td>${fmt(l.prix_unitaire)}</td><td>${fmt(l.montant)}</td></tr>
  `).join('');

  document.getElementById('extractBody').innerHTML = `
    <div class="extract-body">
      <div class="extract-grid">
        <div class="extract-field"><div class="extract-label">Fournisseur</div><div class="extract-value">${e.fournisseur?.nom || '—'}</div></div>
        <div class="extract-field"><div class="extract-label">N° Facture</div><div class="extract-value">${e.numero_facture || '—'}</div></div>
        <div class="extract-field"><div class="extract-label">Date Facture</div><div class="extract-value">${e.date_facture || '—'}</div></div>
        <div class="extract-field"><div class="extract-label">Échéance</div><div class="extract-value">${e.date_echeance || '—'}</div></div>
      </div>
      <div class="extract-field">
        <div class="extract-label">Total TTC</div>
        <div class="extract-value amount">${fmt(e.total_ttc)} ${e.devise || 'MAD'}</div>
      </div>
      <div class="extract-grid" style="margin-top:10px">
        <div class="extract-field"><div class="extract-label">Sous-total HT</div><div class="extract-value">${fmt(e.sous_total)} MAD</div></div>
        <div class="extract-field"><div class="extract-label">TVA (${e.tva_taux || '?'}%)</div><div class="extract-value">${fmt(e.tva_montant)} MAD</div></div>
      </div>
      ${e.fournisseur?.adresse ? `<div class="extract-field"><div class="extract-label">Adresse Fournisseur</div><div class="extract-value" style="font-size:12px">${e.fournisseur.adresse}</div></div>` : ''}
      <div class="divider"></div>
      <div class="extract-field">
        <div class="extract-label">Confiance IA — ${conf}%</div>
        <div class="confidence-bar"><div class="confidence-fill" style="width:${conf}%;background:${conf>80?'var(--accent)':conf>50?'var(--warn)':'var(--danger)'}"></div></div>
      </div>
      ${lines ? `
      <div style="margin-top:12px">
        <div class="extract-label" style="margin-bottom:6px">Lignes de Facture</div>
        <table class="lines-table">
          <thead><tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>
          <tbody>${lines}</tbody>
        </table>
      </div>` : ''}
    </div>`;
}

function fmt(n) {
  if (n == null || n === 0) return '—';
  return Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── LOAD INVOICES ──
async function loadInvoices() {
  try {
    const res = await fetch('/api/invoices');
    const data = await res.json();
    state.invoices = data.invoices || [];
    renderTable();
  } catch {}
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('sTotal').textContent = s.total ?? 0;
    document.getElementById('sOcr').textContent = s.ocr_ia ?? 0;
    document.getElementById('sDoc').textContent = s.digital_repo ?? 0;
    document.getElementById('sDup').textContent = s.doublons ?? 0;
    document.getElementById('sMontant').textContent = s.montant_total ? (s.montant_total.toLocaleString('fr-MA') + ' MAD') : '—';
    document.getElementById('lastUpdate').textContent = new Date().toTimeString().slice(0,8);
  } catch {}
}

// ── RENDER TABLE ──
function renderTable() {
  const data = state.filter === 'all' ? state.invoices : state.invoices.filter(i => i.route === state.filter);
  const container = document.getElementById('tableContainer');
  if (!data.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Aucune facture</div></div>`;
    return;
  }
  const rows = data.map((inv, idx) => {
    const ext = inv.filename?.split('.').pop().toLowerCase() || 'pdf';
    const e = inv.extracted || {};
    const route = inv.route === 'ocr_ia' ? `<span class="chip chip-ocr">🤖 OCR / IA</span>` : `<span class="chip chip-doc">🗂 Digital Repo</span>`;
    const status = `<span class="status-dot s-ok">Traité</span>`;
    const amount = e.total_ttc ? `<span class="amount-cell">${Number(e.total_ttc).toLocaleString('fr-MA')} MAD</span>` : '—';
    const time = inv.processedAt ? new Date(inv.processedAt).toLocaleTimeString('fr-FR') : '—';
    return `<tr style="animation-delay:${idx*0.04}s" onclick="showDetail('${inv.id}')">
      <td><div class="file-cell"><div class="file-ext ext-${ext}">${ext.toUpperCase()}</div><div><div class="file-name">${inv.filename}</div><div class="file-size">${(inv.size/1024).toFixed(1)} KB</div></div></div></td>
      <td>${e.fournisseur?.nom || '—'}</td>
      <td>${amount}</td>
      <td>${e.numero_facture || '—'}</td>
      <td>${route}</td>
      <td>${status}</td>
      <td class="time-cell">${time}</td>
    </tr>`;
  }).join('');
  container.innerHTML = `<table><thead><tr><th>Fichier</th><th>Fournisseur</th><th>Montant TTC</th><th>N° Facture</th><th>Route</th><th>Statut</th><th>Heure</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ── DETAIL MODAL ──
async function showDetail(id) {
  try {
    const res = await fetch(`/api/invoice/${id}`);
    const inv = await res.json();
    const e = inv.extracted || {};
    const lines = (e.lignes || []).map(l => `<tr><td>${l.description}</td><td>${l.quantite}</td><td>${fmt(l.prix_unitaire)} MAD</td><td>${fmt(l.montant)} MAD</td></tr>`).join('');
    document.getElementById('modalBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div><div class="extract-label">Fichier</div><div class="extract-value" style="font-size:13px">${inv.filename}</div></div>
        <div><div class="extract-label">ID Système</div><div class="extract-value" style="font-size:12px">${inv.id}</div></div>
        <div><div class="extract-label">Fournisseur</div><div class="extract-value">${e.fournisseur?.nom || '—'}</div></div>
        <div><div class="extract-label">N° Facture</div><div class="extract-value">${e.numero_facture || '—'}</div></div>
        <div><div class="extract-label">Date</div><div class="extract-value">${e.date_facture || '—'}</div></div>
        <div><div class="extract-label">Échéance</div><div class="extract-value">${e.date_echeance || '—'}</div></div>
        <div><div class="extract-label">Total TTC</div><div class="extract-value amount" style="font-size:18px">${fmt(e.total_ttc)} MAD</div></div>
        <div><div class="extract-label">Confiance IA</div><div class="extract-value">${Math.round((e.confiance||0)*100)}%</div></div>
      </div>
      ${e.fournisseur?.adresse ? `<div style="margin-bottom:14px"><div class="extract-label">Adresse</div><div style="font-size:13px;color:var(--text-muted)">${e.fournisseur.adresse}</div></div>` : ''}
      <div class="divider"></div>
      <div style="margin-top:14px">
        <div class="extract-label" style="margin-bottom:8px">Lignes de Facture</div>
        ${lines ? `<table class="lines-table"><thead><tr><th>Description</th><th>Qté</th><th>Prix Unit.</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>` : '<div style="color:var(--text-muted);font-size:13px">Aucune ligne détaillée</div>'}
      </div>
      <div class="divider"></div>
      <div style="margin-top:12px">
        <div class="extract-label">Fingerprint SHA-256</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);word-break:break-all">${inv.fingerprint}</div>
      </div>
      <div style="margin-top:10px">
        <div class="extract-label">Notes IA</div>
        <div style="font-size:12px;color:var(--text-muted)">${e.notes || '—'}</div>
      </div>`;
    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) { toast('Erreur chargement détail', 'error'); }
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) document.getElementById('modalOverlay').classList.remove('open');
}

// ── FILTER ──
function setFilter(f, btn) {
  state.filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

// ── DRAG & DROP ──
const zone = document.getElementById('uploadZone');
zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

// ── TOAST ──
function toast(msg, type = '') {
  const t = Object.assign(document.createElement('div'), { className: `toast ${type}`, textContent: msg });
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ── INIT ──
loadInvoices();
loadStats();
setInterval(() => { loadStats(); }, 30000);
</script>
</body>
</html>
