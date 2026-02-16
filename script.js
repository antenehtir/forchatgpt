const state = {
  locked: false,
  passportNumber: '',
  photoDataUrl: '',
  signatureDataUrl: ''
};

const form = document.getElementById('passportForm');
const previewBtn = document.getElementById('previewBtn');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const addVaccineBtn = document.getElementById('addVaccineBtn');
const addCommunicableBtn = document.getElementById('addCommunicableBtn');
const addNonCommunicableBtn = document.getElementById('addNonCommunicableBtn');
const vaccineRecords = document.getElementById('vaccineRecords');
const communicableExtra = document.getElementById('communicableExtra');
const nonCommunicableExtra = document.getElementById('nonCommunicableExtra');
const expiryBadge = document.getElementById('expiryBadge');
const qrContainerPageOne = document.getElementById('qrCodePageOne');
const qrContainerPageTwo = document.getElementById('qrCodePageTwo');

const vaccineDefaults = [
  'COVID-19', 'Yellow Fever', 'Hepatitis B', 'Tetanus', 'Polio', 'MMR', 'Influenza', 'Varicella', 'HPV', 'Pneumococcal'
];

const fieldMap = {
  identity: [
    ['Full Name', 'fullName'],
    ['National ID / Passport No', 'idNumber'],
    ['Date of Birth', 'dob'],
    ['Gender', 'gender'],
    ['Nationality', 'nationality'],
    ['Address', 'address'],
    ['Phone Number', 'phone']
  ],
  history: [
    ['Past Medical History', 'history'],
    ['Known Allergies', 'allergies'],
    ['Blood Group', 'bloodGroup'],
    ['Current Medications', 'medications']
  ],
  communicable: [
    ['HIV', 'hiv'],
    ['Hepatitis B', 'hepB'],
    ['Hepatitis C', 'hepC'],
    ['TB Screening', 'tbScreening'],
    ['Chest X-Ray', 'chestXray'],
    ['IGRA', 'igra'],
    ['Syphilis', 'syphilis'],
    ['Gonorrhea', 'gonorrhea'],
    ['Chlamydia', 'chlamydia'],
    ['Pap Smear', 'papSmear']
  ],
  nonCommunicable: [
    ['RBS', 'rbs'],
    ['HbA1c', 'hba1c'],
    ['Lipid Profile', 'lipid'],
    ['Renal Function', 'renal'],
    ['Liver Function', 'liver'],
    ['Tumor Markers', 'tumor']
  ],
  physical: [
    ['Blood Pressure', 'bp'],
    ['Heart Rate', 'hr'],
    ['Respiratory Rate', 'rr'],
    ['Temperature', 'temp'],
    ['Weight (kg)', 'weight'],
    ['Height (cm)', 'height'],
    ['BMI', 'bmi'],
    ['Visual Acuity Mode', 'visionMode'],
    ['Visual Acuity Right', 'visionRight'],
    ['Visual Acuity Left', 'visionLeft'],
    ['Hearing Test', 'hearing'],
    ['Mental Health Evaluation', 'mental']
  ],
  physician: [
    ['Physician', 'physicianName'],
    ['License No', 'license'],
    ['Institution', 'institution'],
    ['Address', 'institutionAddress'],
    ['Institution Phone', 'institutionPhone']
  ]
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

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function calculateBmi(weight, heightCm) {
  const w = Number(weight);
  const h = Number(heightCm) / 100;
  if (!w || !h) return '';
  const bmi = w / (h * h);
  return bmi.toFixed(1);
}

function parseAdditionalTests(payload, nameKey, resultKey) {
  const names = normalizeArray(payload[nameKey]);
  const results = normalizeArray(payload[resultKey]);
  return names
    .map((name, idx) => [name, results[idx] || 'N/A'])
    .filter(([name]) => Boolean(name && String(name).trim()));
}

function getVaccineRows(payload) {
  const names = normalizeArray(payload.vaccineName);
  const doses = normalizeArray(payload.vaccineDose);
  const brands = normalizeArray(payload.vaccineBrand);
  const dates = normalizeArray(payload.vaccineDate);
  const rows = [];
  const count = Math.max(names.length, doses.length, brands.length, dates.length);
  for (let i = 0; i < count; i += 1) {
    const name = names[i] || '';
    const dose = doses[i] || '';
    const brand = brands[i] || '';
    const date = dates[i] || '';
    if (!name && !dose && !brand && !date) continue;
    rows.push({ name: name || 'Unnamed Vaccine', dose: dose || 'N/A', brand: brand || 'N/A', date: formatDate(date) });
  }
  return rows;
}

function renderVaccinePreview(payload) {
  const rows = getVaccineRows(payload);
  const entries = rows.length
    ? rows.map((row) => [row.name, `Dose: ${row.dose} | Brand: ${row.brand} | Date: ${row.date}`])
    : [['No vaccine records', 'N/A']];
  createSummaryRows(entries, 'vaccinePreview');
}

function updateQRCode(passportNumber) {
  const link = `https://habaridoc.com/verify/${passportNumber}`;
  [qrContainerPageOne, qrContainerPageTwo].forEach((container) => {
    container.innerHTML = '';
    new QRCode(container, {
      text: link,
      width: 72,
      height: 72,
      colorDark: '#2c2c2c',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  });
}

function validateConditionalRules(payload) {
  const tbCondition = payload.tbScreening !== 'Negative' || Boolean(payload.tbDate);
  const restrictionCondition = payload.clearance !== 'Clearance with Restrictions' || Boolean(payload.restrictionRemarks?.trim());
  if (!tbCondition) return 'TB Test Date is required when TB Screening is Negative.';
  if (!restrictionCondition) return 'Restriction remarks are required for clearance with restrictions.';
  if (!payload.issueDate || !payload.validUntil) return 'Date Issued and Valid Until are required.';
  return '';
}

function updateExpiryBadge(validUntil) {
  const expiry = new Date(validUntil);
  const now = new Date();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(expiry.getTime())) {
    expiryBadge.className = 'badge hidden';
    expiryBadge.textContent = '';
    return;
  }
  if (diffDays < 0) {
    expiryBadge.textContent = 'EXPIRED';
    expiryBadge.className = 'badge expired';
  } else if (diffDays <= 30) {
    expiryBadge.textContent = 'EXPIRING SOON';
    expiryBadge.className = 'badge warning';
  } else {
    expiryBadge.textContent = '';
    expiryBadge.className = 'badge hidden';
  }
}

function applyImageCropStyles() {
  const photo = document.getElementById('photoPreview');
  const signatureImg = document.querySelector('#signaturePreview img');
  const pz = Number(form.elements.photoZoom.value || 1);
  const px = Number(form.elements.photoX.value || 0);
  const py = Number(form.elements.photoY.value || 0);
  photo.style.transform = `translate(${px}px, ${py}px) scale(${pz})`;
  photo.style.transformOrigin = 'center';

  if (signatureImg) {
    const sz = Number(form.elements.signatureZoom.value || 1);
    const sx = Number(form.elements.signatureX.value || 0);
    const sy = Number(form.elements.signatureY.value || 0);
    signatureImg.style.transform = `translate(${sx}px, ${sy}px) scale(${sz})`;
    signatureImg.style.transformOrigin = 'center';
  }
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
    const li = document.createElement('li');
    li.textContent = purpose;
    purposePreview.appendChild(li);
  });

  createSummaryRows(fieldMap.history.map(([label, key]) => [label, payload[key]]), 'historyPreview');
  createSummaryRows(fieldMap.communicable.map(([label, key]) => [label, payload[key]]), 'communicablePreview');
  createSummaryRows(parseAdditionalTests(payload, 'extraCommName', 'extraCommResult'), 'communicableExtraPreview');
  renderVaccinePreview(payload);
  createSummaryRows(fieldMap.nonCommunicable.map(([label, key]) => [label, payload[key]]), 'nonCommunicablePreview');
  createSummaryRows(parseAdditionalTests(payload, 'extraNonCommName', 'extraNonCommResult'), 'nonCommunicableExtraPreview');
  createSummaryRows(fieldMap.physical.map(([label, key]) => [label, payload[key]]), 'physicalPreview');
  createSummaryRows(fieldMap.physician.map(([label, key]) => [label, payload[key]]), 'physicianPreview');

  const clearanceText = [
    `Clearance Decision: ${payload.clearance}`,
    payload.clearance === 'Clearance with Restrictions' ? `Restrictions: ${payload.restrictionRemarks || 'Pending details.'}` : ''
  ].filter(Boolean).join(' ');

  document.getElementById('clearancePreview').textContent = clearanceText;
  document.getElementById('fitnessDeclarationPreview').textContent = 'This document certifies that the holder has completed the required health screening modules.';

  const testDate = payload.screeningDate || payload.tbDate;
  document.getElementById('screeningDatePreview').textContent = `Date of Test Done: ${formatDate(testDate)}`;

  document.getElementById('issueDatePreview').textContent = `Date Issued: ${formatDate(payload.issueDate)}`;
  document.getElementById('expiryDatePreview').textContent = `Valid Until: ${formatDate(payload.validUntil)}`;

  updateExpiryBadge(payload.validUntil);
  updateQRCode(state.passportNumber);
  applyImageCropStyles();
}

function handleImageUpload(inputName, callback) {
  const file = form.elements[inputName]?.files?.[0];
  if (!file) {
    callback('');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function syncImagePreviews() {
  handleImageUpload('photo', (dataUrl) => {
    state.photoDataUrl = dataUrl;
    document.getElementById('photoPreview').src = dataUrl || '';
    applyImageCropStyles();
  });

  handleImageUpload('signature', (dataUrl) => {
    state.signatureDataUrl = dataUrl;
    const signaturePreview = document.getElementById('signaturePreview');
    const status = document.getElementById('signatureUploadStatus');
    if (dataUrl) {
      signaturePreview.innerHTML = `<img src="${dataUrl}" alt="Signature"/>`;
      status.innerHTML = `<img src="${dataUrl}" alt="Signature Upload Status"/>`;
      applyImageCropStyles();
    } else {
      signaturePreview.textContent = form.elements.signatureText.value || 'Signature';
      status.textContent = 'No signature image selected.';
    }
  });

  if (!form.elements.signature.files?.length) {
    document.getElementById('signaturePreview').textContent = form.elements.signatureText.value || 'Signature';
    document.getElementById('signatureUploadStatus').textContent = 'No signature image selected.';
  }
}

function createAdditionalTestRow(container, prefix, resultOptions) {
  const row = document.createElement('div');
  row.className = 'vaccine-row';
  row.innerHTML = `
    <label>Test Name <input type="text" name="${prefix}Name" placeholder="Enter test" /></label>
    <label>Result <select name="${prefix}Result">${resultOptions.map((v) => `<option>${v}</option>`).join('')}</select></label>
    <div></div><div></div>
    <button type="button" class="remove-test-btn">Remove</button>
  `;
  row.querySelector('.remove-test-btn').addEventListener('click', () => {
    row.remove();
    updatePreview();
  });
  container.appendChild(row);
}

function createVaccineRow(defaults = {}) {
  const row = document.createElement('div');
  row.className = 'vaccine-row';
  const options = vaccineDefaults.map((v) => `<option ${defaults.name === v ? 'selected' : ''}>${v}</option>`).join('');
  row.innerHTML = `
    <label>Vaccine
      <select name="vaccineNameSelect" class="vaccine-name-select">${options}<option ${defaults.name === 'Other' ? 'selected' : ''}>Other</option></select>
      <input type="text" name="vaccineName" class="vaccine-name-custom" placeholder="Custom vaccine name" value="${defaults.name && !vaccineDefaults.includes(defaults.name) ? defaults.name : ''}" ${defaults.name && !vaccineDefaults.includes(defaults.name) ? '' : 'style="display:none"'} />
    </label>
    <label>Dose <input type="text" name="vaccineDose" value="${defaults.dose || ''}" placeholder="e.g. 2/2" /></label>
    <label>Brand (optional) <input type="text" name="vaccineBrand" value="${defaults.brand || ''}" placeholder="Pfizer" /></label>
    <label>Date Given <input type="date" name="vaccineDate" value="${defaults.date || ''}" /></label>
    <button type="button" class="remove-vaccine-btn">Remove</button>
  `;

  const select = row.querySelector('.vaccine-name-select');
  const custom = row.querySelector('.vaccine-name-custom');
  function syncName() {
    if (select.value === 'Other') {
      custom.style.display = 'block';
    } else {
      custom.style.display = 'none';
      custom.value = '';
    }
    row.querySelector('input[name="vaccineName"]').value = select.value === 'Other' ? custom.value : select.value;
    updatePreview();
  }
  select.addEventListener('change', syncName);
  custom.addEventListener('input', () => {
    row.querySelector('input[name="vaccineName"]').value = custom.value;
    updatePreview();
  });
  row.querySelector('input[name="vaccineName"]').value = select.value === 'Other' ? custom.value : select.value;

  row.querySelector('.remove-vaccine-btn').addEventListener('click', () => {
    row.remove();
    if (!vaccineRecords.children.length) createVaccineRow({ name: 'COVID-19', dose: '1' });
    updatePreview();
  });

  vaccineRecords.appendChild(row);
}

async function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pages = [document.getElementById('pageOne'), document.getElementById('pageTwo')];

  for (let i = 0; i < pages.length; i += 1) {
    const canvas = await html2canvas(pages[i], { scale: 2.5, useCORS: true, backgroundColor: '#fff7f7' });
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgRatio = canvas.width / canvas.height;
    const boxRatio = (pageWidth - 8) / (pageHeight - 8);
    let drawW = pageWidth - 8;
    let drawH = pageHeight - 8;
    if (imgRatio > boxRatio) {
      drawH = drawW / imgRatio;
    } else {
      drawW = drawH * imgRatio;
    }
    const x = (pageWidth - drawW) / 2;
    const y = (pageHeight - drawH) / 2;
    pdf.addImage(imgData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
    if (i !== pages.length - 1) pdf.addPage();
  }

  const name = form.elements.fullName.value.trim().replace(/\s+/g, '_') || 'Unnamed';
  pdf.save(`Habari_Medical_Passport_${name}.pdf`);
}

function toggleLock(lock) {
  state.locked = lock;
  [...form.elements].forEach((field) => {
    if (!(field instanceof HTMLButtonElement) && field.name !== 'photo' && field.name !== 'signature') {
      field.disabled = lock;
    }
  });
  previewBtn.disabled = lock;
  generateBtn.disabled = lock;
  addVaccineBtn.disabled = lock;
  addCommunicableBtn.disabled = lock;
  addNonCommunicableBtn.disabled = lock;
  [...document.querySelectorAll('.remove-vaccine-btn,.remove-test-btn')].forEach((btn) => {
    btn.disabled = lock;
  });
}

function setupEventListeners() {
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', () => {
    syncImagePreviews();
    updatePreview();
  });

  addVaccineBtn.addEventListener('click', () => createVaccineRow());
  addCommunicableBtn.addEventListener('click', () => createAdditionalTestRow(communicableExtra, 'extraComm', ['Negative', 'Positive', 'Not Done']));
  addNonCommunicableBtn.addEventListener('click', () => createAdditionalTestRow(nonCommunicableExtra, 'extraNonComm', ['Normal', 'Abnormal', 'Controlled', 'Not Done']));

  previewBtn.addEventListener('click', () => {
    updatePreview();
    document.getElementById('passportSpread').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  generateBtn.addEventListener('click', async () => {
    const payload = getFormData();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const conditionalError = validateConditionalRules(payload);
    if (conditionalError) {
      alert(conditionalError);
      return;
    }
    updatePreview();
    await downloadPdf();
    toggleLock(true);
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    vaccineRecords.innerHTML = '';
    communicableExtra.innerHTML = '';
    nonCommunicableExtra.innerHTML = '';
    createVaccineRow({ name: 'COVID-19', dose: '1' });
    createVaccineRow({ name: 'Hepatitis B', dose: '1' });
    createVaccineRow({ name: 'Tetanus', dose: '1' });
    createVaccineRow({ name: 'Polio', dose: '1' });
    createVaccineRow({ name: 'MMR', dose: '1' });
    state.passportNumber = generatePassportNumber();
    state.photoDataUrl = '';
    state.signatureDataUrl = '';
    document.getElementById('photoPreview').removeAttribute('src');
    document.getElementById('signaturePreview').textContent = 'Signature';
    document.getElementById('signatureUploadStatus').textContent = 'No signature image selected.';
    toggleLock(false);
    updatePreview();
  });
}

function init() {
  state.passportNumber = generatePassportNumber();
  createVaccineRow({ name: 'COVID-19', dose: '1' });
  createVaccineRow({ name: 'Hepatitis B', dose: '1' });
  createVaccineRow({ name: 'Tetanus', dose: '1' });
  createVaccineRow({ name: 'Polio', dose: '1' });
  createVaccineRow({ name: 'MMR', dose: '1' });
  setupEventListeners();
  updatePreview();
}

init();
