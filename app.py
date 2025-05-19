from flask import Flask, render_template, send_from_directory
import os
from dotenv import load_dotenv
from flask_caching import Cache

# Load environment variables from .env file if it exists
load_dotenv()

app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')

# Configure caching
cache_config = {
    "DEBUG": False,
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300  # 5 minutes
}
app.config.from_mapping(cache_config)
cache = Cache(app)


# API URL configuration
API_URL = os.environ.get('API_URL', 'http://localhost:8000')

@app.route('/')
@cache.cached(timeout=60)  # Cache the homepage for 1 minute
def index():
    return render_template('python_index.html', api_url=API_URL)

@app.route('/static/<path:path>')
@cache.cached(timeout=3600)  # Cache static assets for 1 hour
def serve_static(path):
    return send_from_directory('static', path)


    
@app.errorhandler(500)  # Internal Server Error
def internal_error(e):
    return {"error": "An internal server error occurred. Our team has been notified."}, 500

# Add this configuration for better performance
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['PREFERRED_URL_SCHEME'] = 'https'

# Make the app listen on all interfaces for Docker/production deployment
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=False, port=5000)
