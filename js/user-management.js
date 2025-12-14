// User Management for TourApp Admin Web Interface
// Implements DataTables Bootstrap 5 styling with Firebase integration

let usersDataTable;
let allUsers = [];

// Initialize when DOM is ready
$(document).ready(function() {
    initializeDataTable();
    loadUsersData();
    setupEventListeners();
    feather.replace();
});

// Initialize DataTable with Bootstrap 5 styling
function initializeDataTable() {
    usersDataTable = $('#userManagementTable').DataTable({
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']],
        responsive: true,
        order: [[1, 'asc']],
        columnDefs: [
            { orderable: false, targets: [0, 6] }, // Disable sorting on checkbox and actions columns
            { searchable: false, targets: [0, 6] } // Disable search on checkbox and actions columns
        ],
        language: {
            emptyTable: "No users found",
            zeroRecords: "No matching users found",
            loadingRecords: "Loading users...",
            processing: "Processing..."
        },
        // Bootstrap 5 styling configuration
        dom: '<"row"<"col-sm-12 col-md-6"l>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function() {
            feather.replace();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Filter events
    $('#filterRole, #filterStatus').on('change', function() {
        applyFilters();
    });

    // Search event
    $('#searchInput').on('keyup', function() {
        usersDataTable.search(this.value).draw();
    });

    // Select all checkbox
    $('#selectAll').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('.user-checkbox').prop('checked', isChecked);
    });

    // Action buttons
    $('#exportBtn').on('click', function() {
        exportUsers();
    });

    $('#addUserBtn').on('click', function() {
        showAddUserModal();
    });

    $('#bulkActionsBtn').on('click', function() {
        showBulkActionsModal();
    });
}

// Load users data from Firebase
async function loadUsersData() {
    try {
        console.log('Loading users from Firebase...');
        
        // Check if Firebase is available
        if (typeof firebaseServices === 'undefined') {
            throw new Error('Firebase services not available');
        }

        const snapshot = await firebaseServices.usersCollection.get();
        allUsers = [];
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            allUsers.push({
                id: doc.id,
                ...userData
            });
        });

        console.log(`Loaded ${allUsers.length} users from Firebase`);
        
        updateStatistics();
        populateDataTable();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users data. Please check your connection.');
    }
}

// Update statistics cards
function updateStatistics() {
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(user => user.role !== 'suspended' && user.role !== 'pending').length;
    const pendingUsers = allUsers.filter(user => user.role === 'pending').length;
    const suspendedUsers = allUsers.filter(user => user.role === 'suspended').length;

    $('#total-users').text(totalUsers);
    $('#active-users').text(activeUsers);
    $('#pending-users').text(pendingUsers);
    $('#suspended-users').text(suspendedUsers);
}

// Populate DataTable with user data
function populateDataTable() {
    usersDataTable.clear();
    
    allUsers.forEach(user => {
        const row = createUserRow(user);
        usersDataTable.row.add(row);
    });
    
    usersDataTable.draw();
}

// Create user row for DataTable
function createUserRow(user) {
    return [
        `<div class="flex justify-center">
            <input type="checkbox" class="rounded border-gray-300 text-sky-600 focus:ring-sky-500 user-checkbox" data-user-id="${user.id}">
        </div>`,
        createUserProfileCell(user),
        createContactInfoCell(user),
        createRoleCell(user),
        getStatusBadge(user.role),
        formatLastActivity(user.lastLogin),
        createActionsCell(user)
    ];
}

// Create user profile cell
function createUserProfileCell(user) {
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    const avatarUrl = user.profileImageUrl || `https://ui-avatars.com/api/?name=${initials}&background=0ea5e9&color=fff&size=40`;
    
    return `
        <div class="flex items-center py-2">
            <div class="flex-shrink-0 h-12 w-12">
                <img class="h-12 w-12 rounded-full object-cover border-2 border-gray-200" src="${avatarUrl}" alt="${user.firstName} ${user.lastName}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNmM2Y0ZjYiLz4KPHBhdGggZD0iTTI0IDI0QzI3LjMxMzcgMjQgMzAgMjEuMzEzNyAzMCAxOEMzMCAxNC42ODYzIDI3LjMxMzcgMTIgMjQgMTJDMjAuNjg2MyAxMiAxOCAxNC42ODYzIDE4IDE4QzE4IDIxLjMxMzcgMjAuNjg2MyAyNCAyNCAyNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPHBhdGggZD0iTTI0IDI2QzE5LjU4MTcgMjYgMTYgMjkuNTgxNyAxNiAzNFYzNkgzMlYzNEMzMiAyOS41ODE3IDI4LjQxODMgMjYgMjQgMjZaIiBmaWxsPSIjOWNhM2FmIi8+Cjwvc3ZnPgo='">
            </div>
            <div class="ml-4 min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-900 truncate">${user.firstName || 'N/A'} ${user.lastName || 'N/A'}</div>
                <div class="text-xs text-gray-500 truncate">ID: ${user.id.substring(0, 8)}...</div>
            </div>
        </div>
    `;
}

// Create contact info cell
function createContactInfoCell(user) {
    return `
        <div class="py-2">
            <div class="text-sm font-medium text-gray-900 truncate">${user.email || 'No email'}</div>
            <div class="text-xs text-gray-500 truncate">${user.phoneNumber || 'No phone'}</div>
        </div>
    `;
}

// Create role cell
function createRoleCell(user) {
    const roleBadge = getRoleBadge(user.role);
    const department = getDepartment(user.role);
    
    return `
        <div class="py-2">
            ${roleBadge}
            <div class="text-xs text-gray-500 mt-1 truncate">${department}</div>
        </div>
    `;
}

// Create actions cell
function createActionsCell(user) {
    return `
        <div class="py-2">
            <div class="flex items-center space-x-1">
                <button class="action-btn p-1.5 text-sky-600 hover:text-sky-900 hover:bg-sky-50 rounded-md transition-all duration-200" onclick="editUser('${user.id}')" title="Edit User">
                    <i data-feather="edit" class="w-4 h-4"></i>
                </button>
                <button class="action-btn p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md transition-all duration-200" onclick="toggleUserStatus('${user.id}')" title="Toggle Status">
                    <i data-feather="user-check" class="w-4 h-4"></i>
                </button>
                <button class="action-btn p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-all duration-200" onclick="deleteUser('${user.id}')" title="Delete User">
                    <i data-feather="user-x" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

// Get status badge
function getStatusBadge(role) {
    const statusHtml = (() => {
        switch (role) {
            case 'admin':
            case 'teacher':
            case 'student':
                return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">Active</span>';
            case 'pending':
                return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>';
            case 'suspended':
                return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>';
            default:
                return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>';
        }
    })();
    
    return `<div class="py-2">${statusHtml}</div>`;
}

// Get role badge
function getRoleBadge(role) {
    switch (role) {
        case 'admin':
            return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-800">Admin</span>';
        case 'teacher':
            return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800">Teacher</span>';
        case 'student':
            return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-purple-100 text-purple-800">Student</span>';
        default:
            return '<span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>';
    }
}

// Get department based on role
function getDepartment(role) {
    switch (role) {
        case 'admin':
            return 'Administration';
        case 'teacher':
            return 'Faculty';
        case 'student':
            return 'Student Body';
        default:
            return 'N/A';
    }
}

// Format last activity
function formatLastActivity(lastLogin) {
    if (!lastLogin) return '<div class="py-2"><span class="text-xs text-gray-500">Never</span></div>';
    
    const date = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timeText;
    if (diffMinutes < 1) timeText = 'Just now';
    else if (diffMinutes < 60) timeText = `${diffMinutes}m ago`;
    else if (diffHours < 24) timeText = `${diffHours}h ago`;
    else if (diffDays < 7) timeText = `${diffDays}d ago`;
    else timeText = date.toLocaleDateString();
    
    return `<div class="py-2"><span class="text-xs text-gray-600">${timeText}</span></div>`;
}

// Apply filters
function applyFilters() {
    const roleFilter = $('#filterRole').val();
    const statusFilter = $('#filterStatus').val();
    
    usersDataTable.column(3).search(roleFilter); // Role column
    usersDataTable.column(4).search(statusFilter); // Status column
    usersDataTable.draw();
}

// Show error message
function showError(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            showCancelButton: true,
            cancelButtonText: 'Close',
            confirmButtonText: 'Retry',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                loadUsersData();
            }
        });
    } else {
        $('#usersTableBody').html(`
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-center justify-center">
                            <i data-feather="alert-triangle" class="w-6 h-6 text-red-500 mr-2"></i>
                            <span class="text-red-700">${message}</span>
                        </div>
                        <button onclick="loadUsersData()" class="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition">
                            <i data-feather="refresh-cw" class="w-4 h-4 mr-1 inline"></i>
                            Retry
                        </button>
                    </div>
                </td>
            </tr>
        `);
        feather.replace();
    }
}

// Export users to CSV
function exportUsers() {
    try {
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Users exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export users');
    }
}

// Generate CSV content
function generateCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', 'Created At'];
    const rows = allUsers.map(user => [
        `"${user.firstName} ${user.lastName}"`,
        `"${user.email || ''}"`,
        `"${user.phoneNumber || ''}"`,
        `"${user.role}"`,
        `"${user.role === 'suspended' ? 'Suspended' : 'Active'}"`,
        `"${user.lastLogin ? formatLastActivity(user.lastLogin) : 'Never'}"`,
        `"${user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'Unknown'}"`
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Show add user modal
function showAddUserModal() {
    // Redirect to register users page
    window.location.href = 'register-users.html';
}

// Show bulk actions modal
function showBulkActionsModal() {
    const selectedUsers = $('.user-checkbox:checked').length;
    if (selectedUsers === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'No Users Selected',
                text: 'Please select users first to perform bulk actions.',
                icon: 'warning',
                confirmButtonColor: '#f59e0b'
            });
        } else {
            showWarning('Please select users first');
        }
        return;
    }
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Bulk Actions',
            text: `What would you like to do with ${selectedUsers} selected users?`,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            showCloseButton: true,
            confirmButtonText: 'Activate All',
            denyButtonText: 'Suspend All',
            cancelButtonText: 'Delete All',
            closeButtonText: 'Cancel',
            confirmButtonColor: '#10b981',
            denyButtonColor: '#f59e0b',
            cancelButtonColor: '#ef4444',
            closeButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                bulkActivateUsers();
            } else if (result.isDenied) {
                bulkSuspendUsers();
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                bulkDeleteUsers();
            }
        });
    }
}

// Edit user
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'User Not Found',
                text: 'The selected user could not be found.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        } else {
            showError('User not found');
        }
        return;
    }
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Edit User',
            html: `
                <div class="text-left">
                    <p class="mb-4">Edit user: <strong>${user.firstName} ${user.lastName}</strong></p>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select id="editUserRole" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500">
                                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                                <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="editUserStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500">
                                <option value="active" ${user.role !== 'suspended' ? 'selected' : ''}>Active</option>
                                <option value="suspended" ${user.role === 'suspended' ? 'selected' : ''}>Suspended</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            preConfirm: () => {
                const newRole = document.getElementById('editUserRole').value;
                const newStatus = document.getElementById('editUserStatus').value;
                const finalRole = newStatus === 'suspended' ? 'suspended' : newRole;
                
                return { role: finalRole };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                updateUserRole(userId, result.value.role);
            }
        });
    }
}

// Toggle user status
async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'User Not Found',
                text: 'The selected user could not be found.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        } else {
            showError('User not found');
        }
        return;
    }

    const newStatus = user.role === 'suspended' ? 'student' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';

    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
            text: `Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'suspended' ? '#ef4444' : '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                // Show loading
                Swal.fire({
                    title: 'Processing...',
                    text: `${action.charAt(0).toUpperCase() + action.slice(1)}ing user`,
                    icon: 'info',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                await firebaseServices.usersCollection.doc(userId).update({
                    role: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                Swal.fire({
                    title: 'Success!',
                    text: `User ${action}ed successfully!`,
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    timer: 2000,
                    timerProgressBar: true
                });

                loadUsersData(); // Refresh data
            } catch (error) {
                console.error('Error updating user status:', error);
                Swal.fire({
                    title: 'Error',
                    text: `Failed to ${action} user`,
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    } else {
        if (confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`)) {
            try {
                await firebaseServices.usersCollection.doc(userId).update({
                    role: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showSuccess(`User ${action}ed successfully!`);
                loadUsersData(); // Refresh data
            } catch (error) {
                console.error('Error updating user status:', error);
                showError(`Failed to ${action} user`);
            }
        }
    }
}

// Delete user
async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'User Not Found',
                text: 'The selected user could not be found.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        } else {
            showError('User not found');
        }
        return;
    }

    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Delete User',
            text: `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                // Show loading
                Swal.fire({
                    title: 'Deleting...',
                    text: 'Removing user from database',
                    icon: 'info',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Remove user from local array immediately to prevent UI flicker
                allUsers = allUsers.filter(u => u.id !== userId);
                updateStatistics();
                populateDataTable();

                // Call Cloud Function to delete user from both Auth and Firestore
                const idToken = await firebase.auth().currentUser.getIdToken();
                const response = await fetch('https://us-central1-tourapp-69eaf.cloudfunctions.net/deleteUserHttp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ userId: userId })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'User deletion failed');
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error('User deletion failed - Cloud Function returned error');
                }
                
                Swal.fire({
                    title: 'Deleted!',
                    text: 'User has been deleted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    timer: 2000,
                    timerProgressBar: true
                });

                // Reload data to ensure consistency
                setTimeout(() => {
                    loadUsersData();
                }, 1000);
                
            } catch (error) {
                console.error('Error deleting user:', error);
                
                // Restore user in local array if deletion failed
                allUsers.push(user);
                updateStatistics();
                populateDataTable();
                
                Swal.fire({
                    title: 'Error',
                    text: `Failed to delete user: ${error.message}`,
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    } else {
        if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
            try {
                // Remove user from local array immediately
                allUsers = allUsers.filter(u => u.id !== userId);
                updateStatistics();
                populateDataTable();

                // Call Cloud Function to delete user from both Auth and Firestore
                const idToken = await firebase.auth().currentUser.getIdToken();
                const response = await fetch('https://us-central1-tourapp-69eaf.cloudfunctions.net/deleteUserHttp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ userId: userId })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'User deletion failed');
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error('User deletion failed - Cloud Function returned error');
                }
                
                showSuccess('User deleted successfully!');
                
                // Reload data to ensure consistency
                setTimeout(() => {
                    loadUsersData();
                }, 1000);
                
            } catch (error) {
                console.error('Error deleting user:', error);
                
                // Restore user in local array if deletion failed
                allUsers.push(user);
                updateStatistics();
                populateDataTable();
                
                showError(`Failed to delete user: ${error.message}`);
            }
        }
    }
}

// Update user role
async function updateUserRole(userId, newRole) {
    try {
        // Show loading
        Swal.fire({
            title: 'Updating...',
            text: 'Saving user changes',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        await firebaseServices.usersCollection.doc(userId).update({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire({
            title: 'Updated!',
            text: 'User role has been updated successfully.',
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 2000,
            timerProgressBar: true
        });

        loadUsersData(); // Refresh data
    } catch (error) {
        console.error('Error updating user role:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to update user role',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    }
}

// Bulk activate users
async function bulkActivateUsers() {
    const selectedUserIds = $('.user-checkbox:checked').map(function() {
        return $(this).data('user-id');
    }).get();

    try {
        // Show loading
        Swal.fire({
            title: 'Activating Users...',
            text: `Activating ${selectedUserIds.length} users`,
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const batch = firebaseServices.db.batch();
        selectedUserIds.forEach(userId => {
            const userRef = firebaseServices.usersCollection.doc(userId);
            batch.update(userRef, {
                role: 'student', // Default to student role when activating
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        Swal.fire({
            title: 'Success!',
            text: `${selectedUserIds.length} users have been activated successfully.`,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
        });

        loadUsersData(); // Refresh data
    } catch (error) {
        console.error('Error bulk activating users:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to activate users',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    }
}

// Bulk suspend users
async function bulkSuspendUsers() {
    const selectedUserIds = $('.user-checkbox:checked').map(function() {
        return $(this).data('user-id');
    }).get();

    try {
        // Show loading
        Swal.fire({
            title: 'Suspending Users...',
            text: `Suspending ${selectedUserIds.length} users`,
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const batch = firebaseServices.db.batch();
        selectedUserIds.forEach(userId => {
            const userRef = firebaseServices.usersCollection.doc(userId);
            batch.update(userRef, {
                role: 'suspended',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        Swal.fire({
            title: 'Success!',
            text: `${selectedUserIds.length} users have been suspended successfully.`,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
        });

        loadUsersData(); // Refresh data
    } catch (error) {
        console.error('Error bulk suspending users:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to suspend users',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    }
}

// Bulk delete users
async function bulkDeleteUsers() {
    const selectedUserIds = $('.user-checkbox:checked').map(function() {
        return $(this).data('user-id');
    }).get();

    if (selectedUserIds.length === 0) {
        Swal.fire({
            title: 'No Users Selected',
            text: 'Please select users to delete.',
            icon: 'warning',
            confirmButtonColor: '#ef4444'
        });
        return;
    }

    const result = await Swal.fire({
        title: 'Delete Multiple Users?',
        text: `Are you sure you want to delete ${selectedUserIds.length} users? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Delete All',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        try {
            // Show loading
            Swal.fire({
                title: 'Deleting...',
                text: `Removing ${selectedUserIds.length} users from database`,
                icon: 'info',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Remove users from local array immediately
            allUsers = allUsers.filter(user => !selectedUserIds.includes(user.id));
            updateStatistics();
            populateDataTable();

            // Delete users using Cloud Function (one by one for better error handling)
            const idToken = await firebase.auth().currentUser.getIdToken();
            const deletePromises = selectedUserIds.map(async userId => {
                const response = await fetch('https://us-central1-tourapp-69eaf.cloudfunctions.net/deleteUserHttp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ userId: userId })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'User deletion failed');
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error('User deletion failed - Cloud Function returned error');
                }

                return { data: { success: true } };
            });

            const results = await Promise.allSettled(deletePromises);
            
            // Check for failed deletions
            const failedDeletions = results.filter(result => 
                result.status === 'rejected' || 
                (result.status === 'fulfilled' && !result.value.data.success)
            );
            
            if (failedDeletions.length > 0) {
                throw new Error(`${failedDeletions.length} users failed to delete`);
            }

            Swal.fire({
                title: 'Deleted!',
                text: `${selectedUserIds.length} users have been deleted successfully.`,
                icon: 'success',
                confirmButtonColor: '#10b981',
                timer: 3000,
                timerProgressBar: true
            });

            // Reload data to ensure consistency
            setTimeout(() => {
                loadUsersData();
            }, 1000);

        } catch (error) {
            console.error('Error bulk deleting users:', error);
            
            // Restore users in local array if deletion failed
            loadUsersData();
            
            Swal.fire({
                title: 'Error',
                text: `Failed to delete users: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    }
}

// Bulk import users
function showBulkImportModal() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Bulk Import Users',
            html: `
                <div class="text-left">
                    <p class="mb-4">Upload a CSV file to import multiple users at once.</p>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
                            <input type="file" id="csvFile" accept=".csv" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500">
                        </div>
                        <div class="text-sm text-gray-500">
                            <p><strong>CSV Format:</strong></p>
                            <p>firstName,lastName,email,phone,role</p>
                            <p class="mt-1">Example: John,Doe,john.doe@cca.edu.ph,+1234567890,student</p>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Import Users',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            preConfirm: () => {
                const fileInput = document.getElementById('csvFile');
                const file = fileInput.files[0];
                
                if (!file) {
                    Swal.showValidationMessage('Please select a CSV file');
                    return false;
                }
                
                return { file: file };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                processBulkImport(result.value.file);
            }
        });
    }
}

// Process bulk import
async function processBulkImport(file) {
    try {
        // Show loading
        Swal.fire({
            title: 'Processing Import...',
            text: 'Reading and validating CSV file',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate headers
        const requiredHeaders = ['firstName', 'lastName', 'email', 'role'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            Swal.fire({
                title: 'Invalid CSV Format',
                text: `Missing required columns: ${missingHeaders.join(', ')}`,
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        const users = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 4) {
                users.push({
                    firstName: values[0],
                    lastName: values[1],
                    email: values[2],
                    phone: values[3] || '',
                    role: values[4] || 'student'
                });
            }
        }

        if (users.length === 0) {
            Swal.fire({
                title: 'No Valid Users',
                text: 'No valid user data found in the CSV file.',
                icon: 'warning',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        // Confirm import
        const confirmResult = await Swal.fire({
            title: 'Confirm Import',
            text: `Import ${users.length} users from CSV file?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Import',
            cancelButtonText: 'Cancel'
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        // Show progress
        Swal.fire({
            title: 'Importing Users...',
            text: `Importing ${users.length} users`,
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Import users to Firebase
        const batch = firebaseServices.db.batch();
        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                const userRef = firebaseServices.usersCollection.doc();
                batch.set(userRef, {
                    ...user,
                    uid: userRef.id,
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                successCount++;
            } catch (error) {
                console.error('Error preparing user for import:', error);
                errorCount++;
            }
        }

        await batch.commit();

        Swal.fire({
            title: 'Import Complete!',
            text: `Successfully imported ${successCount} users. ${errorCount > 0 ? `${errorCount} users failed to import.` : ''}`,
            icon: successCount > 0 ? 'success' : 'error',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
        });

        loadUsersData(); // Refresh data
    } catch (error) {
        console.error('Error processing bulk import:', error);
        Swal.fire({
            title: 'Import Failed',
            text: 'Failed to process the CSV file. Please check the format and try again.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    }
}

// Notification methods
function showSuccess(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Success!',
            text: message,
            icon: 'success',
            confirmButtonColor: '#10b981',
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        showNotification(message, 'success');
    }
}

function showWarning(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Warning',
            text: message,
            icon: 'warning',
            confirmButtonColor: '#f59e0b'
        });
    } else {
        showNotification(message, 'warning');
    }
}

function showNotification(message, type) {
    const alertClass = type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
                      type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 
                      'bg-red-50 border-red-200 text-red-700';
    
    const iconClass = type === 'success' ? 'check-circle' : 
                     type === 'warning' ? 'alert-triangle' : 
                     'alert-triangle';
    
    const notification = $(`
        <div class="fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i data-feather="${iconClass}" class="h-6 w-6 text-${type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'red'}-400"></i>
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p class="text-sm font-medium text-gray-900">${message}</p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onclick="$(this).closest('.fixed').remove()">
                            <i data-feather="x" class="h-5 w-5"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    $('body').append(notification);
    feather.replace();
    
    setTimeout(() => {
        notification.fadeOut(500, function() {
            $(this).remove();
        });
    }, 5000);
}
