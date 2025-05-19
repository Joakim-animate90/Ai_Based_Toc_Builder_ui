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

#
if __name__ == '__main__':
    app.run(debug=True, port=5000)
