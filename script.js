const state = {
  locked: false,
  passportNumber: '',
  photoDataUrl: '',
  signatureDataUrl: '',
  signatureRawDataUrl: ''
};

const form = document.getElementById('passportForm');
const previewBtn = document.getElementById('previewBtn');
const generateBtn = document.getElementById('generateBtn');
const editBtn = document.getElementById('editBtn');
const resetBtn = document.getElementById('resetBtn');
const addVaccineBtn = document.getElementById('addVaccineBtn');
const addCommunicableBtn = document.getElementById('addCommunicableBtn');
const addNonCommunicableBtn = document.getElementById('addNonCommunicableBtn');
const vaccineRecords = document.getElementById('vaccineRecords');
const communicableRecords = document.getElementById('communicableRecords');
const nonCommunicableRecords = document.getElementById('nonCommunicableRecords');
const expiryBadge = document.getElementById('expiryBadge');
const qrContainerPageOne = document.getElementById('qrCodePageOne');
const qrContainerPageTwo = document.getElementById('qrCodePageTwo');
const signatureContrast = document.getElementById('signatureContrast');
const applySignatureContrastBtn = document.getElementById('applySignatureContrast');

const communicableDefaults = [
  { name: 'HIV', type: 'ELISA/rapid antibody', result: 'Negative' },
  { name: 'Hepatitis B', type: 'HBsAg serology', result: 'Negative' },
  { name: 'Hepatitis C', type: 'Anti-HCV antibody', result: 'Negative' },
  { name: 'Chest X-Ray', type: 'Radiographic screening', result: 'Negative' },
  { name: 'IGRA', type: 'Interferon-gamma release assay', result: 'Negative' },
  { name: 'Syphilis', type: 'VDRL/RPR + confirmatory', result: 'Negative' },
  { name: 'Gonorrhea', type: 'NAAT', result: 'Negative' },
  { name: 'Chlamydia', type: 'NAAT', result: 'Negative' },
  { name: 'Pap Smear', type: 'Cervical cytology', result: 'Not Done' }
];

const nonCommunicableDefaults = [
  { name: 'RBS', type: 'Random blood sugar', result: 'Normal' },
  { name: 'HbA1c', type: 'Glycated hemoglobin', result: 'Normal' },
  { name: 'Lipid Profile', type: 'Serum lipid panel', result: 'Normal' },
  { name: 'Renal Function', type: 'Creatinine/eGFR panel', result: 'Normal' },
  { name: 'Liver Function', type: 'Liver enzyme panel', result: 'Normal' },
  { name: 'Tumor Markers', type: 'Marker immunoassay', result: 'Not Done' }
];

const vaccineDefaults = ['COVID-19', 'Yellow Fever', 'Hepatitis B', 'Tetanus', 'Polio', 'MMR', 'Influenza', 'Varicella', 'HPV', 'Pneumococcal'];

const fieldMap = {
  identity: [
    ['Full Name', 'fullName'], ['National ID / Passport No', 'idNumber'], ['Date of Birth', 'dob'], ['Gender', 'gender'], ['Nationality', 'nationality'], ['Address', 'address'], ['Phone Number', 'phone']
  ],
  history: [['Past Medical History', 'history'], ['Known Allergies', 'allergies'], ['Blood Group', 'bloodGroup'], ['Current Medications', 'medications']],
  physical: [['Blood Pressure', 'bp'], ['Heart Rate', 'hr'], ['Respiratory Rate', 'rr'], ['Temperature', 'temp'], ['Weight (kg)', 'weight'], ['Height (cm)', 'height'], ['BMI', 'bmi'], ['Visual Acuity Mode', 'visionMode'], ['Visual Acuity Right', 'visionRight'], ['Visual Acuity Left', 'visionLeft'], ['Hearing Test', 'hearing'], ['Mental Health Evaluation', 'mental'], ['Physical Examination Findings', 'physicalFindings'], ['Remarks', 'remarks']],
  physician: [['Physician', 'physicianName'], ['License No', 'license'], ['Institution', 'institution'], ['Address', 'institutionAddress'], ['Institution Phone', 'institutionPhone']]
};

function generatePassportNumber() {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `HMP-ET-${year}-${random}`;
}

function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function createSummaryRows(entries, targetId) {
  const container = document.getElementById(targetId);
  container.innerHTML = '';
  entries.forEach(([label, value]) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<dt>${label}:</dt><dd>${value ? ` ${value}` : ' N/A'}</dd>`;
    container.appendChild(wrapper);
  });
}

function getFormData() {
  const data = new FormData(form);
  const payload = {};
  data.forEach((value, key) => {
    if (payload[key]) {
      payload[key] = Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value];
    } else {
      payload[key] = value;
    }
  });
  payload.purpose = [...form.querySelectorAll('input[name="purpose"]:checked')].map((item) => item.value);
  payload.clearance = form.querySelector('input[name="clearance"]:checked')?.value || 'N/A';
  return payload;
}

function normalizeArray(value) { return !value ? [] : (Array.isArray(value) ? value : [value]); }
function calculateBmi(weight, heightCm) { const w = Number(weight); const h = Number(heightCm) / 100; if (!w || !h) return ''; return (w / (h * h)).toFixed(1); }

function getInvestigationRows(container) {
  return [...container.querySelectorAll('.investigation-row')].map((row) => {
    const name = row.querySelector('input[name$="Name"]')?.value || '';
    const type = row.querySelector('input[name$="Type"]')?.value || '';
    const result = row.querySelector('select[name$="Result"]')?.value || 'N/A';
    const date = row.querySelector('input[name$="Date"]')?.value || '';
    return { name, type, result, date };
  }).filter((row) => row.name.trim());
}

function investigationEntries(rows) {
  if (!rows.length) {
    return [['No tests listed', 'N/A']];
  }

  return rows.map((row) => {
    const status = row.result === 'Not Done' ? 'Not Done' : 'Done';
    return [
      row.name,
      `Type: ${row.type || 'N/A'} | Result: ${row.result} | Date: ${formatDate(row.date)} | Status: ${status}`
    ];
  });
}

async function removeSignatureBackground(dataUrl, threshold) {
  if (!dataUrl) return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const imageData = cx.getImageData(0, 0, c.width, c.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const brightness = (r + g + b) / 3;
        if (brightness >= threshold) {
          data[i + 3] = 0;
        } else {
          const boost = Math.max(0, 255 - brightness);
          data[i] = Math.max(0, r - boost * 0.2);
          data[i + 1] = Math.max(0, g - boost * 0.2);
          data[i + 2] = Math.max(0, b - boost * 0.2);
          data[i + 3] = 255;
        }
      }
      cx.putImageData(imageData, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

async function applySignatureContrastFix(rawDataUrl = state.signatureRawDataUrl) {
  const signaturePreview = document.getElementById('signaturePreview');
  const status = document.getElementById('signatureUploadStatus');
  if (!rawDataUrl) {
    state.signatureDataUrl = '';
    state.signatureRawDataUrl = '';
    signaturePreview.textContent = 'Signature';
    status.textContent = 'No signature image selected.';
    return;
  }

  const cleaned = await removeSignatureBackground(rawDataUrl, Number(signatureContrast.value || 190));
  state.signatureDataUrl = cleaned;
  signaturePreview.innerHTML = `<img src="${cleaned}" alt="Signature"/>`;
  status.innerHTML = `<img src="${cleaned}" alt="Signature Upload Status"/>`;
}

function getVaccineRows(payload) {
  const names = normalizeArray(payload.vaccineName);
  const doses = normalizeArray(payload.vaccineDose);
  const brands = normalizeArray(payload.vaccineBrand);
  const dates = normalizeArray(payload.vaccineDate);
  const rows = [];
  const count = Math.max(names.length, doses.length, brands.length, dates.length);
  for (let i = 0; i < count; i += 1) {
    const [name, dose, brand, date] = [names[i] || '', doses[i] || '', brands[i] || '', dates[i] || ''];
    if (!name && !dose && !brand && !date) continue;
    rows.push({ name: name || 'Unnamed Vaccine', dose: dose || 'N/A', brand: brand || 'N/A', date: formatDate(date) });
  }
  return rows;
}

function renderVaccinePreview(payload) {
  const rows = getVaccineRows(payload);
  const entries = rows.length ? rows.map((row) => [row.name, `Dose: ${row.dose} | Brand: ${row.brand} | Date: ${row.date}`]) : [['No vaccine records', 'N/A']];
  createSummaryRows(entries, 'vaccinePreview');
}

function updateQRCode(passportNumber) {
  const link = `https://habaridoc.com/verify/${passportNumber}`;
  [qrContainerPageOne, qrContainerPageTwo].forEach((container) => {
    container.innerHTML = '';
    new QRCode(container, { text: link, width: 72, height: 72, colorDark: '#2c2c2c', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  });
}

function validateConditionalRules(payload) {
  const restrictionCondition = payload.clearance !== 'Clearance with Restrictions' || Boolean(payload.restrictionRemarks?.trim());
  if (!restrictionCondition) return 'Restriction remarks are required for clearance with restrictions.';
  if (!payload.issueDate || !payload.validUntil) return 'Date Issued and Valid Until are required.';
  return '';
}

function updateExpiryBadge(validUntil) {
  const expiry = new Date(validUntil); const now = new Date(); const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(expiry.getTime())) { expiryBadge.className = 'badge hidden'; expiryBadge.textContent = ''; return; }
  if (diffDays < 0) { expiryBadge.textContent = 'EXPIRED'; expiryBadge.className = 'badge expired'; }
  else if (diffDays <= 30) { expiryBadge.textContent = 'EXPIRING SOON'; expiryBadge.className = 'badge warning'; }
  else { expiryBadge.textContent = ''; expiryBadge.className = 'badge hidden'; }
}

function updatePreview() {
  const payload = getFormData();
  const bmi = calculateBmi(payload.weight, payload.height);
  form.elements.bmi.value = bmi;
  payload.bmi = bmi;

  document.getElementById('previewPassportNumber').textContent = `Passport No: ${state.passportNumber}`;
  createSummaryRows(fieldMap.identity.map(([label, key]) => [label, key === 'dob' ? formatDate(payload[key]) : payload[key]]), 'identityList');

  const purposePreview = document.getElementById('purposePreview');
  purposePreview.innerHTML = '';
  (payload.purpose.length ? payload.purpose : ['No purpose selected']).forEach((purpose) => {
    const li = document.createElement('li'); li.textContent = purpose; purposePreview.appendChild(li);
  });

  createSummaryRows(fieldMap.history.map(([label, key]) => [label, payload[key]]), 'historyPreview');
  const communicableRows = getInvestigationRows(communicableRecords);
  createSummaryRows(investigationEntries(communicableRows), 'communicablePreview');
  createSummaryRows([], 'communicableExtraPreview');
  renderVaccinePreview(payload);
  const nonCommunicableRows = getInvestigationRows(nonCommunicableRecords);
  createSummaryRows(investigationEntries(nonCommunicableRows), 'nonCommunicablePreview');
  createSummaryRows([], 'nonCommunicableExtraPreview');
  createSummaryRows(fieldMap.physical.map(([label, key]) => [label, payload[key]]), 'physicalPreview');
  createSummaryRows(fieldMap.physician.map(([label, key]) => [label, payload[key]]), 'physicianPreview');

  const clearanceText = [
    `Clearance Decision: ${payload.clearance}`,
    payload.clearance === 'Clearance with Restrictions' ? `Restrictions: ${payload.restrictionRemarks || 'Pending details.'}` : ''
  ].filter(Boolean).join(' ');

  document.getElementById('clearancePreview').textContent = clearanceText;
  document.getElementById('fitnessDeclarationPreview').textContent = 'This document certifies that the holder has completed the required health screening modules.';
  const testDate = communicableRows.find((row) => row.date)?.date || nonCommunicableRows.find((row) => row.date)?.date;
  document.getElementById('screeningDatePreview').textContent = `Date of Test Done: ${formatDate(testDate)}`;
  document.getElementById('issueDatePreview').textContent = `Date Issued: ${formatDate(payload.issueDate)}`;
  document.getElementById('expiryDatePreview').textContent = `Valid Until: ${formatDate(payload.validUntil)}`;

  updateExpiryBadge(payload.validUntil);
  updateQRCode(state.passportNumber);
}

function createInvestigationRow(container, prefix, defaults = {}, resultOptions = ['Negative', 'Positive', 'Not Done']) {
  const row = document.createElement('div');
  row.className = 'vaccine-row investigation-row';
  row.innerHTML = `<label>Test Name <input type="text" name="${prefix}Name" value="${defaults.name || ''}" placeholder="Enter test" /></label><label>Type of Test <input type="text" name="${prefix}Type" value="${defaults.type || ''}" placeholder="ELISA / NAAT / etc" /></label><label>Result <select name="${prefix}Result">${resultOptions.map((v) => `<option ${defaults.result === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Date Test Done <input type="date" name="${prefix}Date" value="${defaults.date || ''}" /></label><button type="button" class="remove-test-btn">Remove</button>`;
  row.querySelector('.remove-test-btn').addEventListener('click', () => { row.remove(); updatePreview(); });
  row.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', updatePreview));
  container.appendChild(row);
}

function createVaccineRow(defaults = {}) {
  const row = document.createElement('div');
  row.className = 'vaccine-row';
  const options = vaccineDefaults.map((v) => `<option ${defaults.name === v ? 'selected' : ''}>${v}</option>`).join('');
  row.innerHTML = `<label>Vaccine<select name="vaccineNameSelect" class="vaccine-name-select">${options}<option ${defaults.name === 'Other' ? 'selected' : ''}>Other</option></select><input type="text" name="vaccineName" class="vaccine-name-custom" placeholder="Custom vaccine name" value="${defaults.name && !vaccineDefaults.includes(defaults.name) ? defaults.name : ''}" ${defaults.name && !vaccineDefaults.includes(defaults.name) ? '' : 'style="display:none"'} /></label><label>Dose <input type="text" name="vaccineDose" value="${defaults.dose || ''}" placeholder="e.g. 2/2" /></label><label>Brand (optional) <input type="text" name="vaccineBrand" value="${defaults.brand || ''}" placeholder="Pfizer" /></label><label>Date Given <input type="date" name="vaccineDate" value="${defaults.date || ''}" /></label><button type="button" class="remove-vaccine-btn">Remove</button>`;
  const select = row.querySelector('.vaccine-name-select');
  const custom = row.querySelector('.vaccine-name-custom');
  const hiddenInput = row.querySelector('input[name="vaccineName"]');
  function syncName() { if (select.value === 'Other') { custom.style.display = 'block'; } else { custom.style.display = 'none'; custom.value = ''; } hiddenInput.value = select.value === 'Other' ? custom.value : select.value; updatePreview(); }
  select.addEventListener('change', syncName);
  custom.addEventListener('input', () => { hiddenInput.value = custom.value; updatePreview(); });
  hiddenInput.value = select.value === 'Other' ? custom.value : select.value;
  row.querySelector('.remove-vaccine-btn').addEventListener('click', () => { row.remove(); if (!vaccineRecords.children.length) createVaccineRow({ name: 'COVID-19', dose: '1' }); updatePreview(); });
  vaccineRecords.appendChild(row);
}

function setupCanvasCropper({
  inputName, canvasId, cropBoxId, zoomId, applyButtonId, resetButtonId, aspectRatio, onApply
}) {
  const input = form.elements[inputName];
  const canvas = document.getElementById(canvasId);
  const cropBox = document.getElementById(cropBoxId);
  const zoom = document.getElementById(zoomId);
  const applyButton = document.getElementById(applyButtonId);
  const resetButton = document.getElementById(resetButtonId);
  const ctx = canvas.getContext('2d');

  const cropState = { image: null, scale: 1, offsetX: 0, offsetY: 0, dragging: false, dragX: 0, dragY: 0, drawW: 0, drawH: 0 };

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!cropState.image) return;
    const baseScale = Math.max(canvas.width / cropState.image.width, canvas.height / cropState.image.height);
    cropState.drawW = cropState.image.width * baseScale * cropState.scale;
    cropState.drawH = cropState.image.height * baseScale * cropState.scale;
    const minX = canvas.width - cropState.drawW;
    const minY = canvas.height - cropState.drawH;
    cropState.offsetX = Math.min(0, Math.max(minX, cropState.offsetX));
    cropState.offsetY = Math.min(0, Math.max(minY, cropState.offsetY));
    ctx.drawImage(cropState.image, cropState.offsetX, cropState.offsetY, cropState.drawW, cropState.drawH);
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }

  function applyCrop() {
    if (!cropState.image) return;
    const out = document.createElement('canvas');
    out.width = 1200;
    out.height = Math.round(1200 / aspectRatio);
    const octx = out.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(
      cropState.image,
      (-cropState.offsetX / cropState.drawW) * cropState.image.width,
      (-cropState.offsetY / cropState.drawH) * cropState.image.height,
      (canvas.width / cropState.drawW) * cropState.image.width,
      (canvas.height / cropState.drawH) * cropState.image.height,
      0,
      0,
      out.width,
      out.height
    );
    onApply(out.toDataURL('image/png'));
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        cropState.image = img;
        cropState.scale = 1;
        zoom.value = '1';
        const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
        cropState.offsetX = (canvas.width - img.width * baseScale) / 2;
        cropState.offsetY = (canvas.height - img.height * baseScale) / 2;
        cropBox.classList.remove('hidden');
        draw();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  zoom.addEventListener('input', () => {
    if (!cropState.image) return;
    const oldScale = cropState.scale;
    cropState.scale = Number(zoom.value);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const ratio = cropState.scale / oldScale;
    cropState.offsetX = cx - (cx - cropState.offsetX) * ratio;
    cropState.offsetY = cy - (cy - cropState.offsetY) * ratio;
    draw();
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!cropState.image) return;
    const rect = canvas.getBoundingClientRect();
    cropState.dragging = true;
    cropState.dragX = e.clientX - rect.left - cropState.offsetX;
    cropState.dragY = e.clientY - rect.top - cropState.offsetY;
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!cropState.dragging || !cropState.image) return;
    const rect = canvas.getBoundingClientRect();
    cropState.offsetX = e.clientX - rect.left - cropState.dragX;
    cropState.offsetY = e.clientY - rect.top - cropState.dragY;
    draw();
  });
  ['mouseup', 'mouseleave'].forEach((ev) => canvas.addEventListener(ev, () => { cropState.dragging = false; }));
  canvas.addEventListener('wheel', (e) => {
    if (!cropState.image) return;
    e.preventDefault();
    const min = Number(zoom.min);
    const max = Number(zoom.max);
    const next = Math.min(max, Math.max(min, cropState.scale + (e.deltaY > 0 ? -0.05 : 0.05)));
    zoom.value = String(next);
    zoom.dispatchEvent(new Event('input'));
  });

  applyButton.addEventListener('click', () => { applyCrop(); updatePreview(); });
  resetButton.addEventListener('click', () => {
    input.value = '';
    cropBox.classList.add('hidden');
    cropState.image = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onApply('');
    updatePreview();
  });
}

async function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const target = document.getElementById('passportSpread');
  const canvas = await html2canvas(target, { scale: 2.5, useCORS: true, backgroundColor: null });
  const imgData = canvas.toDataURL('image/png');

  // Match PDF page to rendered passport dimensions so it fills the viewer window,
  // without extra white paper margins/background.
  const outputScale = 0.88;
  const pdfWidth = Math.round(canvas.width * outputScale);
  const pdfHeight = Math.round(canvas.height * outputScale);
  const pdf = new jsPDF({
    orientation: pdfWidth >= pdfHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pdfWidth, pdfHeight]
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  const name = form.elements.fullName.value.trim().replace(/\s+/g, '_') || 'Unnamed';
  pdf.save(`Habari_Medical_Passport_${name}.pdf`);
}

function toggleLock(lock) {
  state.locked = lock;
  [...form.elements].forEach((field) => {
    if (!(field instanceof HTMLButtonElement) && field.name !== 'photo' && field.name !== 'signature') field.disabled = lock;
  });
  previewBtn.disabled = lock;
  generateBtn.disabled = lock;
  editBtn.disabled = !lock;
  addVaccineBtn.disabled = lock;
  addCommunicableBtn.disabled = lock;
  addNonCommunicableBtn.disabled = lock;
  [...document.querySelectorAll('.remove-vaccine-btn,.remove-test-btn')].forEach((btn) => { btn.disabled = lock; });
}

function setupEventListeners() {
  form.addEventListener('input', updatePreview);

  addVaccineBtn.addEventListener('click', () => createVaccineRow());
  addCommunicableBtn.addEventListener('click', () => createInvestigationRow(communicableRecords, 'comm', {}, ['Negative', 'Positive', 'Not Done']));
  addNonCommunicableBtn.addEventListener('click', () => createInvestigationRow(nonCommunicableRecords, 'nonComm', {}, ['Normal', 'Abnormal', 'Controlled', 'Not Done']));

  previewBtn.addEventListener('click', () => {
    updatePreview();
    document.getElementById('passportSpread').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  generateBtn.addEventListener('click', async () => {
    const payload = getFormData();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const conditionalError = validateConditionalRules(payload);
    if (conditionalError) { alert(conditionalError); return; }
    updatePreview();
    await downloadPdf();
    toggleLock(true);
  });

  editBtn.addEventListener('click', () => {
    toggleLock(false);
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    vaccineRecords.innerHTML = '';
    communicableRecords.innerHTML = '';
    nonCommunicableRecords.innerHTML = '';
    ['COVID-19', 'Hepatitis B', 'Tetanus', 'Polio', 'MMR'].forEach((v) => createVaccineRow({ name: v, dose: '1' }));
    state.passportNumber = generatePassportNumber();
    state.photoDataUrl = '';
    state.signatureDataUrl = '';
    state.signatureRawDataUrl = '';
    document.getElementById('photoPreview').removeAttribute('src');
    document.getElementById('signaturePreview').textContent = 'Signature';
    document.getElementById('signatureUploadStatus').textContent = 'No signature image selected.';
    document.getElementById('photoCropBox').classList.add('hidden');
    document.getElementById('signatureCropBox').classList.add('hidden');
    communicableDefaults.forEach((item) => createInvestigationRow(communicableRecords, 'comm', item, ['Negative', 'Positive', 'Not Done']));
    nonCommunicableDefaults.forEach((item) => createInvestigationRow(nonCommunicableRecords, 'nonComm', item, ['Normal', 'Abnormal', 'Controlled', 'Not Done']));
    toggleLock(false);
    updatePreview();
  });
}

function init() {
  state.passportNumber = generatePassportNumber();
  ['COVID-19', 'Hepatitis B', 'Tetanus', 'Polio', 'MMR'].forEach((v) => createVaccineRow({ name: v, dose: '1' }));
  communicableDefaults.forEach((item) => createInvestigationRow(communicableRecords, 'comm', item, ['Negative', 'Positive', 'Not Done']));
  nonCommunicableDefaults.forEach((item) => createInvestigationRow(nonCommunicableRecords, 'nonComm', item, ['Normal', 'Abnormal', 'Controlled', 'Not Done']));

  setupCanvasCropper({
    inputName: 'photo',
    canvasId: 'photoCropCanvas',
    cropBoxId: 'photoCropBox',
    zoomId: 'photoZoomCanvas',
    applyButtonId: 'applyPhotoCrop',
    resetButtonId: 'resetPhotoCrop',
    aspectRatio: 118 / 145,
    onApply: (dataUrl) => {
      state.photoDataUrl = dataUrl;
      const photo = document.getElementById('photoPreview');
      if (dataUrl) photo.src = dataUrl;
      else photo.removeAttribute('src');
    }
  });

  setupCanvasCropper({
    inputName: 'signature',
    canvasId: 'signatureCropCanvas',
    cropBoxId: 'signatureCropBox',
    zoomId: 'signatureZoomCanvas',
    applyButtonId: 'applySignatureCrop',
    resetButtonId: 'resetSignatureCrop',
    aspectRatio: 460 / 170,
    onApply: async (dataUrl) => {
      state.signatureRawDataUrl = dataUrl;
      await applySignatureContrastFix(dataUrl);
    }
  });

  applySignatureContrastBtn.addEventListener('click', async () => {
    await applySignatureContrastFix(state.signatureRawDataUrl);
    updatePreview();
  });

  signatureContrast.addEventListener('input', async () => {
    if (!state.signatureRawDataUrl) return;
    await applySignatureContrastFix(state.signatureRawDataUrl);
    updatePreview();
  });

  editBtn.disabled = true;
  setupEventListeners();
  updatePreview();
}

init();
