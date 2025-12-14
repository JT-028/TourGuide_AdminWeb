// Dashboard Mobile Navigation and Search/Notification System
// This file contains all the mobile navigation and search functionality for the dashboard

// Mobile Navigation
class MobileNavigation {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.closeSidebar = document.getElementById('closeSidebar');
        this.mobileOverlay = document.getElementById('mobileOverlay');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.handleResize();
    }
    
    setupEventListeners() {
        this.sidebarToggle?.addEventListener('click', () => this.openSidebar());
        this.closeSidebar?.addEventListener('click', () => this.closeSidebarMenu());
        this.mobileOverlay?.addEventListener('click', () => this.closeSidebarMenu());
        this.mobileMenuBtn?.addEventListener('click', () => this.toggleSidebar());
        
        window.addEventListener('resize', () => this.handleResize());
        
        // Close sidebar when clicking on nav links (mobile)
        document.querySelectorAll('.sidebar a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    this.closeSidebarMenu();
                }
            });
        });
    }
    
    openSidebar() {
        this.sidebar?.classList.add('open');
        this.mobileOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeSidebarMenu() {
        this.sidebar?.classList.remove('open');
        this.mobileOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    toggleSidebar() {
        if (this.sidebar?.classList.contains('open')) {
            this.closeSidebarMenu();
        } else {
            this.openSidebar();
        }
    }
    
    handleResize() {
        if (window.innerWidth >= 1024) {
            this.closeSidebarMenu();
        }
    }
}

// Global Search System
class GlobalSearch {
    constructor() {
        this.searchInput = document.getElementById('globalSearch');
        this.searchDropdown = document.getElementById('searchDropdown');
        this.searchResults = [];
        this.searchTimeout = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSearchData();
    }
    
    setupEventListeners() {
        this.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.searchInput?.addEventListener('focus', () => this.showDropdown());
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchInput?.contains(e.target) && !this.searchDropdown?.contains(e.target)) {
                this.hideDropdown();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDropdown();
            }
        });
    }
    
    async loadSearchData() {
        try {
            // Load searchable content from Firebase
            const usersSnapshot = await firebaseServices.usersCollection.limit(100).get();
            const tripsSnapshot = await firebaseServices.tripsCollection.limit(50).get();
            
            this.searchResults = [
                ...usersSnapshot.docs.map(doc => ({
                    type: 'user',
                    id: doc.id,
                    title: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`,
                    subtitle: doc.data().email || '',
                    icon: 'user',
                    url: 'user-management.html',
                    data: doc.data()
                })),
                ...tripsSnapshot.docs.map(doc => ({
                    type: 'trip',
                    id: doc.id,
                    title: doc.data().tripName || 'Unnamed Trip',
                    subtitle: doc.data().destination || '',
                    icon: 'map',
                    url: 'trips-enhanced.html',
                    data: doc.data()
                }))
            ];
        } catch (error) {
            console.error('Error loading search data:', error);
        }
    }
    
    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (!query.trim()) {
            this.hideDropdown();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query.trim().toLowerCase());
        }, 300);
    }
    
    performSearch(query) {
        if (!query) {
            this.hideDropdown();
            return;
        }
        
        const results = this.searchResults.filter(item => 
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query)
        ).slice(0, 8);
        
        this.renderResults(results);
        this.showDropdown();
    }
    
    renderResults(results) {
        if (results.length === 0) {
            this.searchDropdown.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <i data-feather="search" class="w-8 h-8 mx-auto mb-2"></i>
                    <p>No results found</p>
                </div>
            `;
            return;
        }
        
        this.searchDropdown.innerHTML = results.map(item => `
            <div class="search-item p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" 
                 onclick="globalSearch.navigateTo('${item.url}', '${item.id}')">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i data-feather="${item.icon}" class="w-4 h-4 text-gray-600"></i>
                    </div>
                    <div class="ml-3 flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">${this.highlightMatch(item.title)}</p>
                        <p class="text-xs text-gray-500 truncate">${this.highlightMatch(item.subtitle)}</p>
                        <p class="text-xs text-gray-400 capitalize">${item.type}</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        feather.replace();
    }
    
    highlightMatch(text) {
        const query = this.searchInput.value.toLowerCase();
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    }
    
    navigateTo(url, id) {
        if (id) {
            window.location.href = `${url}?id=${id}`;
        } else {
            window.location.href = url;
        }
        this.hideDropdown();
    }
    
    showDropdown() {
        this.searchDropdown?.classList.add('show');
    }
    
    hideDropdown() {
        this.searchDropdown?.classList.remove('show');
    }
}

// Notification System
class NotificationSystem {
    constructor() {
        this.notificationBell = document.getElementById('notificationBell');
        this.notificationDropdown = document.getElementById('notificationDropdown');
        this.notificationBadge = document.getElementById('notificationBadge');
        this.notifications = [];
        this.unreadCount = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadNotifications();
        this.setupRealtimeListener();
    }
    
    setupEventListeners() {
        this.notificationBell?.addEventListener('click', () => this.toggleDropdown());
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.notificationBell?.contains(e.target) && !this.notificationDropdown?.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    async loadNotifications() {
        try {
            const snapshot = await firebaseServices.db.collection('admin_notifications')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            
            this.notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    setupRealtimeListener() {
        // Listen for new notifications
        firebaseServices.db.collection('admin_notifications')
            .where('timestamp', '>', new Date())
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = {
                            id: change.doc.id,
                            ...change.doc.data()
                        };
                        this.addNotification(notification);
                    }
                });
            });
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        if (this.notifications.length > 20) {
            this.notifications = this.notifications.slice(0, 20);
        }
        this.updateUnreadCount();
        this.renderNotifications();
        
        // Show browser notification if enabled
        if (Notification.permission === 'granted' && !notification.read) {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/web_icon/web_icon.svg'
            });
        }
    }
    
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadge();
    }
    
    updateBadge() {
        if (this.unreadCount > 0) {
            this.notificationBadge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
            this.notificationBadge.classList.remove('hidden');
        } else {
            this.notificationBadge.classList.add('hidden');
        }
    }
    
    renderNotifications() {
        if (this.notifications.length === 0) {
            this.notificationDropdown.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <i data-feather="bell-off" class="w-8 h-8 mx-auto mb-2"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }
        
        this.notificationDropdown.innerHTML = this.notifications.map(notification => `
            <div class="notification-item p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${!notification.read ? 'bg-blue-50' : ''}" 
                 onclick="notificationSystem.markAsRead('${notification.id}')">
                <div class="flex items-start">
                    <div class="flex-shrink-0 w-8 h-8 bg-${this.getNotificationColor(notification.type)}-100 rounded-full flex items-center justify-center">
                        <i data-feather="${this.getNotificationIcon(notification.type)}" class="w-4 h-4 text-${this.getNotificationColor(notification.type)}-600"></i>
                    </div>
                    <div class="ml-3 flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                        <p class="text-xs text-gray-600">${notification.message}</p>
                        <p class="text-xs text-gray-400">${this.formatTimestamp(notification.timestamp)}</p>
                    </div>
                    ${!notification.read ? '<div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>' : ''}
                </div>
            </div>
        `).join('');
        
        // Add notification footer
        this.notificationDropdown.innerHTML += `
            <div class="p-2 border-t border-gray-200">
                <button onclick="notificationSystem.markAllAsRead()" class="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1">
                    Mark all as read
                </button>
            </div>
        `;
        
        feather.replace();
    }
    
    getNotificationColor(type) {
        const colors = {
            'info': 'blue',
            'warning': 'yellow',
            'error': 'red',
            'success': 'green',
            'system': 'purple'
        };
        return colors[type] || 'gray';
    }
    
    getNotificationIcon(type) {
        const icons = {
            'info': 'info',
            'warning': 'alert-triangle',
            'error': 'alert-circle',
            'success': 'check-circle',
            'system': 'settings'
        };
        return icons[type] || 'bell';
    }
    
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
    
    async markAsRead(notificationId) {
        try {
            await firebaseServices.db.collection('admin_notifications').doc(notificationId).update({
                read: true,
                readAt: new Date()
            });
            
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.read);
            const batch = firebaseServices.db.batch();
            
            unreadNotifications.forEach(notification => {
                const ref = firebaseServices.db.collection('admin_notifications').doc(notification.id);
                batch.update(ref, {
                    read: true,
                    readAt: new Date()
                });
            });
            
            await batch.commit();
            
            this.notifications.forEach(n => n.read = true);
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }
    
    toggleDropdown() {
        if (this.notificationDropdown?.classList.contains('show')) {
            this.hideDropdown();
        } else {
            this.showDropdown();
        }
    }
    
    showDropdown() {
        this.notificationDropdown?.classList.add('show');
    }
    
    hideDropdown() {
        this.notificationDropdown?.classList.remove('show');
    }
}

// Initialize systems when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile navigation
    window.mobileNav = new MobileNavigation();
    
    // Initialize global search
    window.globalSearch = new GlobalSearch();
    
    // Initialize notification system
    window.notificationSystem = new NotificationSystem();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});