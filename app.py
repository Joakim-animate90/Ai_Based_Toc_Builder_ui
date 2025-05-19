from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
import os
import tempfile
import time
import json
import urllib.parse
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Set to None to disable the file size limit completely
app.config['MAX_CONTENT_LENGTH'] = None  # No file size limit

# Configure for large file handling
app.config['MAX_CONTENT_PATH'] = os.path.join(app.config['UPLOAD_FOLDER'], 'large_files')
os.makedirs(app.config['MAX_CONTENT_PATH'], exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'heic', 'heif', 'doc', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('python_index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Mock function to generate TOC from text
def generate_toc_from_text(text):
    # In a real implementation, this would use AI to analyze the text
    # For now, we'll just create a simple mock TOC
    lines = text.split('\n')
    toc = []
    chapter_count = 0
    section_count = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if len(line) < 50 and ('chapter' in line.lower() or 'section' in line.lower() or line.lower().startswith('part')):
            if 'chapter' in line.lower() or line.lower().startswith('part'):
                chapter_count += 1
                section_count = 0
                toc.append({
                    "level": 1,
                    "title": line,
                    "page": chapter_count * 5
                })
            else:
                section_count += 1
                toc.append({
                    "level": 2,
                    "title": line,
                    "page": chapter_count * 5 + section_count
                })
    
    # If no chapters were found, create some mock entries
    if not toc:
        toc = [
            {"level": 1, "title": "Introduction", "page": 1},
            {"level": 2, "title": "Background", "page": 3},
            {"level": 2, "title": "Purpose of the Document", "page": 5},
            {"level": 1, "title": "Literature Review", "page": 8},
            {"level": 2, "title": "Previous Studies", "page": 10},
            {"level": 2, "title": "Theoretical Framework", "page": 15},
            {"level": 1, "title": "Methodology", "page": 20},
            {"level": 2, "title": "Research Design", "page": 22},
            {"level": 2, "title": "Data Collection", "page": 25},
            {"level": 1, "title": "Results and Discussion", "page": 30},
            {"level": 1, "title": "Conclusion", "page": 40},
            {"level": 1, "title": "References", "page": 45}
        ]
    
    return toc

# API endpoints for processing
@app.route('/api/process-image', methods=['POST'])
def process_image():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        # In a real implementation, you would:
        # 1. Save the file
        # 2. Use OCR to extract text from the image
        # 3. Process the text to create a TOC
        
        # For now, we'll just return a mock TOC
        toc = generate_toc_from_text("Chapter 1: Introduction\nSection 1.1: Background\nSection 1.2: Motivation\nChapter 2: Literature Review")
        
        return jsonify({
            "success": True, 
            "result": "Image processed successfully", 
            "toc": toc,
            "filename": secure_filename(file.filename)
        })
    
    return jsonify({"success": False, "error": "File type not allowed"}), 400

@app.route('/api/process-url', methods=['POST'])
def process_url():
    """Process a URL to extract a table of contents"""
    url = request.form.get('url')
    url_type = request.form.get('type', 'auto')
    max_pages = request.form.get('max_pages', 20)
    
    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400
    
    try:
        # Validate URL (basic check)
        parsed_url = urllib.parse.urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return jsonify({"success": False, "error": "Invalid URL format"}), 400
        
        # Log received URL for debugging
        print(f"Processing URL: {url} (type: {url_type}, max pages: {max_pages})")
        
        # In a real implementation, you would:
        # 1. Download content from the URL
        # 2. If PDF: Parse the PDF to extract text
        # 3. If Webpage: Extract text content
        # 4. Process the text to create a TOC
        
        # Mock implementation based on URL path
        if url.lower().endswith('.pdf') or url_type == 'pdf':
            # Create a mock PDF TOC
            toc_text = """Table of Contents
Chapter 1: Introduction........................1
Chapter 2: Literature Review..................10
  2.1 Previous Work..........................12
  2.2 Current State of the Art...............15
Chapter 3: Methodology.......................20
Chapter 4: Results...........................30
Chapter 5: Discussion........................40
References...................................50"""
            toc = generate_toc_from_text(toc_text)
            source_type = "PDF"
        else:
            # Create a mock webpage TOC
            toc_text = """1. Introduction
2. Features
  2.1. Core Features
  2.2. Advanced Features
3. Use Cases
4. Pricing
5. Documentation
6. Support
7. FAQ"""
            toc = generate_toc_from_text(toc_text)
            source_type = "Webpage"
        
        return jsonify({
            "success": True, 
            "result": f"URL processed successfully ({source_type})", 
            "toc_content": toc,
            "source_url": url,
            "source_type": source_type
        })
        
    except Exception as e:
        print(f"Error processing URL: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to process URL: {str(e)}"}), 500

@app.route('/api/process-document', methods=['POST'])
def process_document():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # In a real implementation, you would:
        # 1. Parse the PDF/document to extract text
        # 2. Process the text to create a TOC
        
        # For this mock implementation, we'll pretend to extract text and create a TOC
        toc = generate_toc_from_text("Chapter 1: Introduction\nSection 1.1: Background\nSection 1.2: Motivation\nChapter 2: Literature Review")
        
        return jsonify({
            "success": True, 
            "result": "Document processed successfully", 
            "toc": toc,
            "filename": filename
        })
    
    return jsonify({"success": False, "error": "File type not allowed"}), 400

@app.route('/api/process-batch', methods=['POST'])
def process_batch():
    if 'files[]' not in request.files:
        return jsonify({"success": False, "error": "No files part"}), 400
    
    files = request.files.getlist('files[]')
    
    if not files or files[0].filename == '':
        return jsonify({"success": False, "error": "No selected files"}), 400
    
    results = []
    failed_files = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Mock processing
            time.sleep(0.5)  # Simulate processing time
            
            # Generate mock TOC
            toc = generate_toc_from_text("Chapter 1: Introduction\nSection 1.1: Background\nSection 1.2: Motivation\nChapter 2: Literature Review")
            
            results.append({
                "filename": filename,
                "toc": toc
            })
        else:
            failed_files.append(file.filename)
    
    # Create a combined TOC if requested
    combined_toc = []
    if results and request.form.get('mode') == 'combined':
        chapter_offset = 0
        for result in results:
            file_toc = result['toc']
            # Add document title as a section
            combined_toc.append({
                "level": 1,
                "title": f"Document: {result['filename']}",
                "page": chapter_offset + 1
            })
            
            # Add entries with adjusted page numbers
            for entry in file_toc:
                adjusted_entry = entry.copy()
                adjusted_entry["level"] += 1  # Increase level to make it a subsection
                adjusted_entry["page"] += chapter_offset
                combined_toc.append(adjusted_entry)
            
            # Update offset for next document
            if file_toc:
                chapter_offset = file_toc[-1]["page"] + 5
            else:
                chapter_offset += 10
    
    return jsonify({
        "success": True, 
        "result": f"Processed {len(results)} files successfully" + (f", {len(failed_files)} files failed" if failed_files else ""),
        "processed_files": results,
        "failed_files": failed_files,
        "combined_toc": combined_toc if request.form.get('mode') == 'combined' else None
    })

@app.route('/process/document', methods=['POST'])
def process_doc():
    """Legacy endpoint to support the original JS code"""
    return process_document()

@app.route('/process/merge-pdf', methods=['POST'])
def process_merge_pdf():
    """Legacy endpoint to support the original JS code"""
    # Create a simple text file as output
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
    content = "This is a mock PDF generated from your batch upload.\n\n"
    content += f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    # Add info about files
    if 'images' in request.files:
        files = request.files.getlist('images')
        content += f"Files included ({len(files)}):\n"
        
        for file in files:
            content += f"- {file.filename}\n"
    
    temp_file.write(content.encode('utf-8'))
    temp_file.close()
    
    return send_file(temp_file.name, 
                     as_attachment=True, 
                     download_name="batch_processed.txt", 
                     mimetype="text/plain")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
