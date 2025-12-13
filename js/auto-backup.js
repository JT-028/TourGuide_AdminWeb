// Auto Backup System for TourApp Admin Web Interface
// Handles scheduled automatic backups and integration with Firebase Cloud Functions

class AutoBackupManager {
    constructor() {
        this.backupSettings = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBackupSettings();
        this.checkAutoBackupStatus();
        this.scheduleNextBackup();
    }

    setupEventListeners() {
        // Auto backup toggle
        const autoBackupToggle = document.getElementById('autoBackupToggle');
        if (autoBackupToggle) {
            autoBackupToggle.addEventListener('change', (e) => {
                this.toggleAutoBackup(e.target.checked);
            });
        }

        // Backup frequency change
        const backupFrequency = document.getElementById('backupFrequency');
        if (backupFrequency) {
            backupFrequency.addEventListener('change', (e) => {
                this.updateBackupFrequency(e.target.value);
            });
        }

        // Retention days change
        const retentionDays = document.getElementById('retentionDays');
        if (retentionDays) {
            retentionDays.addEventListener('change', (e) => {
                this.updateRetentionDays(parseInt(e.target.value));
            });
        }

        // Retention limit change
        const retentionLimit = document.getElementById('retentionLimit');
        if (retentionLimit) {
            retentionLimit.addEventListener('change', (e) => {
                this.updateRetentionLimit(parseInt(e.target.value));
            });
        }

        // Default backup type change
        const defaultBackupType = document.getElementById('defaultBackupType');
        if (defaultBackupType) {
            defaultBackupType.addEventListener('change', (e) => {
                this.updateDefaultBackupType(e.target.value);
            });
        }

        // Default format change
        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.addEventListener('change', (e) => {
                this.updateDefaultFormat(e.target.value);
            });
        }

        // Save settings button
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveBackupSettings();
            });
        }

        // Reset settings button
        const resetSettingsBtn = document.getElementById('resetSettings');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }

        // Load settings button
        const loadSettingsBtn = document.getElementById('loadSettings');
        if (loadSettingsBtn) {
            loadSettingsBtn.addEventListener('click', () => {
                this.loadBackupSettings();
            });
        }
    }

    async loadBackupSettings() {
        try {
            console.log('Loading backup settings...');
            const settingsDoc = await firebaseServices.db.collection('settings').doc('system').get();
            
            if (settingsDoc.exists && settingsDoc.data().backupSettings) {
                this.backupSettings = settingsDoc.data().backupSettings;
                console.log('Backup settings loaded:', this.backupSettings);
            } else {
                console.log('No backup settings found, using defaults');
                this.backupSettings = this.getDefaultBackupSettings();
            }
            
            this.populateUI();
            this.showStatus('Settings loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading backup settings:', error);
            this.backupSettings = this.getDefaultBackupSettings();
            this.populateUI();
            this.showStatus('Failed to load settings. Using defaults.', 'error');
        }
    }

    populateUI() {
        // Auto backup toggle
        const autoBackupToggle = document.getElementById('autoBackupToggle');
        if (autoBackupToggle) {
            autoBackupToggle.checked = this.backupSettings.autoBackup || false;
        }

        // Backup frequency
        const backupFrequency = document.getElementById('backupFrequency');
        if (backupFrequency) {
            backupFrequency.value = this.backupSettings.backupFrequency || 'weekly';
        }

        // Retention days
        const retentionDays = document.getElementById('retentionDays');
        if (retentionDays) {
            retentionDays.value = this.backupSettings.retentionDays || 30;
        }

        // Retention limit
        const retentionLimit = document.getElementById('retentionLimit');
        if (retentionLimit) {
            retentionLimit.value = this.backupSettings.retentionLimit || 50;
        }

        // Default backup type
        const defaultBackupType = document.getElementById('defaultBackupType');
        if (defaultBackupType) {
            defaultBackupType.value = this.backupSettings.defaultBackupType || 'full';
        }

        // Default format
        const defaultFormat = document.getElementById('defaultFormat');
        if (defaultFormat) {
            defaultFormat.value = this.backupSettings.defaultFormat || 'json';
        }
    }

    async toggleAutoBackup(enabled) {
        try {
            this.backupSettings.autoBackup = enabled;
            this.backupSettings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.backupSettings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';

            await this.saveBackupSettings();
            
            if (enabled) {
                this.scheduleNextBackup();
                this.showStatus('Auto backup enabled', 'success');
            } else {
                this.cancelScheduledBackup();
                this.showStatus('Auto backup disabled', 'info');
            }
        } catch (error) {
            console.error('Error toggling auto backup:', error);
            this.showStatus('Failed to update auto backup setting', 'error');
            
            // Revert UI on error
            const autoBackupToggle = document.getElementById('autoBackupToggle');
            if (autoBackupToggle) {
                autoBackupToggle.checked = !enabled;
            }
        }
    }

    async updateBackupFrequency(frequency) {
        try {
            this.backupSettings.backupFrequency = frequency;
            this.backupSettings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.backupSettings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';

            await this.saveBackupSettings();
            this.scheduleNextBackup();
            this.showStatus('Backup frequency updated', 'success');
        } catch (error) {
            console.error('Error updating backup frequency:', error);
            this.showStatus('Failed to update backup frequency', 'error');
        }
    }

    async updateRetentionDays(days) {
        try {
            if (days < 1 || days > 365) {
                throw new Error('Retention days must be between 1 and 365');
            }

            this.backupSettings.retentionDays = days;
            this.backupSettings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.backupSettings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';

            await this.saveBackupSettings();
            this.showStatus('Retention days updated', 'success');
        } catch (error) {
            console.error('Error updating retention days:', error);
            this.showStatus('Failed to update retention days', 'error');
        }
    }

    async updateRetentionLimit(limit) {
        try {
            if (limit < 1 || limit > 1000) {
                throw new Error('Retention limit must be between 1 and 1000');
            }

            this.backupSettings.retentionLimit = limit;
            this.backupSettings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.backupSettings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';

            await this.saveBackupSettings();
            this.showStatus('Retention limit updated', 'success');
        } catch (error) {
            console.error('Error updating retention limit:', error);
            this.showStatus('Failed to update retention limit', 'error');
        }
    }

    async updateDefaultBackupType(type) {
        try {
            this.backupSettings.defaultBackupType = type;
            this.backupSettings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.backupSettings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';

            await this.saveBackupSettings();
            this.showStatus('Default backup type updated', 'success');
        } catch (error) {
            console.error('Error updating default backup type:', error);
            this.showStatus('Failed to update default backup type', 'error');
        }
    }

    async updateDefaultFormat(format) {
        try {
            this.backupSettings.defaultFormat = format;
            this.backupSettings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.backupSettings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';

            await this.saveBackupSettings();
            this.showStatus('Default format updated', 'success');
        } catch (error) {
            console.error('Error updating default format:', error);
            this.showStatus('Failed to update default format', 'error');
        }
    }

    async saveBackupSettings() {
        try {
            const settingsRef = firebaseServices.db.collection('settings').doc('system');
            
            await settingsRef.set({
                backupSettings: this.backupSettings
            }, { merge: true });

            console.log('Backup settings saved:', this.backupSettings);
            return true;
        } catch (error) {
            console.error('Error saving backup settings:', error);
            throw error;
        }
    }

    async resetToDefaults() {
        const result = await Swal.fire({
            title: 'Reset to Defaults?',
            text: 'This will reset all backup settings to their default values.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, reset!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                this.backupSettings = this.getDefaultBackupSettings();
                await this.saveBackupSettings();
                this.populateUI();
                this.showStatus('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showStatus('Failed to reset settings', 'error');
            }
        }
    }

    checkAutoBackupStatus() {
        if (this.backupSettings.autoBackup) {
            this.scheduleNextBackup();
        }
    }

    scheduleNextBackup() {
        if (!this.backupSettings.autoBackup) {
            return;
        }

        // Clear any existing scheduled backup
        this.cancelScheduledBackup();

        // Calculate next backup time
        const now = new Date();
        let nextBackupTime;

        switch (this.backupSettings.backupFrequency) {
            case 'daily':
                nextBackupTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case 'weekly':
                nextBackupTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                nextBackupTime = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                break;
            default:
                nextBackupTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to weekly
        }

        // Schedule the backup
        this.nextBackupTime = nextBackupTime;
        console.log(`Next backup scheduled for: ${nextBackupTime.toISOString()}`);

        // Show scheduled backup info in UI
        this.showScheduledBackupInfo(nextBackupTime);
    }

    cancelScheduledBackup() {
        if (this.backupTimeout) {
            clearTimeout(this.backupTimeout);
            this.backupTimeout = null;
        }
        this.nextBackupTime = null;
    }

    showScheduledBackupInfo(nextBackupTime) {
        const statusDiv = document.getElementById('settingsStatus');
        const statusText = document.getElementById('settingsStatusText');
        
        if (statusDiv && statusText && nextBackupTime) {
            const timeUntilBackup = this.getTimeUntilBackup(nextBackupTime);
            statusText.textContent = `Next automatic backup: ${timeUntilBackup}`;
            statusDiv.className = 'mt-4 p-3 rounded-lg bg-blue-100 text-blue-800';
            statusDiv.classList.remove('hidden');
        }
    }

    getTimeUntilBackup(nextBackupTime) {
        const now = new Date();
        const diff = nextBackupTime.getTime() - now.getTime();
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
    }

    async performAutoBackup() {
        if (!this.backupSettings.autoBackup) {
            return;
        }

        try {
            console.log('Performing automatic backup...');
            
            // Use the enhanced data backup manager if available
            if (window.enhancedDataBackupManager) {
                // Trigger backup with default settings
                const backupType = this.backupSettings.defaultBackupType || 'full';
                const format = this.backupSettings.defaultFormat || 'json';
                
                // Set the backup type and format in the UI
                const backupTypeSelect = document.getElementById('backupType');
                const formatRadio = document.querySelector(`input[name="format"][value="${format}"]`);
                
                if (backupTypeSelect) backupTypeSelect.value = backupType;
                if (formatRadio) formatRadio.checked = true;
                
                // Trigger the backup
                await window.enhancedDataBackupManager.createBackup();
                
                console.log('Automatic backup completed successfully');
            } else {
                console.warn('EnhancedDataBackupManager not available for automatic backup');
            }
        } catch (error) {
            console.error('Error performing automatic backup:', error);
        }

        // Schedule next backup
        this.scheduleNextBackup();
    }

    async cleanupOldBackups() {
        try {
            const retentionDays = this.backupSettings.retentionDays || 30;
            const retentionLimit = this.backupSettings.retentionLimit || 50;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            console.log(`Cleaning up backups older than ${cutoffDate.toISOString()}`);

            // Get old backups
            const oldBackupsSnapshot = await firebaseServices.db.collection('backups')
                .where('createdAt', '<', firebase.firestore.Timestamp.fromDate(cutoffDate))
                .where('status', '==', 'complete')
                .get();

            let deletedCount = 0;
            const deletePromises = [];

            oldBackupsSnapshot.forEach(doc => {
                const backupData = doc.data();
                if (backupData.downloadUrl) {
                    // Delete from Firebase Storage
                    try {
                        const storageRef = firebaseServices.storage.refFromURL(backupData.downloadUrl);
                        deletePromises.push(storageRef.delete().catch(error => {
                            console.warn(`Failed to delete storage file ${backupData.filename}:`, error);
                        }));
                    } catch (error) {
                        console.warn(`Invalid storage URL for ${backupData.filename}:`, error);
                    }
                }

                // Delete from Firestore
                deletePromises.push(doc.ref.delete());
                deletedCount++;
            });

            await Promise.all(deletePromises);
            console.log(`Cleaned up ${deletedCount} old backups`);

            // Also check if we have too many backups overall
            const allBackupsSnapshot = await firebaseServices.db.collection('backups')
                .orderBy('createdAt', 'desc')
                .get();

            if (allBackupsSnapshot.size > retentionLimit) {
                const excessBackups = allBackupsSnapshot.docs.slice(retentionLimit);
                const excessDeletePromises = [];

                excessBackups.forEach(doc => {
                    const backupData = doc.data();
                    if (backupData.downloadUrl) {
                        try {
                            const storageRef = firebaseServices.storage.refFromURL(backupData.downloadUrl);
                            excessDeletePromises.push(storageRef.delete().catch(error => {
                                console.warn(`Failed to delete excess storage file ${backupData.filename}:`, error);
                            }));
                        } catch (error) {
                            console.warn(`Invalid storage URL for ${backupData.filename}:`, error);
                        }
                    }
                    excessDeletePromises.push(doc.ref.delete());
                });

                await Promise.all(excessDeletePromises);
                console.log(`Deleted ${excessBackups.length} excess backups to stay within limit`);
            }

        } catch (error) {
            console.error('Error cleaning up old backups:', error);
        }
    }

    getDefaultBackupSettings() {
        return {
            autoBackup: false,
            backupFrequency: 'weekly',
            retentionDays: 30,
            retentionLimit: 50,
            defaultBackupType: 'full',
            defaultFormat: 'json',
            lastBackupTime: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebaseServices.auth.currentUser?.uid || 'admin'
        };
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('settingsStatus');
        const statusText = document.getElementById('settingsStatusText');
        
        if (statusDiv && statusText) {
            // Remove existing classes
            statusDiv.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800');
            
            // Add appropriate classes based on type
            switch (type) {
                case 'success':
                    statusDiv.classList.add('bg-green-100', 'text-green-800');
                    break;
                case 'error':
                    statusDiv.classList.add('bg-red-100', 'text-red-800');
                    break;
                case 'info':
                default:
                    statusDiv.classList.add('bg-blue-100', 'text-blue-800');
                    break;
            }
            
            statusText.textContent = message;
            statusDiv.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    }
}

// Initialize auto backup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be initialized
    if (typeof firebaseServices !== 'undefined') {
        console.log('Initializing AutoBackupManager...');
        window.autoBackupManager = new AutoBackupManager();
    } else {
        console.error('Firebase services not available. AutoBackupManager cannot be initialized.');
    }
});