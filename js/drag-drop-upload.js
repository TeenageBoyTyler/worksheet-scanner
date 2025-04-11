/**
 * drag-drop-upload.js - Enhanced file upload with drag-and-drop and multiple file support
 */

// Drag-and-Drop Upload Handler
class DragDropUploader {
    constructor() {
        this.uploadZone = document.getElementById('upload-zone');
        this.fileInput = document.getElementById('imageFile');
        this.uploadForm = document.getElementById('uploadForm');
        this.submitButton = document.querySelector('#uploadForm button[type="submit"]');
        this.fileInputButton = document.querySelector('.file-input-button');
        this.uploadQueue = []; // Queue for multiple file uploads
        this.currentUploadIndex = 0; // Index of current file being uploaded
        this.tagSelections = []; // Selected tags for the batch
        this.isUploading = false; // Flag to prevent duplicate uploads
    }

    // Initialize the drag and drop functionality
    initialize() {
        if (!this.uploadZone || !this.fileInput || !this.uploadForm) {
            console.error('Required elements not found');
            return;
        }

        console.log('Initializing drag-and-drop uploader');

        // Update file input to allow multiple files
        this.fileInput.setAttribute('multiple', 'multiple');

        // Connect the file input to the upload zone
        this.uploadZone.addEventListener('click', (e) => {
            // Only trigger if clicking directly on the zone (not on a child element)
            if (e.target === this.uploadZone || e.target.closest('.upload-zone-content')) {
                this.fileInput.click();
            }
        });

        // Connect the file input button to the file input
        if (this.fileInputButton) {
            this.fileInputButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double triggering
                this.fileInput.click();
            });
        }

        // Set up drag and drop event listeners
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.highlight.bind(this), false);
        });

        // Remove highlight when item leaves the zone or is dropped
        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.unhighlight.bind(this), false);
        });

        // Handle drops
        this.uploadZone.addEventListener('drop', this.handleDrop.bind(this), false);

        // Handle file input change (traditional selection)
        this.fileInput.addEventListener('change', this.handleFiles.bind(this), false);

        // Override the form submit handler
        if (this.uploadForm) {
            this.uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit(e);
            });
        }

        // Handle the submit button directly
        if (this.submitButton) {
            this.submitButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isUploading) {
                    this.handleSubmit(e);
                }
            });
        }

        console.log('Drag-and-drop uploader initialized');
    }

    // Prevent default drag and drop behavior
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight the drop zone
    highlight(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadZone.classList.add('highlight');
    }

    // Remove highlight from the drop zone
    unhighlight(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadZone.classList.remove('highlight');
    }

    // Handle dropped files
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            this.processFiles(files);
        }
    }

    // Process selected files
    handleFiles(e) {
        const files = e.target.files;
        
        if (!files || files.length === 0) {
            return;
        }
        
        this.processFiles(files);
    }

    // Common method to process files from both drop and select
    processFiles(files) {
        console.log(`Selected ${files.length} files`);

        // Update the file count display
        const fileCountDisplay = document.getElementById('bulk-file-count');
        if (fileCountDisplay) {
            fileCountDisplay.textContent = files.length;
            document.getElementById('bulk-upload-info').style.display = 'block';
        }

        // Store the files for later processing
        this.uploadQueue = Array.from(files);
        
        // Preview files if possible
        this.previewFiles(files);
    }

    // Create previews for selected files
    previewFiles(files) {
        const previewContainer = document.getElementById('file-previews');
        if (!previewContainer) return;

        // Clear previous previews
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'flex';

        // Limit previews to a reasonable number (e.g., first 10 files)
        const previewLimit = 10;
        const filesToPreview = Array.from(files).slice(0, previewLimit);

        filesToPreview.forEach(file => {
            const preview = document.createElement('div');
            preview.className = 'file-preview';
            
            const fileType = file.type.split('/')[0];
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (fileType === 'image') {
                // For images, create a thumbnail
                const img = document.createElement('img');
                img.file = file;
                preview.appendChild(img);
                
                const reader = new FileReader();
                reader.onload = (function(aImg) { 
                    return function(e) { 
                        aImg.src = e.target.result; 
                    }; 
                })(img);
                reader.readAsDataURL(file);
            } else if (fileExtension === 'pdf') {
                // For PDFs, show an icon
                preview.innerHTML = '<div class="pdf-icon">PDF</div>';
            } else {
                // For other file types
                preview.innerHTML = '<div class="file-icon">File</div>';
            }
            
            // Add file name
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name.length > 15 ? 
                file.name.substring(0, 12) + '...' : file.name;
            preview.appendChild(fileName);
            
            previewContainer.appendChild(preview);
        });

        // If there are more files than we're showing
        if (files.length > previewLimit) {
            const moreFiles = document.createElement('div');
            moreFiles.className = 'more-files';
            moreFiles.textContent = `+${files.length - previewLimit} more`;
            previewContainer.appendChild(moreFiles);
        }
    }

    // Handle form submission
    handleSubmit(e) {
        e.preventDefault();
        
        // Prevent multiple upload attempts
        if (this.isUploading) {
            console.log('Upload already in progress...');
            return;
        }
        
        // Check if we have files to upload
        if (this.uploadQueue.length === 0) {
            alert('Bitte wählen Sie mindestens eine Datei zum Hochladen aus.');
            return;
        }
        
        // Check if at least one tag is selected
        const tagCheckboxes = document.querySelectorAll('input[name="tags[]"]:checked');
        if (tagCheckboxes.length === 0) {
            alert('Bitte wählen Sie mindestens einen Tag aus.');
            return;
        }

        // Store selected tags
        this.tagSelections = Array.from(tagCheckboxes).map(cb => cb.value);
        
        // Set uploading flag
        this.isUploading = true;
        
        // Start the upload process
        this.currentUploadIndex = 0;
        this.uploadNextFile();
    }

    // Upload the next file in the queue
    uploadNextFile() {
        if (this.currentUploadIndex >= this.uploadQueue.length) {
            // All files have been processed
            console.log('All files uploaded successfully');
            
            // Reset upload form and state
            this.uploadForm.reset();
            document.getElementById('bulk-upload-info').style.display = 'none';
            document.getElementById('file-previews').innerHTML = '';
            
            // Reset upload queue
            this.uploadQueue = [];
            
            // Reset upload progress
            const uploadProgressBox = document.getElementById('uploadProgressBox');
            uploadProgressBox.style.display = 'none';
            
            // Reset uploading flag
            this.isUploading = false;
            
            // Reload images
            if (typeof tagFilter !== 'undefined' && tagFilter.isFiltering) {
                // If tag filter is active, reapply filter
                tagFilter.applyFilter();
            } else {
                // Standard: Load all images
                loadImages();
            }
            
            return;
        }
        
        const file = this.uploadQueue[this.currentUploadIndex];
        const formData = new FormData();
        
        // Add the file to the form data
        formData.append('imageFile', file);
        
        // Add the selected tags
        this.tagSelections.forEach(tag => {
            formData.append('tags[]', tag);
        });
        
        // Update progress UI
        const uploadProgressBox = document.getElementById('uploadProgressBox');
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadStatus = document.getElementById('uploadStatus');
        
        uploadProgressBox.style.display = 'block';
        uploadProgress.style.width = '0%';
        uploadProgress.textContent = '0%';
        uploadStatus.textContent = `Uploading file ${this.currentUploadIndex + 1} of ${this.uploadQueue.length}: ${file.name}`;
        
        // Upload the file
        fetch('upload.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                uploadProgress.style.width = '50%';
                uploadProgress.textContent = '50%';
                uploadStatus.textContent = `Scanning text for ${file.name}...`;
                
                // After successful upload, process OCR
                scanUploadedFile(data.filename, (success, message) => {
                    uploadProgress.style.width = '100%';
                    uploadProgress.textContent = '100%';
                    
                    if (success) {
                        uploadStatus.textContent = `Processed ${this.currentUploadIndex + 1} of ${this.uploadQueue.length}: ${file.name}`;
                    } else {
                        uploadStatus.textContent = `Text recognition failed for ${file.name}: ${message}`;
                    }
                    
                    // Move to the next file after a short delay
                    setTimeout(() => {
                        this.currentUploadIndex++;
                        this.uploadNextFile();
                    }, 500);
                });
            } else {
                uploadStatus.textContent = `Error uploading ${file.name}: ${data.message}`;
                
                // Continue with next file after a delay
                setTimeout(() => {
                    this.currentUploadIndex++;
                    this.uploadNextFile();
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            uploadStatus.textContent = `Error uploading ${file.name}: ${error.message}`;
            
            // Continue with next file after a delay
            setTimeout(() => {
                this.currentUploadIndex++;
                this.uploadNextFile();
            }, 2000);
        });
    }
}

// Initialize the drag-and-drop uploader when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const uploader = new DragDropUploader();
    uploader.initialize();
});