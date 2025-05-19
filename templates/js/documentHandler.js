document.addEventListener("DOMContentLoaded", function () {
    // Updated element IDs to match the current HTML
    const elements = {
        documentDropzone: document.getElementById("documentDropzone"),
        documentInput: document.getElementById("documentInput"),
        documentPreview: document.getElementById("documentPreview"),
        documentNameDisplay: document.getElementById("documentNameDisplay"),
        documentSizeDisplay: document.getElementById("documentSizeDisplay"),
        removeDocument: document.getElementById("removeDocument"),
        processDocumentBtn: document.getElementById("processDocumentBtn")
    };

    const state = {
        file: null,
        converting: false
    };

    function initializeDocumentConversion() {
        console.log("Initializing document handler");
        console.log("Elements:", elements);
        
        if (!elements.documentDropzone || !elements.documentInput) {
            console.error("Required document elements not found");
            return;
        }

        setupEventListeners();
    }

    function setupEventListeners() {
        console.log("Setting up document event listeners");
        
        // File input change handler
        elements.documentInput.addEventListener("change", handleFileSelect);

        // Make documentDropzone clickable to trigger file input
        let clickTriggered = false;
        elements.documentDropzone.addEventListener("click", (e) => {
            // Only trigger the file input if we're not clicking a button inside the dropzone
            if (e.target === elements.documentDropzone || e.target.closest('#documentDropzone') && !e.target.closest('button')) {
                if (!clickTriggered) {
                    clickTriggered = true;
                    elements.documentInput.click();
                    // Reset the flag after a short delay
                    setTimeout(() => clickTriggered = false, 500);
                }
            }
        });
        
        elements.documentDropzone.addEventListener("dragover", function(e) {
            e.preventDefault();
            this.classList.add("border-primary");
        });
        
        elements.documentDropzone.addEventListener("dragleave", function(e) {
            e.preventDefault();
            this.classList.remove("border-primary");
        });
        
        elements.documentDropzone.addEventListener("drop", function(e) {
            e.preventDefault();
            this.classList.remove("border-primary");
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                elements.documentInput.files = e.dataTransfer.files;
                handleFileSelect({
                    target: elements.documentInput
                });
            }
        });
        
        // Event listener for file input
        elements.documentInput.addEventListener("change", handleFileSelect);
        
        // Event listener for clear button
        elements.clearDocumentBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            resetDocumentConversion();
        });
        
        // Event listener for process button
        elements.processDocumentBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            convertDocument();
        });
    }

    function handleFileSelect(e) {
        console.log("File selected", e);
        const file = e.target.files[0];
        if (!file) {
            console.log("No file selected");
            return;
        }

        console.log("Selected file:", file.name, file.type, file.size);
        const ext = file.name.split('.').pop().toLowerCase();
        const supportedFormats = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'];
        
        if (!supportedFormats.includes(ext)) {
            alert("Please select a supported document format: PDF, DOC, DOCX, ODT, RTF, or TXT");
            return;
        }

        state.file = file;
        updateDocumentInfo();
        elements.processDocumentBtn.disabled = false;
    }

    function updateDocumentInfo() {
        console.log("Updating document info");
        // Show the document preview area
        elements.documentPreview.classList.remove("hidden");
        
        // Update the document name and size display
        elements.documentNameDisplay.textContent = state.file.name;
        elements.documentSizeDisplay.textContent = `${(state.file.size / (1024 * 1024)).toFixed(2)} MB`;
    }

    async function convertDocument() {
        console.log('Convert document function called');
        console.log('State:', { converting: state.converting, file: state.file ? state.file.name : null });
        
        if (state.converting || !state.file) {
            console.log('Early return - state.converting:', state.converting, 'state.file exists:', !!state.file);
            return;
        }

        console.log('Processing document:', state.file.name);
        state.converting = true;
        elements.processDocumentBtn.disabled = true;
        
        // Add loading spinner and text
        elements.processDocumentBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...`
        
        // For large files, show a message
        if (state.file.size > 100 * 1024 * 1024) { // 100MB
            console.log(`Processing large file: ${state.file.name} (${(state.file.size / (1024 * 1024)).toFixed(2)} MB)`); 
        }

        const formData = new FormData();
        formData.append("file", state.file);
        formData.append("filename", state.file.name); 
        formData.append("max_pages", 5); // Optional parameter for TOC extraction
        // Add optional output file name if needed
        // formData.append("output_file", "toc/result.txt");

        try {
            // Using the endpoint matching the HTML example
            const response = await fetch(`${API_BASE_URL}/api/v1/toc/extract-from-browser`, {
                method: "POST",
                body: formData,
                mode: "cors"
                // No need for explicit headers, let the browser handle it
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Server error:", errorData);
                throw new Error(errorData.detail || "TOC extraction failed");
            }

            // Parse JSON response
            const result = await response.json();
            
            // Display the TOC results on the page
            displayTocResults(result);
            
        } catch (error) {
            console.error("TOC extraction error:", error);
            let errorMessage = error.message;
            
            // Check if it's a network error (like the API server is not running)
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Cannot connect to the API server. Please ensure the FastAPI server is running on port 8000.';
                console.log(`Make sure your FastAPI server is running with CORS enabled at ${API_BASE_URL}`);
            }
            
            alert("Failed to extract TOC: " + errorMessage);
        } finally {
            state.converting = false;
            elements.processDocumentBtn.disabled = false;
            elements.processDocumentBtn.innerHTML = 'Submit Document';
        }
    }

    function displayTocResults(result) {
        // Find or create results container
        let resultsContainer = document.getElementById('results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'results';
            resultsContainer.className = 'mt-6 space-y-6 rounded-lg shadow p-6';
            resultsContainer.innerHTML = '<h2 class="text-xl font-medium mb-4">Table of Contents Results</h2>';
            document.querySelector('main .max-w-6xl').appendChild(resultsContainer);
        }
        
        // Remove 'hidden' class if it exists
        resultsContainer.classList.remove('hidden');
        
        // Create TOC display area
        let tocContainer = document.getElementById('tocResults');
        if (!tocContainer) {
            tocContainer = document.createElement('div');
            tocContainer.id = 'tocResults';
            tocContainer.className = 'border rounded-lg p-4 min-h-40 max-h-96 overflow-y-auto';
            resultsContainer.appendChild(tocContainer);
        }
        
        // Format and display the TOC content
        if (result.toc_content && result.toc_content.length > 0) {
            const tocHtml = formatTocContent(result.toc_content);
            tocContainer.innerHTML = tocHtml;
        } else {
            tocContainer.innerHTML = '<p class="text-gray-500">No TOC content found or generated.</p>';
        }
        
        // Add JSON output for debugging/viewing raw data
        let jsonOutput = document.getElementById('jsonOutput');
        if (!jsonOutput) {
            jsonOutput = document.createElement('div');
            jsonOutput.id = 'jsonOutput';
            jsonOutput.className = 'mt-4 border rounded-lg p-4 bg-gray-50';
            resultsContainer.appendChild(jsonOutput);
        }
        
        // Format the JSON response for display
        jsonOutput.innerHTML = `
            <h3 class="text-lg font-medium mb-2">API Response (JSON)</h3>
            <pre class="text-sm overflow-x-auto">${JSON.stringify(result, null, 2)}</pre>
        `;
        
        // Add buttons for copying and downloading if not already present
        if (!document.getElementById('tocActions')) {
            const actionsContainer = document.createElement('div');
            actionsContainer.id = 'tocActions';
            actionsContainer.className = 'mt-4 flex space-x-4';
            actionsContainer.innerHTML = `
                <button id="copyTocBtn" class="flex-1 py-2 px-4 bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                    <span class="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy to Clipboard
                    </span>
                </button>
                <button id="downloadTocBtn" class="flex-1 py-2 px-4 bg-primary text-white rounded hover:bg-primaryDark">
                    <span class="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </span>
                </button>
            `;;
            resultsContainer.appendChild(actionsContainer);
            
            // Add event listeners to the buttons
            document.getElementById('copyTocBtn').addEventListener('click', () => copyTocToClipboard(result.toc_content));
            document.getElementById('downloadTocBtn').addEventListener('click', () => downloadTocAsFile(result.toc_content, state.file.name));
        }
        
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
            let html = '<div class="toc-container space-y-1">';
            
            tocContent.forEach(item => {
                // Handle different possible TOC item formats
                if (typeof item === 'string') {
                    // Simple string item (treat as level 1)
                    html += `<div class="flex items-center py-1 font-medium"><span>${item}</span></div>`;
                } else if (typeof item === 'object') {
                    // Format with indentation based on level if available
                    const level = item.level || 1;
                    const title = item.title || item.text || 'Untitled';
                    const page = item.page ? `<span class="text-gray-500 ml-auto">${item.page}</span>` : '';
                    
                    // Calculate indentation (0.75rem per level after level 1)
                    const indentSize = level > 1 ? (level - 1) * 1.25 : 0;
                    
                    // Style based on heading level
                    let itemClasses = 'flex items-center py-1';
                    let bulletColor = '#000';
                    let titleClasses = '';
                    
                    // Adjust styles based on level
                    if (level === 1) {
                        itemClasses += ' font-bold text-primary dark:text-darkPrimary';
                        titleClasses = 'text-lg';
                    } else if (level === 2) {
                        itemClasses += ' font-medium';
                        bulletColor = '#444';
                    } else {
                        bulletColor = '#777';
                    }
                    
                    // Create level markers (bullets) based on level
                    const bullet = level > 1 ? 
                        `<div class="mr-2 w-1.5 h-1.5 rounded-full" style="background-color: ${bulletColor}"></div>` : 
                        '';
                        
                    html += `
                        <div class="${itemClasses}" style="padding-left: ${indentSize}rem">
                            ${bullet}
                            <span class="${titleClasses}">${title}</span>
                            <div class="flex-1 border-b border-dotted border-gray-300 dark:border-gray-600 mx-3"></div>
                            ${page}
                        </div>
                    `;
                }
            });
            
            html += '</div>';
            return html;
        }
        
        // Default case if format is unknown
        return `<pre>${JSON.stringify(tocContent, null, 2)}</pre>`;
    }
    
    function copyTocToClipboard(tocContent) {
        let textToCopy;
        
        if (typeof tocContent === 'string') {
            textToCopy = tocContent;
        } else if (Array.isArray(tocContent)) {
            textToCopy = tocContent.map(item => {
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
        } else {
            textToCopy = JSON.stringify(tocContent, null, 2);
        }
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => alert('TOC copied to clipboard!'))
            .catch(err => console.error('Error copying TOC: ', err));
    }
    
    function downloadTocAsFile(tocContent, originalFilename) {
        let textToDownload;
        
        if (typeof tocContent === 'string') {
            textToDownload = tocContent;
        } else if (Array.isArray(tocContent)) {
            textToDownload = tocContent.map(item => {
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
        } else {
            textToDownload = JSON.stringify(tocContent, null, 2);
        }
        
        const blob = new Blob([textToDownload], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Generate filename based on original PDF name
        let baseFilename = 'toc';
        if (originalFilename) {
            baseFilename = originalFilename.split('.')[0];
        }
        
        downloadFile(blob, `${baseFilename}_toc.txt`);
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

    function resetDocumentConversion() {
        console.log("Resetting document conversion state");
        state.file = null;
        elements.documentInput.value = "";
        elements.documentPreview.classList.add("hidden");
        elements.processDocumentBtn.disabled = true;
    }

    // Make key functions available globally
    window.convertDocument = convertDocument;
    window.displayTocResults = displayTocResults;
    
    initializeDocumentConversion();
});