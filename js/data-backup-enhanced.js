// Enhanced Data Backup System for TourApp Admin Web Interface
// Includes proper file storage and restore functionality

class EnhancedDataBackupManager {
    constructor() {
        // Prevent multiple instances
        if (window.enhancedDataBackupManager) {
            console.log('EnhancedDataBackupManager already exists, returning existing instance');
            return window.enhancedDataBackupManager;
        }
        
        this.backups = [];
        this.init();
        
        // Store reference globally
        window.enhancedDataBackupManager = this;
    }

    init() {
        this.setupEventListeners();
        this.loadBackupHistory();
    }

    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.listenersAttached) {
            console.log('Event listeners already attached, skipping...');
            return;
        }

        console.log('Setting up event listeners...');

        // Create backup button - use global event delegation to prevent duplicates
        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) {
            // Remove any existing listeners first
            createBackupBtn.removeEventListener('click', this.createBackupHandler);
            
            // Create a bound handler
            this.createBackupHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Backup button clicked');
                this.createBackup();
            };
            
            createBackupBtn.addEventListener('click', this.createBackupHandler);
            console.log('Backup button listener attached');
        }

        // Restore backup button
        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        if (restoreBackupBtn) {
            restoreBackupBtn.removeEventListener('click', this.restoreBackupHandler);
            this.restoreBackupHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.restoreBackup();
            };
            restoreBackupBtn.addEventListener('click', this.restoreBackupHandler);
        }

        // Restore file input
        const restoreFile = document.getElementById('restoreFile');
        if (restoreFile) {
            restoreFile.removeEventListener('change', this.handleFileSelectionHandler);
            this.handleFileSelectionHandler = (e) => this.handleFileSelection(e);
            restoreFile.addEventListener('change', this.handleFileSelectionHandler);
        }

        // Auto backup toggle
        const autoBackupToggle = document.getElementById('autoBackupToggle');
        if (autoBackupToggle) {
            autoBackupToggle.removeEventListener('change', this.toggleAutoBackupHandler);
            this.toggleAutoBackupHandler = (e) => this.toggleAutoBackup(e.target.checked);
            autoBackupToggle.addEventListener('change', this.toggleAutoBackupHandler);
        }

        this.listenersAttached = true;
        console.log('All event listeners attached successfully');
    }

    async createBackup() {
        console.log('createBackup called');
        
        // CRITICAL: Check if backup is already in progress at the very start
        if (window.globalBackupState && window.globalBackupState.isCreatingBackup) {
            console.log('Backup already in progress globally, ignoring duplicate request');
            return;
        }
        
        if (this.isCreatingBackup) {
            console.log('Backup already in progress locally, ignoring duplicate request');
            return;
        }
        
        if (window.backupLock) {
            console.log('Backup lock is active, ignoring duplicate request');
            return;
        }
        
        // Check if backup was created recently (within 15 seconds)
        const now = Date.now();
        if (window.globalBackupState && window.globalBackupState.lastBackupTime && 
            (now - window.globalBackupState.lastBackupTime) < 15000) {
            console.log('Backup created too recently, ignoring request');
            return;
        }
        
        // Generate unique backup ID to prevent duplicates
        const backupId = 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('Backup ID:', backupId);
        
        // IMMEDIATELY set global and local flags to prevent any other calls
        if (window.globalBackupState) {
            window.globalBackupState.isCreatingBackup = true;
            window.globalBackupState.lastBackupTime = now;
            window.globalBackupState.currentBackupId = backupId;
        }
        this.isCreatingBackup = true;
        this.currentBackupId = backupId;
        
        // Add a global lock to prevent any other backup operations
        window.backupLock = true;
        
        const backupBtn = document.getElementById('createBackupBtn');
        if (!backupBtn) {
            console.error('Backup button not found');
            return;
        }
        
        const originalText = backupBtn.innerHTML;
        
        // Immediately disable button and show loading
        backupBtn.disabled = true;
        backupBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 mr-2 animate-spin"></i>Creating Backup...';
        
        try {
            console.log('Starting backup process with ID:', backupId);
            
            // Double-check this is still the current backup
            if (window.globalBackupState && window.globalBackupState.currentBackupId !== backupId) {
                console.log('Backup ID mismatch, aborting');
                return;
            }

            // Get backup options
            const backupType = document.querySelector('select[name="backupType"]')?.value || 'full';
            const format = document.querySelector('input[name="format"]:checked')?.value || 'json';
            const includeMedia = document.querySelector('input[name="includeMedia"]')?.checked || false;

            console.log('Backup options:', { backupType, format, includeMedia });

            // Create backup data
            const backupData = await this.generateBackupData(backupType, includeMedia);
            console.log('Backup data generated');
            
            // Generate filename with unique ID
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${backupType}_${timestamp}_${backupId}.${format}`;
            console.log('Filename:', filename);

            // Upload backup to Firebase Storage
            const downloadUrl = await this.uploadBackupToStorage(backupData, filename, format);
            console.log('Uploaded to storage');

            // Save backup record to Firestore
            const backupRecord = await this.saveBackupRecord(filename, backupType, format, backupData, downloadUrl);
            console.log('Saved backup record');

            // Download backup locally - only if this is still the current backup
            if (window.globalBackupState && window.globalBackupState.currentBackupId === backupId) {
                console.log('Downloading backup file');
                this.downloadBackup(backupData, filename, format);
            }

            backupBtn.innerHTML = '<i data-feather="check" class="w-4 h-4 mr-2"></i>Backup Created!';
            
            setTimeout(() => {
                backupBtn.innerHTML = originalText;
                backupBtn.disabled = false;
                this.loadBackupHistory();
                this.isCreatingBackup = false; // Reset local flag
                if (window.globalBackupState) {
                    window.globalBackupState.isCreatingBackup = false; // Reset global flag
                    window.globalBackupState.currentBackupId = null;
                }
                window.backupLock = false; // Remove global lock
            }, 2000);

            this.showSuccess('Backup created and uploaded successfully!');

        } catch (error) {
            console.error('Backup creation error:', error);
            backupBtn.innerHTML = originalText;
            backupBtn.disabled = false;
            this.isCreatingBackup = false; // Reset local flag on error
            if (window.globalBackupState) {
                window.globalBackupState.isCreatingBackup = false; // Reset global flag on error
                window.globalBackupState.currentBackupId = null;
            }
            window.backupLock = false; // Remove global lock on error
            this.showError(`Backup creation failed: ${error.message}`);
        }
    }

    async generateBackupData(backupType, includeMedia = false) {
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                backupType: backupType,
                version: '2.0',
                createdBy: firebaseServices.auth.currentUser.uid,
                includeMedia: includeMedia,
                appVersion: '1.0.0'
            }
        };

        try {
            switch (backupType) {
                case 'full':
                    backupData.users = await this.getCollectionData('users');
                    backupData.messages = await this.getCollectionData('messages');
                    backupData.locations = await this.getCollectionData('locations');
                    backupData.settings = await this.getSettingsData();
                    if (includeMedia) {
                        backupData.media = await this.getMediaData();
                    }
                    break;
                case 'users':
                    backupData.users = await this.getCollectionData('users');
                    break;
                case 'messages':
                    backupData.messages = await this.getCollectionData('messages');
                    break;
                case 'locations':
                    backupData.locations = await this.getCollectionData('locations');
                    break;
                case 'settings':
                    backupData.settings = await this.getSettingsData();
                    break;
            }

            return backupData;
        } catch (error) {
            console.error('Error generating backup data:', error);
            throw error;
        }
    }

    async getCollectionData(collectionName) {
        const snapshot = await firebaseServices.db.collection(collectionName).get();
        const data = [];
        
        snapshot.forEach(doc => {
            const docData = doc.data();
            // Convert Firestore timestamps to ISO strings for JSON serialization
            const processedData = this.processFirestoreData(docData);
            data.push({
                id: doc.id,
                ...processedData
            });
        });

        return data;
    }

    processFirestoreData(data) {
        const processed = {};
        for (const [key, value] of Object.entries(data)) {
            if (value && typeof value === 'object' && value.toDate) {
                // Firestore timestamp
                processed[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Nested object
                processed[key] = this.processFirestoreData(value);
            } else if (Array.isArray(value)) {
                // Array
                processed[key] = value.map(item => 
                    typeof item === 'object' ? this.processFirestoreData(item) : item
                );
            } else {
                processed[key] = value;
            }
        }
        return processed;
    }

    async getSettingsData() {
        try {
            const settingsDoc = await firebaseServices.db.collection('settings').doc('system').get();
            return settingsDoc.exists ? this.processFirestoreData(settingsDoc.data()) : this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    async getMediaData() {
        try {
            // Get list of files from Firebase Storage
            const storageRef = firebaseServices.storage.ref();
            const listResult = await storageRef.listAll();
            
            const mediaFiles = [];
            for (const itemRef of listResult.items) {
                const metadata = await itemRef.getMetadata();
                mediaFiles.push({
                    name: itemRef.name,
                    fullPath: itemRef.fullPath,
                    size: metadata.size,
                    contentType: metadata.contentType,
                    timeCreated: metadata.timeCreated,
                    updated: metadata.updated
                });
            }
            
            return mediaFiles;
        } catch (error) {
            console.error('Error getting media data:', error);
            return [];
        }
    }

    getDefaultSettings() {
        return {
            schoolName: 'Colegio de San Agustin',
            schoolCode: 'CCA',
            emailNotifications: true,
            smsAlerts: true,
            autoLogoutTimer: 30,
            passwordRequirements: {
                minLength: 8,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialChars: false
            },
            backupSettings: {
                autoBackup: false,
                backupFrequency: 'weekly',
                retentionDays: 30
            }
        };
    }

    downloadBackup(data, filename, format) {
        try {
            let content;
            let mimeType;
            
            if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
            } else if (format === 'csv') {
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
            } else {
                throw new Error('Unsupported format');
            }
            
            // Create blob and download
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    convertToCSV(data) {
        // Enhanced CSV conversion for backup data
        if (data.users && Array.isArray(data.users)) {
            const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Phone', 'Student ID', 'Course', 'Section', 'Year Level', 'Department', 'Specialization', 'Created At', 'Last Login'];
            const rows = data.users.map(user => [
                user.id || '',
                user.email || '',
                user.firstName || '',
                user.lastName || '',
                user.role || '',
                user.phoneNumber || '',
                user.studentId || '',
                user.course || '',
                user.section || '',
                user.yearLevel || '',
                user.department || '',
                user.specialization || '',
                user.createdAt ? new Date(user.createdAt.seconds * 1000).toISOString() : '',
                user.lastLogin ? new Date(user.lastLogin.seconds * 1000).toISOString() : ''
            ]);
            
            return [headers, ...rows].map(row => 
                row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
            ).join('\n');
        }
        
        return JSON.stringify(data, null, 2);
    }

    async uploadBackupToStorage(backupData, filename, format) {
        try {
            const storageRef = firebaseServices.storage.ref(`backups/${filename}`);
            const content = format === 'json' ? 
                JSON.stringify(backupData, null, 2) : 
                this.convertToCSV(backupData);
            
            const blob = new Blob([content], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            
            const snapshot = await storageRef.put(blob);
            const downloadUrl = await snapshot.ref.getDownloadURL();
            
            return downloadUrl;
        } catch (error) {
            console.error('Error uploading backup to storage:', error);
            throw error;
        }
    }

    async saveBackupRecord(filename, backupType, format, backupData, downloadUrl) {
        try {
            const backupRecord = {
                filename: filename,
                backupType: backupType,
                format: format,
                size: JSON.stringify(backupData).length,
                downloadUrl: downloadUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: firebaseServices.auth.currentUser.uid,
                status: 'complete',
                metadata: backupData.metadata
            };

            const docRef = await firebaseServices.db.collection('backups').add(backupRecord);
            return docRef.id;
        } catch (error) {
            console.error('Error saving backup record:', error);
            throw error;
        }
    }



    async loadBackupHistory() {
        try {
            const snapshot = await firebaseServices.db.collection('backups')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            this.backups = [];
            snapshot.forEach(doc => {
                this.backups.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderBackupHistory();
        } catch (error) {
            console.error('Error loading backup history:', error);
        }
    }

    renderBackupHistory() {
        const tableBody = document.querySelector('#backupHistoryTable tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.backups.forEach(backup => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <i data-feather="file" class="w-5 h-5 text-gray-400 mr-3"></i>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${backup.filename}</div>
                            <div class="text-sm text-gray-500">${this.formatFileSize(backup.size)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getBackupTypeClass(backup.backupType)}">
                        ${this.getBackupTypeText(backup.backupType)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${this.formatDate(backup.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${backup.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex space-x-2">
                        <button class="text-sky-600 hover:text-sky-900" title="Download" onclick="enhancedDataBackupManager.downloadBackupRecord('${backup.id}')">
                            <i data-feather="download" class="w-4 h-4"></i>
                        </button>
                        <button class="text-green-600 hover:text-green-900" title="Restore" onclick="enhancedDataBackupManager.restoreFromRecord('${backup.id}')">
                            <i data-feather="refresh-cw" class="w-4 h-4"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-900" title="Delete" onclick="enhancedDataBackupManager.deleteBackupRecord('${backup.id}')">
                            <i data-feather="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Refresh feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    async downloadBackupRecord(backupId) {
        try {
            const backup = this.backups.find(b => b.id === backupId);
            if (!backup) {
                throw new Error('Backup record not found.');
            }

            // Download from Firebase Storage
            const response = await fetch(backup.downloadUrl);
            const blob = await response.blob();
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = backup.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Backup downloaded successfully!');

        } catch (error) {
            console.error('Download error:', error);
            this.showError(`Download failed: ${error.message}`);
        }
    }

    async restoreFromRecord(backupId) {
        if (!confirm('Are you sure you want to restore from this backup? This will overwrite existing data.')) {
            return;
        }

        try {
            const backup = this.backups.find(b => b.id === backupId);
            if (!backup) {
                throw new Error('Backup record not found.');
            }

            // Download backup data from storage
            const response = await fetch(backup.downloadUrl);
            const backupData = await response.json();

            // Restore data
            await this.restoreBackupData(backupData);

            this.showSuccess('Backup restored successfully!');

        } catch (error) {
            console.error('Restore error:', error);
            this.showError(`Restore failed: ${error.message}`);
        }
    }

    async restoreBackupData(backupData) {
        const batch = firebaseServices.db.batch();

        // Restore users
        if (backupData.users) {
            for (const user of backupData.users) {
                const userRef = firebaseServices.usersCollection.doc(user.id);
                const processedUser = this.processRestoreData(user);
                batch.set(userRef, processedUser);
            }
        }

        // Restore trips
        if (backupData.trips) {
            for (const trip of backupData.trips) {
                const tripRef = firebaseServices.tripsCollection.doc(trip.id);
                const processedTrip = this.processRestoreData(trip);
                batch.set(tripRef, processedTrip);
            }
        }

        // Restore messages
        if (backupData.messages) {
            for (const message of backupData.messages) {
                const messageRef = firebaseServices.messagesCollection.doc(message.id);
                const processedMessage = this.processRestoreData(message);
                batch.set(messageRef, processedMessage);
            }
        }

        // Restore locations
        if (backupData.locations) {
            for (const location of backupData.locations) {
                const locationRef = firebaseServices.locationsCollection.doc(location.id);
                const processedLocation = this.processRestoreData(location);
                batch.set(locationRef, processedLocation);
            }
        }

        // Restore settings
        if (backupData.settings) {
            const settingsRef = firebaseServices.db.collection('settings').doc('system');
            const processedSettings = this.processRestoreData(backupData.settings);
            batch.set(settingsRef, processedSettings);
        }

        await batch.commit();
    }

    processRestoreData(data) {
        const processed = {};
        for (const [key, value] of Object.entries(data)) {
            if (key === 'id') continue; // Skip ID field
            
            if (typeof value === 'string' && this.isISODateString(value)) {
                // Convert ISO string back to Firestore timestamp
                processed[key] = firebase.firestore.Timestamp.fromDate(new Date(value));
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Nested object
                processed[key] = this.processRestoreData(value);
            } else if (Array.isArray(value)) {
                // Array
                processed[key] = value.map(item => 
                    typeof item === 'object' ? this.processRestoreData(item) : item
                );
            } else {
                processed[key] = value;
            }
        }
        return processed;
    }

    isISODateString(str) {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(str);
    }

    async deleteBackupRecord(backupId) {
        if (!confirm('Are you sure you want to delete this backup record and file?')) {
            return;
        }

        try {
            const backup = this.backups.find(b => b.id === backupId);
            if (!backup) {
                throw new Error('Backup record not found.');
            }

            // Delete from Firestore
            await firebaseServices.db.collection('backups').doc(backupId).delete();

            // Delete from Firebase Storage
            if (backup.downloadUrl) {
                const storageRef = firebaseServices.storage.refFromURL(backup.downloadUrl);
                await storageRef.delete();
            }

            this.showSuccess('Backup record and file deleted successfully!');
            this.loadBackupHistory();

        } catch (error) {
            console.error('Delete error:', error);
            this.showError(`Delete failed: ${error.message}`);
        }
    }

    handleFileSelection(e) {
        const file = e.target.files[0];
        const restoreBtn = document.getElementById('restoreBackupBtn');
        
        if (file) {
            restoreBtn.disabled = false;
            restoreBtn.innerHTML = '<i data-feather="upload" class="w-4 h-4 mr-2"></i>Restore Backup';
        } else {
            restoreBtn.disabled = true;
        }
    }

    async restoreBackup() {
        const fileInput = document.getElementById('restoreFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showError('Please select a backup file to restore.');
            return;
        }

        const restoreBtn = document.getElementById('restoreBackupBtn');
        const originalText = restoreBtn.innerHTML;

        try {
            restoreBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 mr-2 animate-spin"></i>Restoring...';
            restoreBtn.disabled = true;

            const text = await file.text();
            const backupData = JSON.parse(text);

            // Validate backup data
            if (!backupData.metadata) {
                throw new Error('Invalid backup file format.');
            }

            // Restore data based on backup type
            await this.restoreBackupData(backupData);

            restoreBtn.innerHTML = '<i data-feather="check" class="w-4 h-4 mr-2"></i>Restore Complete!';
            
            setTimeout(() => {
                restoreBtn.innerHTML = originalText;
                restoreBtn.disabled = true;
                fileInput.value = '';
                this.loadBackupHistory();
            }, 2000);

            this.showSuccess('Backup restored successfully!');

        } catch (error) {
            console.error('Restore error:', error);
            restoreBtn.innerHTML = originalText;
            restoreBtn.disabled = false;
            this.showError(`Restore failed: ${error.message}`);
        }
    }

    async toggleAutoBackup(enabled) {
        try {
            const settingsRef = firebaseServices.db.collection('settings').doc('system');
            await settingsRef.set({
                backupSettings: {
                    autoBackup: enabled,
                    backupFrequency: 'weekly',
                    retentionDays: 30
                }
            }, { merge: true });

            this.showSuccess(`Auto backup ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error updating auto backup setting:', error);
            this.showError('Failed to update auto backup setting');
        }
    }

    getBackupTypeClass(type) {
        switch (type) {
            case 'full':
                return 'bg-blue-100 text-blue-800';
            case 'users':
                return 'bg-purple-100 text-purple-800';
            case 'trips':
                return 'bg-yellow-100 text-yellow-800';
            case 'messages':
                return 'bg-green-100 text-green-800';
            case 'locations':
                return 'bg-indigo-100 text-indigo-800';
            case 'settings':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getBackupTypeText(type) {
        switch (type) {
            case 'full':
                return 'Full Backup';
            case 'users':
                return 'Users Only';
            case 'trips':
                return 'Trips Only';
            case 'messages':
                return 'Messages Only';
            case 'locations':
                return 'Locations Only';
            case 'settings':
                return 'Settings Only';
            default:
                return 'Unknown';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showSuccess(message) {
        // Prevent duplicate success messages
        if (this.lastSuccessMessage === message && this.lastSuccessTime && (Date.now() - this.lastSuccessTime) < 5000) {
            console.log('Duplicate success message prevented:', message);
            return;
        }
        
        this.lastSuccessMessage = message;
        this.lastSuccessTime = Date.now();
        
        // Use a more controlled SweetAlert without any callbacks that might trigger additional actions
        Swal.fire({
            title: 'Success!',
            text: message,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                // Ensure no additional actions are triggered
                console.log('Success alert shown');
            }
        });
    }

    showError(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Note: Initialization is handled by data-backup.html to prevent duplicate instances
