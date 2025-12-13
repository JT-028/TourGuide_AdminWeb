// Real-time Synchronization System for TourApp Admin Web Interface
// Handles real-time updates between web admin and Android app

class RealTimeSyncManager {
    constructor() {
        this.listeners = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.init();
    }

    init() {
        this.setupConnectionMonitoring();
        this.setupRealTimeListeners();
        this.setupOfflineHandling();
    }

    setupConnectionMonitoring() {
        // Monitor Firebase connection status
        firebaseServices.db.enableNetwork().then(() => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
        }).catch((error) => {
            console.error('Failed to enable network:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });

        // Listen for connection state changes
        firebaseServices.db.onDisconnect().then(() => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.handleDisconnection();
        });
    }

    setupRealTimeListeners() {
        // Users collection listener
        this.setupUsersListener();
        
        // Trips collection listener
        this.setupTripsListener();
        
        // Messages collection listener
        this.setupMessagesListener();
        
        // Locations collection listener
        this.setupLocationsListener();
        
        // Settings collection listener
        this.setupSettingsListener();
    }

    setupUsersListener() {
        const unsubscribe = firebaseServices.usersCollection.onSnapshot(
            (snapshot) => {
                if (this.isConnected) {
                    this.handleUsersUpdate(snapshot);
                }
            },
            (error) => {
                console.error('Users listener error:', error);
                this.handleListenerError('users', error);
            }
        );

        this.listeners.set('users', unsubscribe);
    }

    setupTripsListener() {
        const unsubscribe = firebaseServices.tripsCollection.onSnapshot(
            (snapshot) => {
                if (this.isConnected) {
                    this.handleTripsUpdate(snapshot);
                }
            },
            (error) => {
                console.error('Trips listener error:', error);
                this.handleListenerError('trips', error);
            }
        );

        this.listeners.set('trips', unsubscribe);
    }

    setupMessagesListener() {
        const unsubscribe = firebaseServices.messagesCollection.onSnapshot(
            (snapshot) => {
                if (this.isConnected) {
                    this.handleMessagesUpdate(snapshot);
                }
            },
            (error) => {
                console.error('Messages listener error:', error);
                this.handleListenerError('messages', error);
            }
        );

        this.listeners.set('messages', unsubscribe);
    }

    setupLocationsListener() {
        const unsubscribe = firebaseServices.locationsCollection.onSnapshot(
            (snapshot) => {
                if (this.isConnected) {
                    this.handleLocationsUpdate(snapshot);
                }
            },
            (error) => {
                console.error('Locations listener error:', error);
                this.handleListenerError('locations', error);
            }
        );

        this.listeners.set('locations', unsubscribe);
    }

    setupSettingsListener() {
        const unsubscribe = firebaseServices.db.collection('settings').onSnapshot(
            (snapshot) => {
                if (this.isConnected) {
                    this.handleSettingsUpdate(snapshot);
                }
            },
            (error) => {
                console.error('Settings listener error:', error);
                this.handleListenerError('settings', error);
            }
        );

        this.listeners.set('settings', unsubscribe);
    }

    handleUsersUpdate(snapshot) {
        const changes = [];
        
        snapshot.docChanges().forEach((change) => {
            const userData = {
                id: change.doc.id,
                ...change.doc.data()
            };

            changes.push({
                type: change.type,
                data: userData
            });

            // Emit custom event for user changes
            this.emitEvent('userChanged', {
                type: change.type,
                user: userData
            });
        });

        if (changes.length > 0) {
            this.logSyncActivity('users', changes);
            this.updateUserStatistics();
        }
    }

    handleTripsUpdate(snapshot) {
        const changes = [];
        
        snapshot.docChanges().forEach((change) => {
            const tripData = {
                id: change.doc.id,
                ...change.doc.data()
            };

            changes.push({
                type: change.type,
                data: tripData
            });

            // Emit custom event for trip changes
            this.emitEvent('tripChanged', {
                type: change.type,
                trip: tripData
            });
        });

        if (changes.length > 0) {
            this.logSyncActivity('trips', changes);
            this.updateTripStatistics();
        }
    }

    handleMessagesUpdate(snapshot) {
        const changes = [];
        
        snapshot.docChanges().forEach((change) => {
            const messageData = {
                id: change.doc.id,
                ...change.doc.data()
            };

            changes.push({
                type: change.type,
                data: messageData
            });

            // Emit custom event for message changes
            this.emitEvent('messageChanged', {
                type: change.type,
                message: messageData
            });
        });

        if (changes.length > 0) {
            this.logSyncActivity('messages', changes);
            this.showNewMessageNotification(changes);
        }
    }

    handleLocationsUpdate(snapshot) {
        const changes = [];
        
        snapshot.docChanges().forEach((change) => {
            const locationData = {
                id: change.doc.id,
                ...change.doc.data()
            };

            changes.push({
                type: change.type,
                data: locationData
            });

            // Emit custom event for location changes
            this.emitEvent('locationChanged', {
                type: change.type,
                location: locationData
            });
        });

        if (changes.length > 0) {
            this.logSyncActivity('locations', changes);
            this.updateLocationTracking();
        }
    }

    handleSettingsUpdate(snapshot) {
        const changes = [];
        
        snapshot.docChanges().forEach((change) => {
            const settingsData = {
                id: change.doc.id,
                ...change.doc.data()
            };

            changes.push({
                type: change.type,
                data: settingsData
            });

            // Emit custom event for settings changes
            this.emitEvent('settingsChanged', {
                type: change.type,
                settings: settingsData
            });
        });

        if (changes.length > 0) {
            this.logSyncActivity('settings', changes);
            this.applySettingsChanges(changes);
        }
    }

    emitEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    logSyncActivity(collection, changes) {
        const timestamp = new Date().toISOString();
        const activity = {
            timestamp,
            collection,
            changes: changes.length,
            types: changes.map(c => c.type)
        };

        // Store in localStorage for debugging
        const logs = JSON.parse(localStorage.getItem('syncLogs') || '[]');
        logs.push(activity);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('syncLogs', JSON.stringify(logs));

        // Update sync status indicator
        this.updateSyncIndicator(collection, changes.length);
    }

    updateSyncIndicator(collection, changeCount) {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            indicator.innerHTML = `
                <div class="flex items-center text-sm text-green-600">
                    <i data-feather="refresh-cw" class="w-4 h-4 mr-1 animate-spin"></i>
                    ${changeCount} ${collection} updated
                </div>
            `;
            
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            // Hide after 3 seconds
            setTimeout(() => {
                indicator.classList.add('hidden');
            }, 3000);
        }
    }

    updateUserStatistics() {
        // Trigger user statistics update
        if (window.advancedUserManager) {
            window.advancedUserManager.loadUsers();
        }
        if (window.dashboardManager) {
            window.dashboardManager.loadUsersData();
        }
    }

    updateTripStatistics() {
        // Trigger trip statistics update
        if (window.enhancedTripManager) {
            window.enhancedTripManager.loadTrips();
        }
        if (window.dashboardManager) {
            window.dashboardManager.loadTripsData();
        }
    }

    showNewMessageNotification(changes) {
        const newMessages = changes.filter(change => change.type === 'added');
        
        newMessages.forEach(change => {
            const message = change.data;
            this.showNotification(
                `New message from ${message.senderName || 'Unknown'}`,
                'info',
                5000
            );
        });
    }

    updateLocationTracking() {
        // Update location tracking display if exists
        const locationWidget = document.getElementById('locationTrackingWidget');
        if (locationWidget) {
            // Trigger location widget update
            this.emitEvent('locationTrackingUpdate', {});
        }
    }

    applySettingsChanges(changes) {
        changes.forEach(change => {
            if (change.type === 'modified') {
                const settings = change.data;
                
                // Apply theme changes
                if (settings.theme) {
                    document.body.className = `theme-${settings.theme}`;
                }
                
                // Apply notification settings
                if (settings.notifications) {
                    this.updateNotificationSettings(settings.notifications);
                }
            }
        });
    }

    updateNotificationSettings(notificationSettings) {
        // Update browser notification permissions
        if (notificationSettings.enabled && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    handleListenerError(collection, error) {
        console.error(`Listener error for ${collection}:`, error);
        
        // Attempt to reconnect
        this.attemptReconnection(collection);
    }

    async attemptReconnection(collection) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showError(`Failed to reconnect to ${collection} after ${this.maxReconnectAttempts} attempts`);
            return;
        }

        this.reconnectAttempts++;
        
        try {
            await firebaseServices.db.enableNetwork();
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            
            // Restart listeners
            this.restartListener(collection);
            
        } catch (error) {
            console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
            
            // Retry after delay
            setTimeout(() => {
                this.attemptReconnection(collection);
            }, 2000 * this.reconnectAttempts);
        }
    }

    restartListener(collection) {
        // Unsubscribe from existing listener
        const unsubscribe = this.listeners.get(collection);
        if (unsubscribe) {
            unsubscribe();
        }

        // Restart listener based on collection
        switch (collection) {
            case 'users':
                this.setupUsersListener();
                break;
            case 'trips':
                this.setupTripsListener();
                break;
            case 'messages':
                this.setupMessagesListener();
                break;
            case 'locations':
                this.setupLocationsListener();
                break;
            case 'settings':
                this.setupSettingsListener();
                break;
        }
    }

    handleDisconnection() {
        this.showWarning('Connection lost. Attempting to reconnect...');
        this.updateConnectionStatus(false);
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('connectionStatus');
        if (statusIndicator) {
            if (connected) {
                statusIndicator.innerHTML = `
                    <div class="flex items-center text-sm text-green-600">
                        <i data-feather="wifi" class="w-4 h-4 mr-1"></i>
                        Connected
                    </div>
                `;
            } else {
                statusIndicator.innerHTML = `
                    <div class="flex items-center text-sm text-red-600">
                        <i data-feather="wifi-off" class="w-4 h-4 mr-1"></i>
                        Disconnected
                    </div>
                `;
            }
            
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    setupOfflineHandling() {
        // Handle online/offline events
        window.addEventListener('online', () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.showSuccess('Connection restored');
        });

        window.addEventListener('offline', () => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.showWarning('Connection lost');
        });
    }

    // Public methods for external use
    getSyncLogs() {
        return JSON.parse(localStorage.getItem('syncLogs') || '[]');
    }

    clearSyncLogs() {
        localStorage.removeItem('syncLogs');
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    forceSync() {
        // Force a manual sync by reloading data
        if (window.advancedUserManager) {
            window.advancedUserManager.loadUsers();
        }
        if (window.enhancedTripManager) {
            window.enhancedTripManager.loadTrips();
        }
        if (window.dashboardManager) {
            window.dashboardManager.loadDashboardData();
        }
        
        this.showSuccess('Manual sync completed');
    }

    // Notification methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'warning' ? 'bg-yellow-500 text-white' : 
            type === 'info' ? 'bg-blue-500 text-white' :
            'bg-red-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    // Cleanup method
    destroy() {
        // Unsubscribe from all listeners
        this.listeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.listeners.clear();
    }
}

// Initialize real-time sync manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.realTimeSyncManager = new RealTimeSyncManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.realTimeSyncManager) {
        window.realTimeSyncManager.destroy();
    }
});
