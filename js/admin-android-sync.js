// Admin-Android Synchronization Service for TourApp Admin Web Interface
// This module handles synchronization between the admin web interface and Android app

class AdminAndroidSync {
    constructor() {
        this.init();
    }
    
    init() {
        // Initialize Firebase listeners
        this.setupDeviceTracking();
        this.setupUserStatusTracking();
        this.setupTripStatusTracking();
        
        // Setup UI elements if available
        this.setupUIHandlers();
    }
    
    /**
     * Setup device tracking to monitor active devices
     */
    setupDeviceTracking() {
        this.activeDevicesRef = firebaseServices.db.collection('devices');
            
        // Listen for active devices
        this.deviceListener = this.activeDevicesRef.onSnapshot(snapshot => {
            const devices = [];
            
            snapshot.forEach(doc => {
                const deviceData = doc.data();
                
                devices.push({
                    id: doc.id,
                    ...deviceData
                });
            });
            
            // Update active devices count
            this.updateActiveDevicesCount(devices.length);
            
            // Count online devices
            const onlineDevices = devices.filter(device => device.isOnline === true);
            this.updateActiveUsersCount(onlineDevices.length);
            
            // Store devices data
            this.activeDevices = devices;
            
            // Log device update to console
            console.log(`Updated device tracking: ${devices.length} devices, ${onlineDevices.length} online`);
        }, error => {
            console.error('Error tracking devices:', error);
        });
    }
    
    /**
     * Setup user status tracking for real-time updates
     * Note: We're now tracking user status through the devices collection
     * rather than directly through user documents
     */
    setupUserStatusTracking() {
        // Set up tracking for system events
        this.systemEventsRef = firebaseServices.db.collection('system_events')
            .orderBy('timestamp', 'desc')
            .limit(10);
            
        // Listen for system events
        this.systemEventsListener = this.systemEventsRef.onSnapshot(snapshot => {
            const events = [];
            
            snapshot.forEach(doc => {
                events.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Store system events
            this.systemEvents = events;
            
            // Update system events timeline
            this.updateSystemEventsTimeline(events);
            
            // Log system events update
            console.log(`Updated system events: ${events.length} recent events`);
        }, error => {
            console.error('Error tracking system events:', error);
        });
    }
    
    /**
     * Update system events timeline in the UI
     */
    updateSystemEventsTimeline(events) {
        const timelineElement = document.getElementById('android-activity-timeline');
        if (!timelineElement) return;
        
        // Clear timeline
        timelineElement.innerHTML = '';
        
        // If no events, show a message
        if (!events || events.length === 0) {
            timelineElement.innerHTML = `
                <li class="relative pb-8">
                    <div class="relative flex space-x-3">
                        <div>
                            <span class="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                <svg data-feather="clock" class="h-4 w-4 text-white"></svg>
                            </span>
                        </div>
                        <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                                <p class="text-sm text-gray-500">No recent activity</p>
                            </div>
                        </div>
                    </div>
                </li>
            `;
            
            // Initialize Feather icons if available
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            return;
        }
        
        // Add events to timeline
        events.forEach((event, index) => {
            const isLast = index === events.length - 1;
            
            // Format timestamp
            const timestamp = event.timestamp?.toDate ? event.timestamp.toDate() : new Date(event.timestamp);
            const timeFormatted = timestamp.toLocaleTimeString();
            
            // Determine icon and color based on event type
            let icon, bgColor;
            switch (event.type) {
                case 'force_sync':
                    icon = 'refresh-cw';
                    bgColor = 'bg-indigo-500';
                    break;
                case 'system_notification':
                    icon = 'bell';
                    bgColor = 'bg-yellow-500';
                    break;
                case 'user_login':
                    icon = 'log-in';
                    bgColor = 'bg-green-500';
                    break;
                case 'user_logout':
                    icon = 'log-out';
                    bgColor = 'bg-red-500';
                    break;
                case 'trip_started':
                    icon = 'map';
                    bgColor = 'bg-blue-500';
                    break;
                case 'trip_ended':
                    icon = 'check-circle';
                    bgColor = 'bg-green-500';
                    break;
                case 'app_error':
                    icon = 'alert-triangle';
                    bgColor = 'bg-red-500';
                    break;
                default:
                    icon = 'activity';
                    bgColor = 'bg-gray-400';
                    break;
            }
            
            // Create timeline item
            const li = document.createElement('li');
            li.className = 'relative pb-8';
            
            // Add connecting line except for the last item
            if (!isLast) {
                li.innerHTML = '<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>';
            }
            
            // Add timeline item content
            li.innerHTML += `
                <div class="relative flex space-x-3">
                    <div>
                        <span class="h-8 w-8 rounded-full ${bgColor} flex items-center justify-center ring-8 ring-white">
                            <svg data-feather="${icon}" class="h-4 w-4 text-white"></svg>
                        </span>
                    </div>
                    <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                            <p class="text-sm text-gray-500">${event.message || 'System event'}</p>
                        </div>
                        <div class="text-right text-sm whitespace-nowrap text-gray-500">
                            <time datetime="${timestamp.toISOString()}">${timeFormatted}</time>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to timeline
            timelineElement.appendChild(li);
        });
        
        // Initialize Feather icons if available
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Update last sync time
        const lastSyncTimeElement = document.getElementById('last-sync-time');
        if (lastSyncTimeElement) {
            lastSyncTimeElement.textContent = 'Just now';
        }
    }
    
    /**
     * Setup trip status tracking for real-time updates
     */
    setupTripStatusTracking() {
        this.ongoingTripsRef = firebaseServices.db.collection('trips')
            .where('status', '==', 'ACTIVE');
            
        // Listen for ongoing trips
        this.tripStatusListener = this.ongoingTripsRef.onSnapshot(snapshot => {
            const ongoingTrips = [];
            
            snapshot.forEach(doc => {
                ongoingTrips.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Update ongoing trips count
            this.updateOngoingTripsCount(ongoingTrips.length);
            
            // Store ongoing trips data
            this.ongoingTrips = ongoingTrips;
            
            // Log trip update
            console.log(`Updated trip tracking: ${ongoingTrips.length} active trips`);
            
            // Track system events for trips
            this.trackTripEvents(ongoingTrips);
        }, error => {
            console.error('Error tracking trip status:', error);
        });
    }
    
    /**
     * Track trip-related events for system events log
     */
    async trackTripEvents(currentTrips) {
        // If this is the first update, just store the trips and don't generate events
        if (!this.previousTrips) {
            this.previousTrips = currentTrips;
            return;
        }
        
        try {
            // Find newly started trips
            const newTrips = currentTrips.filter(trip => 
                !this.previousTrips.some(prevTrip => prevTrip.id === trip.id)
            );
            
            // Log new trips as events
            for (const trip of newTrips) {
                await firebaseServices.db.collection('system_events').add({
                    type: 'trip_started',
                    message: `Trip "${trip.name}" started with ${trip.students?.length || 0} students`,
                    timestamp: new Date(),
                    tripId: trip.id,
                    data: {
                        tripName: trip.name,
                        studentCount: trip.students?.length || 0,
                        facultyId: trip.facultyId
                    }
                });
            }
            
            // Update previous trips
            this.previousTrips = currentTrips;
        } catch (error) {
            console.error('Error tracking trip events:', error);
        }
    }
    
    /**
     * Update UI element with active devices count
     */
    updateActiveDevicesCount(count) {
        const activeDevicesElement = document.getElementById('active-devices-count');
        if (activeDevicesElement) {
            activeDevicesElement.textContent = count.toString();
        }
    }
    
    /**
     * Update UI element with active users count
     */
    updateActiveUsersCount(count) {
        const activeUsersElement = document.getElementById('active-users-count');
        if (activeUsersElement) {
            activeUsersElement.textContent = count.toString();
        }
    }
    
    /**
     * Update UI element with ongoing trips count
     */
    updateOngoingTripsCount(count) {
        const ongoingTripsElement = document.getElementById('ongoing-trips-count');
        if (ongoingTripsElement) {
            ongoingTripsElement.textContent = count.toString();
        }
    }
    
    /**
     * Setup UI handlers for sync-related actions
     */
    setupUIHandlers() {
        // Add required components to DOM
        this.addRequiredComponentsToDom();
        
        // View active devices button
        const viewDevicesBtn = document.getElementById('view-devices-btn');
        if (viewDevicesBtn) {
            viewDevicesBtn.addEventListener('click', () => this.showActiveDevices());
        }
        
        // Send notification to all devices button
        const sendNotificationBtn = document.getElementById('send-notification-btn');
        if (sendNotificationBtn) {
            sendNotificationBtn.addEventListener('click', () => this.showSendNotificationModal());
        }
        
        // Force sync button
        const forceSyncBtn = document.getElementById('force-sync-btn');
        if (forceSyncBtn) {
            forceSyncBtn.addEventListener('click', () => this.forceSyncAll());
        }
        
        // System message button
        const sendSystemMessageBtn = document.getElementById('send-system-message-btn');
        if (sendSystemMessageBtn) {
            sendSystemMessageBtn.addEventListener('click', () => this.showSendNotificationModal());
        }
        
        // Check app versions button
        const checkAppVersionsBtn = document.getElementById('check-app-versions-btn');
        if (checkAppVersionsBtn) {
            checkAppVersionsBtn.addEventListener('click', () => this.showAppVersionsModal());
        }
    }
    
    /**
     * Add required components to DOM if not already present
     */
    addRequiredComponentsToDom() {
        // Check for Android App Status widget
        if (!document.querySelector('[id^="android-app-status"]')) {
            fetch('widgets/android-app-status.html')
                .then(response => response.text())
                .then(html => {
                    // Find a suitable container for the widget
                    const dashboardContainer = document.querySelector('.dashboard-container') || 
                                              document.querySelector('main') ||
                                              document.body;
                    
                    if (dashboardContainer) {
                        // Create widget container
                        const widgetContainer = document.createElement('div');
                        widgetContainer.className = 'mt-8';
                        widgetContainer.innerHTML = html;
                        dashboardContainer.appendChild(widgetContainer);
                        
                        console.log('Android App Status widget added to DOM');
                        
                        // Initialize Feather icons if available
                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error loading Android App Status widget:', error);
                });
        }
        
        // Check if notification modal exists, if not, load it
        if (!document.getElementById('notification-modal')) {
            fetch('widgets/notification-modal.html')
                .then(response => response.text())
                .then(html => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    document.body.appendChild(tempDiv.firstElementChild);
                    console.log('Notification modal added to DOM');
                })
                .catch(error => {
                    console.error('Error loading notification modal:', error);
                });
        }
        
        // Check if device management modal exists, if not, load it
        if (!document.getElementById('devices-management-modal')) {
            fetch('widgets/device-management.html')
                .then(response => response.text())
                .then(html => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    document.body.appendChild(tempDiv.firstElementChild);
                    console.log('Device management modal added to DOM');
                })
                .catch(error => {
                    console.error('Error loading device management modal:', error);
                });
        }
    }
    
    /**
     * Display active devices management modal
     */
    showActiveDevices() {
        // Use the device management modal component
        const devicesModal = document.getElementById('devices-management-modal');
        if (!devicesModal) {
            console.error('Devices management modal not found');
            this.showToast('Device management not available', 'error');
            return;
        }
        
        // Show the modal
        devicesModal.classList.remove('hidden');
        
        // If window.openDevicesModal function exists (from the component), call it
        if (typeof window.openDevicesModal === 'function') {
            window.openDevicesModal();
        }
        
        // Add device rows
        this.activeDevices.forEach(device => {
            const lastActiveDate = device.lastActive?.toDate ? device.lastActive.toDate() : new Date();
            
            deviceTableHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${device.deviceModel || 'Unknown'}</div>
                        <div class="text-sm text-gray-500">${device.deviceId?.substring(0, 8) || 'ID Unknown'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ${device.platform || 'Unknown'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatDate(lastActiveDate)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900" onclick="adminAndroidSync.sendNotificationToDevice('${device.userId}', '${device.deviceId}')">
                            Send Notification
                        </button>
                        <button class="ml-3 text-red-600 hover:text-red-900" onclick="adminAndroidSync.logoutDevice('${device.userId}', '${device.deviceId}')">
                            Log Out
                        </button>
                    </td>
                </tr>
            `;
        });
        
        deviceTableHTML += `
                </tbody>
            </table>
        `;
        
        // Show modal with device table
        this.showModal('Active Devices', deviceTableHTML);
    }
    
    /**
     * Format date for display
     */
    formatDate(date) {
        if (!date) return 'Unknown';
        return date.toLocaleString();
    }
    
    /**
     * Show modal dialog
     */
    showModal(title, content) {
        // Create modal element if it doesn't exist
        let modalElement = document.getElementById('admin-sync-modal');
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = 'admin-sync-modal';
            document.body.appendChild(modalElement);
        }
        
        // Set modal content
        modalElement.innerHTML = `
            <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start">
                                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        ${title}
                                    </h3>
                                    <div class="mt-2">
                                        ${content}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onclick="adminAndroidSync.closeModal()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        modalElement.style.display = 'block';
    }
    
    /**
     * Close modal dialog
     */
    closeModal() {
        const modalElement = document.getElementById('admin-sync-modal');
        if (modalElement) {
            modalElement.style.display = 'none';
        }
    }
    
    /**
     * Show notification sending modal
     */
    showSendNotificationModal() {
        const modalContent = `
            <form id="send-notification-form">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="notification-title">
                        Notification Title
                    </label>
                    <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="notification-title" type="text" placeholder="Title">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="notification-message">
                        Message
                    </label>
                    <textarea class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="notification-message" placeholder="Message" rows="4"></textarea>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="notification-type">
                        Type
                    </label>
                    <select class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="notification-type">
                        <option value="SYSTEM">System Message</option>
                        <option value="EMERGENCY">Emergency Alert</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="recipient-type">
                        Recipients
                    </label>
                    <select class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="recipient-type">
                        <option value="all">All Users</option>
                        <option value="students">Students Only</option>
                        <option value="teachers">Teachers Only</option>
                        <option value="admins">Admins Only</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="expiration-hours">
                        Expires After (hours)
                    </label>
                    <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="expiration-hours" type="number" min="1" max="168" value="24">
                </div>
                <div class="flex items-center">
                    <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button" onclick="adminAndroidSync.sendNotification()">
                        Send Notification
                    </button>
                </div>
            </form>
        `;
        
        this.showModal('Send Notification', modalContent);
    }
    
    /**
     * Send system notification using new Cloud Functions integration
     */
    async sendSystemNotification(notificationData) {
        try {
            // Call the Cloud Function to send notification
            const notifyFunction = firebase.functions().httpsCallable('sendSystemNotification');
            const result = await notifyFunction(notificationData);
            
            // Log the event
            await firebaseServices.db.collection('system_events').add({
                type: 'system_notification',
                message: `Admin sent "${notificationData.title}" notification to ${notificationData.targetUserRole || 'all'} users`,
                timestamp: new Date(),
                user: firebaseServices.auth.currentUser?.email || 'unknown'
            });
            
            console.log('System notification sent', result);
            
            // Close the modal
            const modalElement = document.getElementById('notification-modal');
            if (modalElement) {
                modalElement.classList.add('hidden');
            }
            
            // Show success message
            this.showToast('Notification sent successfully!', 'success');
            
            return result;
        } catch (error) {
            console.error('Error sending notification:', error);
            this.showToast(`Error sending notification: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Send notification to specific device
     */
    async sendNotificationToDevice(deviceId) {
        try {
            // Show the notification modal with device pre-selected
            this.showSendNotificationModal(deviceId);
        } catch (error) {
            console.error('Error preparing device notification:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    /**
     * Force logout a specific device
     */
    async logoutDevice(deviceId) {
        if (!confirm('Are you sure you want to log out this device?')) {
            return;
        }
        
        try {
            // Call the Cloud Function to force logout the device
            const logoutFunction = firebase.functions().httpsCallable('forceLogoutDevice');
            const result = await logoutFunction({
                deviceId,
                initiatedBy: firebaseServices.auth.currentUser?.email || 'Admin'
            });
            
            // Log the event
            await firebaseServices.db.collection('system_events').add({
                type: 'force_logout',
                message: `Admin forced logout for device: ${deviceId}`,
                timestamp: new Date(),
                user: firebaseServices.auth.currentUser?.email || 'unknown'
            });
            
            this.showToast('Device logged out successfully!', 'success');
        } catch (error) {
            console.error('Error logging out device:', error);
            this.showToast(`Error logging out device: ${error.message}`, 'error');
        }
    }
    
    /**
     * Force sync all devices
     */
    async forceSyncAll() {
        if (!confirm('Are you sure you want to force sync all devices? This will refresh data on all active devices.')) {
            return;
        }
        
        try {
            // Call the Cloud Function to force sync all devices
            const syncFunction = firebase.functions().httpsCallable('forceSyncAllDevices');
            const result = await syncFunction({
                initiatedBy: firebaseServices.auth.currentUser?.email || 'Admin',
                timestamp: new Date().toISOString()
            });
            
            // Log the event
            await firebaseServices.db.collection('system_events').add({
                type: 'force_sync',
                message: 'Admin triggered force sync for all devices',
                timestamp: new Date(),
                user: firebaseServices.auth.currentUser?.email || 'unknown'
            });
            
            console.log('Force sync request sent to all devices', result);
            this.showToast('Force sync initiated for all devices!', 'success');
        } catch (error) {
            console.error('Error forcing sync:', error);
            this.showToast(`Error initiating force sync: ${error.message}`, 'error');
        }
    }
    
    /**
     * Force sync a specific device
     */
    async forceSyncDevice(deviceId) {
        try {
            // Call the Cloud Function to force sync a specific device
            const syncFunction = firebase.functions().httpsCallable('forceSyncDevice');
            const result = await syncFunction({
                deviceId,
                initiatedBy: firebaseServices.auth.currentUser?.email || 'Admin',
                timestamp: new Date().toISOString()
            });
            
            // Log the event
            await firebaseServices.db.collection('system_events').add({
                type: 'force_sync',
                message: `Admin triggered force sync for device: ${deviceId}`,
                timestamp: new Date(),
                user: firebaseServices.auth.currentUser?.email || 'unknown'
            });
            
            console.log(`Force sync request sent to device: ${deviceId}`, result);
            this.showToast(`Sync request sent to device`, 'success');
            return result;
        } catch (error) {
            console.error(`Error forcing sync for device ${deviceId}:`, error);
            this.showToast(`Error: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Show app versions modal with system information
     */
    showAppVersionsModal() {
        // Create modal content with app versions table
        const modalContent = `
            <div class="overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Platform
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Version
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
                                            <polygon points="12 15 17 21 7 21 12 15"></polygon>
                                        </svg>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">Web Admin</div>
                                        <div class="text-sm text-gray-500">Browser Interface</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">1.0.0</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Current
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M5 16V9h14V2H5l14 14h-7m-7 0l7 7v-7m-7 0h7"></path>
                                        </svg>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">Android App</div>
                                        <div class="text-sm text-gray-500">Mobile Interface</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">1.0.0</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Current
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 2L2 7l10 5l10-5l-10-5z"></path>
                                            <path d="M2 17l10 5l10-5"></path>
                                            <path d="M2 12l10 5l10-5"></path>
                                        </svg>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">Firebase Functions</div>
                                        <div class="text-sm text-gray-500">Integration Service</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">1.0.0</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Current
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="mt-4">
                    <h4 class="text-sm font-medium text-gray-500 mb-2">System Information</h4>
                    <div class="bg-gray-50 p-3 rounded text-xs font-mono text-gray-700 overflow-x-auto">
                        <div>Firebase Project: tourapp-69eaf</div>
                        <div>Authentication: Enabled</div>
                        <div>Firestore: Enabled</div>
                        <div>Storage: Enabled</div>
                        <div>Functions: Deployed</div>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        this.showModal('App Versions', modalContent);
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed bottom-0 right-0 p-4 z-50';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `transform transition-all duration-300 ease-in-out mb-4 p-4 rounded shadow-lg max-w-sm`;
        
        // Set color based on type
        switch (type) {
            case 'success':
                toast.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                toast.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                toast.classList.add('bg-yellow-500', 'text-white');
                break;
            default:
                toast.classList.add('bg-blue-500', 'text-white');
                break;
        }
        
        // Set toast content
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="text-sm font-medium">${message}</div>
                </div>
                <button class="text-white ml-4">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Add toast to container
        toastContainer.appendChild(toast);
        
        // Add close button event
        toast.querySelector('button').addEventListener('click', () => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }
    
    /**
     * For backwards compatibility
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    /**
     * Cleanup listeners when page unloads
     */
    cleanup() {
        if (this.deviceListener) this.deviceListener();
        if (this.userStatusListener) this.userStatusListener();
        if (this.tripStatusListener) this.tripStatusListener();
    }
}

// Initialize admin-android sync service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebaseServices !== 'undefined' && firebaseServices.auth) {
        window.adminAndroidSync = new AdminAndroidSync();
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (window.adminAndroidSync) {
                window.adminAndroidSync.cleanup();
            }
        });
    }
});