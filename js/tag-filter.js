/**
 * tag-filter.js - Improved tag filtering with instant feedback
 * Without reset button functionality
 */

// Global tag filter settings
const tagFilter = {
    // Active filter tags
    activeTags: [],
    
    // Current search term (for combination with tags)
    currentSearchTerm: '',
    
    // Filter status
    isFiltering: false,
    
    // Flag to prevent multiple simultaneous filter operations
    isProcessing: false,
    
    // Initialize tag filter functions
    initialize: function() {
        console.log("Initializing tag filter");
        
        // Make tag filter checkboxes directly clickable
        const filterLabels = document.querySelectorAll('.tag-filter-container .tag-checkbox');
        console.log("Found filter tag labels:", filterLabels.length);
        
        filterLabels.forEach(label => {
            // We need to remove any existing event listeners 
            // that might have been added by tag-selection.js
            const newLabel = label.cloneNode(true);
            label.parentNode.replaceChild(newLabel, label);
            
            // Add click event to the entire label
            newLabel.addEventListener('click', this.handleTagClick.bind(this));
            
            // Also add change event to the checkbox
            const checkbox = newLabel.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', this.handleCheckboxChange.bind(this));
                
                // Initialize visual state
                if (checkbox.checked) {
                    newLabel.classList.add('selected');
                }
            }
        });
        
        // Extend existing search form handler
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            // Remove previous handlers to prevent conflicts
            const newSearchForm = searchForm.cloneNode(true);
            searchForm.parentNode.replaceChild(newSearchForm, searchForm);
            
            // Add our handler
            newSearchForm.addEventListener('submit', this.handleSearch.bind(this));
        }
        
        // Override clearSearch function
        if (typeof window.clearSearch === 'function') {
            window.originalClearSearch = window.clearSearch;
            window.clearSearch = this.resetEverything.bind(this);
        }
    },
    
    // Handle clicks on tag labels
    handleTagClick: function(e) {
        // Skip if already processing
        if (this.isProcessing) return;
        
        // Only process if the click was on the label or the span, not on the input
        if (e.target.tagName.toLowerCase() === 'input') {
            return;
        }
        
        // Get the checkbox inside the label
        const label = e.currentTarget;
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        
        // Toggle checkbox state
        checkbox.checked = !checkbox.checked;
        
        // Update visual state
        if (checkbox.checked) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
        
        // Trigger filter update
        setTimeout(() => this.handleTagChange(), 10);
        
        // Prevent default to avoid double-triggering
        e.preventDefault();
    },
    
    // Handle checkbox state changes
    handleCheckboxChange: function(e) {
        // Skip if already processing
        if (this.isProcessing) return;
        
        const checkbox = e.target;
        const label = checkbox.closest('.tag-checkbox');
        
        // Update visual state
        if (checkbox.checked) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }
        
        // Trigger filter update
        setTimeout(() => this.handleTagChange(), 10);
    },
    
    // Handle search form submissions
    handleSearch: function(e) {
        e.preventDefault();
        
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        // Store search term
        this.currentSearchTerm = searchTerm;
        
        // Perform search with appropriate method
        if (searchTerm.length > 0) {
            this.searchWithTags(searchTerm);
        } else if (this.activeTags.length > 0) {
            this.filterByTagsOnly();
        } else {
            this.resetEverything();
        }
    },
    
    // Handle tag selection change
    handleTagChange: function() {
        // Set processing flag to prevent multiple simultaneous updates
        this.isProcessing = true;
        
        // Collect active tags
        this.activeTags = this.collectActiveTags();
        
        // Update filter state
        this.isFiltering = this.activeTags.length > 0;
        
        // Update visual indication of active filtering
        const tagFilterContainer = document.querySelector('.tag-filter-container');
        if (tagFilterContainer) {
            if (this.isFiltering) {
                tagFilterContainer.classList.add('tag-filter-active');
            } else {
                tagFilterContainer.classList.remove('tag-filter-active');
            }
        }
        
        // Apply the appropriate filter method
        if (this.currentSearchTerm) {
            this.searchWithTags(this.currentSearchTerm);
        } else {
            if (this.isFiltering) {
                this.filterByTagsOnly();
            } else {
                // Reset to show all images
                loadImages();
                
                // Clear status
                const tagFilterStatus = document.getElementById('tagFilterStatus');
                if (tagFilterStatus) {
                    tagFilterStatus.textContent = '';
                }
                
                // Reset processing flag
                this.isProcessing = false;
            }
        }
    },
    
    // Collect active filter tags
    collectActiveTags: function() {
        const checkboxes = document.querySelectorAll('.tag-filter-container .tag-checkbox input[type="checkbox"]:checked');
        const tags = [];
        
        checkboxes.forEach(checkbox => {
            tags.push(checkbox.value);
        });
        
        return tags;
    },
    
    // Apply filter - compatibility method for existing code
    applyFilter: function() {
        // If already processing, wait
        if (this.isProcessing) {
            setTimeout(() => this.applyFilter(), 100);
            return;
        }
        
        this.isProcessing = true;
        
        // Get current active tags
        this.activeTags = this.collectActiveTags();
        this.isFiltering = this.activeTags.length > 0;
        
        // If we have active tags, filter by them
        if (this.isFiltering) {
            console.log('Filtering by tags (OR logic):', this.activeTags);
            
            // Apply the appropriate filter method
            if (this.currentSearchTerm) {
                this.searchWithTags(this.currentSearchTerm);
            } else {
                this.filterByTagsOnly();
            }
        } else {
            // No tags selected, show all images
            loadImages();
            
            // Clear status
            const tagFilterStatus = document.getElementById('tagFilterStatus');
            if (tagFilterStatus) {
                tagFilterStatus.textContent = '';
            }
            
            // Reset processing flag
            this.isProcessing = false;
        }
    },
    
    // Reset filter only without reloading images
    clearFilterOnly: function() {
        // Reset tags
        this.activeTags = [];
        this.isFiltering = false;
        
        // Reset checkboxes
        const checkboxes = document.querySelectorAll('.tag-filter-container input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const label = checkbox.closest('.tag-checkbox');
            if (label) {
                label.classList.remove('selected');
            }
        });
        
        // Reset container styling
        const tagFilterContainer = document.querySelector('.tag-filter-container');
        if (tagFilterContainer) {
            tagFilterContainer.classList.remove('tag-filter-active');
        }
        
        // Reset status
        const tagFilterStatus = document.getElementById('tagFilterStatus');
        if (tagFilterStatus) {
            tagFilterStatus.textContent = '';
        }
    },
    
    // Reset everything (tag filter and search)
    resetEverything: function() {
        console.log("Resetting everything - tags and search");
        
        // If already processing, wait
        if (this.isProcessing) {
            setTimeout(() => this.resetEverything(), 100);
            return;
        }
        
        this.isProcessing = true;
        
        // Reset search field
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const searchStatus = document.getElementById('searchStatus');
        if (searchStatus) {
            searchStatus.textContent = '';
        }
        
        this.currentSearchTerm = '';
        
        // Reset tags
        this.clearFilterOnly();
        
        // Reset batch selection if available
        if (typeof batchOperations !== 'undefined') {
            batchOperations.selectedItems = [];
            batchOperations.selectAll = false;
            
            // Reset Select All checkbox
            const selectAllCheckbox = document.getElementById('batch-select-all');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }
            
            // Update batch panel
            batchOperations.updateBatchPanel();
        }
        
        // Load all images
        loadImages();
        
        // Reset processing flag once images are loaded
        setTimeout(() => this.isProcessing = false, 300);
    },
    
    // Filter only by tags (without text search)
    filterByTagsOnly: function() {
        console.log('Performing tag-only filtering (OR logic)');
        
        // Create comma-separated tag list
        const tagParam = this.activeTags.join(',');
        
        fetch('get_images.php?tags=' + encodeURIComponent(tagParam))
            .then(response => response.json())
            .then(data => {
                console.log(`Filtered by tags: ${data.length} images found`);
                
                const imageGrid = document.getElementById('imageGrid');
                if (!imageGrid) {
                    this.isProcessing = false;
                    return;
                }
                
                imageGrid.innerHTML = '';
                
                if (data.length === 0) {
                    imageGrid.innerHTML = '<p class="no-results">Keine Dateien mit den ausgewählten Tags gefunden.</p>';
                    
                    const tagFilterStatus = document.getElementById('tagFilterStatus');
                    if (tagFilterStatus) {
                        tagFilterStatus.textContent = 'Keine Dateien mit den ausgewählten Tags gefunden.';
                    }
                    
                    this.isProcessing = false;
                    return;
                }
                
                // Display images using the existing functions
                data.forEach(filename => {
                    // We'll use the existing implementation from core.js
                    // This will create a proper image card with all event handlers
                    const card = document.createElement('div');
                    card.className = 'image-card';
                    card.dataset.filename = filename;
                    
                    const fileExtension = filename.split('.').pop().toLowerCase();
                    const isPdf = fileExtension === 'pdf';
                    
                    let previewHTML;
                    if (isPdf) {
                        previewHTML = `
                            <div class="image-wrapper">
                                <div class="image-select-wrapper">
                                    <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                                </div>
                                <div class="pdf-preview" id="pdf_${filename.replace(/\./g, '_')}">
                                    <div>PDF-Dokument wird geladen...</div>
                                    <canvas></canvas>
                                    <div class="pdf-controls">
                                        <button class="btn" id="prev_${filename.replace(/\./g, '_')}" disabled>Zurück</button>
                                        <span>Seite <span id="page_num_${filename.replace(/\./g, '_')}">1</span> / <span id="page_count_${filename.replace(/\./g, '_')}">?</span></span>
                                        <button class="btn" id="next_${filename.replace(/\./g, '_')}" disabled>Vor</button>
                                    </div>
                                </div>
                                <span class="file-type-badge">PDF</span>
                            </div>
                        `;
                    } else {
                        previewHTML = `
                            <div class="image-wrapper">
                                <div class="image-select-wrapper">
                                    <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                                </div>
                                <img src="uploads/${filename}" alt="${filename}">
                                <span class="file-type-badge">${fileExtension.toUpperCase()}</span>
                            </div>
                        `;
                    }
                    
                    card.innerHTML = `
                        ${previewHTML}
                        <div class="progress-container">
                            <div class="progress-bar">0%</div>
                        </div>
                        <div class="loading">Text wird erkannt...</div>
                        <div class="file-tags" id="tags_${filename.replace(/\./g, '_')}">Tags werden geladen...</div>
                        <div class="text-content hidden"></div>
                    `;
                    
                    imageGrid.appendChild(card);
                    
                    // Checkbox-Event-Listener hinzufügen
                    const checkbox = card.querySelector('.image-select-checkbox');
                    if (checkbox && typeof batchOperations !== 'undefined') {
                        checkbox.addEventListener('change', batchOperations.handleItemSelect);
                    }
                    
                    // Text laden
                    loadText(filename, card.querySelector('.text-content'));
                    
                    // Tags laden
                    loadTags(filename, card.querySelector('.file-tags'));
                    
                    // PDF laden, wenn es sich um ein PDF handelt
                    if (isPdf) {
                        loadPDF(filename);
                    }
                });
                
                // Update filter status with OR logic note
                const tagFilterStatus = document.getElementById('tagFilterStatus');
                if (tagFilterStatus) {
                    tagFilterStatus.textContent = `${data.length} Datei${data.length !== 1 ? 'en' : ''} gefunden, die mindestens einen der ausgewählten Tags enthalten`;
                }
                
                // Reset processing flag
                this.isProcessing = false;
            })
            .catch(error => {
                console.error("Error in tag filtering:", error);
                // Show error message
                const imageGrid = document.getElementById('imageGrid');
                if (imageGrid) {
                    imageGrid.innerHTML = '<p class="no-results">Fehler bei der Filterung.</p>';
                }
                // Reset processing flag
                this.isProcessing = false;
            });
    },
    
    // Combined search: Text + Tags
    searchWithTags: function(searchTerm) {
        console.log("Combined search with OR logic:", { searchTerm, tags: this.activeTags });
        
        let url = 'search_text.php?search=' + encodeURIComponent(searchTerm);
        
        // Add tags if active
        if (this.activeTags.length > 0) {
            url += '&tags=' + encodeURIComponent(this.activeTags.join(','));
        }
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(`Combined search: ${data.length} results found`);
                
                const imageGrid = document.getElementById('imageGrid');
                if (!imageGrid) {
                    this.isProcessing = false;
                    return;
                }
                
                imageGrid.innerHTML = '';
                
                if (data.length === 0) {
                    let message = 'Keine Suchergebnisse';
                    if (this.activeTags.length > 0) {
                        message += ` für "${searchTerm}" mit den ausgewählten Tags`;
                    } else {
                        message += ` für "${searchTerm}"`;
                    }
                    
                    imageGrid.innerHTML = `<p class="no-results">${message}</p>`;
                    
                    const searchStatus = document.getElementById('searchStatus');
                    if (searchStatus) {
                        searchStatus.textContent = '0 Ergebnisse gefunden';
                    }
                    
                    // Reset processing flag
                    this.isProcessing = false;
                    return;
                }
                
                // Display images with search results using existing methods
                data.forEach(file => {
                    const card = document.createElement('div');
                    card.className = 'image-card search-highlight';
                    card.dataset.filename = file.filename;
                    
                    const fileExtension = file.filename.split('.').pop().toLowerCase();
                    const isPdf = fileExtension === 'pdf';
                    
                    let previewHTML;
                    if (isPdf) {
                        previewHTML = `
                            <div class="image-wrapper">
                                <div class="image-select-wrapper">
                                    <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                                </div>
                                <div class="pdf-preview" id="pdf_${file.filename.replace(/\./g, '_')}">
                                    <div>PDF-Dokument wird geladen...</div>
                                    <canvas></canvas>
                                    <div class="pdf-controls">
                                        <button class="btn" id="prev_${file.filename.replace(/\./g, '_')}" disabled>Zurück</button>
                                        <span>Seite <span id="page_num_${file.filename.replace(/\./g, '_')}">1</span> / <span id="page_count_${file.filename.replace(/\./g, '_')}">?</span></span>
                                        <button class="btn" id="next_${file.filename.replace(/\./g, '_')}" disabled>Vor</button>
                                    </div>
                                </div>
                                <span class="file-type-badge">PDF</span>
                            </div>
                        `;
                    } else {
                        previewHTML = `
                            <div class="image-wrapper">
                                <div class="image-select-wrapper">
                                    <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                                </div>
                                <img src="uploads/${file.filename}" alt="${file.filename}">
                                <span class="file-type-badge">${fileExtension.toUpperCase()}</span>
                            </div>
                        `;
                    }
                    
                    card.innerHTML = `
                        ${previewHTML}
                        <div class="progress-container">
                            <div class="progress-bar">0%</div>
                        </div>
                        <div class="loading">Text wird erkannt...</div>
                        <div class="file-tags" id="tags_${file.filename.replace(/\./g, '_')}">Tags werden geladen...</div>
                        <div class="text-content hidden">${highlightText(file.text, searchTerm)}</div>
                    `;
                    
                    imageGrid.appendChild(card);
                    
                    // Add checkbox event listener
                    const checkbox = card.querySelector('.image-select-checkbox');
                    if (checkbox && typeof batchOperations !== 'undefined') {
                        checkbox.addEventListener('change', batchOperations.handleItemSelect);
                    }
                    
                    // Load tags
                    loadTags(file.filename, card.querySelector('.file-tags'));
                    
                    // Load PDF if it's a PDF file
                    if (isPdf) {
                        loadPDF(file.filename);
                    }
                });
                
                // Update search status with OR logic note
                const searchStatus = document.getElementById('searchStatus');
                if (searchStatus) {
                    let statusMessage = `${data.length} Ergebnis${data.length !== 1 ? 'se' : ''} für "${searchTerm}"`;
                    if (this.activeTags.length > 0) {
                        statusMessage += `, die mindestens einen der ausgewählten Tags enthalten`;
                    }
                    searchStatus.textContent = statusMessage;
                }
                
                // Reset processing flag
                this.isProcessing = false;
            })
            .catch(error => {
                console.error("Combined search failed:", error);
                // Show error message
                const imageGrid = document.getElementById('imageGrid');
                if (imageGrid) {
                    imageGrid.innerHTML = '<p class="no-results">Fehler bei der Suche.</p>';
                }
                // Reset processing flag
                this.isProcessing = false;
            });
    }
};

// Initialize tag filter when document is ready
document.addEventListener('DOMContentLoaded', function() {
    tagFilter.initialize();
});