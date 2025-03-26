// editor.js - Main script for the interactive letter editor functionality

// Global variables
let editor = null;
let engine = null;
let tokenManager = null;
let currentNodeId = 1;
let sectionNodes = {};
let currentEditingNode = null;
let currentLetterName = '';
let letterData = {
    title: 'New Interactive Letter',
    signature: '',
    startSectionId: '',
    config: {
        theme: 'elegant',
        textSize: 'medium'
    },
    sections: {}
};

// Node component for Rete.js
class SectionComponent extends Rete.Component {
    constructor() {
        super('Section');
        this.data.component = 'section';
    }

    builder(node) {
        // Create inputs and outputs
        const input = new Rete.Input('input', 'Input', sockets.input, true);
        const output = new Rete.Output('output', 'Output', sockets.output, true);
        
        // Add inputs and outputs to the node
        return node
            .addInput(input)
            .addOutput(output)
            .addControl(new TextControl(this.editor, 'title', node, true));
    }

    worker(node, inputs, outputs) {
        // This function is called when the node is processed
        // For our use case, we don't need to do anything here
    }
}

// Text control for node titles
class TextControl extends Rete.Control {
    constructor(editor, key, node, readonly = false) {
        super(key);
        this.editor = editor;
        this.key = key;
        this.node = node;
        this.readonly = readonly;
    }

    setValue(val) {
        this.value = val;
        this.update();
    }

    update() {
        if (this.element) {
            this.element.value = this.value;
        }
    }

    mounted() {
        const el = document.createElement('input');
        el.type = 'text';
        el.value = this.value || '';
        el.readOnly = this.readonly;
        el.addEventListener('input', () => {
            this.value = el.value;
            this.update();
            
            // Update section title in letterData
            if (this.node && this.node.id && sectionNodes[this.node.id]) {
                const sectionId = sectionNodes[this.node.id].sectionId;
                if (sectionId && letterData.sections[sectionId]) {
                    // We're not changing the section ID, just updating the display title
                    // The actual section ID remains the same for connection consistency
                }
            }
        });
        
        this.element = el;
        this.container.appendChild(el);
    }
}

// Socket types
const sockets = {
    input: new Rete.Socket('Input'),
    output: new Rete.Socket('Output')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the letter selection page
    if (document.getElementById('letter-selection')) {
        loadLetterList();
        return;
    }
    
    // Initialize token manager
    tokenManager = new TokenManager();
    
    // Set up tab navigation
    setupTabs();
    
    // Set up editor actions
    setupEditorActions();
    
    // Initialize Rete.js editor
    initReteEditor();
    
    // Load tokens
    loadTokens();
    
    // Check for letter ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const letterId = urlParams.get('letter');
    
    if (letterId) {
        loadSpecificLetter(letterId);
    } else {
        // Create a new letter with placeholder section
        createNewLetterWithPlaceholder();
    }
});

// Load letter list for selection page
function loadLetterList() {
    const letterList = document.getElementById('letter-list');
    if (!letterList) return;
    
    // Clear existing list
    letterList.innerHTML = '';
    
    // Get all saved letters from localStorage
    const savedLetters = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('letter_')) {
            try {
                const letterData = JSON.parse(localStorage.getItem(key));
                savedLetters.push({
                    id: key.replace('letter_', ''),
                    title: letterData.title || 'Untitled Letter',
                    date: new Date().toLocaleDateString() // In a real app, would store creation date
                });
            } catch (error) {
                console.error('Error parsing letter data:', error);
            }
        }
    }
    
    // Add each letter to the list
    if (savedLetters.length === 0) {
        letterList.innerHTML = '<div class="empty-state">No letters found. Create a new letter to get started.</div>';
    } else {
        savedLetters.forEach(letter => {
            const letterItem = document.createElement('div');
            letterItem.className = 'letter-item';
            letterItem.innerHTML = `
                <div class="letter-info">
                    <h3>${letter.title}</h3>
                    <p>Created: ${letter.date}</p>
                </div>
                <div class="letter-actions">
                    <button class="edit-letter-btn btn-small">Edit</button>
                    <button class="delete-letter-btn btn-small danger">Delete</button>
                </div>
            `;
            
            // Set up edit button
            letterItem.querySelector('.edit-letter-btn').addEventListener('click', () => {
                window.location.href = `editor.html?letter=${letter.id}`;
            });
            
            // Set up delete button
            letterItem.querySelector('.delete-letter-btn').addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete "${letter.title}"?`)) {
                    localStorage.removeItem(`letter_${letter.id}`);
                    loadLetterList(); // Reload the list
                }
            });
            
            letterList.appendChild(letterItem);
        });
    }
    
    // Set up create new letter button
    document.getElementById('create-letter-btn').addEventListener('click', () => {
        window.location.href = 'editor.html';
    });
}

// Create a new letter with a placeholder section
function createNewLetterWithPlaceholder() {
    // Reset letter data
    letterData = {
        title: 'New Interactive Letter',
        signature: '',
        startSectionId: 'intro',
        config: {
            theme: 'elegant',
            textSize: 'medium'
        },
        sections: {
            intro: {
                content: '<p>This is a placeholder section. Edit this content and add choices to create your interactive letter.</p>',
                choices: []
            }
        }
    };
    
    // Update form fields
    document.getElementById('letter-title').value = letterData.title;
    document.getElementById('letter-signature').value = letterData.signature;
    
    // Create node for placeholder section
    createNodeForSection('intro');
    
    // Update section selects
    updateSectionSelects();
}

// Load a specific letter by ID
function loadSpecificLetter(letterId) {
    try {
        const savedData = localStorage.getItem(`letter_${letterId}`);
        
        if (savedData) {
            letterData = JSON.parse(savedData);
            currentLetterName = letterId;
            
            // Update form fields
            document.getElementById('letter-title').value = letterData.title || '';
            document.getElementById('letter-signature').value = letterData.signature || '';
            document.getElementById('theme-select').value = letterData.config?.theme || 'elegant';
            document.getElementById('text-size').value = letterData.config?.textSize || 'medium';
            document.getElementById('custom-css').value = letterData.config?.customStyles || '';
            
            // Clear editor
            editor.clear();
            sectionNodes = {};
            
            // Create nodes for sections
            Object.keys(letterData.sections).forEach(sectionId => {
                createNodeForSection(sectionId);
            });
            
            // Update section selects
            updateSectionSelects();
        } else {
            // Letter not found, create new one
            createNewLetterWithPlaceholder();
        }
    } catch (error) {
        console.error('Error loading letter data:', error);
        createNewLetterWithPlaceholder();
    }
}

// Set up tab navigation
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Set up editor actions
function setupEditorActions() {
    // Structure tab
    document.getElementById('letter-title').addEventListener('input', updateLetterTitle);
    document.getElementById('letter-signature').addEventListener('input', updateLetterSignature);
    document.getElementById('start-section').addEventListener('change', updateStartSection);
    document.getElementById('add-section-btn').addEventListener('click', openSectionEditor);
    document.getElementById('save-structure-btn').addEventListener('click', saveLetterStructure);
    
    // Styling tab
    document.getElementById('theme-select').addEventListener('change', updateTheme);
    document.getElementById('text-size').addEventListener('change', updateTextSize);
    document.getElementById('custom-css').addEventListener('input', updateCustomCSS);
    document.getElementById('save-styling-btn').addEventListener('click', saveLetterStyling);
    
    // Tokens tab
    document.getElementById('generate-token-btn').addEventListener('click', generateToken);
    
    // Preview tab
    document.getElementById('open-preview-btn').addEventListener('click', openLetterPreview);
    
    // Section editor
    document.getElementById('close-section-editor').addEventListener('click', closeSectionEditor);
    document.getElementById('add-choice-btn').addEventListener('click', addChoice);
    document.getElementById('save-section-btn').addEventListener('click', saveSection);
    
    // Import/Export
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    document.getElementById('import-json-btn').addEventListener('click', importJSON);
}

// Initialize Rete.js editor
async function initReteEditor() {
    // Create container
    const container = document.getElementById('rete');
    
    // Create editor
    editor = new Rete.NodeEditor('interactive-letter@1.0.0', container);
    
    // Register component
    const sectionComponent = new SectionComponent();
    
    // Create engine
    engine = new Rete.Engine('interactive-letter@1.0.0');
    
    // Register component with editor and engine
    editor.register(sectionComponent);
    engine.register(sectionComponent);
    
    // Add plugins
    editor.use(VueRenderPlugin.default);
    editor.use(ConnectionPlugin.default);
    editor.use(AreaPlugin);
    editor.use(ContextMenuPlugin.default, {
        searchBar: false,
        delay: 100,
        allocate(component) {
            return ['Sections'];
        },
        items: {
            'Add Section': () => {
                openSectionEditor();
            },
            'Delete Section': () => {
                if (editor.selected.list.length) {
                    editor.selected.list.forEach(node => {
                        // Remove section from letterData
                        if (sectionNodes[node.id]) {
                            const sectionId = sectionNodes[node.id].sectionId;
                            if (sectionId && letterData.sections[sectionId]) {
                                delete letterData.sections[sectionId];
                            }
                            delete sectionNodes[node.id];
                        }
                        
                        // Remove node from editor
                        editor.removeNode(node);
                    });
                    
                    // Update section select options
                    updateSectionSelects();
                }
            }
        }
    });
    
    // Handle node selection for editing
    editor.on('nodeselected', node => {
        if (sectionNodes[node.id]) {
            const sectionId = sectionNodes[node.id].sectionId;
            if (sectionId && letterData.sections[sectionId]) {
                openSectionEditor(sectionId);
            }
        }
    });
    
    // Handle connection changes
    editor.on('connectioncreated', connection => {
        updateConnectionsInLetterData();
    });
    
    editor.on('connectionremoved', connection => {
        updateConnectionsInLetterData();
    });
    
    // Initial editor setup
    editor.view.resize();
    editor.trigger('process');
}

// Update connections in letter data based on editor connections
function updateConnectionsInLetterData() {
    // Reset all section choices
    Object.keys(letterData.sections).forEach(sectionId => {
        if (!letterData.sections[sectionId].isFinal) {
            letterData.sections[sectionId].choices = letterData.sections[sectionId].choices || [];
        }
    });
    
    // Get all connections
    const connections = editor.connections;
    
    // Process each connection to update choices
    connections.forEach(connection => {
        const sourceNodeId = connection.source;
        const targetNodeId = connection.target;
        
        if (sectionNodes[sourceNodeId] && sectionNodes[targetNodeId]) {
            const sourceSectionId = sectionNodes[sourceNodeId].sectionId;
            const targetSectionId = sectionNodes[targetNodeId].sectionId;
            
            if (sourceSectionId && targetSectionId && 
                letterData.sections[sourceSectionId] && 
                letterData.sections[targetSectionId]) {
                
                // Find if there's already a choice for this connection
                const existingChoiceIndex = letterData.sections[sourceSectionId].choices ?
                    letterData.sections[sourceSectionId].choices.findIndex(choice => 
                        choice.nextSection === targetSectionId) : -1;
                
                if (existingChoiceIndex === -1) {
                    // Add a new choice if it doesn't exist
                    if (!letterData.sections[sourceSectionId].choices) {
                        letterData.sections[sourceSectionId].choices = [];
                    }
                    
                    letterData.sections[sourceSectionId].choices.push({
                        text: `Go to ${targetSectionId}`,
                        nextSection: targetSectionId
                    });
                }
            }
        }
    });
}

// Open section editor
function openSectionEditor(sectionId = null) {
    const sectionEditor = document.getElementById('section-editor');
    
    // Clear previous data
    document.getElementById('section-id').value = '';
    document.getElementById('section-content').value = '';
    document.getElementById('is-final-section').checked = false;
    document.getElementById('choices-list').innerHTML = '';
    
    if (sectionId && letterData.sections[sectionId]) {
        // Edit existing section
        currentEditingNode = Object.keys(sectionNodes).find(
            nodeId => sectionNodes[nodeId].sectionId === sectionId
        );
        
        const section = letterData.sections[sectionId];
        
        // Fill form with section data
        document.getElementById('section-id').value = sectionId;
        document.getElementById('section-id').readOnly = true; // Don't allow changing ID of existing section
        document.getElementById('section-content').value = section.content || '';
        document.getElementById('is-final-section').checked = section.isFinal || false;
        
        // Toggle choices editor based on isFinal
        document.getElementById('choices-editor').style.display = section.isFinal ? 'none' : 'block';
        
        // Add existing choices
        if (section.choices && section.choices.length > 0) {
            section.choices.forEach(choice => {
                addChoiceToEditor(choice.text, choice.nextSection);
            });
        }
    } else {
        // Create new section
        currentEditingNode = null;
        document.getElementById('section-id').readOnly = false;
        document.getElementById('choices-editor').style.display = 'block';
    }
    
    // Update section selects in choice items
    updateSectionSelects();
    
    // Show section editor
    sectionEditor.classList.remove('hidden');
}

// Close section editor
function closeSectionEditor() {
    document.getElementById('section-editor').classList.add('hidden');
    currentEditingNode = null;
}

// Add a new choice to the editor
function addChoice() {
    addChoiceToEditor('', '');
}

// Add a choice to the editor with specified text and next section
function addChoiceToEditor(text, nextSection) {
    const choicesList = document.getElementById('choices-list');
    const template = document.getElementById('choice-template');
    const choiceItem = template.content.cloneNode(true);
    
    // Set values
    choiceItem.querySelector('.choice-text').value = text;
    
    // Set up remove button
    choiceItem.querySelector('.remove-choice-btn').addEventListener('click', function() {
        this.closest('.choice-item').remove();
    });
    
    // Add to list
    choicesList.appendChild(choiceItem);
    
    // Update section selects after adding
    updateSectionSelects();
    
    // Set next section value after options are updated
    if (nextSection) {
        const selects = choicesList.querySelectorAll('.next-section');
        const lastSelect = selects[selects.length - 1];
        if (lastSelect) {
            lastSelect.value = nextSection;
        }
    }
}

// Update all section select dropdowns
function updateSectionSelects() {
    // Get all section IDs
    const sectionIds = Object.keys(letterData.sections);
    
    // Update start section select
    const startSectionSelect = document.getElementById('start-section');
    startSectionSelect.innerHTML = '<option value="">Select start section</option>';
    
    sectionIds.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        option.selected = id === letterData.startSectionId;
        startSectionSelect.appendChild(option);
    });
    
    // Update next section selects in choices
    const nextSectionSelects = document.querySelectorAll('.next-section');
    nextSectionSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select next section</option>';
        
        sectionIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            option.selected = id === currentValue;
            select.appendChild(option);
        });
    });
    
    // Update preview token select
    const previewTokenSelect = document.getElementById('preview-token');
    previewTokenSelect.innerHTML = '<option value="">Select a token</option>';
    
    const tokens = tokenManager.getAllTokens();
    Object.keys(tokens).forEach(token => {
        const option = document.createElement('option');
        option.value = token;
        option.textContent = `${token} (${tokens[token].letterName})`;
        previewTokenSelect.appendChild(option);
    });
}

// Save section data
function saveSection() {
    const sectionId = document.getElementById('section-id').value.trim();
    const content = document.getElementById('section-content').value.trim();
    const isFinal = document.getElementById('is-final-section').checked;
    
    if (!sectionId) {
        alert('Section ID is required');
        return;
    }
    
    if (!content) {
        alert('Section content is required');
        return;
    }
    
    // Get choices if not final
    let choices = [];
    if (!isFinal) {
        const choiceItems = document.querySelectorAll('.choice-item');
        choiceItems.forEach(item => {
            const text = item.querySelector('.choice-text').value.trim();
            const nextSection = item.querySelector('.next-section').value;
            
            if (text && nextSection) {
                choices.push({
                    text,
                    nextSection
                });
            }
        });
    }
    
    // Create or update section in letterData
    letterData.sections[sectionId] = {
        content,
        isFinal
    };
    
    if (!isFinal) {
        letterData.sections[sectionId].choices = choices;
    }
    
    // If this is a new section, create a node for it
    if (!currentEditingNode) {
        createNodeForSection(sectionId);
    } else {
        // Update existing node title
        const node = editor.nodes.find(n => n.id.toString() === currentEditingNode.toString());
        if (node) {
            node.controls.get('title').setValue(sectionId);
        }
    }
    
    // Update section selects
    updateSectionSelects();
    
    // Close section editor
    closeSectionEditor();
    
    // Save letter data
    saveLetterData();
}

// Create a node for a section
function createNodeForSection(sectionId) {
    const component = editor.components.get('Section');
    const node = new Rete.Node('Section');
    node.position = [Math.random() * 300, Math.random() * 300];
    
    // Add component to node
    component.builder(node);
    
    // Set node title
    node.controls.get('title').setValue(sectionId);
    
    // Add node to editor
    editor.addNode(node);
    
    // Store reference to node
    sectionNodes[node.id] = { sectionId };
    
    // Process
    editor.view.resize();
    editor.trigger('process');
}

// Update letter title
function updateLetterTitle(event) {
    letterData.title = event.target.value;
}

// Update letter signature
function updateLetterSignature(event) {
    letterData.signature = event.target.value;
}

// Update start section
function updateStartSection(event) {
    letterData.startSectionId = event.target.value;
}

// Update theme
function updateTheme(event) {
    letterData.config.theme = event.target.value;
}

// Update text size
function updateTextSize(event) {
    letterData.config.textSize = event.target.value;
}

// Update custom CSS
function updateCustomCSS(event) {
    letterData.config.customStyles = event.target.value;
}

// Save letter structure
function saveLetterStructure() {
    // Validate required fields
    if (!letterData.title) {
        alert('Letter title is required');
        return;
    }
    
    if (!letterData.startSectionId) {
        alert('Start section is required');
        return;
    }
    
    if (Object.keys(letterData.sections).length === 0) {
        alert('At least one section is required');
        return;
    }
    
    // Save letter data
    saveLetterData();
    
    alert('Letter structure saved successfully');
}

// Save letter data
function saveLetterData() {
    // Generate a unique ID if this is a new letter
    if (!currentLetterName) {
        currentLetterName = 'letter_' + Date.now();
    }
    
    // Save to localStorage
    localStorage.setItem(`letter_${currentLetterName}`, JSON.stringify(letterData));
}

// Save letter styling
function saveLetterStyling() {
    // Save letter data
    saveLetterData();
    
    alert('Letter styling saved successfully');
}

// Generate a token
async function generateToken() {
    const letterName = document.getElementById('token-letter-name').value.trim();
    const creator = document.getElementById('token-creator').value.trim() || 'admin';
    
    if (!letterName) {
        alert('Letter name is required');
        return;
    }
    
    // Generate token
    const result = tokenManager.generateToken(letterName, creator);
    
    if (result) {
        // Save tokens data
        await tokenManager.saveTokensData();
        
        // Save letter data for this token
        saveLetterForToken(result.token);
        
        // Reload tokens
        loadTokens();
        
        // Clear form
        document.getElementById('token-letter-name').value = '';
        document.getElementById('token-creator').value = '';
        
        alert(`Token generated successfully: ${result.token}`);
    } else {
        alert('Error generating token');
    }
}

// Save letter data for a specific token
function saveLetterForToken(token) {
    // Save current letter data for this token
    localStorage.setItem(`letter_${token}`, JSON.stringify(letterData));
}

// Load tokens
async function loadTokens() {
    await tokenManager.loadTokensData();
    const tokens = tokenManager.getAllTokens();
    
    const tokenList = document.getElementById('token-list');
    tokenList.innerHTML = '';
    
    const template = document.getElementById('token-item-template');
    
    Object.keys(tokens).forEach(token => {
        const tokenData = tokens[token];
        const tokenItem = template.content.cloneNode(true);
        
        // Set values
        tokenItem.querySelector('.token-value').textContent = token;
        tokenItem.querySelector('.token-letter-name').textContent = tokenData.letterName;
        
        // Set up copy button
        tokenItem.querySelector('.copy-token-btn').addEventListener('click', () => {
            const link = tokenManager.createShareableLink(token);
            navigator.clipboard.writeText(link)
                .then(() => alert('Link copied to clipboard'))
                .catch(err => console.error('Error copying link:', err));
        });
        
        // Set up delete button
        tokenItem.querySelector('.delete-token-btn').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete token ${token}?`)) {
                tokenManager.deleteToken(token);
                await tokenManager.saveTokensData();
                loadTokens();
            }
        });
        
        // Add to list
        tokenList.appendChild(tokenItem);
    });
    
    // Update preview token select
    updateSectionSelects();
}

// Open letter preview
function openLetterPreview() {
    const token = document.getElementById('preview-token').value;
    
    if (!token) {
        alert('Please select a token');
        return;
    }
    
    // Save current letter data for this token
    saveLetterForToken(token);
    
    // Open preview in new tab
    const url = `index.html?token=${token}`;
    window.open(url, '_blank');
}

// Export JSON
function exportJSON() {
    const dataStr = JSON.stringify(letterData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'letter-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Import JSON
function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Validate imported data
                if (!data.title || !data.sections || Object.keys(data.sections).length === 0) {
                    throw new Error('Invalid letter data format');
                }
                
                // Update letter data
                letterData = data;
                
                // Clear editor
                editor.clear();
                sectionNodes = {};
                
                // Create nodes for sections
                Object.keys(letterData.sections).forEach(sectionId => {
                    createNodeForSection(sectionId);
                });
                
                // Update form fields
                document.getElementById('letter-title').value = letterData.title || '';
                document.getElementById('letter-signature').value = letterData.signature || '';
                document.getElementById('theme-select').value = letterData.config?.theme || 'elegant';
                document.getElementById('text-size').value = letterData.config?.textSize || 'medium';
                document.getElementById('custom-css').value = letterData.config?.customStyles || '';
                
                // Update section selects
                updateSectionSelects();
                
                // Save letter data
                saveLetterData();
                
                alert('Letter data imported successfully');
            } catch (error) {
                console.error('Error importing JSON:', error);
                alert('Error importing JSON: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}
