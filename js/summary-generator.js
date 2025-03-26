// summary-generator.js - Generates summaries of letter interactions

class SummaryGenerator {
    constructor(letterData) {
        this.letterData = letterData;
        this.choiceHistory = [];
        this.visitedSections = [];
    }
    
    // Add a choice to the history
    addChoice(fromSectionId, choiceText, toSectionId) {
        this.choiceHistory.push({
            fromSection: fromSectionId,
            choiceText: choiceText,
            toSection: toSectionId
        });
    }
    
    // Add a visited section
    addVisitedSection(sectionId) {
        if (this.letterData && this.letterData.sections && this.letterData.sections[sectionId]) {
            this.visitedSections.push({
                id: sectionId,
                content: this.letterData.sections[sectionId].content
            });
        }
    }
    
    // Generate a summary of the letter interaction
    generateSummary() {
        return {
            letterTitle: this.letterData?.title || 'Interactive Letter',
            date: new Date().toISOString(),
            choices: this.choiceHistory,
            sections: this.visitedSections
        };
    }
    
    // Save summary to localStorage
    saveSummary() {
        const summary = this.generateSummary();
        const summaryId = `summary_${Date.now()}`;
        localStorage.setItem(summaryId, JSON.stringify(summary));
        return summaryId;
    }
    
    // Get HTML representation of the summary
    getSummaryHTML() {
        const summary = this.generateSummary();
        
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
        
        // Return HTML
        return `
            <h2>Journey Summary: ${summary.letterTitle}</h2>
            <p class="summary-date">Completed on: ${new Date(summary.date).toLocaleString()}</p>
            ${choicesSummary}
            ${contentSummary}
            <div class="summary-actions">
                <button id="close-summary-btn" class="btn">Close Summary</button>
            </div>
        `;
    }
    
    // Static method to load a summary from localStorage
    static loadSummary(summaryId) {
        const savedSummary = localStorage.getItem(summaryId);
        
        if (savedSummary) {
            return JSON.parse(savedSummary);
        }
        
        return null;
    }
    
    // Static method to get all summaries from localStorage
    static getAllSummaries() {
        const summaries = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith('summary_')) {
                try {
                    const summary = JSON.parse(localStorage.getItem(key));
                    summaries.push({
                        id: key,
                        title: summary.letterTitle,
                        date: summary.date
                    });
                } catch (error) {
                    console.error('Error parsing summary:', error);
                }
            }
        }
        
        return summaries;
    }
    
    // Static method to delete a summary from localStorage
    static deleteSummary(summaryId) {
        localStorage.removeItem(summaryId);
    }
}
