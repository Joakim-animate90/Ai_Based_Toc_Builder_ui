# AI Based Table of Content Builder

![License](https://img.shields.io/github/license/Joakim-animate90/Ai_Based_Toc_Builder_ui)
![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)

An intelligent web application that automatically generates structured tables of contents from various sources including PDFs, documents, images, and URLs using AI.

![App Screenshot](static/assets/toc-builder-screenshot.png)

## Features

- **Multiple Input Sources**:
  - Document Upload (PDF, DOC, DOCX, TXT)
  - URL Processing (PDF links and websites)
  - Image Upload (coming soon)
  - Batch Processing (coming soon)

- **Smart TOC Generation**:
  - Hierarchical structure detection
  - Page number extraction
  - Formatting preservation
  - Modern, clean UI output

- **User-Friendly Experience**:
  - Drag-and-drop interface
  - Dark/light mode
  - Progress indicators
  - Responsive design

## System Architecture

This application consists of two main components:

1. **Frontend UI** (this repository): A Flask web application that provides the user interface
2. **Backend API** (separate service): A FastAPI service that handles document processing and TOC extraction

## Prerequisites

- Python 3.8 or higher
- Node.js and npm for frontend development
- Docker (optional, for containerization)

## Quick Start

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Joakim-animate90/Ai_Based_Toc_Builder_ui.git
   cd Ai_Based_Toc_Builder_ui
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install and build frontend dependencies:
   ```bash
   cd templates
   npm install
   npm run build
   cd ..
   ```

### Running Locally

1. Start the Flask application:
   ```bash
   python app.py
   ```

2. Start the FastAPI backend service (must be running separately)

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

### Docker Deployment

You can also run the application using Docker:

```bash
# Build the Docker image
docker build -t toc-builder-ui .

# Run the container
docker run -p 5000:5000 toc-builder-ui
```

## API Integration

This UI connects to a FastAPI backend service that handles the document processing and TOC extraction. Make sure the backend service is running and accessible at the URL specified in the frontend code.

Default API endpoints:
- PDF/Document extraction: `http://localhost:8000/api/v1/toc/extract-from-browser`
- URL extraction: `http://localhost:8000/api/v1/toc/extract-from-url`

## Development

### Frontend Development

The frontend uses TailwindCSS for styling and Alpine.js for interactive components:

```bash
cd templates
npm run build:css   # Builds the CSS
npm run build:js    # Builds the JavaScript
npm run build       # Builds both CSS and JavaScript
```

### Backend Integration

To connect to a different backend API, modify the endpoint URLs in the following files:
- `templates/js/documentHandler.js`: For document processing
- `templates/js/urlHandler.js`: For URL processing

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- TailwindCSS for the styling framework
- Alpine.js for the frontend interactivity
- FastAPI for the backend service
