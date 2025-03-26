// letter.js - Main script for the interactive letter functionality

// Global variables
let letterData = null;
let currentSectionId = null;
let visitedSections = [];
let userChoices = [];
let letterConfig = {};
let tokenManager = null;
let summaryGenerator = null;
let currentToken = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize token manager
    tokenManager = new TokenManager();
    
    // Initialize summary generator
    summaryGenerator = new SummaryGenerator();
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentToken = urlParams.get('token');
    
    if (!currentToken) {
        showTokenError('No access token provided');
        return;
    }
    
    // Validate token and load letter data
    validateToken(currentToken)
        .then(result => {
            if (result.valid) {
                loadLetterData(currentToken);
            } else {
                showTokenError(`Invalid or expired token: ${result.reason}`);
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
            showTokenError('Error validating access');
        });
        
    // Set current date
    document.getElementById('letter-date').textContent = new Date().toLocaleDateString();
});

// Validate the access token
async function validateToken(token) {
    try {
        return await tokenManager.validateToken(token);
    } catch (error) {
        console.error('Error validating token:', error);
        return { valid: false, reason: 'Error during validation' };
    }
}

// Mark token as used
async function markTokenAsUsed(token) {
    return tokenManager.markTokenAsUsed(token);
}

// Load letter data from JSON
async function loadLetterData(token) {
    try {
        // Load letter content
        const response = await fetch(`data/letters/${token}.json`);
        
        if (!response.ok) {
            throw new Error('Letter data not found');
        }
        
        letterData = await response.json();
        letterConfig = letterData.config || {};
        
        // Apply letter styling if provided
        applyLetterStyling();
        
        // Set letter title and signature
        document.getElementById('letter-title').textContent = letterData.title || 'Interactive Letter';
        document.getElementById('letter-signature').textContent = letterData.signature || '';
        
        // Mark token as used
        await markTokenAsUsed(token);
        
        // Initialize summary generator with letter data
        summaryGenerator.initialize(letterData, visitedSections, userChoices);
        
        // Start with the first section
        showSection(letterData.startSectionId);
        
        // Hide token validation screen and show letter content
        document.getElementById('token-validation').classList.add('hidden');
        document.getElementById('letter-content').classList.remove('hidden');
        document.getElementById('letter-content').classList.add('fade-in');
        
    } catch (error) {
        console.error('Error loading letter data:', error);
        showTokenError('Error loading letter content');
    }
}

// Apply letter styling based on configuration
function applyLetterStyling() {
    const container = document.querySelector('.container');
    
    // Apply theme class if specified
    if (letterConfig.theme) {
        container.classList.add(letterConfig.theme);
    }
    
    // Apply text size if specified
    if (letterConfig.textSize) {
        container.classList.add(`text-${letterConfig.textSize}`);
    }
    
    // Apply custom styles if specified
    if (letterConfig.customStyles) {
        const style = document.createElement('style');
        style.textContent = letterConfig.customStyles;
        document.head.appendChild(style);
    }
}

// Show token error message
function showTokenError(message) {
    document.getElementById('token-message').textContent = message || 'Access error';
    document.getElementById('token-error').classList.remove('hidden');
}

// Show a specific section of the letter
function showSection(sectionId) {
    if (!letterData || !letterData.sections || !letterData.sections[sectionId]) {
        console.error('Section not found:', sectionId);
        return;
    }
    
    currentSectionId = sectionId;
    
    // Add to visited sections if not already there
    if (!visitedSections.includes(sectionId)) {
        visitedSections.push(sectionId);
    }
    
    const section = letterData.sections[sectionId];
    const sectionElement = document.getElementById('current-section');
    const choicesContainer = document.getElementById('choices-container');
    const choicesElement = document.getElementById('choices');
    
    // Display section content
    sectionElement.innerHTML = section.content;
    
    // Handle choices
    if (section.choices && section.choices.length > 0) {
        // Clear previous choices
        choicesElement.innerHTML = '';
        
        // Create buttons for each choice
        section.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.textContent = choice.text;
            button.addEventListener('click', () => {
                // Record this choice
                userChoices.push({
                    fromSection: sectionId,
                    choiceText: choice.text,
                    toSection: choice.nextSection
                });
                
                // Update summary generator with new data
                summaryGenerator.initialize(letterData, visitedSections, userChoices);
                
                // Go to next section
                showSection(choice.nextSection);
            });
            
            choicesElement.appendChild(button);
        });
        
        // Show choices container
        choicesContainer.classList.remove('hidden');
    } else {
        // No choices means this is an end section
        choicesContainer.classList.add('hidden');
        
        // If this is a final section, show completion screen
        if (section.isFinal) {
            setTimeout(() => {
                showCompletionScreen();
            }, 2000); // Give user time to read final section
        }
    }
}

// Show the completion screen with journey summary
function showCompletionScreen() {
    // Generate summary
    generateSummary();
    
    // Hide letter content and show completion screen
    document.getElementById('letter-content').classList.add('hidden');
    document.getElementById('letter-complete').classList.remove('hidden');
    document.getElementById('letter-complete').classList.add('fade-in');
    
    // Save journey data
    saveJourneyData();
}

// Generate a summary of the user's journey through the letter
function generateSummary() {
    const summaryContent = document.getElementById('summary-content');
    
    // Update summary generator with final data
    summaryGenerator.initialize(letterData, visitedSections, userChoices);
    
    // Generate summary and convert to HTML
    const summary = summaryGenerator.generateSummary();
    const summaryHTML = SummaryGenerator.generateSummaryHTML(summary);
    
    // Display summary
    summaryContent.innerHTML = summaryHTML;
}

// Save journey data for analytics
async function saveJourneyData() {
    // Save summary using the summary generator
    await summaryGenerator.saveSummary(currentToken);
}
