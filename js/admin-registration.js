// Admin Registration System for TourApp Admin Web Interface
// Handles admin user creation and role management

class AdminRegistrationManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAdminUsers();
    }

    setupEventListeners() {
        // Register admin button
        document.getElementById('registerAdminBtn')?.addEventListener('click', () => this.showRegisterAdminModal());
        
        // Edit admin button
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="edit-admin"]')) {
                const adminId = e.target.closest('[data-action="edit-admin"]').dataset.adminId;
                this.showEditAdminModal(adminId);
            }
        });

        // Delete admin button
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="delete-admin"]')) {
                const adminId = e.target.closest('[data-action="delete-admin"]').dataset.adminId;
                this.deleteAdmin(adminId);
            }
        });

        // Toggle admin status
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="toggle-admin-status"]')) {
                const adminId = e.target.closest('[data-action="toggle-admin-status"]').dataset.adminId;
                this.toggleAdminStatus(adminId);
            }
        });
    }

    async loadAdminUsers() {
        try {
            const snapshot = await firebaseServices.usersCollection
                .where('role', '==', 'admin')
                .get();
            
            const adminUsers = [];
            snapshot.forEach(doc => {
                adminUsers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderAdminUsers(adminUsers);
        } catch (error) {
            console.error('Error loading admin users:', error);
            this.showError('Failed to load admin users');
        }
    }

    renderAdminUsers(adminUsers) {
        const tableBody = document.getElementById('adminUsersTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (adminUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <i data-feather="users" class="w-8 h-8 mx-auto mb-2 text-gray-300"></i>
                        <p>No admin users found</p>
                    </td>
                </tr>
            `;
            feather.replace();
            return;
        }

        adminUsers.forEach(admin => {
            const row = this.createAdminRow(admin);
            tableBody.appendChild(row);
        });

        feather.replace();
    }

    createAdminRow(admin) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusClass = admin.role === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
        const statusText = admin.role === 'suspended' ? 'Suspended' : 'Active';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <img class="h-10 w-10 rounded-full" src="${admin.profileImageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(admin.firstName + ' ' + admin.lastName) + '&background=dc2626&color=fff&size=40'}" alt="${admin.firstName}">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${admin.firstName} ${admin.lastName}</div>
                        <div class="text-sm text-gray-500">ID: ${admin.id.substring(0, 8)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${admin.email}</div>
                <div class="text-sm text-gray-500">${admin.phoneNumber || 'No phone'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Admin</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${statusText}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${this.formatLastActivity(admin.lastLogin)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex space-x-2">
                    <button class="text-sky-600 hover:text-sky-900" data-action="edit-admin" data-admin-id="${admin.id}" title="Edit">
                        <i data-feather="edit" class="w-4 h-4"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-900" data-action="toggle-admin-status" data-admin-id="${admin.id}" title="Toggle Status">
                        <i data-feather="user-check" class="w-4 h-4"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900" data-action="delete-admin" data-admin-id="${admin.id}" title="Delete">
                        <i data-feather="user-x" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    showRegisterAdminModal() {
        const modal = this.createAdminModal('Register New Admin', null);
        document.body.appendChild(modal);
        this.showModal(modal);
    }

    showEditAdminModal(adminId) {
        // This would need to fetch the admin data first
        // For now, we'll show a placeholder
        this.showError('Edit admin functionality will be implemented');
    }

    createAdminModal(title, admin) {
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
                    
                    <form id="adminForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">First Name</label>
                            <input type="text" id="firstName" value="${admin?.firstName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Last Name</label>
                            <input type="text" id="lastName" value="${admin?.lastName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" id="email" value="${admin?.email || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                            <p class="mt-1 text-sm text-gray-500">Must be a @cca.edu.ph email address</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input type="tel" id="phoneNumber" value="${admin?.phoneNumber || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                        </div>
                        
                        ${!admin ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" id="password" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                            <p class="mt-1 text-sm text-gray-500">Minimum 8 characters</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input type="password" id="confirmPassword" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                        </div>
                        ` : ''}
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Admin Level</label>
                            <select id="adminLevel" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required>
                                <option value="super_admin" ${admin?.adminLevel === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                                <option value="admin" ${admin?.adminLevel === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="moderator" ${admin?.adminLevel === 'moderator' ? 'selected' : ''}>Moderator</option>
                            </select>
                        </div>
                        
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" class="close-modal px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                Cancel
                            </button>
                            <button type="submit" class="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">
                                ${admin ? 'Update' : 'Register'} Admin
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.hideModal(modal));
        modal.querySelector('#adminForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminSubmit(admin?.id);
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

    async handleAdminSubmit(adminId) {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            adminLevel: document.getElementById('adminLevel').value
        };

        // Validate email domain
        if (!formData.email.endsWith('@cca.edu.ph')) {
            this.showError('Only @cca.edu.ph email addresses are allowed for admin accounts');
            return;
        }

        try {
            if (adminId) {
                // Update existing admin
                await firebaseServices.usersCollection.doc(adminId).update({
                    ...formData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.showSuccess('Admin updated successfully!');
            } else {
                // Create new admin
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                // Validate passwords
                if (password !== confirmPassword) {
                    this.showError('Passwords do not match');
                    return;
                }

                if (password.length < 8) {
                    this.showError('Password must be at least 8 characters long');
                    return;
                }

                // Create user in Firebase Auth
                const userCredential = await firebaseServices.auth.createUserWithEmailAndPassword(formData.email, password);
                
                // Create admin document in Firestore
                await firebaseServices.usersCollection.doc(userCredential.user.uid).set({
                    ...formData,
                    uid: userCredential.user.uid,
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: null,
                    profileImageUrl: null,
                    permissions: this.getAdminPermissions(formData.adminLevel)
                });

                this.showSuccess('Admin registered successfully!');
            }

            // Reload admin users
            this.loadAdminUsers();

        } catch (error) {
            console.error('Error saving admin:', error);
            this.showError(`Failed to save admin: ${error.message}`);
        }
    }

    getAdminPermissions(adminLevel) {
        switch (adminLevel) {
            case 'super_admin':
                return {
                    userManagement: true,
                    tripManagement: true,
                    systemSettings: true,
                    dataBackup: true,
                    adminManagement: true,
                    analytics: true
                };
            case 'admin':
                return {
                    userManagement: true,
                    tripManagement: true,
                    systemSettings: false,
                    dataBackup: true,
                    adminManagement: false,
                    analytics: true
                };
            case 'moderator':
                return {
                    userManagement: true,
                    tripManagement: true,
                    systemSettings: false,
                    dataBackup: false,
                    adminManagement: false,
                    analytics: false
                };
            default:
                return {
                    userManagement: false,
                    tripManagement: false,
                    systemSettings: false,
                    dataBackup: false,
                    adminManagement: false,
                    analytics: false
                };
        }
    }

    async deleteAdmin(adminId) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            this.showError('Admin not found');
            return;
        }

        if (!confirm(`Are you sure you want to delete admin ${admin.firstName} ${admin.lastName}? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete admin from Firestore
            await firebaseServices.usersCollection.doc(adminId).delete();
            
            this.showSuccess('Admin deleted successfully!');
            this.loadAdminUsers();

        } catch (error) {
            console.error('Error deleting admin:', error);
            this.showError(`Failed to delete admin: ${error.message}`);
        }
    }

    async toggleAdminStatus(adminId) {
        const admin = await this.getAdminById(adminId);
        if (!admin) {
            this.showError('Admin not found');
            return;
        }

        const newStatus = admin.role === 'suspended' ? 'admin' : 'suspended';
        const action = newStatus === 'suspended' ? 'suspend' : 'activate';

        if (!confirm(`Are you sure you want to ${action} admin ${admin.firstName} ${admin.lastName}?`)) {
            return;
        }

        try {
            await firebaseServices.usersCollection.doc(adminId).update({
                role: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showSuccess(`Admin ${action}ed successfully!`);
            this.loadAdminUsers();

        } catch (error) {
            console.error('Error updating admin status:', error);
            this.showError(`Failed to ${action} admin: ${error.message}`);
        }
    }

    async getAdminById(adminId) {
        try {
            const doc = await firebaseServices.usersCollection.doc(adminId).get();
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting admin:', error);
            return null;
        }
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

// Initialize admin registration manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminUsersTableBody')) {
        window.adminRegistrationManager = new AdminRegistrationManager();
    }
});
