// Dashboard functionality for TourApp Admin Web Interface

class DashboardManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('DashboardManager initializing...');
        this.setupEventListeners();
        // Load data immediately
        this.loadDashboardDataImmediately();
    }

    // Load dashboard data immediately without delay
    async loadDashboardDataImmediately() {
        try {
            console.log('DashboardManager: Loading data immediately...');
            
            // Wait for Firebase services and authentication
            let attempts = 0;
            const maxAttempts = 15;
            
            while (attempts < maxAttempts) {
                // Check if Firebase services are available
                if (typeof firebaseServices !== 'undefined' && firebaseServices.usersCollection) {
                    console.log('DashboardManager: Firebase services ready, checking authentication...');
                    
                    // Check if user is authenticated
                    const currentUser = firebaseServices.auth.currentUser;
                    if (currentUser) {
                        console.log('DashboardManager: User authenticated, loading data...');
                        await this.loadDashboardData();
                        return;
                    } else {
                        console.log('DashboardManager: User not authenticated, waiting for auth...');
                    }
                }
                
                console.log(`DashboardManager: Waiting for Firebase services and authentication... attempt ${attempts + 1}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            console.error('DashboardManager: Firebase services or authentication not available after waiting');
            this.showError('Please log in to view dashboard data.');
            
        } catch (error) {
            console.error('DashboardManager: Error in immediate loading:', error);
            console.error('DashboardManager: Error details:', error.message, error.code);
            this.showError(`Failed to load dashboard data: ${error.message}`);
        }
    }

    setupEventListeners() {
        // Refresh button if exists
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    async loadDashboardData() {
        try {
            // Load all data in parallel for better performance
            const [usersData, tripsData, recentActivity] = await Promise.all([
                this.loadUsersData(),
                this.loadTripsData(),
                this.loadRecentActivity()
            ]);

            this.updateDashboardStats(usersData, tripsData);
            this.updateTripStats(tripsData);
            this.updateRecentActivity(recentActivity);
            this.updateRecentUsersTable(usersData);
            this.updateQuickActions();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data. Please refresh the page.');
        }
    }

    async loadUsersData() {
        try {
            const snapshot = await firebaseServices.usersCollection.get();
            const users = [];
            
            snapshot.forEach(doc => {
                const userData = doc.data();
                users.push({
                    id: doc.id,
                    ...userData
                });
            });

            console.log(`Dashboard loaded ${users.length} users:`, users);

            return {
                total: users.length,
                teachers: users.filter(user => user.role === 'teacher').length,
                students: users.filter(user => user.role === 'student').length,
                admins: users.filter(user => user.role === 'admin').length,
                active: users.filter(user => user.role !== 'suspended' && user.role !== 'pending').length,
                suspended: users.filter(user => user.role === 'suspended').length,
                pending: users.filter(user => user.role === 'pending').length,
                allUsers: users
            };
        } catch (error) {
            console.error('Error loading users data:', error);
            return { total: 0, teachers: 0, students: 0, admins: 0, active: 0, suspended: 0, pending: 0, allUsers: [] };
        }
    }

    async loadTripsData() {
        try {
            const snapshot = await firebaseServices.tripsCollection.get();
            const trips = [];
            
            snapshot.forEach(doc => {
                const tripData = doc.data();
                trips.push({
                    id: doc.id,
                    ...tripData
                });
            });

            console.log(`Dashboard loaded ${trips.length} trips:`, trips);

            return {
                total: trips.length,
                planned: trips.filter(trip => trip.status === 'PLANNED').length,
                ongoing: trips.filter(trip => trip.status === 'ONGOING').length,
                completed: trips.filter(trip => trip.status === 'COMPLETED').length,
                cancelled: trips.filter(trip => trip.status === 'CANCELLED').length,
                active: trips.filter(trip => trip.status === 'ONGOING').length
            };
        } catch (error) {
            console.error('Error loading trips data:', error);
            return { total: 0, planned: 0, ongoing: 0, completed: 0, cancelled: 0, active: 0 };
        }
    }

    async loadRecentActivity() {
        try {
            // Get recent users (last 10) - same as user-management
            const recentUsersSnapshot = await firebaseServices.usersCollection
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            // Get recent trips (last 10)
            const recentTripsSnapshot = await firebaseServices.tripsCollection
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            const recentUsers = [];
            recentUsersSnapshot.forEach(doc => {
                const userData = doc.data();
                recentUsers.push({
                    id: doc.id,
                    ...userData,
                    type: 'user_registration'
                });
            });

            const recentTrips = [];
            recentTripsSnapshot.forEach(doc => {
                const tripData = doc.data();
                recentTrips.push({
                    id: doc.id,
                    ...tripData,
                    type: 'trip_creation'
                });
            });

            // Combine and sort by date, take only the most recent 5
            const allActivity = [...recentUsers, ...recentTrips]
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return dateB - dateA;
                })
                .slice(0, 5);

            console.log('Recent activity loaded:', allActivity);
            return allActivity;
        } catch (error) {
            console.error('Error loading recent activity:', error);
            return [];
        }
    }

    updateDashboardStats(usersData, tripsData) {
        // Update user statistics
        this.updateStatCard('total-users', usersData.total);
        this.updateStatCard('teacher-count', usersData.teachers);
        this.updateStatCard('student-count', usersData.students);
        this.updateStatCard('active-trips', tripsData.active);

        // Update additional stats if elements exist
        this.updateStatCard('active-users', usersData.active);
        this.updateStatCard('pending-users', usersData.pending);
        this.updateStatCard('suspended-users', usersData.suspended);
        this.updateStatCard('total-trips', tripsData.total);
        this.updateStatCard('upcoming-trips', tripsData.planned);
        this.updateStatCard('ongoing-trips', tripsData.ongoing);
        this.updateStatCard('completed-trips', tripsData.completed);
    }

    updateTripStats(tripsData) {
        // Update trip statistics in the new dashboard layout
        const totalTripsEl = document.getElementById('total-trips');
        const plannedTripsEl = document.getElementById('planned-trips');
        const ongoingTripsEl = document.getElementById('ongoing-trips');
        const completedTripsEl = document.getElementById('completed-trips');
        
        if (totalTripsEl) totalTripsEl.textContent = tripsData.total || 0;
        if (plannedTripsEl) plannedTripsEl.textContent = tripsData.planned || 0;
        if (ongoingTripsEl) ongoingTripsEl.textContent = tripsData.ongoing || 0;
        if (completedTripsEl) completedTripsEl.textContent = tripsData.completed || 0;
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Hide loading state and show value
            const loadingElement = document.getElementById(elementId + '-loading');
            const valueElement = document.getElementById(elementId + '-value');
            
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }
            if (valueElement) {
                valueElement.classList.remove('hidden');
                valueElement.textContent = this.formatNumber(value);
            } else {
                // Fallback for direct text update
                element.textContent = this.formatNumber(value);
            }
            
            // Add animation effect
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.2s ease';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 100);
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    updateRecentActivity(activities) {
        const activityContainer = document.querySelector('.recent-activity-container');
        if (!activityContainer) return;

        activityContainer.innerHTML = '';

        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i data-feather="activity" class="w-12 h-12 mx-auto mb-3 text-gray-300"></i>
                    <p>No recent activity</p>
                </div>
            `;
            feather.replace();
            return;
        }

        activities.forEach(activity => {
            const activityElement = this.createActivityElement(activity);
            activityContainer.appendChild(activityElement);
        });

        feather.replace();
    }

    createActivityElement(activity) {
        const div = document.createElement('div');
        div.className = 'flex items-start';

        const icon = activity.type === 'user_registration' ? 'user-plus' : 'map';
        const title = activity.type === 'user_registration' 
            ? `${activity.firstName} ${activity.lastName} registered` 
            : `${activity.title} created`;
        const subtitle = activity.type === 'user_registration'
            ? `${activity.email} - ${this.formatTimeAgo(activity.createdAt)}`
            : `${activity.destination} - ${this.formatTimeAgo(activity.createdAt)}`;

        // Use proper default profile picture
        const defaultProfilePicture = 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <rect width="40" height="40" fill="#f3f4f6"/>
                <circle cx="20" cy="16" r="6" fill="#9ca3af"/>
                <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#9ca3af"/>
            </svg>
        `);

        div.innerHTML = `
            <div class="flex-shrink-0">
                <img class="h-10 w-10 rounded-full object-cover" src="${defaultProfilePicture}" alt="Activity" onerror="this.src='${defaultProfilePicture}'">
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">${title}</p>
                <p class="text-sm text-gray-500">${subtitle}</p>
            </div>
        `;

        return div;
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'Unknown time';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    updateQuickActions() {
        // Update quick action buttons with current data
        const quickActions = document.querySelectorAll('.quick-action-btn');
        
        quickActions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'register-teacher':
                window.location.href = 'register-users.html';
                break;
            case 'create-backup':
                window.location.href = 'data-backup.html';
                break;
            case 'view-trips':
                window.location.href = 'trips-enhanced.html';
                break;
            case 'system-settings':
                window.location.href = 'settings.html';
                break;
            default:
                console.log('Unknown quick action:', action);
        }
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-red-500 text-white';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    updateRecentUsersTable(usersData) {
        const tableBody = document.getElementById('recent-users-table');
        if (!tableBody) return;

        // Get the 5 most recent users
        const recentUsers = usersData.allUsers
            .sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            })
            .slice(0, 5);

        tableBody.innerHTML = '';

        if (recentUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-8 text-center text-gray-500">
                        <i data-feather="users" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            feather.replace();
            return;
        }

        recentUsers.forEach(user => {
            const row = this.createUserTableRow(user);
            tableBody.appendChild(row);
        });

        feather.replace();
    }

    createUserTableRow(user) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const roleClass = this.getUserRoleClass(user.role);
        const roleText = this.getUserRoleText(user.role);

        // Use proper default profile picture
        const defaultProfilePicture = 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <rect width="40" height="40" fill="#f3f4f6"/>
                <circle cx="20" cy="16" r="6" fill="#9ca3af"/>
                <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#9ca3af"/>
            </svg>
        `);

        // Format the join date
        const joinDate = this.formatTimeAgo(user.createdAt);

        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                        <img class="h-8 w-8 rounded-full object-cover" src="${user.profileImageUrl || defaultProfilePicture}" alt="${user.firstName || 'User'}" onerror="this.src='${defaultProfilePicture}'">
                    </div>
                    <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">${user.firstName || 'Unknown'} ${user.lastName || ''}</div>
                        <div class="text-xs text-gray-500">${user.email || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleClass}">${roleText}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                ${joinDate}
            </td>
        `;

        return row;
    }

    getUserStatusClass(role) {
        switch (role) {
            case 'admin':
            case 'teacher':
            case 'student':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'suspended':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getUserStatusText(role) {
        switch (role) {
            case 'admin':
            case 'teacher':
            case 'student':
                return 'Active';
            case 'pending':
                return 'Pending';
            case 'suspended':
                return 'Suspended';
            default:
                return 'Unknown';
        }
    }

    getUserRoleClass(role) {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'teacher':
                return 'bg-green-100 text-green-800';
            case 'student':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getUserRoleText(role) {
        return role.charAt(0).toUpperCase() + role.slice(1);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-green-500 text-white';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('total-users') || document.querySelector('.dashboard-card')) {
        window.dashboardManager = new DashboardManager();
    }
});
