// letter.js - Main script for the interactive letter functionality

// Global variables
let letterData = null;
let currentSectionId = null;
let choiceHistory = [];
let summaryData = {
    letterTitle: '',
    choices: [],
    sections: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Check if we need to show the token entry form
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Show token entry form
        showTokenEntryForm(token);
    } else {
        // Show error message
        showErrorMessage('No token provided. Please use a valid link to access this letter.');
    }
});

// Show token entry form
function showTokenEntryForm(token) {
    const letterContainer = document.getElementById('letter-container');
    
    // Create token entry form
    const tokenForm = document.createElement('div');
    tokenForm.className = 'token-entry-form';
    tokenForm.innerHTML = `
        <h2>Enter Password</h2>
        <p>This letter is protected. Please enter the password to view it.</p>
        <div class="form-group">
            <input type="password" id="token-password" placeholder="Enter password" class="token-input">
            <button id="submit-token" class="token-submit-btn">Submit</button>
        </div>
        <p id="token-error" class="error-message hidden"></p>
    `;
    
    // Add form to container
    letterContainer.innerHTML = '';
    letterContainer.appendChild(tokenForm);
    
    // Set up submit button
    document.getElementById('submit-token').addEventListener('click', () => {
        const password = document.getElementById('token-password').value.trim();
        
        if (password === token) {
            // Password matches token, load letter
            loadLetter(token);
        } else {
            // Show error
            const errorElement = document.getElementById('token-error');
            errorElement.textContent = 'Invalid password. Please try again.';
            errorElement.classList.remove('hidden');
        }
    });
    
    // Set up enter key
    document.getElementById('token-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('submit-token').click();
        }
    });
}

// Load letter data
async function loadLetter(token) {
    try {
        // Try to load from localStorage first
        const savedData = localStorage.getItem(`letter_${token}`);
        
        if (savedData) {
            letterData = JSON.parse(savedData);
            
            // Check if token is valid
            const tokenManager = new TokenManager();
            await tokenManager.loadTokensData();
            
            const isValid = tokenManager.validateToken(token);
            
            if (!isValid) {
                showErrorMessage('This letter link has expired or is no longer valid.');
                return;
            }
            
            // Initialize summary data
            summaryData.letterTitle = letterData.title || 'Interactive Letter';
            
            // Apply styling
            applyLetterStyling();
            
            // Show the first section
            if (letterData.startSectionId && letterData.sections[letterData.startSectionId]) {
                showSection(letterData.startSectionId);
            } else {
                showErrorMessage('Letter data is invalid. Missing start section.');
            }
            
            // Mark token as used
            tokenManager.markTokenAsUsed(token);
            await tokenManager.saveTokensData();
        } else {
            // Try to load from server
            try {
                const response = await fetch(`data/letters/${token}.json`);
                
                if (response.ok) {
                    letterData = await response.json();
                    
                    // Initialize summary data
                    summaryData.letterTitle = letterData.title || 'Interactive Letter';
                    
                    // Apply styling
                    applyLetterStyling();
                    
                    // Show the first section
                    if (letterData.startSectionId && letterData.sections[letterData.startSectionId]) {
                        showSection(letterData.startSectionId);
                    } else {
                        showErrorMessage('Letter data is invalid. Missing start section.');
                    }
                    
                    // Mark token as used
                    const tokenManager = new TokenManager();
                    await tokenManager.loadTokensData();
                    tokenManager.markTokenAsUsed(token);
                    await tokenManager.saveTokensData();
                } else {
                    showErrorMessage('Letter not found. The link may be invalid or expired.');
                }
            } catch (error) {
                console.error('Error loading letter:', error);
                showErrorMessage('Error loading letter. Please try again later.');
            }
        }
    } catch (error) {
        console.error('Error loading letter:', error);
        showErrorMessage('Error loading letter. Please try again later.');
    }
}

// Show a specific section
function showSection(sectionId) {
    if (!letterData || !letterData.sections || !letterData.sections[sectionId]) {
        showErrorMessage('Section not found.');
        return;
    }
    
    // Update current section
    currentSectionId = sectionId;
    
    // Get section data
    const section = letterData.sections[sectionId];
    
    // Add to summary data
    summaryData.sections.push({
        id: sectionId,
        content: section.content
    });
    
    // Create section element
    const sectionElement = document.createElement('div');
    sectionElement.className = 'letter-section';
    sectionElement.innerHTML = `
        <div class="letter-content">${section.content}</div>
        ${section.isFinal ? getLetterClosing() : getChoicesHTML(section.choices)}
    `;
    
    // Add to container
    const letterContainer = document.getElementById('letter-container');
    letterContainer.innerHTML = '';
    letterContainer.appendChild(sectionElement);
    
    // Set up choice buttons
    if (!section.isFinal && section.choices && section.choices.length > 0) {
        section.choices.forEach((choice, index) => {
            const button = document.getElementById(`choice-${index}`);
            if (button) {
                button.addEventListener('click', () => {
                    // Add to choice history
                    choiceHistory.push({
                        fromSection: sectionId,
                        choiceText: choice.text,
                        toSection: choice.nextSection
                    });
                    
                    // Add to summary data
                    summaryData.choices.push({
                        fromSection: sectionId,
                        choiceText: choice.text,
                        toSection: choice.nextSection
                    });
                    
                    // Show next section
                    showSection(choice.nextSection);
                });
            }
        });
    }
    
    // If this is a final section, generate summary
    if (section.isFinal) {
        generateSummary();
    }
}

// Get HTML for choices
function getChoicesHTML(choices) {
    if (!choices || choices.length === 0) {
        return '<div class="letter-choices"><p>No choices available.</p></div>';
    }
    
    let choicesHTML = '<div class="letter-choices">';
    
    choices.forEach((choice, index) => {
        choicesHTML += `
            <button id="choice-${index}" class="choice-btn">${choice.text}</button>
        `;
    });
    
    choicesHTML += '</div>';
    
    return choicesHTML;
}

// Get HTML for letter closing
function getLetterClosing() {
    return `
        <div class="letter-closing">
            <p class="signature">${letterData.signature || 'Sincerely'}</p>
        </div>
    `;
}

// Apply letter styling
function applyLetterStyling() {
    if (!letterData || !letterData.config) return;
    
    const root = document.documentElement;
    
    // Apply theme
    const theme = letterData.config.theme || 'elegant';
    document.body.className = `theme-${theme}`;
    
    // Apply text size
    const textSize = letterData.config.textSize || 'medium';
    root.style.setProperty('--text-size', getTextSizeValue(textSize));
    
    // Apply custom styles
    if (letterData.config.customStyles) {
        const styleElement = document.createElement('style');
        styleElement.textContent = letterData.config.customStyles;
        document.head.appendChild(styleElement);
    }
    
    // Update title
    document.title = letterData.title || 'Interactive Letter';
    
    // Add letter title to header
    const letterHeader = document.querySelector('.letter-header h1');
    if (letterHeader) {
        letterHeader.textContent = letterData.title || 'Interactive Letter';
    }
}

// Get text size value
function getTextSizeValue(size) {
    switch (size) {
        case 'small': return '0.9rem';
        case 'medium': return '1rem';
        case 'large': return '1.2rem';
        case 'x-large': return '1.4rem';
        default: return '1rem';
    }
}

// Show error message
function showErrorMessage(message) {
    const letterContainer = document.getElementById('letter-container');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
        <h2>Error</h2>
        <p>${message}</p>
        <button id="back-btn" class="btn">Go Back</button>
    `;
    
    letterContainer.innerHTML = '';
    letterContainer.appendChild(errorElement);
    
    // Set up back button
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
}

// Generate summary
function generateSummary() {
    // Create summary object
    const summary = {
        letterTitle: summaryData.letterTitle,
        date: new Date().toISOString(),
        choices: summaryData.choices,
        sections: summaryData.sections
    };
    
    // Save summary to localStorage
    const summaryId = `summary_${Date.now()}`;
    localStorage.setItem(summaryId, JSON.stringify(summary));
    
    // Add summary button
    const letterContainer = document.getElementById('letter-container');
    const summaryButton = document.createElement('div');
    summaryButton.className = 'summary-button-container';
    summaryButton.innerHTML = `
        <button id="view-summary-btn" class="btn">View Journey Summary</button>
    `;
    
    letterContainer.appendChild(summaryButton);
    
    // Set up summary button
    document.getElementById('view-summary-btn').addEventListener('click', () => {
        showSummary(summary);
    });
}

// Show summary
function showSummary(summary) {
    const letterContainer = document.getElementById('letter-container');
    
    // Create summary element
    const summaryElement = document.createElement('div');
    summaryElement.className = 'letter-summary';
    
    // Create choices summary
    let choicesSummary = '';
    if (summary.choices && summary.choices.length > 0) {
        choicesSummary = '<h3>Your Choices</h3><ul>';
        
        summary.choices.forEach(choice => {
            choicesSummary += `<li>You chose: "${choice.choiceText}"</li>`;
        });
        
        choicesSummary += '</ul>';
    }
    
    // Create content summary
    let contentSummary = '<h3>Your Journey</h3>';
    if (summary.sections && summary.sections.length > 0) {
        summary.sections.forEach(section => {
            contentSummary += `<div class="summary-section">${section.content}</div>`;
        });
    }
    
    // Set summary content
    summaryElement.innerHTML = `
        <h2>Journey Summary: ${summary.letterTitle}</h2>
        <p class="summary-date">Completed on: ${new Date(summary.date).toLocaleString()}</p>
        ${choicesSummary}
        ${contentSummary}
        <div class="summary-actions">
            <button id="close-summary-btn" class="btn">Close Summary</button>
        </div>
    `;
    
    // Show summary
    letterContainer.innerHTML = '';
    letterContainer.appendChild(summaryElement);
    
    // Set up close button
    document.getElementById('close-summary-btn').addEventListener('click', () => {
        // Go back to final section
        showSection(currentSectionId);
    });
}
