# Gunicorn configuration file
import multiprocessing

# Bind to 0.0.0.0:5000
bind = "0.0.0.0:5000"

# Use multiple workers based on CPU cores to handle concurrent requests 
# Generally 2-4 x number of CPU cores is recommended
workers = multiprocessing.cpu_count() * 2 + 1

# Use gevent worker class for async processing
worker_class = 'gevent'

# Maximum number of simultaneous clients
worker_connections = 1000

# Maximum number of requests a worker will process before restarting
max_requests = 1000
max_requests_jitter = 50

# Timeout for requests (60 seconds)
timeout = 60

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = 'info'

# Process naming
proc_name = 'ai_toc_builder_ui'

# Enable statsd monitoring if available
# statsd_host = 'localhost:8125'
# statsd_prefix = 'gunicorn'

# Preload the application for better performance 
preload_app = True
