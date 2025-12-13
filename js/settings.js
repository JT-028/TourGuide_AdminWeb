// Settings Management for TourApp Admin Web Interface
// Handles saving and loading system settings to Firebase Firestore

class SettingsManager {
    constructor() {
        this.settings = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Save settings button
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset to defaults button
        const resetBtn = document.querySelector('button[onclick*="Reset"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }

        // Auto-logout timer select
        const autoLogoutSelect = document.querySelector('select');
        if (autoLogoutSelect) {
            autoLogoutSelect.addEventListener('change', (e) => {
                this.settings.autoLogoutTimer = parseInt(e.target.value);
            });
        }

        // Toggle switches
        const toggles = document.querySelectorAll('input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.updateSettingFromToggle(e.target);
            });
        });

        // Input fields
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateSettingFromInput(e.target);
            });
        });
    }

    async loadSettings() {
        try {
            console.log('Loading settings from Firebase...');
            
            // Load system settings from Firestore
            const settingsDoc = await firebaseServices.db.collection('settings').doc('system').get();
            
            if (settingsDoc.exists) {
                this.settings = settingsDoc.data();
                console.log('Settings loaded:', this.settings);
                this.populateUI();
            } else {
                console.log('No settings found, using defaults');
                this.settings = this.getDefaultSettings();
                this.populateUI();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Failed to load settings. Using defaults.');
            this.settings = this.getDefaultSettings();
            this.populateUI();
        }
    }

    populateUI() {
        // School Information
        const schoolName = document.getElementById('schoolName');
        const schoolCode = document.getElementById('schoolCode');
        const schoolAddress = document.getElementById('schoolAddress');

        if (schoolName) schoolName.value = this.settings.schoolName || 'Colegio de San Agustin';
        if (schoolCode) schoolCode.value = this.settings.schoolCode || 'CCA';
        if (schoolAddress) schoolAddress.value = this.settings.schoolAddress || 'Makati City, Metro Manila';

        // Application Preferences
        const emailNotificationsToggle = document.querySelector('input[type="checkbox"]:checked');
        const smsAlertsToggle = document.querySelectorAll('input[type="checkbox"]')[1];
        const autoLogoutSelect = document.querySelector('select');

        if (emailNotificationsToggle) {
            emailNotificationsToggle.checked = this.settings.emailNotifications !== false;
        }
        if (smsAlertsToggle) {
            smsAlertsToggle.checked = this.settings.smsAlerts !== false;
        }
        if (autoLogoutSelect) {
            autoLogoutSelect.value = this.settings.autoLogoutTimer || 30;
        }

        // Security Settings
        const minPasswordLength = document.getElementById('minPasswordLength');
        const passwordExpiry = document.getElementById('passwordExpiry');
        const maxLoginAttempts = document.getElementById('maxLoginAttempts');
        const lockoutDuration = document.getElementById('lockoutDuration');

        if (minPasswordLength) minPasswordLength.value = this.settings.passwordRequirements?.minLength || 8;
        if (passwordExpiry) passwordExpiry.value = this.settings.passwordRequirements?.expiryDays || 90;
        if (maxLoginAttempts) maxLoginAttempts.value = this.settings.securitySettings?.maxLoginAttempts || 5;
        if (lockoutDuration) lockoutDuration.value = this.settings.securitySettings?.lockoutDuration || 30;

        // Password Requirements Checkboxes
        const requireUppercase = document.querySelector('input[type="checkbox"][checked]');
        const requireNumbers = document.querySelectorAll('input[type="checkbox"]')[2];
        const requireSpecialChars = document.querySelectorAll('input[type="checkbox"]')[3];

        if (requireUppercase) {
            requireUppercase.checked = this.settings.passwordRequirements?.requireUppercase !== false;
        }
        if (requireNumbers) {
            requireNumbers.checked = this.settings.passwordRequirements?.requireNumbers !== false;
        }
        if (requireSpecialChars) {
            requireSpecialChars.checked = this.settings.passwordRequirements?.requireSpecialChars === true;
        }

        // Notification Settings
        const notificationCheckboxes = document.querySelectorAll('input[type="checkbox"]');
        const notificationSettings = this.settings.notificationSettings || {};

        // Map notification settings to checkboxes
        const notificationMap = {
            'newUserRegistration': 4,
            'tripUpdates': 5,
            'sosAlerts': 6,
            'systemErrors': 7,
            'emergencyAlerts': 8,
            'tripUpdatesSMS': 9
        };

        Object.entries(notificationMap).forEach(([setting, index]) => {
            if (notificationCheckboxes[index]) {
                notificationCheckboxes[index].checked = notificationSettings[setting] !== false;
            }
        });
    }

    updateSettingFromToggle(toggle) {
        const settingName = this.getSettingNameFromElement(toggle);
        if (settingName) {
            this.setNestedProperty(this.settings, settingName, toggle.checked);
            console.log(`Updated ${settingName}:`, toggle.checked);
        }
    }

    updateSettingFromInput(input) {
        const settingName = this.getSettingNameFromElement(input);
        if (settingName) {
            let value = input.type === 'number' ? parseInt(input.value) : input.value;
            this.setNestedProperty(this.settings, settingName, value);
            console.log(`Updated ${settingName}:`, value);
        }
    }

    getSettingNameFromElement(element) {
        const id = element.id;
        const nameMap = {
            'schoolName': 'schoolName',
            'schoolCode': 'schoolCode',
            'schoolAddress': 'schoolAddress',
            'minPasswordLength': 'passwordRequirements.minLength',
            'passwordExpiry': 'passwordRequirements.expiryDays',
            'maxLoginAttempts': 'securitySettings.maxLoginAttempts',
            'lockoutDuration': 'securitySettings.lockoutDuration'
        };

        if (nameMap[id]) {
            return nameMap[id];
        }

        // Handle checkbox settings
        if (element.type === 'checkbox') {
            const checkboxMap = {
                // Application preferences
                0: 'emailNotifications',
                1: 'smsAlerts',
                // Password requirements
                2: 'passwordRequirements.requireUppercase',
                3: 'passwordRequirements.requireNumbers',
                4: 'passwordRequirements.requireSpecialChars',
                // Notification settings
                5: 'notificationSettings.newUserRegistration',
                6: 'notificationSettings.tripUpdates',
                7: 'notificationSettings.sosAlerts',
                8: 'notificationSettings.systemErrors',
                9: 'notificationSettings.emergencyAlerts',
                10: 'notificationSettings.tripUpdatesSMS'
            };

            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const index = Array.from(checkboxes).indexOf(element);
            return checkboxMap[index];
        }

        return null;
    }

    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    async saveSettings() {
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (!saveBtn) return;

        const originalText = saveBtn.innerHTML;
        
        try {
            // Show loading state
            saveBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 mr-2 animate-spin"></i>Saving...';
            saveBtn.disabled = true;

            // Update settings from current UI values
            this.updateSettingsFromUI();

            // Add metadata
            this.settings.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            this.settings.updatedBy = firebaseServices.auth.currentUser?.uid || 'admin';
            this.settings.version = '1.0';

            console.log('Saving settings:', this.settings);

            // Save to Firestore
            await firebaseServices.db.collection('settings').doc('system').set(this.settings, { merge: true });

            // Update Android app settings if needed
            await this.syncWithAndroidApp();

            // Show success state
            saveBtn.innerHTML = '<i data-feather="check" class="w-4 h-4 mr-2"></i>Settings Saved!';
            
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                feather.replace();
            }, 2000);

            this.showSuccess('Settings saved successfully and synced with Android app!');

        } catch (error) {
            console.error('Error saving settings:', error);
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            this.showError(`Failed to save settings: ${error.message}`);
        }
    }

    updateSettingsFromUI() {
        // School Information
        const schoolName = document.getElementById('schoolName');
        const schoolCode = document.getElementById('schoolCode');
        const schoolAddress = document.getElementById('schoolAddress');

        if (schoolName) this.settings.schoolName = schoolName.value;
        if (schoolCode) this.settings.schoolCode = schoolCode.value;
        if (schoolAddress) this.settings.schoolAddress = schoolAddress.value;

        // Application Preferences
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        const autoLogoutSelect = document.querySelector('select');

        if (checkboxes[0]) this.settings.emailNotifications = checkboxes[0].checked;
        if (checkboxes[1]) this.settings.smsAlerts = checkboxes[1].checked;
        if (autoLogoutSelect) this.settings.autoLogoutTimer = parseInt(autoLogoutSelect.value);

        // Security Settings
        const minPasswordLength = document.getElementById('minPasswordLength');
        const passwordExpiry = document.getElementById('passwordExpiry');
        const maxLoginAttempts = document.getElementById('maxLoginAttempts');
        const lockoutDuration = document.getElementById('lockoutDuration');

        if (!this.settings.passwordRequirements) this.settings.passwordRequirements = {};
        if (minPasswordLength) this.settings.passwordRequirements.minLength = parseInt(minPasswordLength.value);
        if (passwordExpiry) this.settings.passwordRequirements.expiryDays = parseInt(passwordExpiry.value);
        if (checkboxes[2]) this.settings.passwordRequirements.requireUppercase = checkboxes[2].checked;
        if (checkboxes[3]) this.settings.passwordRequirements.requireNumbers = checkboxes[3].checked;
        if (checkboxes[4]) this.settings.passwordRequirements.requireSpecialChars = checkboxes[4].checked;

        if (!this.settings.securitySettings) this.settings.securitySettings = {};
        if (maxLoginAttempts) this.settings.securitySettings.maxLoginAttempts = parseInt(maxLoginAttempts.value);
        if (lockoutDuration) this.settings.securitySettings.lockoutDuration = parseInt(lockoutDuration.value);

        // Notification Settings
        if (!this.settings.notificationSettings) this.settings.notificationSettings = {};
        if (checkboxes[5]) this.settings.notificationSettings.newUserRegistration = checkboxes[5].checked;
        if (checkboxes[6]) this.settings.notificationSettings.tripUpdates = checkboxes[6].checked;
        if (checkboxes[7]) this.settings.notificationSettings.sosAlerts = checkboxes[7].checked;
        if (checkboxes[8]) this.settings.notificationSettings.systemErrors = checkboxes[8].checked;
        if (checkboxes[9]) this.settings.notificationSettings.emergencyAlerts = checkboxes[9].checked;
        if (checkboxes[10]) this.settings.notificationSettings.tripUpdatesSMS = checkboxes[10].checked;
    }

    async syncWithAndroidApp() {
        try {
            // Create a settings document specifically for Android app
            const androidSettings = {
                schoolName: this.settings.schoolName,
                schoolCode: this.settings.schoolCode,
                schoolAddress: this.settings.schoolAddress,
                emailNotifications: this.settings.emailNotifications,
                smsAlerts: this.settings.smsAlerts,
                autoLogoutTimer: this.settings.autoLogoutTimer,
                passwordRequirements: this.settings.passwordRequirements,
                securitySettings: this.settings.securitySettings,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'admin_web',
                source: 'admin_web_interface'
            };

            await firebaseServices.db.collection('settings').doc('android_app').set(androidSettings, { merge: true });
            
            console.log('Settings synced with Android app');
            return true;
        } catch (error) {
            console.error('Error syncing with Android app:', error);
            // Don't throw error, just log it - settings are still saved
            return false;
        }
    }

    async resetToDefaults() {
        const result = await Swal.fire({
            title: 'Reset to Defaults?',
            text: 'This will reset all settings to their default values. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, reset all settings!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                this.settings = this.getDefaultSettings();
                this.populateUI();
                await this.saveSettings();
                this.showSuccess('Settings reset to defaults successfully!');
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showError(`Failed to reset settings: ${error.message}`);
            }
        }
    }

    getDefaultSettings() {
        return {
            schoolName: 'Colegio de San Agustin',
            schoolCode: 'CCA',
            schoolAddress: 'Makati City, Metro Manila',
            emailNotifications: true,
            smsAlerts: true,
            autoLogoutTimer: 30,
            passwordRequirements: {
                minLength: 8,
                expiryDays: 90,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialChars: false
            },
            securitySettings: {
                maxLoginAttempts: 5,
                lockoutDuration: 30
            },
            notificationSettings: {
                newUserRegistration: true,
                tripUpdates: true,
                sosAlerts: true,
                systemErrors: true,
                emergencyAlerts: true,
                tripUpdatesSMS: false
            },
            version: '1.0',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'admin'
        };
    }

    showSuccess(message) {
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
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be initialized
    if (typeof firebaseServices !== 'undefined') {
        console.log('Initializing SettingsManager...');
        window.settingsManager = new SettingsManager();
    } else {
        console.error('Firebase services not available. SettingsManager cannot be initialized.');
        
        // Show error in UI
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Firebase Not Available';
        }
    }
});