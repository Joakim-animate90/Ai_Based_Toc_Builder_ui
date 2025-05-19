document.addEventListener("DOMContentLoaded", function () {
    const elements = {
        batchUploadArea: document.getElementById("batchDropzone"), // Updated to match HTML ID
        batchImageInput: document.getElementById("batchImageInput"),
        batchFileList: document.getElementById("batchFileList"),
        batchProcessBtn: document.getElementById("batchProcessBtn"),
        batchProgress: document.getElementById("batchProgress"),
        batchProgressBar: document.getElementById("batchProgressBar"),
        batchProgressCount: document.getElementById("batchProgressCount")
    };

    const state = {
        files: [],
        processing: false
    };

    function initializeBatchUpload() {
        if (!elements.batchUploadArea || !elements.batchImageInput) {
            console.error("Required batch upload elements not found");
            return;
        }

        setupBatchEventListeners();
    }

    function setupBatchEventListeners() {
        // File input change handler
        elements.batchImageInput.addEventListener("change", handleFileSelect);

        // Make batchUploadArea clickable to trigger file input
        if (elements.batchUploadArea) {
            elements.batchUploadArea.addEventListener("click", (e) => {
                // Prevent default only if we're directly clicking the upload area (not a child button)
                if (e.target === elements.batchUploadArea || 
                    e.target.closest('#batchDropzone') && !e.target.closest('button')) {
                    console.log("Batch dropzone clicked, opening file dialog");
                    e.preventDefault();
                    e.stopPropagation();
                    elements.batchImageInput.click();
                }
            });
        }

        // Drag and drop handlers
        elements.batchUploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.batchUploadArea.classList.add("border-indigo-500");
        });

        elements.batchUploadArea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.batchUploadArea.classList.remove("border-indigo-500");
        });

        elements.batchUploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            elements.batchUploadArea.classList.remove("border-indigo-500");
            
            if (e.dataTransfer.files.length) {
                handleFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });

        // Process button handler - prevent default form submission
        elements.batchProcessBtn.addEventListener("click", (e) => {
            e.preventDefault();
            processBatch();
        });
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => {
            const isImage = file.type.startsWith("image/");
            const isPdf = file.type === "application/pdf";
            const isDoc = file.type === "application/msword" || 
                         file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                          file.name.toLowerCase().endsWith('.heif');
            
            // Check file extension as a fallback for PDFs that might not have the correct MIME type
            const ext = file.name.split('.').pop().toLowerCase();
            const isPdfByExt = ext === 'pdf';
            const isDocByExt = ['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext);
            
            return isImage || isPdf || isDoc || isHeic || isPdfByExt || isDocByExt;
        });
        
        if (files.length === 0) {
            alert("Please select valid files (images, PDFs, or documents)");
            return;
        }
    
        state.files = files;
        updateFileList();
        elements.batchProcessBtn.disabled = false;
    }

    function updateFileList() {
        elements.batchFileList.innerHTML = state.files.map((file, index) => `
            <div class="flex items-center justify-between py-2">
                <div class="flex items-center">
                    <span class="text-sm font-medium transition-colors" 
                          :class="{ 'text-darkTextPrimary': darkMode, 'text-gray-900': !darkMode }">
                        ${file.name}
                    </span>
                    <span class="ml-2 text-sm transition-colors" 
                          :class="{ 'text-darkTextSecondary': darkMode, 'text-gray-500': !darkMode }">
                        (${(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                </div>
                <button onclick="removeFile(${index})" 
                        class="transition-colors hover:text-red-700"
                        :class="{ 'text-red-400': darkMode, 'text-red-500': !darkMode }">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `).join("");
        
        elements.batchFileList.classList.remove("hidden");
    }

    window.removeFile = function(index) {
        state.files.splice(index, 1);
        updateFileList();
        elements.batchProcessBtn.disabled = state.files.length === 0;
    };

    async function processBatch() {
        if (state.processing || state.files.length === 0) return;

        state.processing = true;
        elements.batchProcessBtn.disabled = true;
        elements.batchProgress.classList.remove('hidden');
        
        // Check for large files in the batch
        const largeFiles = state.files.filter(file => file.size > 100 * 1024 * 1024); // Files larger than 100MB
        if (largeFiles.length > 0) {
            console.log(`Processing ${largeFiles.length} large files:`);
            largeFiles.forEach(file => {
                console.log(`- ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
            });
        }

        const options = getProcessingOptions();

        if (options.mode === 'merge-pdf') {
            await processMergePDF(options);
        } else {
            await processIndividualFiles(options);
        }

        state.processing = false;
        elements.batchProcessBtn.disabled = false;
        resetBatchUpload();
    }

    function getProcessingOptions() {
        const processingMode = document.querySelector('input[name="processing-mode"]:checked').value;
        
        if (processingMode === 'merge-pdf') {
            return {
                mode: 'merge-pdf',
                pageSize: document.getElementById('pdfPageSize').value,
                orientation: document.getElementById('pdfOrientation').value,
                imagesPerPage: document.getElementById('imagesPerPage').value
            };
        }
        
        return {
            mode: 'individual',
            format: document.getElementById('batchFormatSelect')?.value || 'jpeg',
            // quality: document.getElementById('batchQualitySelect')?.value || 'medium',
            width: document.getElementById('batchWidthInput')?.value || '',
            height: document.getElementById('batchHeightInput')?.value || '',
            // optimize: document.getElementById('batchOptimize')?.checked || false
        };
    }

    async function processIndividualFiles(options) {
        const total = state.files.length;
        let processed = 0;
        let errors = [];

        try {
            for (const file of state.files) {
                const formData = new FormData();
                formData.append("image", file);
                
                // Add processing options
                for (const [key, value] of Object.entries(options)) {
                    formData.append(key, value);
                }

                try {
                    await processFile(formData);
                    processed++;
                } catch (error) {
                    errors.push(`Failed to process ${file.name}: ${error.message}`);
                }
                
                updateProgress(processed, total);
            }

            if (errors.length > 0) {
                alert(`Batch processing completed with ${errors.length} errors:\n${errors.join('\n')}`);
            } else {
                alert("Batch processing completed successfully!");
            }
        } catch (error) {
            console.error("Batch processing error:", error);
            alert("An error occurred during batch processing");
        }
    }

    async function processMergePDF(options) {
        const formData = new FormData();
        state.files.forEach((file, index) => {
            formData.append(`files[]`, file);
        });
        
        // Add batch options
        formData.append('mode', 'combined');
        formData.append('max_pages', 20); // Optional parameter for TOC extraction
        
        try {
            // Use the FastAPI batch endpoint
            const response = await fetch('/api/process-batch', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Batch TOC extraction failed');
            }

            // Parse the JSON response
            const result = await response.json();
            
            // Display combined TOC results
            displayBatchResults(result);
            
            return true;
        } catch (error) {
            console.error('Error processing batch:', error);
            alert('Failed to process batch: ' + error.message);
            throw error;
        }
    }
    
    async function processFile(formData) {
        // Make sure we have the right file parameter name
        const file = formData.get('image');
        if (file) {
            formData.delete('image');
            formData.append('file', file);
        }
        
        // Add max_pages parameter if needed
        if (!formData.has('max_pages')) {
            formData.append('max_pages', 20);
        }
        
        try {
            // Use the FastAPI extraction endpoint
            const response = await fetch('/extract', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'TOC extraction failed');
            }

            // Parse JSON response
            const result = await response.json();
            return {
                success: true,
                filename: file ? file.name : 'document.pdf',
                toc_content: result.toc_content,
                result: result
            };
        } catch (error) {
            console.error(`Error processing file: ${error.message}`);
            throw error;
        }
    }

    function getContentType(format) {
        const contentTypes = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'heic': 'image/heic',
            'heif': 'image/heif',
            'pdf': 'application/pdf'
        };
        return contentTypes[format] || 'application/octet-stream';
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function displayBatchResults(result) {
        // Find or create results container
        let resultsContainer = document.getElementById('results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'results';
            resultsContainer.className = 'mt-6 space-y-6 rounded-lg shadow p-6';
            resultsContainer.innerHTML = '<h2 class="text-xl font-medium mb-4">Batch TOC Results</h2>';
            document.querySelector('main .max-w-6xl').appendChild(resultsContainer);
        }
        
        // Remove 'hidden' class if it exists
        resultsContainer.classList.remove('hidden');
        
        // Create content for the results
        let batchContent = '';
        
        // Display the combined TOC if available
        if (result.combined_toc && result.combined_toc.length > 0) {
            batchContent += `
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-2">Combined Table of Contents</h3>
                    <div class="border rounded-lg p-4 max-h-96 overflow-y-auto">
                        ${formatTocContent(result.combined_toc)}
                    </div>
                </div>
            `;
        }
        
        // Display individual file results
        if (result.processed_files && result.processed_files.length > 0) {
            batchContent += `
                <div class="mt-4">
                    <h3 class="text-lg font-medium mb-2">Individual Files (${result.processed_files.length})</h3>
                    <div class="space-y-4">
            `;
            
            result.processed_files.forEach((file, index) => {
                batchContent += `
                    <div class="border rounded-lg p-4">
                        <h4 class="font-medium text-primary dark:text-darkPrimary mb-2">${file.filename}</h4>
                        <div class="max-h-60 overflow-y-auto">
                            ${file.toc ? formatTocContent(file.toc) : '<p class="text-gray-500">No TOC content found</p>'}
                        </div>
                    </div>
                `;
            });
            
            batchContent += `
                    </div>
                </div>
            `;
        }
        
        // Display failed files if any
        if (result.failed_files && result.failed_files.length > 0) {
            batchContent += `
                <div class="mt-4">
                    <h3 class="text-lg font-medium mb-2 text-red-500">Failed Files (${result.failed_files.length})</h3>
                    <ul class="list-disc pl-5">
            `;
            
            result.failed_files.forEach(filename => {
                batchContent += `<li>${filename}</li>`;
            });
            
            batchContent += `
                    </ul>
                </div>
            `;
        }
        
        // Add JSON output for debugging/viewing raw data
        batchContent += `
            <div class="mt-6 border rounded-lg p-4 bg-gray-50">
                <h3 class="text-lg font-medium mb-2">API Response (JSON)</h3>
                <pre class="text-sm overflow-x-auto">${JSON.stringify(result, null, 2)}</pre>
            </div>
        `;
        
        // Update the results container with the batch content
        resultsContainer.innerHTML = `
            <h2 class="text-xl font-medium mb-4">Batch TOC Results</h2>
            ${batchContent}
        `;
        
        // Add copy and download buttons
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'mt-4 flex space-x-4';
        actionsContainer.innerHTML = `
            <button id="copyBatchBtn" class="flex-1 py-2 px-4 bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                <span class="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy to Clipboard
                </span>
            </button>
            <button id="downloadBatchBtn" class="flex-1 py-2 px-4 bg-primary text-white rounded hover:bg-primaryDark">
                <span class="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Results
                </span>
            </button>
        `;
        resultsContainer.appendChild(actionsContainer);
        
        // Add event listeners for the buttons
        document.getElementById('copyBatchBtn').addEventListener('click', () => {
            let textToCopy = '';
            
            if (result.combined_toc && result.combined_toc.length > 0) {
                textToCopy += 'COMBINED TABLE OF CONTENTS\n';
                textToCopy += '=========================\n\n';
                textToCopy += formatTocAsText(result.combined_toc);
                textToCopy += '\n\n';
            }
            
            if (result.processed_files && result.processed_files.length > 0) {
                textToCopy += 'INDIVIDUAL FILES\n';
                textToCopy += '===============\n\n';
                
                result.processed_files.forEach((file, index) => {
                    textToCopy += `File: ${file.filename}\n`;
                    textToCopy += '----------\n';
                    if (file.toc) {
                        textToCopy += formatTocAsText(file.toc);
                    } else {
                        textToCopy += 'No TOC content found\n';
                    }
                    textToCopy += '\n\n';
                });
            }
            
            navigator.clipboard.writeText(textToCopy)
                .then(() => alert('Batch TOC results copied to clipboard!'))
                .catch(err => console.error('Error copying batch results: ', err));
        });
        
        document.getElementById('downloadBatchBtn').addEventListener('click', () => {
            let textToDownload = '';
            
            if (result.combined_toc && result.combined_toc.length > 0) {
                textToDownload += 'COMBINED TABLE OF CONTENTS\n';
                textToDownload += '=========================\n\n';
                textToDownload += formatTocAsText(result.combined_toc);
                textToDownload += '\n\n';
            }
            
            if (result.processed_files && result.processed_files.length > 0) {
                textToDownload += 'INDIVIDUAL FILES\n';
                textToDownload += '===============\n\n';
                
                result.processed_files.forEach((file, index) => {
                    textToDownload += `File: ${file.filename}\n`;
                    textToDownload += '----------\n';
                    if (file.toc) {
                        textToDownload += formatTocAsText(file.toc);
                    } else {
                        textToDownload += 'No TOC content found\n';
                    }
                    textToDownload += '\n\n';
                });
            }
            
            const blob = new Blob([textToDownload], { type: 'text/plain' });
            downloadFile(URL.createObjectURL(blob), `batch_toc_results_${new Date().toISOString().slice(0, 10)}.txt`);
        });
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    function formatTocContent(tocContent) {
        // If tocContent is a string, display as is with line breaks converted to <br>
        if (typeof tocContent === 'string') {
            return tocContent.replace(/\n/g, '<br>');
        }
        
        // If tocContent is an array (hierarchical TOC), format as nested list
        if (Array.isArray(tocContent)) {
            let html = '<ul class="list-disc pl-5 space-y-2">';
            
            tocContent.forEach(item => {
                // Handle different possible TOC item formats
                if (typeof item === 'string') {
                    html += `<li>${item}</li>`;
                } else if (typeof item === 'object') {
                    // Format with indentation based on level if available
                    const level = item.level || 1;
                    const title = item.title || item.text || 'Untitled';
                    const page = item.page ? `<span class="text-gray-500 ml-2">p.${item.page}</span>` : '';
                    
                    // Apply indentation based on level
                    const indentClass = level > 1 ? `ml-${(level-1)*4}` : '';
                    html += `<li class="${indentClass}">${title}${page}</li>`;
                }
            });
            
            html += '</ul>';
            return html;
        }
        
        // Default case if format is unknown
        return `<pre>${JSON.stringify(tocContent, null, 2)}</pre>`;
    }
    
    function formatTocAsText(tocContent) {
        // If tocContent is a string, return as is
        if (typeof tocContent === 'string') {
            return tocContent;
        }
        
        // If tocContent is an array (hierarchical TOC), format with indentation
        if (Array.isArray(tocContent)) {
            return tocContent.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object') {
                    const level = item.level || 1;
                    const indent = '  '.repeat(level - 1);
                    const title = item.title || item.text || 'Untitled';
                    const page = item.page ? ` (p.${item.page})` : '';
                    return `${indent}${title}${page}`;
                }
                return '';
            }).join('\n');
        }
        
        // Default case if format is unknown
        return JSON.stringify(tocContent, null, 2);
    }

    function updateProgress(processed, total) {
        const percentage = (processed / total) * 100;
        elements.batchProgressBar.style.width = `${percentage}%`;
        elements.batchProgressCount.textContent = `${processed}/${total} files`;
    }

    function resetBatchUpload() {
        state.files = [];
        elements.batchImageInput.value = "";
        elements.batchFileList.classList.add("hidden");
        elements.batchProgress.classList.add("hidden");
        elements.batchProgressBar.style.width = "0%";
        elements.batchProgressCount.textContent = "0/0 files";
        elements.batchProcessBtn.disabled = true;
    }

    initializeBatchUpload();
});