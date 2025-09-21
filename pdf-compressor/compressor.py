import os
import subprocess
import tempfile
from flask import Flask, request, jsonify
from google.cloud import storage, firestore

# --- Configuration ---
# These will be populated by Cloud Run environment variables
GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET')
WORKER_API_KEY = os.environ.get('WORKER_API_KEY')
PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT')

# --- Flask App Initialization ---
app = Flask(__name__)

# --- Google Cloud Client Initialization ---
try:
    storage_client = storage.Client()
    db = firestore.Client()
    GCS_BUCKET = storage_client.bucket(GCS_BUCKET_NAME)
except Exception as e:
    print(f"Error initializing Google Cloud clients: {e}")
    # In a real app, you might want to exit or handle this more gracefully
    storage_client = None
    db = None
    GCS_BUCKET = None

# --- Helper Functions ---

def update_job_status(job_id, status, updates=None):
    """Updates the job document in Firestore."""
    if not db:
        print(f"Firestore client not initialized. Cannot update job {job_id}.")
        return

    try:
        job_ref = db.collection('jobs').document(job_id)
        payload = {
            'status': status,
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }
        if updates:
            payload.update(updates)
        job_ref.update(payload)
        print(f"Successfully updated job {job_id} to status: {status}")
    except Exception as e:
        print(f"Error updating Firestore for job {job_id}: {e}")

def run_ghostscript(input_path, output_path, quality_preset):
    """Runs the Ghostscript command to compress a PDF."""
    
    # PDFSETTINGS presets:
    # /screen:   Low quality, small size (72 dpi)
    # /ebook:    Medium quality, medium size (150 dpi)
    # /prepress: High quality, large size (300 dpi)
    # /printer:  Similar to /prepress for printing (300 dpi)
    # /default:  A good general-purpose setting
    
    quality_map = {
        'low': '/screen',
        'balanced': '/ebook',
        'high': '/prepress',
    }
    pdf_settings = quality_map.get(quality_preset, '/ebook')

    command = [
        'gs',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        f'-dPDFSETTINGS={pdf_settings}',
        '-dNOPAUSE',
        '-dBATCH',
        f'-sOutputFile={output_path}',
        input_path
    ]

    try:
        print(f"Running Ghostscript command: {' '.join(command)}")
        subprocess.run(command, check=True, capture_output=True, text=True)
        print("Ghostscript command completed successfully.")
        return True, None
    except subprocess.CalledProcessError as e:
        error_message = f"Ghostscript failed with exit code {e.returncode}.\nStderr: {e.stderr}"
        print(error_message)
        return False, error_message
    except Exception as e:
        print(f"An unexpected error occurred while running Ghostscript: {e}")
        return False, str(e)


# --- Flask Routes ---

@app.route('/compress', methods=['POST'])
def compress_pdf():
    """Main endpoint to trigger a PDF compression job."""
    # 1. --- Authorization ---
    api_key = request.headers.get('x-api-key')
    if not api_key or api_key != WORKER_API_KEY:
        print("Unauthorized attempt to access /compress endpoint.")
        return jsonify({'error': 'Unauthorized'}), 401

    # 2. --- Get Job ID & Fetch Job Data ---
    data = request.get_json()
    job_id = data.get('jobId')
    if not job_id:
        return jsonify({'error': 'jobId is missing from request body'}), 400
    
    if not db:
        return jsonify({'error': 'Server configuration error: Firestore not available'}), 500

    try:
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        if not job_doc.exists:
            return jsonify({'error': f'Job with ID {job_id} not found.'}), 404
        job_data = job_doc.to_dict()
    except Exception as e:
        return jsonify({'error': f'Failed to fetch job data: {e}'}), 500

    # 3. --- Start Processing ---
    update_job_status(job_id, 'processing', {'progress': 10})
    original_path = job_data.get('originalPath')
    compression_mode = job_data.get('compressionMode', 'balanced')
    file_id = job_data.get('fileId')
    user_id = job_data.get('userId')
    
    if not all([original_path, file_id, user_id]):
        update_job_status(job_id, 'failed', {'error': 'Job document is missing required fields.'})
        return jsonify({'error': 'Invalid job data'}), 400
        
    compressed_path = f"uploads/{user_id}/{file_id}/compressed.pdf"

    # 4. --- Download, Compress, Upload ---
    with tempfile.TemporaryDirectory() as temp_dir:
        local_original_path = os.path.join(temp_dir, 'original.pdf')
        local_compressed_path = os.path.join(temp_dir, 'compressed.pdf')

        try:
            # Download from GCS
            update_job_status(job_id, 'processing', {'progress': 25})
            print(f"Downloading {original_path} from bucket {GCS_BUCKET_NAME}...")
            original_blob = GCS_BUCKET.blob(original_path)
            original_blob.download_to_filename(local_original_path)
            original_size_bytes = os.path.getsize(local_original_path)
            print("Download complete.")
            
            # Compress with Ghostscript
            update_job_status(job_id, 'processing', {'progress': 50, 'originalSizeBytes': original_size_bytes})
            success, error = run_ghostscript(local_original_path, local_compressed_path, compression_mode)
            if not success:
                raise RuntimeError(f"Compression failed: {error}")
            print("Compression complete.")

            # Upload to GCS
            update_job_status(job_id, 'processing', {'progress': 75})
            print(f"Uploading compressed file to {compressed_path}...")
            compressed_blob = GCS_BUCKET.blob(compressed_path)
            compressed_blob.upload_from_filename(local_compressed_path)
            compressed_size_bytes = os.path.getsize(local_compressed_path)
            print("Upload complete.")

            # 5. --- Finalize Job ---
            final_updates = {
                'progress': 100,
                'resultPath': compressed_path,
                'compressedSizeBytes': compressed_size_bytes,
                'error': None,
            }
            update_job_status(job_id, 'done', final_updates)
            
            # Decrement concurrent jobs count for the user
            user_ref = db.collection('users').document(user_id)
            user_ref.update({'concurrentJobs': firestore.Increment(-1)})

            return jsonify({'status': 'success', 'jobId': job_id}), 200

        except Exception as e:
            print(f"An error occurred during job {job_id}: {e}")
            update_job_status(job_id, 'failed', {'error': str(e)})
            # Decrement concurrent jobs count on failure as well
            user_ref = db.collection('users').document(user_id)
            user_ref.update({'concurrentJobs': firestore.Increment(-1)})
            return jsonify({'error': f'Processing failed: {e}'}), 500

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'}), 200

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
