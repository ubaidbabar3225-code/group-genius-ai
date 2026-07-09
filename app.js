// Roster State
let students = [];
let groups = [];
let remainingStudents = [];
let currentGroupIndex = 0;
let soundEnabled = true;
let speedMultiplier = 2; // 1 = Slow, 2 = Normal, 3 = Fast, 4 = Insane

// Configuration Settings
const config = {
    groupSize: 5,
    genderBalance: true,    // legacy kept; actual mode controlled by genderMode
    genderMode: 'mixed',    // 'mixed' | 'separate'
    theaterMode: true,
    autoplay: false,
    subjectName: '',
    groupPurpose: 'presentation',
    department: '',
    semester: '',
    existingGroup: ''
};

// Web Audio API Context for Sound FX
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Sound Synthesizers
function playTickSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
        console.warn("Audio Context error: ", e);
    }
}

function playChimeSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        
        // Two oscillators for a beautiful harmonized bell chime
        [523.25, 659.25, 783.99].forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + (index * 0.06));
            
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + (index * 0.06) + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.06) + 0.4);
            
            osc.start(now + (index * 0.06));
            osc.stop(now + 0.5);
        });
    } catch (e) {
        console.warn("Audio Context error: ", e);
    }
}

function playFanfareSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50]; // Arpeggio C major
        
        notes.forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sawtooth';
            // Soften the sawtooth sound
            const lowpass = audioCtx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(1200, now);
            osc.disconnect(gain);
            osc.connect(lowpass);
            lowpass.connect(gain);
            
            osc.frequency.setValueAtTime(freq, now + (index * 0.08));
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + (index * 0.08) + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.08) + 0.6);
            
            osc.start(now + (index * 0.08));
            osc.stop(now + (index * 0.08) + 0.6);
        });
    } catch (e) {
        console.warn("Audio Context error: ", e);
    }
}

// Lucide icon helper
function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// UI Navigation Controller
const views = {
    upload: document.getElementById('view-upload'),
    review: document.getElementById('view-review'),
    config: document.getElementById('view-config'),
    theater: document.getElementById('view-theater'),
    results: document.getElementById('view-results')
};

const navSteps = {
    upload: document.getElementById('step-nav-upload'),
    review: document.getElementById('step-nav-review'),
    config: document.getElementById('step-nav-config'),
    theater: document.getElementById('step-nav-theater'),
    results: document.getElementById('step-nav-results')
};

function switchView(viewName) {
    // Hide all views
    Object.keys(views).forEach(key => {
        views[key].classList.remove('active');
        navSteps[key].classList.remove('active');
    });
    
    // Show active view
    views[viewName].classList.add('active');
    navSteps[viewName].classList.add('active');
    
    // Mark previous steps as completed
    const viewKeys = Object.keys(views);
    const activeIndex = viewKeys.indexOf(viewName);
    
    viewKeys.forEach((key, index) => {
        if (index < activeIndex) {
            navSteps[key].classList.add('completed');
        } else {
            navSteps[key].classList.remove('completed');
        }
    });

    // Specific view entry logic
    if (viewName === 'review') {
        renderRosterTable();
        updateSummaryStats();
    } else if (viewName === 'config') {
        updateConfigSummary();
        renderConfigPreview();
    } else if (viewName === 'results') {
        renderResultsDashboard();
    }
    
    refreshIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bulk Gender Detection based on Name heuristics
const BOY_NAMES = ['muhammad', 'ali', 'syed', 'ahmed', 'ubaid', 'bilal', 'hamza', 'zain', 'faisal', 'anas', 'osama', 'hasan', 'hassan', 'usman', 'omer', 'umar', 'asad', 'harris', 'haris', 'junaid', 'farhan', 'waleed', 'arsalan', 'abdul', 'rehman', 'abdullah', 'saad', 'zeeshan', 'nabeel', 'shehroz', 'talha', 'daniyal', 'faizan', 'mustafa', 'shah', 'hussain', 'rizvi', 'khan', 'raza', 'haider'];
const GIRL_NAMES = ['sarah', 'ayesha', 'fatima', 'mariam', 'sana', 'zainab', 'amina', 'anam', 'sidra', 'kiran', 'mahnoor', 'hira', 'amna', 'aqsa', 'iqra', 'nida', 'maria', 'bushra', 'saba', 'sadia', 'rabia', 'sonia', 'tayyaba', 'komal', 'javeria', 'rimsha', 'alisha', 'fiza', 'zoya', 'anum', 'mahreen', 'nimra', 'areeba', 'alina', 'maryam'];

function autoDetectGender(name) {
    if (!name) return 'Boy';
    const lower = name.toLowerCase();
    
    // Check girl keywords first
    for (let word of GIRL_NAMES) {
        if (lower.includes(word)) return 'Girl';
    }
    
    // Check boy keywords
    for (let word of BOY_NAMES) {
        if (lower.includes(word)) return 'Boy';
    }
    
    // Default fallback based on last character or balanced distribution
    return Math.random() > 0.5 ? 'Boy' : 'Girl';
}

// Student object factory
let studentIdCounter = 1;
function createStudent(name, regNo = '', gender = '') {
    const id = studentIdCounter++;
    const finalGender = gender ? (gender.toLowerCase().includes('girl') || gender.toLowerCase() === 'f' || gender.toLowerCase().includes('female') ? 'Girl' : 'Boy') : autoDetectGender(name);
    return {
        id,
        name: name.trim(),
        regNo: regNo.trim() || `REG-CS-${String(1000 + id)}`,
        gender: finalGender
    };
}

// UI Elements: File Upload & Drag-and-Drop
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const btnBrowse = document.getElementById('btn-browse');
const loader = document.getElementById('processing-loader');
const loaderTitle = document.getElementById('loader-title');
const loaderDesc = document.getElementById('loader-desc');
const loaderProgress = document.getElementById('loader-progress');

// Sound Toggle UI
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.setAttribute('data-lucide', soundEnabled ? 'volume-2' : 'volume-x');
    refreshIcons();
});

// Setup File drag and drop
btnBrowse.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// Toggle Manual Input Accordion
const toggleManual = document.getElementById('toggle-manual-input');
const manualBody = document.getElementById('manual-input-body');
toggleManual.addEventListener('click', () => {
    manualBody.classList.toggle('hidden');
    const arrow = toggleManual.querySelector('.accordion-arrow');
    if (manualBody.classList.contains('hidden')) {
        arrow.setAttribute('data-lucide', 'chevron-down');
    } else {
        arrow.setAttribute('data-lucide', 'chevron-up');
    }
    refreshIcons();
});

// Manual Text Area Logic
const btnParseManual = document.getElementById('btn-parse-manual');
const btnLoadSample = document.getElementById('btn-load-sample');
const manualTextarea = document.getElementById('manual-textarea');

btnParseManual.addEventListener('click', () => {
    const text = manualTextarea.value.trim();
    if (!text) return;
    
    showLoader("Parsing Text", "Analyzing manual inputs...");
    setTimeout(() => {
        parseTextRoster(text);
        hideLoader();
        switchView('review');
    }, 500);
});

btnLoadSample.addEventListener('click', () => {
    const sampleNames = [
        "Muhammad Ubaid, 1250100517, Boy", "Ali Rizvi, 1250100915, Boy", "Sarah Khan, 1250100222, Girl", 
        "Ayesha Ahmed, 1250100342, Girl", "Bilal Siddiqui, 1250100654, Boy", "Hamza Malik, 1250100112, Boy",
        "Zainab Fatima, 1250100889, Girl", "Fatima Hassan, 1250100411, Girl", "Syed Mustafa, 1250100201, Boy",
        "Osama Bin Tariq, 1250100331, Boy", "Mariam Jameel, 1250100778, Girl", "Sana Parveen, 1250100990, Girl",
        "Zain Shakeel, 1250100552, Boy", "Anas Farooq, 1250100441, Boy", "Amina Bibi, 1250100661, Girl",
        "Hira Shah, 1250100559, Girl", "Usman Ghani, 1250100119, Boy", "Omer Chaudhry, 1250100192, Boy",
        "Sidra Tul Muntaha, 1250100902, Girl", "Kiran Shahzadi, 1250100823, Girl", "Faisal Rasheed, 1250100122, Boy",
        "Anas Baig, 1250100311, Boy", "Amna Waseem, 1250100418, Girl", "Aqsa Noreen, 1250100712, Girl",
        "Asad Mehmood, 1250100816, Boy", "Harris Jamil, 1250100624, Boy", "Mahnoor Fatima, 1250100115, Girl",
        "Iqra Yasmin, 1250100932, Girl", "Junaid Akbar, 1250100542, Boy", "Farhan Saeed, 1250100732, Boy",
        "Sidra Kanwal, 1250100213, Girl", "Nida Khan, 1250100319, Girl", "Waleed Khalid, 1250100918, Boy",
        "Arsalan Tariq, 1250100817, Boy", "Maria Ghafoor, 1250100713, Girl", "Bushra Bibi, 1250100414, Girl",
        "Saad Murtaza, 1250100351, Boy", "Zeeshan Haider, 1250100459, Boy", "Saba Qamar, 1250100851, Girl",
        "Sadia Imam, 1250100158, Girl", "Nabeel Qureshi, 1250100257, Boy", "Shehroz Ahmed, 1250100362, Boy",
        "Rabia Basri, 1250100465, Girl", "Sonia Naz, 1250100561, Girl", "Talha Mahmood, 1250100762, Boy",
        "Daniyal Azhar, 1250100965, Boy", "Tayyaba Riaz, 1250100262, Girl", "Komal Arshad, 1250100371, Girl",
        "Faizan Ali, 1250100876, Boy", "Javeria Noor, 1250100572, Girl"
    ];
    manualTextarea.value = sampleNames.join('\n');
});

// Loader controls
function showLoader(title, desc, progress = 0) {
    loader.classList.remove('hidden');
    loaderTitle.textContent = title;
    loaderDesc.textContent = desc;
    loaderProgress.style.width = `${progress}%`;
}
function updateLoaderProgress(progress, desc) {
    loaderProgress.style.width = `${progress}%`;
    if (desc) loaderDesc.textContent = desc;
}
function hideLoader() {
    loader.classList.add('hidden');
}

// File Router
function handleFiles(fileList) {
    if (fileList.length === 0) return;
    const file = fileList[0];
    const extension = file.name.split('.').pop().toLowerCase();
    
    showLoader("Reading File", `Loading ${file.name}...`, 10);
    
    const reader = new FileReader();
    
    if (extension === 'xlsx' || extension === 'xls') {
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            parseExcel(data);
        };
        reader.readAsArrayBuffer(file);
    } else if (extension === 'pdf') {
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            parsePDF(data);
        };
        reader.readAsArrayBuffer(file);
    } else if (['jpg', 'jpeg', 'png'].includes(extension)) {
        parseImage(file);
    } else {
        hideLoader();
        alert("Unsupported file format! Please upload Excel, PDF, or JPG files.");
    }
}

// Parser: Excel File Reader
function parseExcel(data) {
    updateLoaderProgress(40, "Processing Excel rows...");
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON rows
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rows.length === 0) {
            throw new Error("Excel sheet is empty.");
        }
        
        students = [];
        
        // Identify column mappings based on headers in first few rows
        let nameCol = 0;
        let regCol = -1;
        let genderCol = -1;
        
        let headerRowIdx = 0;
        // Search first 5 rows for standard headers
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const row = rows[i];
            let foundHeader = false;
            row.forEach((cell, idx) => {
                if (cell) {
                    const text = String(cell).toLowerCase().trim();
                    if (text.includes('name') || text.includes('student')) {
                        nameCol = idx;
                        foundHeader = true;
                    } else if (text.includes('reg') || text.includes('roll') || text.includes('number') || text.includes('id')) {
                        regCol = idx;
                        foundHeader = true;
                    } else if (text.includes('gender') || text.includes('sex') || text.includes('boy') || text.includes('girl')) {
                        genderCol = idx;
                        foundHeader = true;
                    }
                }
            });
            if (foundHeader) {
                headerRowIdx = i;
                break;
            }
        }
        
        // Read data starting after header row
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            const nameVal = row[nameCol];
            if (!nameVal || String(nameVal).trim() === '') continue;
            
            const regVal = regCol !== -1 ? row[regCol] : '';
            const genderVal = genderCol !== -1 ? row[genderCol] : '';
            
            students.push(createStudent(String(nameVal), String(regVal), String(genderVal)));
        }
        
        updateLoaderProgress(100, "Roster loaded!");
        setTimeout(() => {
            hideLoader();
            switchView('review');
        }, 500);
        
    } catch (e) {
        hideLoader();
        console.error(e);
        alert("Failed to parse Excel file. Make sure columns have appropriate headings like 'Name' and 'Registration Number'.");
    }
}

// Parser: PDF Reader
async function parsePDF(data) {
    updateLoaderProgress(30, "Analyzing PDF layout...");
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({ data: data });
        const pdf = await loadingTask.promise;
        
        let textLines = [];
        const numPages = pdf.numPages;
        
        for (let i = 1; i <= numPages; i++) {
            updateLoaderProgress(30 + Math.floor((i / numPages) * 50), `Extracting text from page ${i} of ${numPages}...`);
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            // Reconstruct rows by grouping items on similar Y coordinate
            const items = content.items;
            const rows = {};
            
            items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (!rows[y]) rows[y] = [];
                rows[y].push(item);
            });
            
            // Sort keys by Y coordinate descending (top to bottom)
            const sortedY = Object.keys(rows).sort((a, b) => b - a);
            
            sortedY.forEach(y => {
                // Sort items on same row by X coordinate (left to right)
                const rowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
                const rowText = rowItems.map(item => item.str).join(' ');
                if (rowText.trim()) {
                    textLines.push(rowText.trim());
                }
            });
        }
        
        parseTextLines(textLines);
        hideLoader();
        switchView('review');
        
    } catch (e) {
        hideLoader();
        console.error(e);
        alert("Failed to parse PDF document. It might be scanned. Try importing as a JPG instead to run AI character recognition (OCR)!");
    }
}

// Parser: Image OCR Reader
function parseImage(file) {
    showLoader("OCR Processing", "Initializing Tesseract engine...", 15);
    
    Tesseract.recognize(
        file,
        'eng',
        {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progressVal = 15 + Math.floor(m.progress * 80);
                    updateLoaderProgress(progressVal, `AI Scanning Page: ${Math.floor(m.progress * 100)}% complete`);
                }
            }
        }
    ).then(({ data: { text } }) => {
        updateLoaderProgress(95, "Formatting extracted text...");
        const lines = text.split('\n');
        parseTextLines(lines);
        hideLoader();
        switchView('review');
    }).catch(err => {
        hideLoader();
        console.error("OCR Error:", err);
        alert("OCR parsing failed. Check image quality or use manual pasting.");
    });
}

// Parser: Helper to clean raw multi-line text files/OCR/manual entries
function parseTextRoster(text) {
    const lines = text.split('\n');
    parseTextLines(lines);
}

function parseTextLines(lines) {
    students = [];
    
    // Ignore lines that match header keywords
    const headerKeywords = ['s.no', 'roll no', 'registration', 'attendance', 'present', 'absent', 'roster', 'page', 'signature', 'name', 'gender'];
    
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.length < 3) return;
        
        // Check if header line
        const lowerLine = cleanLine.toLowerCase();
        let matchesHeader = false;
        let activeHeadersCount = 0;
        headerKeywords.forEach(k => {
            if (lowerLine.includes(k)) activeHeadersCount++;
        });
        if (activeHeadersCount >= 2) matchesHeader = true;
        if (matchesHeader) return;
        
        // Parse student
        // Standard formats: Name, RegNo, Gender OR Name, RegNo OR RegNo Name OR just Name
        let parts = cleanLine.split(/[,;\t]/);
        if (parts.length >= 2) {
            const namePart = parts[0].trim();
            const regPart = parts[1].trim();
            const genderPart = parts[2] ? parts[2].trim() : '';
            if (namePart && isNaN(namePart)) {
                students.push(createStudent(namePart, regPart, genderPart));
            }
        } else {
            // Regex parsing: Search for a registration number (like 1250100517 or CS-19-20)
            const regRegex = /\b(\d{5,12}|[A-Za-z]+-\d+-\d+|\d+-[A-Za-z]+-\d+)\b/;
            const match = cleanLine.match(regRegex);
            if (match) {
                const regNo = match[0];
                const namePart = cleanLine.replace(regNo, '').replace(/[^a-zA-Z\s]/g, '').trim();
                // Avoid empty names
                if (namePart.length > 2) {
                    students.push(createStudent(namePart, regNo));
                }
            } else {
                // Just treat the line as the name
                const namePart = cleanLine.replace(/[^a-zA-Z\s.-]/g, '').trim();
                if (namePart.length > 2) {
                    students.push(createStudent(namePart));
                }
            }
        }
    });
}

// SCREEN 2: Roster Table Renderer
const rosterTableBody = document.getElementById('roster-table-body');
const btnAddStudent = document.getElementById('btn-add-student');
const btnClearRoster = document.getElementById('btn-clear-roster');
const btnBulkBoys = document.getElementById('btn-bulk-boys');
const btnBulkGirls = document.getElementById('btn-bulk-girls');
const btnBulkDetectGender = document.getElementById('btn-bulk-detect-gender');
const btnProceedToConfig = document.getElementById('btn-proceed-to-config');
const btnBackToUpload = document.getElementById('btn-back-to-upload');

function renderRosterTable() {
    rosterTableBody.innerHTML = '';
    
    if (students.length === 0) {
        rosterTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
                    No students loaded. Click "Add Student" or paste roster manually.
                </td>
            </tr>
        `;
        return;
    }
    
    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <input type="text" class="roster-input name-input" data-id="${student.id}" value="${escapeHtml(student.name)}">
            </td>
            <td>
                <input type="text" class="roster-input reg-input" data-id="${student.id}" value="${escapeHtml(student.regNo)}">
            </td>
            <td>
                <select class="gender-select" data-id="${student.id}">
                    <option value="Boy" ${student.gender === 'Boy' ? 'selected' : ''}>👦 Boy</option>
                    <option value="Girl" ${student.gender === 'Girl' ? 'selected' : ''}>👧 Girl</option>
                </select>
            </td>
            <td>
                <button class="btn-delete-row" data-id="${student.id}"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
            </td>
        `;
        rosterTableBody.appendChild(tr);
    });
    
    // Add Event Listeners to inputs
    rosterTableBody.querySelectorAll('.name-input').forEach(input => {
        input.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.id);
            const stud = students.find(s => s.id === id);
            if (stud) stud.name = e.target.value;
            updateSummaryStats();
        });
    });
    
    rosterTableBody.querySelectorAll('.reg-input').forEach(input => {
        input.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.id);
            const stud = students.find(s => s.id === id);
            if (stud) stud.regNo = e.target.value;
        });
    });
    
    rosterTableBody.querySelectorAll('.gender-select').forEach(select => {
        select.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.id);
            const stud = students.find(s => s.id === id);
            if (stud) stud.gender = e.target.value;
            updateSummaryStats();
        });
    });
    
    rosterTableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
        btn.addEventListener('click', e => {
            const btnEl = e.currentTarget;
            const id = parseInt(btnEl.dataset.id);
            students = students.filter(s => s.id !== id);
            renderRosterTable();
            updateSummaryStats();
        });
    });
    
    refreshIcons();
}

function updateSummaryStats() {
    const total = students.length;
    const boys = students.filter(s => s.gender === 'Boy').length;
    const girls = students.filter(s => s.gender === 'Girl').length;
    
    // Update Sidebar
    document.getElementById('summary-total').textContent = total;
    document.getElementById('summary-boys').textContent = boys;
    document.getElementById('summary-girls').textContent = girls;
    
    // Update Badges on Screen 2
    document.getElementById('badge-total').textContent = `${total} Students`;
    document.getElementById('badge-boys').textContent = `${boys} Boys`;
    document.getElementById('badge-girls').textContent = `${girls} Girls`;
}

// Bulk Buttons Handlers
btnBulkBoys.addEventListener('click', () => {
    students.forEach(s => s.gender = 'Boy');
    renderRosterTable();
    updateSummaryStats();
});

btnBulkGirls.addEventListener('click', () => {
    students.forEach(s => s.gender = 'Girl');
    renderRosterTable();
    updateSummaryStats();
});

btnBulkDetectGender.addEventListener('click', () => {
    students.forEach(s => s.gender = autoDetectGender(s.name));
    renderRosterTable();
    updateSummaryStats();
});

btnClearRoster.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the entire roster?")) {
        students = [];
        renderRosterTable();
        updateSummaryStats();
    }
});

btnAddStudent.addEventListener('click', () => {
    students.push(createStudent('New Student'));
    renderRosterTable();
    updateSummaryStats();
    // Scroll to the bottom of the table container
    const tblContainer = document.querySelector('.table-container');
    tblContainer.scrollTop = tblContainer.scrollHeight;
});

btnProceedToConfig.addEventListener('click', () => {
    if (students.length === 0) {
        alert("Please add at least 1 student first!");
        return;
    }
    switchView('config');
});

btnBackToUpload.addEventListener('click', () => {
    switchView('upload');
});

// SCREEN 3: CONFIGURATION INTERFACE
const groupSizeRange = document.getElementById('group-size-range');
const groupSizeVal = document.getElementById('group-size-val');
const chkTheaterMode = document.getElementById('chk-theater-mode');
const configSummaryText = document.getElementById('config-summary-text');
const btnBackToReview = document.getElementById('btn-back-to-review');
const btnLaunchGenerator = document.getElementById('btn-launch-generator');

const subjectNameInput = document.getElementById('input-subject-name');
const departmentInput = document.getElementById('input-department');
const semesterInput = document.getElementById('input-semester');
const existingGroupInput = document.getElementById('input-existing-group');
const purposeCardPresentation = document.getElementById('purpose-card-presentation');
const purposeCardProject = document.getElementById('purpose-card-project');
const genderCardMixed = document.getElementById('gender-card-mixed');
const genderCardSeparate = document.getElementById('gender-card-separate');

// Purpose toggle
purposeCardPresentation.addEventListener('click', () => {
    config.groupPurpose = 'presentation';
    purposeCardPresentation.classList.add('active');
    purposeCardProject.classList.remove('active');
    updateConfigSummary();
    renderConfigPreview();
});
purposeCardProject.addEventListener('click', () => {
    config.groupPurpose = 'project';
    purposeCardProject.classList.add('active');
    purposeCardPresentation.classList.remove('active');
    updateConfigSummary();
    renderConfigPreview();
});

// Gender Mode toggle
genderCardMixed.addEventListener('click', () => {
    config.genderMode = 'mixed';
    config.genderBalance = true;
    genderCardMixed.classList.add('active');
    genderCardSeparate.classList.remove('active');
    updateConfigSummary();
    renderConfigPreview();
});
genderCardSeparate.addEventListener('click', () => {
    config.genderMode = 'separate';
    config.genderBalance = false;
    genderCardSeparate.classList.add('active');
    genderCardMixed.classList.remove('active');
    updateConfigSummary();
    renderConfigPreview();
});

// Text inputs
subjectNameInput.addEventListener('input', e => { config.subjectName = e.target.value.trim(); });
departmentInput.addEventListener('input', e => { config.department = e.target.value.trim(); });
semesterInput.addEventListener('input', e => { config.semester = e.target.value.trim(); });
existingGroupInput.addEventListener('input', e => { config.existingGroup = e.target.value.trim(); });

groupSizeRange.addEventListener('input', e => {
    const size = parseInt(e.target.value);
    groupSizeVal.textContent = size;
    config.groupSize = size;
    updateConfigSummary();
    renderConfigPreview();
});

chkTheaterMode.addEventListener('change', e => {
    config.theaterMode = e.target.checked;
    const card = document.getElementById('toggle-card-theater');
    if (config.theaterMode) card.classList.add('active');
    else card.classList.remove('active');
});

function updateConfigSummary() {
    const size = config.groupSize;
    const totalStudents = students.length;
    const totalGroups = Math.ceil(totalStudents / size);
    
    // Estimate members distribution
    const minMembers = Math.floor(totalStudents / totalGroups);
    const maxMembers = Math.ceil(totalStudents / totalGroups);
    
    let distributionStr = "";
    if (minMembers === maxMembers) {
        distributionStr = `Each of the ${totalGroups} groups will have exactly ${minMembers} students.`;
    } else {
        const extraStudents = totalStudents % totalGroups;
        const regularGroupsCount = totalGroups - extraStudents;
        distributionStr = `Will create ${totalGroups} groups: ${extraStudents} groups of ${maxMembers} and ${regularGroupsCount} groups of ${minMembers} students.`;
    }
    

    let modeStr = '';
    if (config.genderMode === 'mixed') {
        modeStr = ' <strong style="color:var(--accent)">Boys & Girls Mixed:</strong> Each group will have both boys and girls evenly distributed.';
    } else if (config.genderMode === 'separate') {
        const boys = students.filter(s => s.gender === 'Boy').length;
        const girls = students.filter(s => s.gender === 'Girl').length;
        const boyGroups = Math.ceil(boys / config.groupSize);
        const girlGroups = Math.ceil(girls / config.groupSize);
        modeStr = ` <strong style="color:#f472b6">Boys & Girls Separate:</strong> ${boyGroups} boys-only group(s) + ${girlGroups} girls-only group(s).`;
    } else {
        modeStr = ' Fully Random: No gender constraint applied.';
    }

    configSummaryText.innerHTML = `
        <strong>Structure Plan:</strong> ${distributionStr} <br/>
        <strong>Grouping Mode:</strong> ${modeStr}
    `;
    
    // Update right sidebar stats
    document.getElementById('prev-num-groups').textContent = totalGroups;
    document.getElementById('prev-avg-size').textContent = (totalStudents / totalGroups).toFixed(1);
}

function renderConfigPreview() {
    const previewGrid = document.getElementById('visual-groups-preview');
    previewGrid.innerHTML = '';
    
    const size = config.groupSize;
    const totalStudents = students.length;
    const totalGroups = Math.ceil(totalStudents / size);
    
    // Simulating gender distribution
    const boysCount = students.filter(s => s.gender === 'Boy').length;
    const girlsCount = students.filter(s => s.gender === 'Girl').length;
    
    // Setup arrays of placeholder gender values
    const simGenders = [];
    for (let i = 0; i < boysCount; i++) simGenders.push('boy');
    for (let i = 0; i < girlsCount; i++) simGenders.push('girl');
    
    // Shuffle simulated array to match group sorting
    if (!config.genderBalance) {
        simGenders.sort(() => Math.random() - 0.5);
    }
    
    // Allocate to groups
    const previewGroups = Array.from({ length: totalGroups }, () => []);
    
    if (config.genderBalance) {
        const boys = simGenders.filter(g => g === 'boy');
        const girls = simGenders.filter(g => g === 'girl');
        let idx = 0;
        
        // Loop and balance
        while (boys.length > 0 || girls.length > 0) {
            const groupIdx = idx % totalGroups;
            const currentGroup = previewGroups[groupIdx];
            
            // Decide size to enforce correct distribution limit
            const targetSize = (groupIdx < totalStudents % totalGroups) ? Math.ceil(totalStudents / totalGroups) : Math.floor(totalStudents / totalGroups);
            if (currentGroup.length >= targetSize) {
                idx++;
                continue;
            }
            
            // Balance card choice
            const boysInGroup = currentGroup.filter(g => g === 'boy').length;
            const girlsInGroup = currentGroup.filter(g => g === 'girl').length;
            
            if (boys.length > 0 && (boysInGroup <= girlsInGroup || girls.length === 0)) {
                currentGroup.push(boys.pop());
            } else if (girls.length > 0) {
                currentGroup.push(girls.pop());
            } else if (boys.length > 0) {
                currentGroup.push(boys.pop());
            }
            idx++;
        }
    } else {
        let gIdx = 0;
        for (let i = 0; i < totalStudents; i++) {
            const groupIdx = gIdx % totalGroups;
            const currentGroup = previewGroups[groupIdx];
            const targetSize = (groupIdx < totalStudents % totalGroups) ? Math.ceil(totalStudents / totalGroups) : Math.floor(totalStudents / totalGroups);
            
            if (currentGroup.length >= targetSize) {
                gIdx++;
                i--; // retry element
                continue;
            }
            currentGroup.push(simGenders[i]);
            gIdx++;
        }
    }
    
    previewGroups.forEach((groupGenders, index) => {
        const div = document.createElement('div');
        div.className = 'visual-group-item';
        
        let dotsHtml = '';
        groupGenders.forEach(g => {
            dotsHtml += `<span class="gender-dot ${g}" title="${g === 'boy' ? 'Boy' : 'Girl'}"></span>`;
        });
        
        div.innerHTML = `
            <span class="visual-group-name">Group ${index + 1} (${groupGenders.length} slots)</span>
            <div class="visual-group-dots">
                ${dotsHtml}
            </div>
        `;
        previewGrid.appendChild(div);
    });
}

btnBackToReview.addEventListener('click', () => {
    switchView('review');
});

btnLaunchGenerator.addEventListener('click', () => {
    // Generate actual groups
    buildGroupsData();
    
    if (config.theaterMode) {
        setupTheater();
        switchView('theater');
    } else {
        switchView('results');
    }
});

// CORE ALGORITHM: Balanced Group Generation
function buildGroupsData() {
    const size = config.groupSize;
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

    if (config.genderMode === 'separate') {
        // ── SEPARATE MODE ─────────────────────────────────────────────
        // Boys and girls form their own independent groups
        const boys  = shuffledStudents.filter(s => s.gender === 'Boy');
        const girls = shuffledStudents.filter(s => s.gender === 'Girl');

        const buildSeparate = (pool, tag) => {
            const count = Math.ceil(pool.length / size);
            const arr = Array.from({ length: count }, () => []);
            pool.forEach((student, i) => arr[i % count].push(student));
            arr.forEach(g => {
                g.sort(() => Math.random() - 0.5);
                g.genderTag = tag; // attach tag to the array itself
            });
            return arr;
        };

        const boyGroups  = buildSeparate(boys,  'boys');
        const girlGroups = buildSeparate(girls, 'girls');

        // Re-attach genderTag after sort (arrays lose it on mutation above)
        boyGroups.forEach(g  => { g.genderTag = 'boys';  });
        girlGroups.forEach(g => { g.genderTag = 'girls'; });

        groups = [...boyGroups, ...girlGroups];

    } else if (config.genderMode === 'mixed') {
        // ── MIXED MODE ────────────────────────────────────────────────
        const totalStudents = shuffledStudents.length;
        const totalGroups = Math.ceil(totalStudents / size);
        groups = Array.from({ length: totalGroups }, () => []);

        const boys  = shuffledStudents.filter(s => s.gender === 'Boy');
        const girls = shuffledStudents.filter(s => s.gender === 'Girl');

        const groupTargetSizes = [];
        for (let i = 0; i < totalGroups; i++) {
            groupTargetSizes.push(i < totalStudents % totalGroups
                ? Math.ceil(totalStudents / totalGroups)
                : Math.floor(totalStudents / totalGroups));
        }

        let idx = 0;
        while (boys.length > 0 || girls.length > 0) {
            const gi = idx % totalGroups;
            const g  = groups[gi];
            if (g.length >= groupTargetSizes[gi]) { idx++; continue; }
            const boysIn  = g.filter(s => s.gender === 'Boy').length;
            const girlsIn = g.filter(s => s.gender === 'Girl').length;
            if (boys.length > 0 && (boysIn <= girlsIn || girls.length === 0)) {
                g.push(boys.pop());
            } else if (girls.length > 0) {
                g.push(girls.pop());
            } else {
                g.push(boys.pop());
            }
            idx++;
        }
        groups.forEach(g => {
            g.sort(() => Math.random() - 0.5);
            g.genderTag = 'mixed';
        });

    } else {
        // ── RANDOM MODE ───────────────────────────────────────────────
        const totalStudents = shuffledStudents.length;
        const totalGroups   = Math.ceil(totalStudents / size);
        groups = Array.from({ length: totalGroups }, () => []);
        let idx = 0;
        shuffledStudents.forEach(student => {
            let placed = false;
            while (!placed) {
                const gi = idx % totalGroups;
                const tSize = gi < totalStudents % totalGroups
                    ? Math.ceil(totalStudents / totalGroups)
                    : Math.floor(totalStudents / totalGroups);
                if (groups[gi].length < tSize) { groups[gi].push(student); placed = true; }
                idx++;
            }
        });
        groups.forEach(g => {
            g.sort(() => Math.random() - 0.5);
            g.genderTag = 'mixed';
        });
    }
}

// SCREEN 4: INTERACTIVE THEATER LOGIC
const countRemaining = document.getElementById('count-remaining');
const countFormed = document.getElementById('count-formed');
const remainingListEl = document.getElementById('theater-remaining-list');
const formedListEl = document.getElementById('theater-formed-list');
const drawBoxWrapper = document.getElementById('draw-box-wrapper');
const groupMembersList = document.getElementById('group-members-list');
const groupMembersPanel = document.getElementById('group-members-panel');
const theaterGroupTitle = document.getElementById('theater-group-title');
const btnPlayGroup = document.getElementById('btn-play-group');
const btnSkipAnim = document.getElementById('btn-skip-anim');
const chkAutoplay = document.getElementById('chk-autoplay');
const speedRange = document.getElementById('speed-range');
const speedLabel = document.getElementById('speed-val-label');
const celebrationOverlay = document.getElementById('celebration-screen');
const btnTheaterToResults = document.getElementById('btn-theater-to-results');

const tabRemaining = document.getElementById('tab-btn-remaining');
const tabFormed = document.getElementById('tab-btn-formed');
const contentRemaining = document.getElementById('tab-content-remaining');
const contentFormed = document.getElementById('tab-content-formed');

tabRemaining.addEventListener('click', () => {
    tabRemaining.classList.add('active');
    tabFormed.classList.remove('active');
    contentRemaining.classList.remove('hidden');
    contentFormed.classList.add('hidden');
});

tabFormed.addEventListener('click', () => {
    tabFormed.classList.add('active');
    tabRemaining.classList.remove('active');
    contentFormed.classList.remove('hidden');
    contentRemaining.classList.add('hidden');
});

speedRange.addEventListener('input', e => {
    speedMultiplier = parseInt(e.target.value);
    const speedNames = ["Slow", "Normal", "Fast", "Insane"];
    speedLabel.textContent = speedNames[speedMultiplier - 1];
});

let animationTimeouts = [];
let drawingInProgress = false;

function setupTheater() {
    // Clear timeouts
    animationTimeouts.forEach(clearTimeout);
    animationTimeouts = [];
    drawingInProgress = false;
    
    currentGroupIndex = 0;
    remainingStudents = [...students];
    celebrationOverlay.classList.add('hidden');
    
    updateTheaterCounters();
    renderTheaterRemainingList();
    renderTheaterFormedList();
    prepareGroupSlots();
    
    btnPlayGroup.style.display = 'inline-flex';
    btnPlayGroup.disabled = false;
    btnPlayGroup.classList.add('btn-accent');
    btnPlayGroup.classList.remove('btn-secondary');
    btnPlayGroup.innerHTML = `<i data-lucide="play"></i> Draw Group`;
    btnSkipAnim.style.display = 'inline-flex';
    
    refreshIcons();
}

function updateTheaterCounters() {
    countRemaining.textContent = remainingStudents.length;
    countFormed.textContent = currentGroupIndex;
}

function renderTheaterRemainingList() {
    remainingListEl.innerHTML = '';
    remainingStudents.forEach(student => {
        const span = document.createElement('span');
        span.className = `student-badge ${student.gender === 'Boy' ? 'boy' : 'girl'}`;
        span.id = `badge-student-${student.id}`;
        span.innerHTML = `
            ${student.gender === 'Boy' ? '👦' : '👧'} ${escapeHtml(student.name)}
        `;
        remainingListEl.appendChild(span);
    });
}

function renderTheaterFormedList() {
    formedListEl.innerHTML = '';
    
    if (currentGroupIndex === 0) {
        formedListEl.innerHTML = `
            <div class="empty-state-sidebar">
                <i data-lucide="users"></i>
                <p>No groups formed yet. Click "Draw Group" to start!</p>
            </div>
        `;
        refreshIcons();
        return;
    }
    
    for (let i = 0; i < currentGroupIndex; i++) {
        const group = groups[i];
        const card = document.createElement('div');
        card.className = 'formed-group-card';
        
        let membersHtml = '';
        group.forEach(m => {
            membersHtml += `
                <div class="formed-member-item">
                    <span>${escapeHtml(m.name)}</span>
                    <span class="formed-member-reg">${escapeHtml(m.regNo)}</span>
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="formed-group-header">
                <span>Group ${i + 1}</span>
                <span>${group.length} students</span>
            </div>
            <div class="formed-group-members">
                ${membersHtml}
            </div>
        `;
        formedListEl.appendChild(card);
    }
}

function prepareGroupSlots() {
    drawBoxWrapper.innerHTML = '';
    groupMembersList.innerHTML = '';
    groupMembersPanel.classList.remove('has-members');

    if (currentGroupIndex >= groups.length) return;

    theaterGroupTitle.textContent = `Group ${currentGroupIndex + 1} — Ready to Draw`;
    theaterGroupTitle.classList.remove('drawing-active');

    const waiting = document.createElement('div');
    waiting.className = 'slots-waiting-state';
    waiting.id = 'slots-waiting-state';
    waiting.innerHTML = `
        <div class="waiting-icon"><i data-lucide="users"></i></div>
        <p>Click <strong>Draw Group</strong> to randomly pick students one by one</p>
    `;
    drawBoxWrapper.appendChild(waiting);
    refreshIcons();
}

function createDrawBoxElement() {
    const box = document.createElement('div');
    box.className = 'draw-box';
    box.id = 'draw-box';
    box.innerHTML = `
        <div class="draw-box-label" id="draw-box-label">Drawing...</div>
        <div class="slot-reel draw-box-reel">
            <div class="reel-names-container" id="reel-names-draw">
                <div class="reel-name-item">...</div>
            </div>
        </div>
    `;
    return box;
}

function addMemberToGroupList(student, index) {
    groupMembersPanel.classList.add('has-members');
    const chip = document.createElement('div');
    chip.className = `group-member-chip ${student.gender === 'Boy' ? 'boy' : 'girl'} chip-entering`;
    chip.innerHTML = `
        <span class="chip-num">#${index + 1}</span>
        <span class="chip-name">${escapeHtml(student.name)}</span>
        <span class="chip-reg">${escapeHtml(student.regNo)}</span>
        <span class="chip-gender">${student.gender === 'Boy' ? '👦' : '👧'}</span>
    `;
    groupMembersList.appendChild(chip);
    requestAnimationFrame(() => chip.classList.remove('chip-entering'));
}

function pickRandomFromRemaining(excludeId = null) {
    const pool = excludeId
        ? remainingStudents.filter(s => s.id !== excludeId)
        : remainingStudents;
    if (pool.length === 0) return remainingStudents[0];
    return pool[Math.floor(Math.random() * pool.length)];
}

function animateNameReel(reelContainer, targetStudent, slotIndex) {
    const itemHeight = 50;
    const poolSize = Math.max(14, Math.floor(20 / speedMultiplier));
    const pool = [];

    for (let p = 0; p < poolSize - 1; p++) {
        pool.push(pickRandomFromRemaining(targetStudent.id));
    }
    pool.push(targetStudent);

    reelContainer.innerHTML = '';
    pool.forEach(stud => {
        const item = document.createElement('div');
        item.className = 'reel-name-item';
        item.textContent = stud.name;
        reelContainer.appendChild(item);
    });

    const speedIntervals = [];
    let totalAnimTime = 0;

    for (let step = 0; step < poolSize; step++) {
        const easeFactor = Math.pow(step / (poolSize - 1), 3);
        const interval = (40 + easeFactor * 320) / speedMultiplier;
        speedIntervals.push(interval);
        totalAnimTime += interval;
    }

    return new Promise(resolve => {
        let step = 0;

        const runShift = () => {
            if (step >= poolSize) {
                resolve(totalAnimTime);
                return;
            }
            reelContainer.style.transform = `translateY(-${step * itemHeight}px)`;
            playTickSound();
            step++;
            const timer = setTimeout(runShift, speedIntervals[step - 1]);
            animationTimeouts.push(timer);
        };

        runShift();
    });
}

// Visual Raffle trigger
btnPlayGroup.addEventListener('click', () => {
    if (drawingInProgress) return;
    drawNextGroupVisual();
});

btnSkipAnim.addEventListener('click', () => {
    skipToFinalResults();
});

btnTheaterToResults.addEventListener('click', () => {
    switchView('results');
});

// Live group builder — draws one group at a time, one student per animation
async function drawNextGroupVisual() {
    if (currentGroupIndex >= groups.length || drawingInProgress) return;

    drawingInProgress = true;
    btnPlayGroup.classList.add('btn-secondary');
    btnPlayGroup.classList.remove('btn-accent');
    btnPlayGroup.disabled = true;
    btnPlayGroup.innerHTML = `<i data-lucide="loader"></i> Drawing...`;
    refreshIcons();

    const targetGroup = groups[currentGroupIndex];
    const targetSize = targetGroup.length;
    const groupNum = currentGroupIndex + 1;

    theaterGroupTitle.textContent = `Drawing Group ${groupNum}...`;
    theaterGroupTitle.classList.add('drawing-active');

    drawBoxWrapper.innerHTML = '';
    groupMembersList.innerHTML = '';
    groupMembersPanel.classList.remove('has-members');

    const drawBox = createDrawBoxElement();
    drawBoxWrapper.appendChild(drawBox);
    const reelContainer = document.getElementById('reel-names-draw');
    const drawBoxLabel = document.getElementById('draw-box-label');

    for (let i = 0; i < targetSize; i++) {
        const targetStudent = targetGroup[i];

        drawBox.classList.add('active');
        drawBox.classList.remove('filled');
        drawBoxLabel.textContent = `Picking student ${i + 1} of ${targetSize}`;

        const badge = document.getElementById(`badge-student-${targetStudent.id}`);
        if (badge) {
            badge.classList.add('drawing');
            badge.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        theaterGroupTitle.textContent = `Group ${groupNum} — Picking student ${i + 1} of ${targetSize}`;

        reelContainer.style.transform = 'translateY(0)';
        await animateNameReel(reelContainer, targetStudent, i);

        const poolSize = reelContainer.children.length;
        reelContainer.style.transform = `translateY(-${(poolSize - 1) * 50}px)`;

        drawBox.classList.remove('active');
        drawBox.classList.add('filled');
        drawBoxLabel.textContent = `Selected: ${targetStudent.name}`;

        addMemberToGroupList(targetStudent, i);

        remainingStudents = remainingStudents.filter(s => s.id !== targetStudent.id);
        updateTheaterCounters();
        if (badge) badge.classList.add('selected');

        playChimeSound();
        triggerConfettiOnSlot(drawBox);

        if (i < targetSize - 1) {
            await new Promise(resolve => {
                const pauseTimer = setTimeout(resolve, 350 / speedMultiplier);
                animationTimeouts.push(pauseTimer);
            });
        }
    }

    theaterGroupTitle.textContent = `Group ${groupNum} Complete!`;
    theaterGroupTitle.classList.remove('drawing-active');
    currentGroupIndex++;
    playFanfareSound();

    confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
    });

    renderTheaterFormedList();

    await new Promise(resolve => {
        const pauseTimer = setTimeout(resolve, 1200);
        animationTimeouts.push(pauseTimer);
    });

    drawingInProgress = false;

    if (currentGroupIndex < groups.length) {
        prepareGroupSlots();
        btnPlayGroup.disabled = false;
        btnPlayGroup.classList.remove('btn-secondary');
        btnPlayGroup.classList.add('btn-accent');
        btnPlayGroup.innerHTML = `<i data-lucide="play"></i> Draw Group ${currentGroupIndex + 1}`;

        if (chkAutoplay.checked) {
            drawNextGroupVisual();
        }
    } else {
        celebrationOverlay.classList.remove('hidden');
        btnPlayGroup.style.display = 'none';
        btnSkipAnim.style.display = 'none';
    }

    refreshIcons();
}

function skipToFinalResults() {
    animationTimeouts.forEach(clearTimeout);
    animationTimeouts = [];
    drawingInProgress = false;

    currentGroupIndex = groups.length;
    remainingStudents = [];

    updateTheaterCounters();
    renderTheaterRemainingList();
    renderTheaterFormedList();

    switchView('results');
}

function triggerConfettiOnSlot(el) {
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
        particleCount: 15,
        spread: 30,
        origin: { x, y }
    });
}

// SCREEN 5: FINAL RESULTS & DRAG AND DROP
const resultsGroupsGrid = document.getElementById('results-groups-grid');
const resultsMetaDesc = document.getElementById('results-meta-desc');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnExportPdf = document.getElementById('btn-export-pdf');
const btnResetApp = document.getElementById('btn-reset-app');

function renderResultsDashboard() {
    resultsGroupsGrid.innerHTML = '';
    
    const totalStudents = students.length;
    const totalGroups = groups.length;
    const purposeLabel = config.groupPurpose === 'presentation' ? 'Presentation Groups' : 'Project Groups';
    const modeLabel = config.genderMode === 'separate' ? 'Separate (Boys / Girls)' :
                      config.genderMode === 'mixed'    ? 'Mixed (Boys & Girls)' : 'Random';
    const dateStr = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

    // Update page title
    const mainTitle = document.getElementById('results-main-title');
    if (mainTitle) mainTitle.textContent = `${purposeLabel} — Formed Successfully`;

    resultsMetaDesc.textContent = `${totalStudents} students divided into ${totalGroups} groups. Mode: ${modeLabel}.`;

    // Populate info banner
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    setEl('res-department',   config.department   || 'Not specified');
    setEl('res-subject',      config.subjectName  || 'General Class');
    setEl('res-semester',     config.semester     || 'Not specified');
    setEl('res-existing-group', config.existingGroup ? `Section: ${config.existingGroup}` : 'No section');
    setEl('res-date', dateStr);

    // Conditionally hide pills with no data
    const bannerEl = document.getElementById('results-info-banner');
    if (bannerEl) bannerEl.style.display = 'block';
    
    groups.forEach((group, groupIdx) => {
        const card = document.createElement('div');
        card.className = 'result-group-card';
        card.dataset.groupIdx = groupIdx;
        
        const tag = group.genderTag || 'mixed';
        const tagLabel = tag === 'boys' ? 'Boys Only' : tag === 'girls' ? 'Girls Only' : 'Mixed';
        
        const header = document.createElement('div');
        header.className = 'result-group-header';
        header.innerHTML = `
            <span class="result-group-title">Group ${groupIdx + 1}</span>
            <span class="group-gender-tag ${tag}">${tagLabel}</span>
            <span class="result-group-count" id="badge-count-${groupIdx}">${group.length} students</span>
        `;
        
        const membersList = document.createElement('div');
        membersList.className = 'result-group-members';
        membersList.id = `members-group-${groupIdx}`;
        membersList.dataset.groupIdx = groupIdx;
        
        group.forEach(student => {
            const item = document.createElement('div');
            item.className = 'result-member-card';
            item.draggable = true;
            item.dataset.studentId = student.id;
            item.dataset.groupIdx = groupIdx;
            
            item.innerHTML = `
                <div class="result-member-info">
                    <span class="result-member-name">${escapeHtml(student.name)}</span>
                    <span class="result-member-reg">${escapeHtml(student.regNo)}</span>
                </div>
                <span class="gender-indicator ${student.gender === 'Boy' ? 'boy' : 'girl'}" title="${student.gender}"></span>
            `;
            
            // Drag listeners
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            
            membersList.appendChild(item);
        });
        
        // Drop zone listeners
        membersList.addEventListener('dragover', handleDragOver);
        membersList.addEventListener('dragleave', handleDragLeave);
        membersList.addEventListener('drop', handleDrop);
        
        card.appendChild(header);
        card.appendChild(membersList);
        resultsGroupsGrid.appendChild(card);
    });
    
    refreshIcons();
}

// Drag & Drop event handlers
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = e.currentTarget;
    draggedItem.classList.add('dragging');
    e.dataTransfer.setData('text/plain', draggedItem.dataset.studentId);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }
    
    // Remove all drop-over classes
    document.querySelectorAll('.result-group-members').forEach(zone => {
        zone.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const zone = e.currentTarget;
    zone.classList.remove('drag-over');
    
    const studentId = parseInt(e.dataTransfer.getData('text/plain'));
    const targetGroupIdx = parseInt(zone.dataset.groupIdx);
    
    if (isNaN(studentId) || isNaN(targetGroupIdx)) return;
    
    // Find student in groups
    let sourceGroupIdx = -1;
    let studentObj = null;
    
    for (let i = 0; i < groups.length; i++) {
        const stud = groups[i].find(s => s.id === studentId);
        if (stud) {
            sourceGroupIdx = i;
            studentObj = stud;
            break;
        }
    }
    
    // If student not found or dropped into same group, skip
    if (!studentObj || sourceGroupIdx === targetGroupIdx) return;
    
    // Enforce limits: groups cannot exceed 10 or drop below 1
    const targetGroup = groups[targetGroupIdx];
    if (targetGroup.length >= 10) {
        alert("Maximum team size is 10 students!");
        return;
    }
    
    // Modify State
    groups[sourceGroupIdx] = groups[sourceGroupIdx].filter(s => s.id !== studentId);
    groups[targetGroupIdx].push(studentObj);
    
    // Re-render
    renderResultsDashboard();
}

// EXPORT TO EXCEL ROUTINES
btnExportExcel.addEventListener('click', () => {
    try {
        const excelData = [];
        const purposeLabel  = config.groupPurpose === 'presentation' ? 'Presentation Groups' : 'Project Groups';
        const dateStr       = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        const modeLabel     = config.genderMode === 'separate' ? 'Separate (Boys / Girls)' :
                              config.genderMode === 'mixed'    ? 'Mixed (Boys & Girls)' : 'Random';

        // ── Document Header ──
        excelData.push([purposeLabel]);
        excelData.push(['Department:', config.department || '—', '', 'Date:', dateStr]);
        excelData.push(['Subject:',    config.subjectName || '—']);
        excelData.push(['Semester:',   config.semester    || '—']);
        if (config.existingGroup) excelData.push(['Section / Class:', config.existingGroup]);
        excelData.push(['Grouping Mode:', modeLabel]);
        excelData.push([`Total Students: ${students.length}`, '', `Total Groups: ${groups.length}`]);
        excelData.push([]);

        // ── Table Header ──
        excelData.push(['Group No', 'S.No', 'Student Name', 'Registration Number', 'Gender']);
        
        groups.forEach((group, gIdx) => {
            const tag = group.genderTag || 'mixed';
            const tagLabel = tag === 'boys' ? 'Boys Only' : tag === 'girls' ? 'Girls Only' : 'Mixed';
            group.forEach((student, sIdx) => {
                excelData.push([
                    `Group ${gIdx + 1} (${tagLabel})`,
                    sIdx + 1,
                    student.name,
                    student.regNo,
                    student.gender
                ]);
            });
            excelData.push([]);  // blank separator between groups
        });
        
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook  = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, purposeLabel);
        
        // Column widths
        worksheet['!cols'] = [
            { wch: 22 }, { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 12 }
        ];
        
        const subject  = config.subjectName  ? '_' + config.subjectName.replace(/[^a-zA-Z0-9]/g, '_')  : '';
        const dept     = config.department   ? '_' + config.department.replace(/[^a-zA-Z0-9]/g, '_')    : '';
        XLSX.writeFile(workbook, `${purposeLabel.replace(/ /g,'_')}${subject}${dept}.xlsx`);
        
    } catch (e) {
        console.error(e);
        alert('Error exporting Excel spreadsheet.');
    }
});

// EXPORT TO PDF ROUTINES
btnExportPdf.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const purposeLabel  = config.groupPurpose === 'presentation' ? 'Presentation Groups' : 'Project Groups';
        const dateStr       = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        const modeLabel     = config.genderMode === 'separate' ? 'Separate (Boys / Girls)' :
                              config.genderMode === 'mixed'    ? 'Mixed (Boys & Girls)' : 'Random';

        // ── PDF Header Block ──────────────────────────────────────────
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 38, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(purposeLabel, 14, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 220, 255);

        const dept    = config.department   || '—';
        const subject = config.subjectName  || '—';
        const sem     = config.semester     || '—';
        const section = config.existingGroup ? `  |  Section: ${config.existingGroup}` : '';

        doc.text(`Department: ${dept}  |  Subject: ${subject}  |  Semester: ${sem}${section}`, 14, 25);
        doc.text(`Date: ${dateStr}  |  Total Students: ${students.length}  |  Groups: ${groups.length}  |  Mode: ${modeLabel}`, 14, 32);

        // ── Divider ───────────────────────────────────────────────────
        let startY = 46;

        // ── Group Tables ──────────────────────────────────────────────
        groups.forEach((group, index) => {
            if (startY + 45 > 280) {
                doc.addPage();
                startY = 20;
            }

            const tag      = group.genderTag || 'mixed';
            const tagLabel = tag === 'boys' ? 'Boys Only' : tag === 'girls' ? 'Girls Only' : 'Mixed';

            // Group heading
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const headColor = tag === 'boys' ? [6, 182, 212] : tag === 'girls' ? [244, 114, 182] : [99, 102, 241];
            doc.setTextColor(...headColor);
            doc.text(`GROUP ${index + 1}  ·  ${tagLabel}  ·  ${group.length} Students`, 14, startY);

            const rows = group.map((s, idx) => [
                idx + 1,
                s.name,
                s.regNo,
                s.gender
            ]);

            const headFill = tag === 'boys' ? [6, 182, 212] : tag === 'girls' ? [244, 114, 182] : [99, 102, 241];

            doc.autoTable({
                startY: startY + 4,
                head: [['S.No', 'Student Name', 'Registration No.', 'Gender']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: headFill, fontStyle: 'bold', textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 14 },
                    1: { cellWidth: 72 },
                    2: { cellWidth: 60 },
                    3: { cellWidth: 30 }
                },
                margin: { left: 14, right: 14 }
            });

            startY = doc.lastAutoTable.finalY + 14;
        });

        // ── Footer on last page ───────────────────────────────────────
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}  —  Generated by AI Random Group Generator`, 14, 292);
        }

        const safeSubject = config.subjectName ? '_' + config.subjectName.replace(/[^a-zA-Z0-9]/g, '_') : '';
        const safeDept    = config.department   ? '_' + config.department.replace(/[^a-zA-Z0-9]/g, '_')   : '';
        doc.save(`${purposeLabel.replace(/ /g,'_')}${safeSubject}${safeDept}.pdf`);

    } catch (e) {
        console.error(e);
        alert('Error exporting PDF report document.');
    }
});

// App reset
btnResetApp.addEventListener('click', () => {
    if (confirm('Reset the app? This will clear all data and groups.')) {
        students = [];
        groups = [];
        remainingStudents = [];
        currentGroupIndex = 0;
        updateSummaryStats();
        switchView('upload');
        // Reset text fields
        manualTextarea.value = '';
        groupSizeRange.value = 5;
        groupSizeVal.textContent = 5;
        subjectNameInput.value = '';
        departmentInput.value  = '';
        semesterInput.value    = '';
        existingGroupInput.value = '';
        // Reset config
        config.groupSize     = 5;
        config.subjectName   = '';
        config.department    = '';
        config.semester      = '';
        config.existingGroup = '';
        config.groupPurpose  = 'presentation';
        config.genderMode    = 'mixed';
        config.genderBalance = true;
        // Reset purpose cards
        purposeCardPresentation.classList.add('active');
        purposeCardProject.classList.remove('active');
        // Reset gender cards
        genderCardMixed.classList.add('active');
        genderCardSeparate.classList.remove('active');
    }
});

// Helper for security escaping HTML strings
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initial Boot up
document.addEventListener('DOMContentLoaded', () => {
    switchView('upload');
    updateSummaryStats();
});
