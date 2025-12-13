# TourApp Admin Web Interface

This is the web-based admin interface for the TourApp field trip management system. It connects to the same Firebase database as the Android app, providing administrators with comprehensive management capabilities.

## Features

### 🔐 Authentication
- Firebase Authentication integration
- Domain-restricted access (@cca.edu.ph emails only)
- Role-based access control (Admin privileges required)
- Secure session management

### 👥 User Management
- View all registered users (teachers, students, admins)
- Create new user accounts
- Edit user information
- Suspend/activate user accounts
- Bulk user registration via CSV upload
- Real-time user statistics

### 🗺️ Trip Management
- View all field trips and excursions
- Create new trips
- Edit trip details
- Cancel ongoing trips
- Monitor trip status and participants
- Trip analytics and reporting

### 💾 Data Backup & Restore
- Create full or selective backups
- Export data in JSON or CSV format
- Restore data from backup files
- Backup history and management
- Automated backup scheduling

### ⚙️ System Settings
- School information management
- Security settings configuration
- Notification preferences
- Password requirements
- Session management

## Technical Architecture

### Frontend
- **HTML5/CSS3**: Modern responsive design
- **Tailwind CSS**: Utility-first CSS framework
- **JavaScript (ES6+)**: Modern JavaScript with async/await
- **DataTables**: Advanced table functionality
- **Feather Icons**: Beautiful icon set

### Backend Integration
- **Firebase Authentication**: User authentication and authorization
- **Firebase Firestore**: Real-time database operations
- **Firebase Storage**: File storage for backups and documents
- **Firebase Security Rules**: Database security and access control

### Database Collections
- `users`: User profiles and account information
- `trips`: Field trip data and management
- `messages`: Communication and notifications
- `locations`: Location tracking data
- `backups`: Backup history and metadata
- `settings`: System configuration

## Setup Instructions

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Firebase services
- Admin account with @cca.edu.ph email domain

### Installation
1. **Clone or download** the admin web interface files
2. **Ensure Firebase configuration** is properly set up in `js/firebase-config.js`
3. **Open `login.html`** in a web browser
4. **Login with admin credentials** using @cca.edu.ph email

### Firebase Configuration
The web interface uses the same Firebase project as the Android app:
- **Project ID**: tourapp-69eaf
- **API Key**: AIzaSyBDF1FPiNiOuJiIO1rarzJtQCyQUgyq0Q4
- **Auth Domain**: tourapp-69eaf.firebaseapp.com

## Usage Guide

### Getting Started
1. **Login**: Use your admin credentials to access the dashboard
2. **Dashboard**: View system overview and statistics
3. **Navigation**: Use the sidebar to access different management sections

### User Management
1. **View Users**: Go to User Management to see all registered users
2. **Add Users**: Use Register Users to create new accounts
3. **Bulk Import**: Upload CSV files for multiple user registration
4. **Manage Accounts**: Edit, suspend, or activate user accounts

### Trip Management
1. **View Trips**: Access the Trips section to see all field trips
2. **Create Trips**: Set up new educational trips and excursions
3. **Monitor Status**: Track trip progress and participant status
4. **Manage Details**: Edit trip information and settings

### Data Backup
1. **Create Backup**: Generate full or selective data backups
2. **Download**: Export backup files in JSON or CSV format
3. **Restore**: Upload and restore data from backup files
4. **History**: View and manage backup history

## Security Features

### Authentication Security
- Email domain validation (@cca.edu.ph only)
- Role-based access control
- Secure session management
- Automatic logout for inactive sessions

### Data Security
- Firebase Security Rules enforcement
- Encrypted data transmission
- Secure file upload/download
- Access logging and monitoring

### Admin Controls
- User account management
- System configuration
- Data backup and restore
- Security settings management

## File Structure

```
TOURAPP - ADMIN WEB/
├── index.html              # Main dashboard
├── login.html              # Authentication page
├── user-management.html    # User management interface
├── register-users.html     # User registration form
├── trips.html              # Trip management interface
├── data-backup.html        # Backup and restore interface
├── settings.html           # System settings
├── forgot-password.html    # Password reset
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   ├── auth.js            # Authentication management
│   ├── user-management.js # User management logic
│   ├── trip-management.js # Trip management logic
│   └── data-backup.js     # Backup functionality
├── firebase/
│   └── google-services.json # Firebase configuration
└── README.md              # This documentation
```

## Integration with Android App

The web admin interface shares the same Firebase database with the Android app:

### Shared Data
- **Users**: All user accounts and profiles
- **Trips**: Field trip information and management
- **Messages**: Communication and notifications
- **Locations**: Real-time location tracking data

### Real-time Synchronization
- Changes made in the web interface are immediately reflected in the Android app
- User account modifications affect mobile app access
- Trip updates are synchronized across all platforms
- Real-time data updates and notifications

### Cross-Platform Features
- Unified user management across web and mobile
- Consistent trip data and status
- Shared notification system
- Coordinated backup and restore operations

## Troubleshooting

### Common Issues

**Login Problems**
- Ensure you're using an @cca.edu.ph email address
- Verify you have admin role privileges
- Check internet connection for Firebase services

**Data Not Loading**
- Refresh the page to reload data
- Check browser console for error messages
- Verify Firebase configuration is correct

**Backup Issues**
- Ensure sufficient browser storage space
- Check file format compatibility (JSON/CSV)
- Verify backup file integrity

### Browser Compatibility
- **Chrome**: Recommended (latest version)
- **Firefox**: Supported (latest version)
- **Safari**: Supported (latest version)
- **Edge**: Supported (latest version)

### Performance Optimization
- Clear browser cache regularly
- Use modern browser for best performance
- Ensure stable internet connection
- Close unnecessary browser tabs

## Support and Maintenance

### Regular Maintenance
- Monitor user activity and system performance
- Regular data backups
- Update security settings as needed
- Review and manage user accounts

### Security Updates
- Keep Firebase configuration updated
- Monitor access logs for suspicious activity
- Regular password policy enforcement
- System security audits

### Data Management
- Regular backup creation and testing
- Data cleanup and archiving
- User account lifecycle management
- System performance monitoring

## Contact Information

For technical support or questions about the TourApp Admin Web Interface:
- **Email**: admin@cca.edu.ph
- **System**: TourApp Field Trip Management System
- **Version**: 1.0.0
- **Last Updated**: 2024

---

**Note**: This admin interface is designed specifically for Colegio de San Agustin and requires proper authentication and authorization to access. All data is securely managed through Firebase services with appropriate security rules and access controls.
