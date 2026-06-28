document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const workspaceSection = document.getElementById("workspaceSection");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const fileSizeDisplay = document.getElementById("fileSizeDisplay");
    const btnReset = document.getElementById("btnReset");
    
    // Setting Toggles & Selects
    const chkRemoveTimestamps = document.getElementById("chkRemoveTimestamps");
    const chkCleanTags = document.getElementById("chkCleanTags");
    const chkMergeLines = document.getElementById("chkMergeLines");
    const selParagraphs = document.getElementById("selParagraphs");
    const selHeaders = document.getElementById("selHeaders");
    
    // Download Buttons
    const btnDownloadDocx = document.getElementById("btnDownloadDocx");
    const btnDownloadMd = document.getElementById("btnDownloadMd");
    const btnDownloadTxt = document.getElementById("btnDownloadTxt");
    const btnPrintPdf = document.getElementById("btnPrintPdf");
    
    // Clipboard Copy
    const btnCopyToClipboard = document.getElementById("btnCopyToClipboard");
    
    // Previews
    const cleanedPreview = document.getElementById("cleanedPreview");
    const originalPreview = document.getElementById("originalPreview");
    
    // Tabs
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    // Tool Cards
    const toolCards = document.querySelectorAll(".tool-card");

    // State Variables
    let uploadedFiles = [];
    let activeFileId = null;

    // Files Queue Elements
    const fileListGroup = document.getElementById("fileListGroup");
    const uploadedFilesList = document.getElementById("uploadedFilesList");
    const fileCount = document.getElementById("fileCount");
    const batchDownloadSection = document.getElementById("batchDownloadSection");
    const batchCount = document.getElementById("batchCount");

    // Batch download buttons
    const btnDownloadAllDocx = document.getElementById("btnDownloadAllDocx");
    const btnDownloadAllMd = document.getElementById("btnDownloadAllMd");
    const btnDownloadAllTxt = document.getElementById("btnDownloadAllTxt");

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Check if docx is loaded, if not show spinner and disable button
    function checkDocxLibrary() {
        if (window.docx) {
            btnDownloadDocx.disabled = false;
            btnDownloadDocx.innerHTML = '<i data-lucide="file-text" class="btn-icon"></i> Baixar Documento Word (.docx)';
            if (window.lucide) window.lucide.createIcons();
        } else {
            // Keep checking
            btnDownloadDocx.disabled = true;
            setTimeout(checkDocxLibrary, 300);
        }
    }
    checkDocxLibrary();

    // --- Drag & Drop Event Listeners ---
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    workspaceSection.addEventListener("dragover", (e) => {
        e.preventDefault();
        workspaceSection.classList.add("dragover-workspace");
    });

    workspaceSection.addEventListener("dragleave", () => {
        workspaceSection.classList.remove("dragover-workspace");
    });

    workspaceSection.addEventListener("drop", (e) => {
        e.preventDefault();
        workspaceSection.classList.remove("dragover-workspace");
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    uploadBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // --- Tab Switching ---
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            // Toggle active classes on buttons
            tabBtns.forEach(b => {
                // Keep the copy button intact
                if (b !== btnCopyToClipboard) {
                    b.classList.remove("active");
                }
            });
            btn.classList.add("active");
            
            // Toggle active classes on tab contents
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add("active");
                } else {
                    content.classList.remove("active");
                }
            });

            // Update Copy button text/icon depending on tab
            const copySpan = btnCopyToClipboard.querySelector("span");
            copySpan.textContent = targetTab === "tab-cleaned" ? "Copiar Texto" : "Copiar VTT";
        });
    });

    // --- Settings Change Listeners ---
    const settingsElements = [chkRemoveTimestamps, chkCleanTags, chkMergeLines, selParagraphs, selHeaders];
    settingsElements.forEach(el => {
        el.addEventListener("change", () => {
            if (uploadedFiles.length > 0) {
                processAndPreview();
            }
        });
    });

    // --- Navigation Links Interactions ---
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            
            if (href === "#home") {
                if (workspaceSection.style.display === "block") {
                    e.preventDefault();
                    resetState();
                }
            } else if (href === "#tools") {
                if (workspaceSection.style.display === "block") {
                    e.preventDefault();
                    const downloadCard = document.querySelector(".download-actions-card");
                    downloadCard.classList.remove("highlight");
                    void downloadCard.offsetWidth; // Trigger reflow
                    downloadCard.classList.add("highlight");
                    
                    // Scroll it into view just in case (though it is sticky)
                    downloadCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            }
        });
    });

    // --- Reset ---
    btnReset.addEventListener("click", () => {
        resetState();
    });

    // --- Copy to Clipboard ---
    btnCopyToClipboard.addEventListener("click", () => {
        const activeTab = document.querySelector(".tab-content.active");
        let textToCopy = "";

        if (activeTab.id === "tab-cleaned") {
            // Reconstruct plain text from preview area (ignoring HTML tags if formatted, or simple textContent)
            textToCopy = cleanedPreview.innerText;
        } else {
            textToCopy = originalPreview.textContent;
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("Conteúdo copiado!");
            // Visual micro-feedback on button
            const copyIcon = btnCopyToClipboard.querySelector("i");
            const copySpan = btnCopyToClipboard.querySelector("span");
            const originalIcon = copyIcon.getAttribute("data-lucide");
            const originalText = copySpan.textContent;

            copyIcon.setAttribute("data-lucide", "check");
            copySpan.textContent = "Copiado!";
            if (window.lucide) window.lucide.createIcons();

            setTimeout(() => {
                copyIcon.setAttribute("data-lucide", originalIcon);
                copySpan.textContent = originalText;
                if (window.lucide) window.lucide.createIcons();
            }, 1500);
        }).catch(err => {
            console.error("Falha ao copiar:", err);
            showToast("Falha ao copiar o texto.");
        });
    });

    // --- Downloads ---
    btnDownloadTxt.addEventListener("click", () => {
        const activeFile = uploadedFiles.find(f => f.id === activeFileId);
        if (activeFile && activeFile.convertedData) {
            downloadTextFile(activeFile.name, activeFile.convertedData.text, "txt");
        }
    });

    btnDownloadMd.addEventListener("click", () => {
        const activeFile = uploadedFiles.find(f => f.id === activeFileId);
        if (activeFile && activeFile.convertedData) {
            downloadTextFile(activeFile.name, activeFile.convertedData.markdown, "md");
        }
    });

    btnDownloadDocx.addEventListener("click", () => {
        const activeFile = uploadedFiles.find(f => f.id === activeFileId);
        if (activeFile && activeFile.convertedData) {
            downloadDocx(activeFile.name, activeFile.convertedData.docxItems);
        }
    });

    btnPrintPdf.addEventListener("click", () => {
        // Automatically switch to Cleaned tab first to print clean content
        const cleanedTabBtn = document.querySelector('[data-tab="tab-cleaned"]');
        if (cleanedTabBtn) {
            cleanedTabBtn.click();
        }
        window.print();
    });

    // --- Batch Downloads ---
    function getCurrentOptions() {
        return {
            removeTimestamps: chkRemoveTimestamps.checked,
            cleanTags: chkCleanTags.checked,
            mergeLines: chkMergeLines.checked,
            paragraphSize: selParagraphs.value,
            intervalMinutes: selHeaders.value
        };
    }

    btnDownloadAllTxt.addEventListener("click", () => {
        const options = getCurrentOptions();
        uploadedFiles.forEach((file, index) => {
            const data = convertVTT(file.rawContent, options, file.isTxt);
            setTimeout(() => {
                downloadTextFile(file.name, data.text, "txt");
            }, index * 300);
        });
        showToast(`Iniciando download de ${uploadedFiles.length} arquivos txt...`);
    });

    btnDownloadAllMd.addEventListener("click", () => {
        const options = getCurrentOptions();
        uploadedFiles.forEach((file, index) => {
            const data = convertVTT(file.rawContent, options, file.isTxt);
            setTimeout(() => {
                downloadTextFile(file.name, data.markdown, "md");
            }, index * 300);
        });
        showToast(`Iniciando download de ${uploadedFiles.length} arquivos md...`);
    });

    btnDownloadAllDocx.addEventListener("click", () => {
        if (!window.docx) {
            showToast("A biblioteca Word (docx) ainda está carregando. Por favor, aguarde.");
            return;
        }
        const options = getCurrentOptions();
        uploadedFiles.forEach((file, index) => {
            const data = convertVTT(file.rawContent, options, file.isTxt);
            setTimeout(() => {
                downloadDocx(file.name, data.docxItems);
            }, index * 450); // slightly larger delay for docx zip compilation
        });
        showToast(`Iniciando download de ${uploadedFiles.length} arquivos docx...`);
    });

    // --- Tools Grid Interactivity ---
    toolCards.forEach(card => {
        card.addEventListener("click", () => {
            const format = card.getAttribute("data-target-format");
            
            if (uploadedFiles.length > 0) {
                // If file is already uploaded, trigger download directly!
                if (format === "txt") {
                    btnDownloadTxt.click();
                } else if (format === "md") {
                    btnDownloadMd.click();
                } else if (format === "docx") {
                    if (btnDownloadDocx.disabled) {
                        showToast("A biblioteca Word (docx) ainda está carregando. Por favor, aguarde.");
                    } else {
                        btnDownloadDocx.click();
                    }
                } else if (format === "pdf") {
                    btnPrintPdf.click();
                }
            } else {
                // Scroll to upload card and shake it to call attention
                const uploadCard = document.getElementById("uploadCard");
                document.getElementById("heroSection").scrollIntoView({ behavior: "smooth" });
                
                // Add shake animation
                setTimeout(() => {
                    uploadCard.style.transform = "scale(1.05)";
                    uploadCard.style.boxShadow = "0 20px 25px -5px rgba(239, 68, 68, 0.25)";
                    dropzone.style.borderColor = "var(--primary)";
                    
                    setTimeout(() => {
                        uploadCard.style.transform = "";
                        uploadCard.style.boxShadow = "";
                        dropzone.style.borderColor = "";
                    }, 800);
                }, 400);

                showToast("Por favor, carregue um arquivo VTT primeiro.");
            }
        });
    });

    // --- Core File Handling ---
    function handleFiles(filesList) {
        const filePromises = [];
        
        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i];
            if (!file.name.endsWith(".vtt") && !file.name.endsWith(".txt")) {
                showToast(`Arquivo "${file.name}" ignorado: formato inválido.`);
                continue;
            }
            
            // Check if file already exists in queue to avoid duplicates
            if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue; 
            }

            const promise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    const isTxt = file.name.endsWith(".txt") || (!content.trim().startsWith("WEBVTT") && !content.includes("-->"));
                    resolve({
                        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        size: file.size,
                        formattedSize: formatBytes(file.size),
                        rawContent: content,
                        isTxt: isTxt,
                        convertedData: null
                    });
                };
                reader.readAsText(file);
            });
            filePromises.push(promise);
        }

        if (filePromises.length === 0) return;

        Promise.all(filePromises).then((newFiles) => {
            const isFirstUpload = uploadedFiles.length === 0;
            
            // Add new files to our list
            uploadedFiles = [...uploadedFiles, ...newFiles];
            
            if (isFirstUpload) {
                // Set first file active
                activeFileId = newFiles[0].id;
            }

            // Update UI view states
            document.getElementById("heroSection").style.display = "none";
            document.getElementById("tools").style.display = "none";
            workspaceSection.style.display = "block";
            
            // Render file list & update preview
            renderFileList();
            processAndPreview();
            
            fileInput.value = ""; // Clear file input value to allow re-uploading the same file
            
            window.scrollTo({ top: 0, behavior: "smooth" });
            showToast(`${newFiles.length} arquivo(s) carregado(s)!`);
        });
    }

    function renderFileList() {
        uploadedFilesList.innerHTML = "";
        
        if (uploadedFiles.length >= 1) {
            fileListGroup.style.display = "flex";
            fileCount.textContent = uploadedFiles.length;
            if (uploadedFiles.length > 1) {
                batchDownloadSection.style.display = "block";
                batchCount.textContent = uploadedFiles.length;
            } else {
                batchDownloadSection.style.display = "none";
            }
        } else {
            fileListGroup.style.display = "none";
            batchDownloadSection.style.display = "none";
        }

        // Bind the "+ Adicionar" button in the queue header
        const btnAddMoreFiles = document.getElementById("btnAddMoreFiles");
        if (btnAddMoreFiles) {
            btnAddMoreFiles.onclick = (e) => {
                e.preventDefault();
                fileInput.click();
            };
        }

        uploadedFiles.forEach(file => {
            const isActive = file.id === activeFileId;
            const fileItem = document.createElement("div");
            fileItem.className = `file-item ${isActive ? 'active' : ''}`;
            fileItem.setAttribute("data-id", file.id);
            
            const iconName = file.isTxt ? "file-text" : "file";
            const typeBadge = file.isTxt ? "TXT" : "VTT";
            
            fileItem.innerHTML = `
                <div class="file-item-info">
                    <i data-lucide="${iconName}" class="file-item-icon"></i>
                    <span class="file-item-name" title="${file.name}">${file.name}</span>
                    <span class="file-item-size">${typeBadge} &bull; ${file.formattedSize}</span>
                </div>
                <button class="btn-delete-file" title="Remover da fila">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            `;
            
            // Clicking item selects active file
            fileItem.querySelector(".file-item-info").addEventListener("click", () => {
                activeFileId = file.id;
                renderFileList();
                processAndPreview();
            });
            
            // Delete button click
            fileItem.querySelector(".btn-delete-file").addEventListener("click", (e) => {
                e.stopPropagation(); // Avoid selecting it before deleting
                removeFile(file.id);
            });
            
            uploadedFilesList.appendChild(fileItem);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function removeFile(id) {
        const index = uploadedFiles.findIndex(f => f.id === id);
        if (index === -1) return;
        
        uploadedFiles.splice(index, 1);
        
        if (uploadedFiles.length === 0) {
            resetState();
            return;
        }
        
        if (activeFileId === id) {
            // Set active to first remaining
            activeFileId = uploadedFiles[0].id;
        }
        
        renderFileList();
        processAndPreview();
        showToast("Arquivo removido.");
    }

    function resetState() {
        uploadedFiles = [];
        activeFileId = null;
        fileInput.value = ""; // Reset file input
        
        document.getElementById("heroSection").style.display = "block";
        document.getElementById("tools").style.display = "block";
        workspaceSection.style.display = "none";
        
        cleanedPreview.innerHTML = "";
        originalPreview.textContent = "";
        
        // Hide file list container
        fileListGroup.style.display = "none";
        batchDownloadSection.style.display = "none";
    }

    // --- Processing & Rendering ---
    function processAndPreview() {
        const activeFile = uploadedFiles.find(f => f.id === activeFileId);
        if (!activeFile) return;

        // Set filenames and UI details
        fileNameDisplay.textContent = activeFile.name;
        fileSizeDisplay.textContent = `${activeFile.isTxt ? 'Ata de Reunião (.txt)' : 'Legenda WebVTT (.vtt)'} &bull; ${activeFile.formattedSize}`;

        // Settings object
        const options = {
            removeTimestamps: chkRemoveTimestamps.checked,
            cleanTags: chkCleanTags.checked,
            mergeLines: chkMergeLines.checked,
            paragraphSize: selParagraphs.value,
            intervalMinutes: selHeaders.value
        };

        // Convert
        activeFile.convertedData = convertVTT(activeFile.rawContent, options, activeFile.isTxt);

        // Render Original VTT
        originalPreview.textContent = activeFile.rawContent;

        // Render Cleaned HTML preview
        renderCleanedPreview(activeFile.convertedData.markdown);
    }


    function renderCleanedPreview(markdownText) {
        // Standard markdown rendering helper (simple client-side formatter)
        let html = markdownText;
        
        // Escape HTML tags to show them properly if raw, but here we render formatted structure
        // 1. Replace section headers: ### [05:00] -> <h3>[05:00]</h3>
        html = html.replace(/^###\s+([^\n]+)/gm, "<h3>$1</h3>");
        
        // 2. Replace speaker bold names: **Speaker:** -> <strong>Speaker:</strong>
        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        
        // 3. Replace timestamps italicized: *[05:00]* -> <em>[05:00]</em>
        html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        
        // 4. Group remaining text segments into paragraphs
        const paragraphs = html.split(/\n\n+/);
        const formattedParas = paragraphs.map(p => {
            if (p.startsWith("<h3>")) {
                return p; // Headings are already formatted
            }
            return `<p>${p}</p>`;
        });

        cleanedPreview.innerHTML = formattedParas.join("");
    }

    // --- meeting text transcript parser ---
    function timeStringToSeconds(timeStr) {
        timeStr = timeStr.trim().toLowerCase();
        
        let isPM = timeStr.includes("pm");
        let isAM = timeStr.includes("am");
        
        let cleanTime = timeStr.replace(/\s*(?:am|pm)/g, "").trim();
        cleanTime = cleanTime.replace(/[\[\]()]/g, "").trim();
        
        const parts = cleanTime.split(":");
        let hrs = 0, mins = 0, secs = 0;
        
        if (parts.length === 3) {
            hrs = parseInt(parts[0], 10);
            mins = parseInt(parts[1], 10);
            secs = parseFloat(parts[2]);
        } else if (parts.length === 2) {
            hrs = 0;
            mins = parseInt(parts[0], 10);
            secs = parseFloat(parts[1]);
        } else {
            const val = parseFloat(cleanTime);
            return isNaN(val) ? 0 : val;
        }
        
        if (isPM && hrs < 12) hrs += 12;
        if (isAM && hrs === 12) hrs = 0;
        
        return hrs * 3600 + mins * 60 + secs;
    }

    function formatSecondsToTime(totalSecs) {
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = Math.floor(totalSecs % 60);
        
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function parseTextTranscript(text) {
        const lines = text.split(/\r?\n/);
        const cues = [];
        let currentCue = null;

        const regex1 = /^\[(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\]\s+([^:\n]+):?$/i;
        const regex2 = /^([^:\[\n]+)\s+\[(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\]:?$/i;
        const regex3 = /^([^:\[\n]+)\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?):?$/i;
        const regex4 = /^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s+([^:\n]+):?$/i;
        const regex5 = /^([^:\n]{1,40}):$/;
        const regexTimestampOnly = /^[\(\[]?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)[\)\]]?$/i;

        let baseTimeSec = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === "") continue;

            let match = null;
            let speaker = "";
            let timestamp = "";

            if ((match = line.match(regex1))) {
                timestamp = match[1];
                speaker = match[2].trim();
            } else if ((match = line.match(regex2))) {
                speaker = match[1].trim();
                timestamp = match[2];
            } else if ((match = line.match(regex3))) {
                const possibleTime = match[2].trim();
                if (possibleTime.includes(":") || possibleTime.toLowerCase().includes("am") || possibleTime.toLowerCase().includes("pm")) {
                    speaker = match[1].trim();
                    timestamp = possibleTime;
                }
            } else if ((match = line.match(regex4))) {
                timestamp = match[1];
                speaker = match[2].trim();
            } else if ((match = line.match(regexTimestampOnly))) {
                const tempTime = match[1];
                if (currentCue && (!currentCue.start || currentCue.start === "00:00" || currentCue.isFallbackStart)) {
                    currentCue.start = tempTime;
                    currentCue.isFallbackStart = false;
                    const sec = timeStringToSeconds(tempTime);
                    if (baseTimeSec === null) baseTimeSec = sec;
                    currentCue.startTimeSec = Math.max(0, sec - baseTimeSec);
                    currentCue.endTimeSec = currentCue.startTimeSec + 5;
                }
                continue;
            } else if ((match = line.match(regex5))) {
                const name = match[1].trim();
                if (name && !name.startsWith("#") && !name.startsWith("<")) {
                    speaker = name;
                }
            }

            if (speaker || timestamp) {
                let startTimeSec = 0;
                if (timestamp) {
                    startTimeSec = timeStringToSeconds(timestamp);
                    if (baseTimeSec === null) {
                        baseTimeSec = startTimeSec;
                    }
                    startTimeSec = Math.max(0, startTimeSec - baseTimeSec);
                } else {
                    const lastCue = cues[cues.length - 1];
                    startTimeSec = lastCue ? lastCue.startTimeSec + 10 : 0;
                }

                currentCue = {
                    id: 'cue-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    start: timestamp || formatSecondsToTime(startTimeSec),
                    isFallbackStart: !timestamp,
                    end: "",
                    startTimeSec: startTimeSec,
                    endTimeSec: startTimeSec + 5,
                    speaker: speaker,
                    textLines: []
                };
                cues.push(currentCue);
            } else {
                if (currentCue) {
                    currentCue.textLines.push(line);
                } else if (cues.length === 0) {
                    currentCue = {
                        id: 'cue-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        start: "00:00",
                        isFallbackStart: true,
                        end: "",
                        startTimeSec: 0,
                        endTimeSec: 5,
                        speaker: "",
                        textLines: [line]
                    };
                    cues.push(currentCue);
                } else {
                    cues[cues.length - 1].textLines.push(line);
                }
            }
        }

        cues.forEach(cue => {
            cue.text = cue.textLines.join(" ").trim();
        });

        return cues;
    }

    // --- VTT Parser & Converters ---
    function convertVTT(vttText, options, isTxt = false) {
        const cues = isTxt ? parseTextTranscript(vttText) : parseVTT(vttText);
        if (cues.length === 0) return { text: "", markdown: "", docxItems: [] };

        const cleanTimestamps = options.removeTimestamps;
        const cleanTags = options.cleanTags;
        const mergeLines = options.mergeLines;
        const paragraphSize = options.paragraphSize;
        const intervalMinutes = options.intervalMinutes;

        // First pass: clean cue texts and extract speakers
        const processedCues = cues.map(cue => {
            let text = cue.textLines.join(" ").trim();
            let speaker = cue.speaker || "";

            if (!isTxt) {
                // Extract speaker from voice tags
                const voiceMatch = text.match(/<v\s+([^>]+)>/i);
                if (voiceMatch) {
                    speaker = voiceMatch[1].trim();
                    text = text.replace(/<v\s+[^>]+>/gi, "").replace(/<\/v>/gi, "");
                } else {
                    // Check if text starts with "Speaker: " or "Speaker Name:"
                    const prefixMatch = text.match(/^([^:\r\n\t]+):/);
                    // Limit speaker name length to 35 chars to avoid normal punctuation
                    if (prefixMatch && prefixMatch[1].length < 35 && !prefixMatch[1].includes("http") && !prefixMatch[1].includes("www")) {
                        speaker = prefixMatch[1].trim();
                        text = text.substring(prefixMatch[0].length).trim();
                    }
                }
            }

            if (cleanTags) {
                // Remove all formatting tags
                text = text.replace(/<\/?[^>]+>/g, "");
                // Decode HTML entities
                text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
            }

            return {
                ...cue,
                cleanedText: text,
                speaker: speaker
            };
        });

        // Group into paragraphs
        const paragraphs = [];
        let currentParagraph = {
            speaker: processedCues[0].speaker,
            cues: [],
            text: "",
            startTimestamp: processedCues[0].start,
            startTimeSec: processedCues[0].startTimeSec,
            header: null
        };

        let lastHeaderSec = -9999;
        const intervalSecs = intervalMinutes !== "none" ? parseInt(intervalMinutes) * 60 : 0;

        for (let i = 0; i < processedCues.length; i++) {
            const cue = processedCues[i];
            const prevCue = i > 0 ? processedCues[i - 1] : null;
            let cueText = cue.cleanedText.replace(/\s+/g, " ");

            // Check if we should insert a timestamp header
            let insertHeader = false;
            let headerLabel = "";
            if (intervalSecs > 0) {
                const currentIntervalIndex = Math.floor(cue.startTimeSec / intervalSecs);
                const lastIntervalIndex = Math.floor(lastHeaderSec / intervalSecs);
                if (currentIntervalIndex > lastIntervalIndex || lastHeaderSec === -9999) {
                    insertHeader = true;
                    lastHeaderSec = cue.startTimeSec;
                    
                    const hrs = Math.floor(cue.startTimeSec / 3600);
                    const mins = Math.floor((cue.startTimeSec % 3600) / 60);
                    const secs = Math.floor(cue.startTimeSec % 60);
                    
                    if (hrs > 0) {
                        headerLabel = `[${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
                    } else {
                        headerLabel = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
                    }
                }
            }

            // Decide if we should force a new paragraph
            let startNewPara = false;
            
            if (i === 0) {
                startNewPara = false;
            } else if (insertHeader) {
                startNewPara = true;
            } else if (cue.speaker !== currentParagraph.speaker && (cue.speaker !== "" || currentParagraph.speaker !== "")) {
                startNewPara = true;
            } else if (prevCue && (cue.startTimeSec - prevCue.endTimeSec) > 5.0) {
                // Silence gap of more than 5 seconds
                startNewPara = true;
            } else if (mergeLines) {
                const prevText = currentParagraph.text.trim();
                const lastChar = prevText.slice(-1);
                const isSentenceEnd = [".", "?", "!", '"', "”", ")"].includes(lastChar);

                if (isSentenceEnd) {
                    const sentenceCount = prevText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
                    
                    if (paragraphSize === "short" && sentenceCount >= 2) {
                        startNewPara = true;
                    } else if (paragraphSize === "medium" && sentenceCount >= 5) {
                        startNewPara = true;
                    } else if (paragraphSize === "long" && sentenceCount >= 8) {
                        startNewPara = true;
                    }
                }
            } else {
                // Without line merging, every VTT block becomes its own paragraph
                startNewPara = true;
            }

            if (startNewPara) {
                if (currentParagraph.cues.length > 0) {
                    paragraphs.push(currentParagraph);
                }
                currentParagraph = {
                    speaker: cue.speaker || (paragraphSize === "speaker" ? "" : (prevCue ? currentParagraph.speaker : "")),
                    cues: [cue],
                    text: cueText,
                    startTimestamp: cue.start,
                    startTimeSec: cue.startTimeSec,
                    header: insertHeader ? headerLabel : null
                };
            } else {
                currentParagraph.cues.push(cue);
                if (currentParagraph.text === "") {
                    currentParagraph.text = cueText;
                } else {
                    currentParagraph.text += " " + cueText;
                }
                if (insertHeader && !currentParagraph.header) {
                    currentParagraph.header = headerLabel;
                }
            }
        }

        if (currentParagraph.cues.length > 0) {
            paragraphs.push(currentParagraph);
        }

        return generateFormats(paragraphs, cleanTimestamps);
    }

    function parseVTT(vttText) {
        const lines = vttText.split(/\r?\n/);
        const cues = [];
        let currentCue = null;
        let potentialId = "";

        const timestampRegex = /(\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(\d{2}:)?\d{2}:\d{2}\.\d{3}/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line === "") {
                currentCue = null;
                continue;
            }

            if (line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
                continue;
            }

            const match = line.match(timestampRegex);
            if (match) {
                const times = line.split("-->");
                const startStr = times[0].trim();
                const endStr = times[1].trim().split(/\s+/)[0];

                currentCue = {
                    id: potentialId,
                    start: startStr,
                    end: endStr,
                    startTimeSec: timeToSeconds(startStr),
                    endTimeSec: timeToSeconds(endStr),
                    textLines: []
                };
                cues.push(currentCue);
                potentialId = "";
            } else {
                if (currentCue) {
                    currentCue.textLines.push(line);
                } else {
                    potentialId = line;
                }
            }
        }
        return cues;
    }

    function timeToSeconds(timeStr) {
        const parts = timeStr.trim().split(":");
        let hrs = 0, mins = 0, secs = 0;
        if (parts.length === 3) {
            hrs = parseFloat(parts[0]);
            mins = parseFloat(parts[1]);
            secs = parseFloat(parts[2]);
        } else if (parts.length === 2) {
            mins = parseFloat(parts[0]);
            secs = parseFloat(parts[1]);
        }
        return hrs * 3600 + mins * 60 + secs;
    }

    function generateFormats(paragraphs, cleanTimestamps) {
        let textOut = [];
        let mdOut = [];
        let docxItems = [];

        paragraphs.forEach((p) => {
            const speakerPrefix = p.speaker ? `${p.speaker}: ` : "";
            const mdSpeakerPrefix = p.speaker ? `**${p.speaker}:** ` : "";
            
            // Handle Interval Header
            if (p.header && !cleanTimestamps) {
                textOut.push(`\n${p.header}\n`);
                mdOut.push(`\n### ${p.header}\n`);
                docxItems.push({
                    type: "heading",
                    text: p.header
                });
            }

            // Paragraph level timestamp if cleanTimestamps is false AND we didn't write an interval header
            let timeLabel = "";
            let mdTimeLabel = "";
            if (!cleanTimestamps && !p.header) {
                const hrs = Math.floor(p.startTimeSec / 3600);
                const mins = Math.floor((p.startTimeSec % 3600) / 60);
                const secs = Math.floor(p.startTimeSec % 60);
                const timeStr = hrs > 0 
                    ? `[${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}] `
                    : `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}] `;
                
                timeLabel = timeStr;
                mdTimeLabel = `*${timeStr}* `;
            }

            // Plain Text
            textOut.push(`${timeLabel}${speakerPrefix}${p.text}`);

            // Markdown
            mdOut.push(`${mdTimeLabel}${mdSpeakerPrefix}${p.text}`);

            // Word Docx items
            docxItems.push({
                type: "paragraph",
                speaker: p.speaker,
                time: !cleanTimestamps && !p.header ? timeLabel.trim() : "",
                text: p.text
            });
        });

        return {
            text: textOut.join("\n\n"),
            markdown: mdOut.join("\n\n"),
            docxItems: docxItems
        };
    }

    // --- Helpers & Downloads ---
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }

    function downloadTextFile(fileName, content, extension) {
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const downloadName = `${baseName}_clean.${extension}`;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadDocx(fileName, docxItems) {
        if (!window.docx) {
            showToast("A biblioteca Word (docx) ainda está carregando. Tente novamente.");
            return;
        }

        const { Document, Paragraph, TextRun, Packer, HeadingLevel } = window.docx;
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const downloadName = `${baseName}_clean.docx`;

        const children = [];

        // Title
        children.push(new Paragraph({
            text: baseName.replace(/_/g, ' '),
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 240 }
        }));

        // Metadata block
        children.push(new Paragraph({
            children: [
                new TextRun({ text: "Transcrição gerada automaticamente por VTTConvert\n", italic: true, color: "555555" }),
                new TextRun({ text: `Data da conversão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n`, italic: true, color: "555555" })
            ],
            spacing: { after: 360 }
        }));

        // Build paragraphs
        docxItems.forEach(item => {
            if (item.type === "heading") {
                children.push(new Paragraph({
                    text: item.text,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 240, after: 120 }
                }));
            } else {
                const paragraphChildren = [];

                if (item.time) {
                    paragraphChildren.push(new TextRun({
                        text: `${item.time} `,
                        color: "888888",
                        italic: true
                    }));
                }

                if (item.speaker) {
                    paragraphChildren.push(new TextRun({
                        text: `${item.speaker}: `,
                        bold: true,
                        color: "1d4ed8" // Royal blue accent color for speaker tags
                    }));
                }

                paragraphChildren.push(new TextRun({
                    text: item.text
                }));

                children.push(new Paragraph({
                    children: paragraphChildren,
                    spacing: { after: 180 },
                    lineRule: "auto",
                    lineSpacing: 240 // 1.5 spacing
                }));
            }
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Documento Word baixado!");
        }).catch(err => {
            console.error("Erro ao gerar docx:", err);
            showToast("Erro ao gerar documento do Word.");
        });
    }

    // --- Toast Notifications ---
    function showToast(message) {
        // Remove existing toast if any
        const existingToast = document.querySelector(".toast-msg");
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement("div");
        toast.className = "toast-msg";
        toast.innerHTML = `<i data-lucide="info" style="width:16px;height:16px;"></i><span>${message}</span>`;
        document.body.appendChild(toast);
        
        if (window.lucide) window.lucide.createIcons();

        // Trigger transition
        setTimeout(() => {
            toast.classList.add("show");
        }, 50);

        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
});
