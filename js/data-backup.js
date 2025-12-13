// Data Backup functionality for TourApp Admin Web Interface

class DataBackupManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBackupHistory();
    }

    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.listenersAttached) {
            return;
        }

        // Create backup button
        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn && !createBackupBtn.hasAttribute('data-listener-attached')) {
            createBackupBtn.addEventListener('click', () => this.createBackup());
            createBackupBtn.setAttribute('data-listener-attached', 'true');
        }

        // Restore backup button
        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        if (restoreBackupBtn && !restoreBackupBtn.hasAttribute('data-listener-attached')) {
            restoreBackupBtn.addEventListener('click', () => this.restoreBackup());
            restoreBackupBtn.setAttribute('data-listener-attached', 'true');
        }

        // Restore file input
        const restoreFile = document.getElementById('restoreFile');
        if (restoreFile && !restoreFile.hasAttribute('data-listener-attached')) {
            restoreFile.addEventListener('change', (e) => this.handleFileSelection(e));
            restoreFile.setAttribute('data-listener-attached', 'true');
        }

        this.listenersAttached = true;
    }

    async createBackup() {
        // Prevent multiple simultaneous backup operations
        if (this.isCreatingBackup) {
            console.log('Backup already in progress, ignoring duplicate request');
            return;
        }
        
        this.isCreatingBackup = true;
        const backupBtn = document.getElementById('createBackupBtn');
        const originalText = backupBtn.innerHTML;
        
        try {
            // Show loading state
            backupBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 mr-2 animate-spin"></i>Creating Backup...';
            backupBtn.disabled = true;

            // Get backup type and format
            const backupType = document.querySelector('select').value || 'full';
            const format = document.querySelector('input[name="format"]:checked').value || 'json';

            // Create backup data
            const backupData = await this.generateBackupData(backupType);
            
            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${backupType}_${timestamp}.${format}`;

            // Download backup
            this.downloadBackup(backupData, filename, format);

            // Save backup record to Firestore
            await this.saveBackupRecord(filename, backupType, format, backupData);

            backupBtn.innerHTML = '<i data-feather="check" class="w-4 h-4 mr-2"></i>Backup Created!';
            
            setTimeout(() => {
                backupBtn.innerHTML = originalText;
                backupBtn.disabled = false;
                this.loadBackupHistory();
                this.isCreatingBackup = false; // Reset flag
            }, 2000);

            this.showSuccess('Backup created and downloaded successfully!');

        } catch (error) {
            console.error('Backup creation error:', error);
            backupBtn.innerHTML = originalText;
            backupBtn.disabled = false;
            this.isCreatingBackup = false; // Reset flag on error
            this.showError(`Backup creation failed: ${error.message}`);
        }
    }

    async generateBackupData(backupType) {
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                backupType: backupType,
                version: '1.0',
                createdBy: firebaseServices.auth.currentUser.uid
            }
        };

        try {
            switch (backupType) {
                case 'full':
                    backupData.users = await this.getCollectionData('users');
                    backupData.messages = await this.getCollectionData('messages');
                    backupData.locations = await this.getCollectionData('locations');
                    break;
                case 'users':
                    backupData.users = await this.getCollectionData('users');
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
            data.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return data;
    }

    async getSettingsData() {
        // Get system settings from Firestore or return default settings
        try {
            const settingsDoc = await firebaseServices.db.collection('settings').doc('system').get();
            return settingsDoc.exists ? settingsDoc.data() : this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
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
        // Simple CSV conversion for backup data
        if (data.users && Array.isArray(data.users)) {
            const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Phone', 'Created At'];
            const rows = data.users.map(user => [
                user.id || '',
                user.email || '',
                user.firstName || '',
                user.lastName || '',
                user.role || '',
                user.phoneNumber || '',
                user.createdAt ? new Date(user.createdAt.seconds * 1000).toISOString() : ''
            ]);
            
            return [headers, ...rows].map(row => 
                row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
            ).join('\n');
        }
        
        return JSON.stringify(data, null, 2);
    }

    async saveBackupRecord(filename, backupType, format, data) {
        try {
            const backupRecord = {
                filename: filename,
                backupType: backupType,
                format: format,
                size: JSON.stringify(data).length,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: firebaseServices.auth.currentUser.uid,
                status: 'complete'
            };

            await firebaseServices.db.collection('backups').add(backupRecord);
        } catch (error) {
            console.error('Error saving backup record:', error);
            // Don't throw error as backup was already created
        }
    }

    async loadBackupHistory() {
        try {
            const snapshot = await firebaseServices.db.collection('backups')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            const backups = [];
            snapshot.forEach(doc => {
                backups.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderBackupHistory(backups);
        } catch (error) {
            console.error('Error loading backup history:', error);
        }
    }

    renderBackupHistory(backups) {
        const tableBody = document.querySelector('#backupHistoryTable tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        backups.forEach(backup => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <i data-feather="file" class="w-5 h-5 text-gray-400 mr-3"></i>
                        <div class="text-sm font-medium text-gray-900">${backup.filename}</div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getBackupTypeClass(backup.backupType)}">
                        ${this.getBackupTypeText(backup.backupType)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${this.formatFileSize(backup.size)}
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
                        <button class="text-sky-600 hover:text-sky-900" title="Download" onclick="dataBackupManager.downloadBackupRecord('${backup.id}')">
                            <i data-feather="download" class="w-4 h-4"></i>
                        </button>
                        <button class="text-green-600 hover:text-green-900" title="Restore" onclick="dataBackupManager.restoreFromRecord('${backup.id}')">
                            <i data-feather="refresh-cw" class="w-4 h-4"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-900" title="Delete" onclick="dataBackupManager.deleteBackupRecord('${backup.id}')">
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

    getBackupTypeClass(type) {
        switch (type) {
            case 'full':
                return 'bg-blue-100 text-blue-800';
            case 'users':
                return 'bg-purple-100 text-purple-800';
            case 'trips':
                return 'bg-yellow-100 text-yellow-800';
            case 'settings':
                return 'bg-green-100 text-green-800';
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

    async restoreBackupData(backupData) {
        const batch = firebaseServices.db.batch();

        // Restore users
        if (backupData.users) {
            for (const user of backupData.users) {
                const userRef = firebaseServices.usersCollection.doc(user.id);
                batch.set(userRef, user);
            }
        }

        // Restore trips
        if (backupData.trips) {
            for (const trip of backupData.trips) {
                const tripRef = firebaseServices.tripsCollection.doc(trip.id);
                batch.set(tripRef, trip);
            }
        }

        // Restore messages
        if (backupData.messages) {
            for (const message of backupData.messages) {
                const messageRef = firebaseServices.messagesCollection.doc(message.id);
                batch.set(messageRef, message);
            }
        }

        // Restore locations
        if (backupData.locations) {
            for (const location of backupData.locations) {
                const locationRef = firebaseServices.locationsCollection.doc(location.id);
                batch.set(locationRef, location);
            }
        }

        // Restore settings
        if (backupData.settings) {
            const settingsRef = firebaseServices.db.collection('settings').doc('system');
            batch.set(settingsRef, backupData.settings);
        }

        await batch.commit();
    }

    async downloadBackupRecord(backupId) {
        try {
            const backupDoc = await firebaseServices.db.collection('backups').doc(backupId).get();
            if (!backupDoc.exists) {
                throw new Error('Backup record not found.');
            }

            const backupData = backupDoc.data();
            // In a real implementation, you would retrieve the actual backup data
            // For now, we'll create a placeholder
            const placeholderData = {
                metadata: {
                    timestamp: backupData.createdAt.toDate().toISOString(),
                    backupType: backupData.backupType,
                    version: '1.0'
                },
                note: 'This is a placeholder backup file. In a real implementation, the actual backup data would be retrieved from storage.'
            };

            this.downloadBackup(placeholderData, backupData.filename, backupData.format);
            this.showSuccess('Backup downloaded successfully!');

        } catch (error) {
            console.error('Download error:', error);
            this.showError(`Download failed: ${error.message}`);
        }
    }

    async restoreFromRecord(backupId) {
        const result = await Swal.fire({
            title: 'Restore Backup',
            text: 'Are you sure you want to restore from this backup? This will overwrite existing data.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Restore',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });
        
        if (!result.isConfirmed) {
            return;
        }

        try {
            // In a real implementation, you would retrieve the actual backup data
            // and restore it. For now, we'll show a placeholder message.
            this.showSuccess('Backup restoration initiated. In a real implementation, this would restore the actual backup data.');
        } catch (error) {
            console.error('Restore error:', error);
            this.showError(`Restore failed: ${error.message}`);
        }
    }

    async deleteBackupRecord(backupId) {
        const result = await Swal.fire({
            title: 'Delete Backup',
            text: 'Are you sure you want to delete this backup record?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });
        
        if (!result.isConfirmed) {
            return;
        }

        try {
            await firebaseServices.db.collection('backups').doc(backupId).delete();
            this.showSuccess('Backup record deleted successfully!');
            this.loadBackupHistory();
        } catch (error) {
            console.error('Delete error:', error);
            this.showError(`Delete failed: ${error.message}`);
        }
    }

    showSuccess(message) {
        // Prevent duplicate success messages
        if (this.lastSuccessMessage === message && this.lastSuccessTime && (Date.now() - this.lastSuccessTime) < 5000) {
            console.log('Duplicate success message prevented:', message);
            return;
        }
        
        this.lastSuccessMessage = message;
        this.lastSuccessTime = Date.now();
        
        Swal.fire({
            title: 'Success!',
            text: message,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
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
