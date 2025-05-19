document.addEventListener("DOMContentLoaded", function () {
    const elements = {
        urlInput: document.getElementById("urlInput"),
        urlTypeSelect: document.getElementById("urlTypeSelect"),
        maxUrlPages: document.getElementById("maxUrlPages"),
        clearUrlBtn: document.getElementById("clearUrlBtn"),
        urlPreview: document.getElementById("urlPreview"),
        urlValidStatus: document.getElementById("urlValidStatus"),
        urlTypeDisplay: document.getElementById("urlTypeDisplay"),
        processUrlBtn: document.getElementById("processUrlBtn")
    };

    const state = {
        url: "",
        urlType: "auto",
        isValid: false,
        isProcessing: false
    };

    function initializeUrlHandler() {
        console.log("Initializing URL handler");
        
        if (!elements.urlInput || !elements.processUrlBtn) {
            console.error("Required URL elements not found");
            return;
        }

        setupEventListeners();
    }

    function setupEventListeners() {
        // URL input event listener
        elements.urlInput.addEventListener("input", handleUrlInput);
        
        // URL type select event listener
        elements.urlTypeSelect.addEventListener("change", (e) => {
            state.urlType = e.target.value;
            updateUrlTypeDisplay();
        });
        
        // Clear URL button event listener
        elements.clearUrlBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetUrlForm();
        });
        
        // Process URL button event listener
        elements.processUrlBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            processUrl();
        });
    }

    function handleUrlInput(e) {
        const url = e.target.value.trim();
        state.url = url;
        
        // Basic URL validation
        const isValid = validateUrl(url);
        state.isValid = isValid;
        
        if (isValid) {
            showUrlPreview();
            detectUrlType(url);
        } else {
            hideUrlPreview();
        }
    }

    function validateUrl(url) {
        if (!url) return false;
        
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    function detectUrlType(url) {
        // Reset to auto if user has changed the URL
        if (state.urlType !== elements.urlTypeSelect.value) {
            state.urlType = elements.urlTypeSelect.value;
        }
        
        // Only auto-detect if set to auto
        if (state.urlType === "auto") {
            // Simple detection based on URL ending
            if (url.toLowerCase().endsWith(".pdf")) {
                state.urlType = "pdf";
            } else {
                state.urlType = "webpage";
            }
            
            // Update the select element
            elements.urlTypeSelect.value = state.urlType;
        }
        
        updateUrlTypeDisplay();
    }

    function updateUrlTypeDisplay() {
        const typeLabels = {
            "pdf": "PDF",
            "webpage": "Webpage",
            "auto": "Auto-detect"
        };
        
        elements.urlTypeDisplay.textContent = typeLabels[state.urlType] || "Unknown";
    }

    function showUrlPreview() {
        elements.urlPreview.classList.remove("hidden");
        elements.urlValidStatus.textContent = "URL is valid";
    }

    function hideUrlPreview() {
        elements.urlPreview.classList.add("hidden");
    }

    async function processUrl() {
        if (!state.url || !state.isValid || state.isProcessing) return;
        
        state.isProcessing = true;
        elements.processUrlBtn.disabled = true;
        elements.processUrlBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
        `;
        
        // Prepare request payload as JSON for the PDF URL extraction API
        const payload = {
            pdf_url: state.url,
            max_pages: parseInt(elements.maxUrlPages.value)
        };
        
        try {
            console.log("Sending URL data to API", state.url, state.urlType);
            
            // Use the dedicated API endpoint for URL extraction
            const response = await fetch("http://localhost:8000/api/v1/toc/extract-from-url", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "URL processing failed");
            }
            
            // Parse the response
            const result = await response.json();
            
            // Display the results
            displayUrlResults(result);
            
        } catch (error) {
            console.error("URL processing error:", error);
            let errorMessage = error.message;
            
            // Check if it's a network error (like the API server is not running)
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Cannot connect to the API server. Please ensure the FastAPI server is running on port 3000.';
                console.log('Make sure your FastAPI server is running with CORS enabled at http://localhost:8000');
            }
            
            alert("Failed to process URL: " + errorMessage);
        } finally {
            state.isProcessing = false;
            elements.processUrlBtn.disabled = false;
            elements.processUrlBtn.textContent = "Process URL";
        }
    }
    
    function displayUrlResults(result) {
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
        
        // Check if operation was successful
        if (!result.success) {
            tocContainer.innerHTML = `<p class="text-red-500">Error: ${result.error || 'Unknown error occurred during extraction'}</p>`;
            return;
        }
        
        // Format and display the TOC content
        if (result.toc_content && result.toc_content.length > 0) {
            // Extract the actual content from the markdown code block if present
            let tocContent = result.toc_content;
            if (tocContent.startsWith('```') && tocContent.endsWith('```')) {
                // Remove the markdown code block markers and extract the plaintext content
                const lines = tocContent.split('\n');
                // Remove first and last line (the code block markers)
                lines.shift(); // Remove first line (```plaintext)
                lines.pop();   // Remove last line (```)
                tocContent = lines.join('\n');
            }
            
            const tocHtml = formatTocContent(tocContent);
            tocContainer.innerHTML = tocHtml;
        } else {
            tocContainer.innerHTML = '<p class="text-gray-500">No TOC content found or generated.</p>';
        }
        
        // Add URL source info
        let urlSourceInfo = document.createElement('div');
        urlSourceInfo.className = 'mt-2 text-sm text-gray-500';
        urlSourceInfo.innerHTML = `<p>Source: <a href="${state.url}" target="_blank" class="text-primary hover:underline">${state.url}</a></p>`;
        tocContainer.appendChild(urlSourceInfo);
        
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
            `;
            resultsContainer.appendChild(actionsContainer);
            
            // Add event listeners to the buttons
            document.getElementById('copyTocBtn').addEventListener('click', () => {
                // Extract clean TOC content without markdown code block if present
                let cleanTocContent = result.toc_content;
                if (typeof cleanTocContent === 'string' && cleanTocContent.startsWith('```') && cleanTocContent.endsWith('```')) {
                    const lines = cleanTocContent.split('\n');
                    lines.shift(); // Remove first line (```plaintext)
                    lines.pop();   // Remove last line (```)
                    cleanTocContent = lines.join('\n');
                }
                copyTocToClipboard(cleanTocContent);
            });
            document.getElementById('downloadTocBtn').addEventListener('click', () => {
                // Extract clean TOC content without markdown code block if present
                let cleanTocContent = result.toc_content;
                if (typeof cleanTocContent === 'string' && cleanTocContent.startsWith('```') && cleanTocContent.endsWith('```')) {
                    const lines = cleanTocContent.split('\n');
                    lines.shift(); // Remove first line (```plaintext)
                    lines.pop();   // Remove last line (```)
                    cleanTocContent = lines.join('\n');
                }
                downloadTocAsFile(cleanTocContent, "url_toc");
            });
        }
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    function formatTocContent(tocContent) {
        // If tocContent is a string, display as is with line breaks converted to <br>
        if (typeof tocContent === 'string') {
            return tocContent.replace(/\\n/g, '<br>');
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
    
    function copyTocToClipboard(tocContent) {
        if (!tocContent) {
            alert('No TOC content to copy');
            return;
        }
        
        let textToCopy = '';
        
        // If TOC is a string, copy it directly
        if (typeof tocContent === 'string') {
            // Remove markdown code block delimiters if present
            if (tocContent.startsWith('```') && tocContent.endsWith('```')) {
                const lines = tocContent.split('\n');
                // Remove first and last line (the code block markers)
                lines.shift();
                lines.pop();
                textToCopy = lines.join('\n');
            } else {
                textToCopy = tocContent;
            }
        } 
        // If TOC is an array, format it as text
        else if (Array.isArray(tocContent)) {
            textToCopy = tocContent.map(item => {
                const indent = '	'.repeat(item.level - 1);
                return `${indent}${item.title} .................... ${item.page}`;
            }).join('\n');
        }
        
        // Create a temporary textarea to perform the copy
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = textToCopy;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        
        // Show success message
        alert('TOC copied to clipboard');
    }
    
    function downloadTocAsFile(tocContent, filenameBase) {
        let textToDownload;
        
        if (typeof tocContent === 'string') {
            // Remove markdown code block delimiters if present
            if (tocContent.startsWith('```') && tocContent.endsWith('```')) {
                const lines = tocContent.split('\n');
                // Remove first and last line (the code block markers)
                lines.shift();
                lines.pop();
                textToDownload = lines.join('\n');
            } else {
                textToDownload = tocContent;
            }
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
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenameBase}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function resetUrlForm() {
        elements.urlInput.value = "";
        state.url = "";
        state.isValid = false;
        elements.urlTypeSelect.value = "auto";
        state.urlType = "auto";
        hideUrlPreview();
    }

    initializeUrlHandler();
});
