// summary-generator.js - Handles summary generation and storage

class SummaryGenerator {
    constructor() {
        this.journeyData = null;
    }

    // Initialize with letter data and user journey
    initialize(letterData, visitedSections, userChoices) {
        this.letterData = letterData;
        this.visitedSections = visitedSections;
        this.userChoices = userChoices;
    }

    // Generate a detailed summary of the user's journey
    generateSummary() {
        if (!this.letterData || !this.visitedSections || !this.userChoices) {
            console.error('Cannot generate summary: missing data');
            return null;
        }

        const summary = {
            timestamp: new Date().toISOString(),
            letterTitle: this.letterData.title || 'Interactive Letter',
            totalSections: this.visitedSections.length,
            pathTaken: this.generatePathDescription(),
            fullContent: this.generateFullContent(),
            choicesMade: this.formatChoices()
        };

        return summary;
    }

    // Generate a description of the path taken through the letter
    generatePathDescription() {
        const path = [];
        
        this.visitedSections.forEach(sectionId => {
            const section = this.letterData.sections[sectionId];
            if (!section) return;
            
            // Create a short description of this section
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = section.content;
            let textContent = tempDiv.textContent.trim();
            const shortDesc = textContent.length > 50 ? textContent.substring(0, 50) + '...' : textContent;
            
            path.push({
                sectionId,
                shortDescription: shortDesc,
                isFinal: section.isFinal || false
            });
        });
        
        return path;
    }

    // Generate the full content of the visited sections
    generateFullContent() {
        const fullContent = [];
        
        this.visitedSections.forEach(sectionId => {
            const section = this.letterData.sections[sectionId];
            if (!section) return;
            
            // Get the choice that led to this section
            const leadingChoice = this.userChoices.find(choice => choice.toSection === sectionId);
            
            fullContent.push({
                sectionId,
                content: section.content,
                leadingChoice: leadingChoice ? leadingChoice.choiceText : null
            });
        });
        
        return fullContent;
    }

    // Format the choices made by the user
    formatChoices() {
        return this.userChoices.map(choice => {
            const fromSection = this.letterData.sections[choice.fromSection];
            const toSection = this.letterData.sections[choice.toSection];
            
            return {
                fromSectionId: choice.fromSection,
                fromSectionTitle: this.getSectionTitle(fromSection),
                choiceText: choice.choiceText,
                toSectionId: choice.toSection,
                toSectionTitle: this.getSectionTitle(toSection)
            };
        });
    }

    // Extract a title from section content
    getSectionTitle(section) {
        if (!section) return 'Unknown Section';
        
        // Try to extract a title from the first paragraph or heading
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = section.content;
        
        // Look for headings first
        const heading = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) return heading.textContent.trim();
        
        // If no heading, use the first paragraph or first few words
        const firstPara = tempDiv.querySelector('p');
        if (firstPara) {
            const text = firstPara.textContent.trim();
            return text.length > 30 ? text.substring(0, 30) + '...' : text;
        }
        
        // Fallback to first few words of content
        const text = tempDiv.textContent.trim();
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }

    // Save the summary data
    async saveSummary(token) {
        const summary = this.generateSummary();
        if (!summary) return false;
        
        try {
            // Add token information
            summary.token = token;
            
            // In a real application, this would make an API call to save to the server
            // For this client-side only app, we'll simulate this with localStorage
            
            // Get existing summaries
            const storedSummaries = localStorage.getItem('letterSummaries') || '{}';
            const summaries = JSON.parse(storedSummaries);
            
            // Add this summary
            summaries[token] = summary;
            
            // Save back to localStorage
            localStorage.setItem('letterSummaries', JSON.stringify(summaries));
            
            // Also save to sessionStorage for immediate access in the current session
            sessionStorage.setItem(`summary_${token}`, JSON.stringify(summary));
            
            console.log('Summary saved successfully:', summary);
            return true;
        } catch (error) {
            console.error('Error saving summary:', error);
            return false;
        }
    }

    // Get a saved summary by token
    static getSummary(token) {
        try {
            // Try sessionStorage first (for current session)
            const sessionSummary = sessionStorage.getItem(`summary_${token}`);
            if (sessionSummary) return JSON.parse(sessionSummary);
            
            // Fall back to localStorage
            const storedSummaries = localStorage.getItem('letterSummaries') || '{}';
            const summaries = JSON.parse(storedSummaries);
            
            return summaries[token] || null;
        } catch (error) {
            console.error('Error retrieving summary:', error);
            return null;
        }
    }

    // Generate HTML representation of the summary
    static generateSummaryHTML(summary) {
        if (!summary) return '<p>Summary not available</p>';
        
        let html = `
            <div class="summary-header">
                <h2>${summary.letterTitle}</h2>
                <p>Read on: ${new Date(summary.timestamp).toLocaleString()}</p>
                <p>Sections visited: ${summary.totalSections}</p>
            </div>
            <div class="summary-journey">
                <h3>Journey Path</h3>
                <ol class="journey-path">
        `;
        
        // Add path steps
        summary.pathTaken.forEach((step, index) => {
            html += `<li>${step.shortDescription}</li>`;
        });
        
        html += `
                </ol>
            </div>
            <div class="summary-choices">
                <h3>Choices Made</h3>
                <ul class="choices-list">
        `;
        
        // Add choices
        summary.choicesMade.forEach(choice => {
            html += `
                <li>
                    <p><strong>At:</strong> ${choice.fromSectionTitle}</p>
                    <p><strong>You chose:</strong> ${choice.choiceText}</p>
                    <p><strong>Leading to:</strong> ${choice.toSectionTitle}</p>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
            <div class="summary-full-content">
                <h3>Full Content</h3>
        `;
        
        // Add full content
        summary.fullContent.forEach(section => {
            html += `
                <div class="content-section">
                    ${section.leadingChoice ? `<p class="choice-made">You chose: ${section.leadingChoice}</p>` : ''}
                    <div class="section-content">${section.content}</div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        return html;
    }
}

// Export the SummaryGenerator class
window.SummaryGenerator = SummaryGenerator;
