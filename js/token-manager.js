// token-manager.js - Handles token creation, validation, and management

class TokenManager {
    constructor() {
        this.tokensData = null;
        this.usedTokens = [];
        this.loadUsedTokens();
    }

    // Load tokens data from JSON file
    async loadTokensData() {
        try {
            const response = await fetch('../data/tokens.json');
            if (!response.ok) {
                throw new Error('Failed to load tokens data');
            }
            this.tokensData = await response.json();
            return this.tokensData;
        } catch (error) {
            console.error('Error loading tokens data:', error);
            return null;
        }
    }

    // Load used tokens from localStorage
    loadUsedTokens() {
        try {
            const storedTokens = localStorage.getItem('usedTokens');
            this.usedTokens = storedTokens ? JSON.parse(storedTokens) : [];
        } catch (error) {
            console.error('Error loading used tokens:', error);
            this.usedTokens = [];
        }
    }

    // Save used tokens to localStorage
    saveUsedTokens() {
        try {
            localStorage.setItem('usedTokens', JSON.stringify(this.usedTokens));
        } catch (error) {
            console.error('Error saving used tokens:', error);
        }
    }

    // Validate a token
    async validateToken(token) {
        if (!this.tokensData) {
            await this.loadTokensData();
        }

        // Check if token exists and is valid
        if (!this.tokensData || !this.tokensData.tokens || !this.tokensData.tokens[token]) {
            return { valid: false, reason: 'Token not found' };
        }

        const tokenData = this.tokensData.tokens[token];

        // Check if token is marked as valid in the data
        if (!tokenData.valid) {
            return { valid: false, reason: 'Token is invalid' };
        }

        // Check if token has expired
        if (tokenData.expires) {
            const expiryDate = new Date(tokenData.expires);
            if (expiryDate < new Date()) {
                return { valid: false, reason: 'Token has expired' };
            }
        }

        // Check if token has been used
        if (this.usedTokens.includes(token)) {
            return { valid: false, reason: 'Token has already been used' };
        }

        return { valid: true, tokenData };
    }

    // Mark a token as used
    markTokenAsUsed(token) {
        if (!this.usedTokens.includes(token)) {
            this.usedTokens.push(token);
            this.saveUsedTokens();
            return true;
        }
        return false;
    }

    // Generate a new token (for editor use)
    generateToken(letterName, creator = 'admin') {
        // Generate a random token
        const tokenChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 10; i++) {
            token += tokenChars.charAt(Math.floor(Math.random() * tokenChars.length));
        }

        // Create token data
        const now = new Date();
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 1); // Default expiry: 1 month

        const tokenData = {
            valid: true,
            created: now.toISOString(),
            expires: expires.toISOString(),
            creator,
            letterName
        };

        // Add to tokens data
        if (!this.tokensData) {
            this.tokensData = { tokens: {} };
        }
        
        this.tokensData.tokens[token] = tokenData;
        
        return { token, tokenData };
    }

    // Save tokens data (for editor use)
    async saveTokensData() {
        try {
            // In a real application, this would make an API call to save to the server
            // For this client-side only app, we'll simulate this with localStorage
            localStorage.setItem('editorTokensData', JSON.stringify(this.tokensData));
            return true;
        } catch (error) {
            console.error('Error saving tokens data:', error);
            return false;
        }
    }

    // Delete a token (for editor use)
    deleteToken(token) {
        if (this.tokensData && this.tokensData.tokens && this.tokensData.tokens[token]) {
            delete this.tokensData.tokens[token];
            return true;
        }
        return false;
    }

    // Get all tokens (for editor use)
    getAllTokens() {
        if (!this.tokensData || !this.tokensData.tokens) {
            return {};
        }
        return this.tokensData.tokens;
    }

    // Create a shareable link for a token
    createShareableLink(token) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/index.html?token=${token}`;
    }
}

// Export the TokenManager class
window.TokenManager = TokenManager;
