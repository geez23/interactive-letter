// token-manager.js - Manages tokens for one-time use access to letters

class TokenManager {
    constructor() {
        this.tokens = {};
    }
    
    // Load tokens data from localStorage or server
    async loadTokensData() {
        try {
            // Try to load from localStorage first
            const savedTokens = localStorage.getItem('letter_tokens');
            
            if (savedTokens) {
                this.tokens = JSON.parse(savedTokens);
            } else {
                // Try to load from server
                try {
                    const response = await fetch('data/tokens.json');
                    
                    if (response.ok) {
                        this.tokens = await response.json();
                    } else {
                        console.error('Error loading tokens from server');
                        this.tokens = {};
                    }
                } catch (error) {
                    console.error('Error loading tokens from server:', error);
                    this.tokens = {};
                }
            }
        } catch (error) {
            console.error('Error loading tokens:', error);
            this.tokens = {};
        }
    }
    
    // Save tokens data to localStorage
    async saveTokensData() {
        try {
            localStorage.setItem('letter_tokens', JSON.stringify(this.tokens));
            return true;
        } catch (error) {
            console.error('Error saving tokens:', error);
            return false;
        }
    }
    
    // Generate a new token
    generateToken(letterName, creator) {
        try {
            // Generate a random token
            const token = this.generateRandomToken();
            
            // Add token to tokens object
            this.tokens[token] = {
                letterName,
                creator,
                created: new Date().toISOString(),
                used: false
            };
            
            return {
                token,
                letterName,
                creator
            };
        } catch (error) {
            console.error('Error generating token:', error);
            return null;
        }
    }
    
    // Generate a random token
    generateRandomToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        
        // Generate a 10-character token
        for (let i = 0; i < 10; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return token;
    }
    
    // Validate a token
    validateToken(token) {
        // Check if token exists
        if (!this.tokens[token]) {
            return false;
        }
        
        // Check if token has been used
        if (this.tokens[token].used) {
            return false;
        }
        
        return true;
    }
    
    // Mark a token as used
    markTokenAsUsed(token) {
        if (this.tokens[token]) {
            this.tokens[token].used = true;
            this.tokens[token].usedDate = new Date().toISOString();
            return true;
        }
        
        return false;
    }
    
    // Delete a token
    deleteToken(token) {
        if (this.tokens[token]) {
            delete this.tokens[token];
            return true;
        }
        
        return false;
    }
    
    // Get all tokens
    getAllTokens() {
        return this.tokens;
    }
    
    // Create a shareable link for a token
    createShareableLink(token) {
        const baseUrl = window.location.origin;
        const path = window.location.pathname.replace(/\/[^\/]*$/, '/');
        return `${baseUrl}${path}index.html?token=${token}`;
    }
}
