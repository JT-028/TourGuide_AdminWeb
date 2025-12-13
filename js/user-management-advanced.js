// Advanced User Management for TourApp Admin Web Interface
// Enhanced CRUD operations with real-time sync

class AdvancedUserManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUsers();
        this.setupRealTimeListeners();
    }

    setupEventListeners() {
        // Add user modal
        document.getElementById('addUserBtn')?.addEventListener('click', () => this.showAddUserModal());
        
        // Edit user modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="edit-user"]')) {
                const userId = e.target.closest('[data-action="edit-user"]').dataset.userId;
                this.showEditUserModal(userId);
            }
        });

        // Delete user
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="delete-user"]')) {
                const userId = e.target.closest('[data-action="delete-user"]').dataset.userId;
                this.deleteUser(userId);
            }
        });

        // Toggle user status
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="toggle-status"]')) {
                const userId = e.target.closest('[data-action="toggle-status"]').dataset.userId;
                this.toggleUserStatus(userId);
            }
        });

        // Bulk actions
        document.getElementById('bulkActionsBtn')?.addEventListener('click', () => this.showBulkActionsModal());
        
        // Export users
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportUsers());
        
        // Import users
        document.getElementById('importBtn')?.addEventListener('click', () => this.showImportModal());
    }

    setupRealTimeListeners() {
        // Listen for real-time user changes
        firebaseServices.usersCollection.onSnapshot((snapshot) => {
            this.users = [];
            snapshot.forEach(doc => {
                this.users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            this.updateUserTable();
            this.updateStatistics();
        });
    }

    async loadUsers() {
        try {
            const snapshot = await firebaseServices.usersCollection.get();
            this.users = [];
            
            snapshot.forEach(doc => {
                const userData = doc.data();
                this.users.push({
                    id: doc.id,
                    ...userData
                });
            });
            
            this.updateUserTable();
            this.updateStatistics();
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users data');
        }
    }

    updateUserTable() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.users.forEach(user => {
            const row = this.createUserRow(user);
            tableBody.appendChild(row);
        });

        // Refresh feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    createUserRow(user) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusClass = this.getStatusClass(user.role);
        const statusText = this.getStatusText(user.role);
        const roleClass = this.getRoleClass(user.role);
        const roleText = this.getRoleText(user.role);

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="user-checkbox rounded border-gray-300" data-user-id="${user.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <img class="h-10 w-10 rounded-full" src="${user.profileImageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.firstName + ' ' + user.lastName) + '&background=0ea5e9&color=fff&size=40'}" alt="${user.firstName}">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</div>
                        <div class="text-sm text-gray-500">ID: ${user.id.substring(0, 8)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${user.email}</div>
                <div class="text-sm text-gray-500">${user.phoneNumber || 'No phone'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleClass}">${roleText}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${statusText}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${this.formatLastActivity(user.lastLogin)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex space-x-2">
                    <button class="text-sky-600 hover:text-sky-900" data-action="edit-user" data-user-id="${user.id}" title="Edit">
                        <i data-feather="edit" class="w-4 h-4"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-900" data-action="toggle-status" data-user-id="${user.id}" title="Toggle Status">
                        <i data-feather="user-check" class="w-4 h-4"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900" data-action="delete-user" data-user-id="${user.id}" title="Delete">
                        <i data-feather="user-x" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    showAddUserModal() {
        const modal = this.createUserModal('Add New User', null);
        document.body.appendChild(modal);
        this.showModal(modal);
    }

    showEditUserModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showError('User not found');
            return;
        }

        const modal = this.createUserModal('Edit User', user);
        document.body.appendChild(modal);
        this.showModal(modal);
    }

    createUserModal(title, user) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                        <button class="close-modal text-gray-400 hover:text-gray-600">
                            <i data-feather="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <form id="userForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">First Name</label>
                            <input type="text" id="firstName" value="${user?.firstName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Last Name</label>
                            <input type="text" id="lastName" value="${user?.lastName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" id="email" value="${user?.email || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input type="tel" id="phoneNumber" value="${user?.phoneNumber || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Role</label>
                            <select id="role" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                                <option value="student" ${user?.role === 'student' ? 'selected' : ''}>Student</option>
                                <option value="teacher" ${user?.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                                <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        
                        ${!user ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" id="password" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        ` : ''}
                        
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" class="close-modal px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Cancel
                            </button>
                            <button type="submit" class="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">
                                ${user ? 'Update' : 'Create'} User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.hideModal(modal));
        modal.querySelector('#userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSubmit(user?.id);
            this.hideModal(modal);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
            }
        });

        return modal;
    }

    async handleUserSubmit(userId) {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            role: document.getElementById('role').value
        };

        try {
            if (userId) {
                // Update existing user
                await firebaseServices.usersCollection.doc(userId).update({
                    ...formData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.showSuccess('User updated successfully!');
            } else {
                // Create new user
                const password = document.getElementById('password').value;
                
                // Create user in Firebase Auth
                const userCredential = await firebaseServices.auth.createUserWithEmailAndPassword(formData.email, password);
                
                // Create user document in Firestore
                await firebaseServices.usersCollection.doc(userCredential.user.uid).set({
                    ...formData,
                    uid: userCredential.user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: null,
                    profileImageUrl: null
                });

                this.showSuccess('User created successfully!');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError(`Failed to save user: ${error.message}`);
        }
    }

    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showError('User not found');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete user from Firestore
            await firebaseServices.usersCollection.doc(userId).delete();
            
            // Note: In a real implementation, you might also want to delete the user from Firebase Auth
            // This requires admin SDK which is not available in client-side code
            
            this.showSuccess('User deleted successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError(`Failed to delete user: ${error.message}`);
        }
    }

    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showError('User not found');
            return;
        }

        const newStatus = user.role === 'suspended' ? 'student' : 'suspended';
        const action = newStatus === 'suspended' ? 'suspend' : 'activate';

        if (!confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`)) {
            return;
        }

        try {
            await firebaseServices.usersCollection.doc(userId).update({
                role: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showSuccess(`User ${action}ed successfully!`);
        } catch (error) {
            console.error('Error updating user status:', error);
            this.showError(`Failed to ${action} user: ${error.message}`);
        }
    }

    showBulkActionsModal() {
        const selectedUsers = document.querySelectorAll('.user-checkbox:checked');
        if (selectedUsers.length === 0) {
            this.showWarning('Please select users first');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Bulk Actions</h3>
                    <p class="text-sm text-gray-600 mb-4">${selectedUsers.length} users selected</p>
                    
                    <div class="space-y-3">
                        <button class="w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100" onclick="advancedUserManager.bulkAction('activate')">
                            <i data-feather="user-check" class="w-4 h-4 inline mr-2"></i>
                            Activate Selected Users
                        </button>
                        <button class="w-full text-left px-4 py-2 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100" onclick="advancedUserManager.bulkAction('suspend')">
                            <i data-feather="user-x" class="w-4 h-4 inline mr-2"></i>
                            Suspend Selected Users
                        </button>
                        <button class="w-full text-left px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100" onclick="advancedUserManager.bulkAction('delete')">
                            <i data-feather="trash-2" class="w-4 h-4 inline mr-2"></i>
                            Delete Selected Users
                        </button>
                    </div>
                    
                    <div class="flex justify-end pt-4">
                        <button class="close-modal px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('.close-modal').addEventListener('click', () => this.hideModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
            }
        });

        document.body.appendChild(modal);
        this.showModal(modal);
    }

    async bulkAction(action) {
        const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
            .map(checkbox => checkbox.dataset.userId);

        if (selectedUsers.length === 0) {
            this.showWarning('No users selected');
            return;
        }

        const actionText = action === 'activate' ? 'activate' : action === 'suspend' ? 'suspend' : 'delete';
        
        if (!confirm(`Are you sure you want to ${actionText} ${selectedUsers.length} users?`)) {
            return;
        }

        try {
            const batch = firebaseServices.db.batch();
            
            for (const userId of selectedUsers) {
                const userRef = firebaseServices.usersCollection.doc(userId);
                
                if (action === 'delete') {
                    batch.delete(userRef);
                } else {
                    const newRole = action === 'activate' ? 'student' : 'suspended';
                    batch.update(userRef, {
                        role: newRole,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            await batch.commit();
            this.showSuccess(`${selectedUsers.length} users ${actionText}ed successfully!`);
            
            // Clear selections
            document.querySelectorAll('.user-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            
        } catch (error) {
            console.error('Error performing bulk action:', error);
            this.showError(`Failed to ${actionText} users: ${error.message}`);
        }
    }

    exportUsers() {
        try {
            const csvContent = this.generateCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Users exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export users');
        }
    }

    generateCSV() {
        const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', 'Created At'];
        const rows = this.users.map(user => [
            `"${user.firstName} ${user.lastName}"`,
            `"${user.email || ''}"`,
            `"${user.phoneNumber || ''}"`,
            `"${user.role}"`,
            `"${user.role === 'suspended' ? 'Suspended' : 'Active'}"`,
            `"${user.lastLogin ? this.formatLastActivity(user.lastLogin) : 'Never'}"`,
            `"${user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'Unknown'}"`
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    showImportModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Import Users</h3>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                        <input type="file" id="importFile" accept=".csv" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100">
                    </div>
                    
                    <div class="text-sm text-gray-600 mb-4">
                        <p>CSV format should include: firstName, lastName, email, phoneNumber, role</p>
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button class="close-modal px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Cancel
                        </button>
                        <button id="importBtn" class="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700" disabled>
                            Import Users
                        </button>
                    </div>
                </div>
            </div>
        `;

        const fileInput = modal.querySelector('#importFile');
        const importBtn = modal.querySelector('#importBtn');

        fileInput.addEventListener('change', (e) => {
            importBtn.disabled = !e.target.files[0];
        });

        importBtn.addEventListener('click', () => {
            this.importUsers(fileInput.files[0]);
            this.hideModal(modal);
        });

        modal.querySelector('.close-modal').addEventListener('click', () => this.hideModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
            }
        });

        document.body.appendChild(modal);
        this.showModal(modal);
    }

    async importUsers(file) {
        if (!file) {
            this.showError('Please select a file');
            return;
        }

        try {
            const text = await file.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            const users = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                    const user = {};
                    headers.forEach((header, index) => {
                        user[header] = values[index] || '';
                    });
                    users.push(user);
                }
            }

            // Import users
            let successCount = 0;
            let errorCount = 0;

            for (const userData of users) {
                try {
                    // Generate a temporary password
                    const tempPassword = Math.random().toString(36).slice(-8);
                    
                    // Create user in Firebase Auth
                    const userCredential = await firebaseServices.auth.createUserWithEmailAndPassword(userData.email, tempPassword);
                    
                    // Create user document in Firestore
                    await firebaseServices.usersCollection.doc(userCredential.user.uid).set({
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                        phoneNumber: userData.phoneNumber || '',
                        role: userData.role || 'student',
                        uid: userCredential.user.uid,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: null,
                        profileImageUrl: null
                    });

                    successCount++;
                } catch (error) {
                    console.error('Error importing user:', userData.email, error);
                    errorCount++;
                }
            }

            this.showSuccess(`Import completed: ${successCount} users imported, ${errorCount} errors`);
        } catch (error) {
            console.error('Import error:', error);
            this.showError('Failed to import users');
        }
    }

    updateStatistics() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.role !== 'suspended' && user.role !== 'pending').length;
        const pendingUsers = this.users.filter(user => user.role === 'pending').length;
        const suspendedUsers = this.users.filter(user => user.role === 'suspended').length;

        const totalElement = document.getElementById('total-users');
        const activeElement = document.getElementById('active-users');
        const pendingElement = document.getElementById('pending-users');
        const suspendedElement = document.getElementById('suspended-users');

        if (totalElement) totalElement.textContent = totalUsers;
        if (activeElement) activeElement.textContent = activeUsers;
        if (pendingElement) pendingElement.textContent = pendingUsers;
        if (suspendedElement) suspendedElement.textContent = suspendedUsers;
    }

    // Utility methods
    getStatusClass(role) {
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

    getStatusText(role) {
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

    getRoleClass(role) {
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

    getRoleText(role) {
        return role.charAt(0).toUpperCase() + role.slice(1);
    }

    formatLastActivity(lastLogin) {
        if (!lastLogin) return 'Never';
        
        const date = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    showModal(modal) {
        modal.style.display = 'block';
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    hideModal(modal) {
        modal.remove();
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'warning' ? 'bg-yellow-500 text-white' : 
            'bg-red-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize advanced user manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('usersTableBody')) {
        window.advancedUserManager = new AdvancedUserManager();
    }
});