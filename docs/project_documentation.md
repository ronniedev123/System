# Church Management System Project Documentation

## 1. Introduction

The Church Management System is a web-based information system developed to support the daily administrative, operational, and communication needs of a church. The project focuses on improving how church leaders and authorized staff manage members, attendance, contributions, events, announcements, weekly programs, and user access within one centralized platform.

This system was designed because church operations often involve repeated manual work, disconnected records, and delays in accessing important information. By digitizing these processes, the project provides a more structured, secure, and efficient way to run ministry activities.

The system serves three major groups of users:

- **Administrators**, who manage the full system, approve users, and monitor records.
- **Team users**, who assist in daily operations such as attendance, events, programs, and member updates.
- **Normal users or members**, who mainly view relevant information such as contributions, weekly programs, announcements, and personal attendance reports.

The overall aim of the project is to provide a reliable church service platform that improves organization, transparency, communication, and decision-making.

### Objectives of the Project

The project was developed with the following objectives:

- To centralize church records in one system.
- To reduce manual paperwork and duplicated effort.
- To improve monitoring of attendance, contributions, and member records.
- To support easier communication through announcements and SMS notifications.
- To provide role-based access so that each user only sees the features relevant to them.
- To improve reporting and visibility for church leadership.

## 2. Problem Definition

Many churches still manage core activities manually or with scattered tools such as notebooks, spreadsheets, phone contacts, and separate messaging channels. This creates several operational problems:

### 2.1 Fragmented Member Records

Member information may be stored in different places, making it hard to maintain accurate details such as names, departments, phone numbers, gender, and addresses. Updating records becomes slow and error-prone.

### 2.2 Poor Attendance Tracking

Attendance is often recorded on paper or through inconsistent methods. This makes it difficult to analyze trends, identify irregular attendance, or produce monthly and yearly summaries.

### 2.3 Weak Financial Visibility

Contributions and donations may be captured manually, which makes tracking totals, categories, and contribution history difficult. Leadership may struggle to obtain clear summaries of giving patterns.

### 2.4 Slow Communication

Church announcements are often shared through informal or repetitive channels. Without a central system, it is difficult to keep members consistently informed, especially when direct SMS communication is needed.

### 2.5 Limited Reporting

Without a digital platform, it is difficult to generate reports on member participation, attendance trends, contribution summaries, and upcoming events. This weakens planning and informed decision-making.

### 2.6 Lack of Controlled Access

When everyone uses the same records without structured permissions, there is a risk of data misuse, accidental changes, and poor accountability.

### 2.7 Inconvenient Weekly Program Management

Church schedules often change over time, but when weekly programs are not managed centrally, members and staff may not have a dependable reference point.

Because of these problems, the need arose for a single system that could simplify church administration while still remaining easy to use for different categories of users.

## 3. Analysis and Idealization

This phase focused on studying the church environment, understanding the users, identifying requirements, and imagining the ideal system that could solve the observed problems.

### 3.1 System Analysis

The analysis stage examined the main operational areas of the church:

- Member registration and storage
- Department-based organization
- Attendance marking and reporting
- Events scheduling
- Contribution and donation tracking
- Announcements and SMS communication
- Weekly program management
- User authentication and access control

From this analysis, the main users and their needs were identified.

### 3.2 User Analysis

#### Administrators

Administrators need full control over the platform. They are responsible for:

- Creating and managing system users
- Approving or blocking accounts
- Viewing all members and departments
- Managing attendance, events, contributions, announcements, and weekly programs
- Accessing dashboards and reports

#### Team Users

Team users need access to operational tasks but not necessarily full administrative privileges. They are expected to:

- View and manage members
- Mark attendance
- Add and review events
- Access reports and weekly programs
- Work within the system without changing high-level administrative controls

#### Normal Users / Members

Normal users mainly need a simple and focused experience. Their needs include:

- Viewing announcements and weekly programs
- Accessing contribution-related pages
- Opening their own attendance report
- Using the system without seeing sensitive administrative pages

### 3.3 Functional Requirements

The ideal system was expected to provide the following functions:

1. User registration and login
2. Role-based dashboards
3. Member creation, editing, deletion, and department assignment
4. Department-based member navigation
5. Attendance marking and editing
6. Attendance summaries and visual analytics
7. Event creation and listing
8. Contribution category tracking and contribution recording
9. Announcement creation and SMS sending
10. Weekly program management
11. Downloadable attendance reports
12. Automatic database migration support

### 3.4 Non-Functional Requirements

The ideal system also needed to satisfy non-functional requirements such as:

- **Usability:** The platform should be easy to learn and navigate.
- **Security:** JWT-based authentication and controlled user roles are required.
- **Reliability:** Records should be stored consistently in a relational database.
- **Maintainability:** The codebase should support module separation and future upgrades.
- **Responsiveness:** Pages should remain usable on both desktop and mobile devices.
- **Scalability:** The system should allow new modules and features to be added later.

### 3.5 Idealized Solution

The ideal solution was envisioned as a centralized church management web application with these characteristics:

- A single login point for all user types
- A dashboard that changes based on user role
- Clear modules for members, attendance, contributions, events, announcements, and programs
- Reporting features for better monitoring and decisions
- A modern frontend with clearer navigation and lightweight user interaction
- Integration points for communication services such as SMS and email

This idealization directly shaped the architecture and implementation choices of the project.

## 4. Project Implementation

The implementation phase transformed the analyzed requirements into a working software solution.

### 4.1 Technology Stack

The project was implemented using the following technologies:

- **Frontend:** HTML, CSS, and JavaScript
- **Backend:** Node.js with Express.js
- **Database:** MySQL
- **Authentication:** JSON Web Tokens (JWT)
- **Password Security:** bcryptjs
- **Communication Services:** Twilio for SMS and Nodemailer for email support
- **Development Support:** Nodemon for development and migration scripts for schema setup

### 4.2 Architectural Approach

The system follows a client-server model:

- The **frontend** provides the user interface through pages served from the `backend/public` folder.
- The **backend** exposes REST-style API endpoints under `/api`.
- The **database layer** stores persistent information such as users, members, attendance, events, donations, announcements, and weekly programs.

This structure allows responsibilities to be separated clearly:

- Routes handle endpoint definitions
- Controllers process requests and business logic
- Models manage database operations
- Public assets provide the browser interface

### 4.3 Backend Implementation

The backend server is implemented in Express. It handles:

- JSON and URL-encoded request parsing
- Static file serving
- CORS support
- API routing
- migration execution during startup
- automatic admin account creation
- dynamic free-port selection when the default port is busy

The main backend modules include:

- `auth` for registration, login, approval, blocking, and user management
- `members` for member record management
- `attendance` for attendance marking, editing, and reports
- `events` for church event records
- `donations` for contribution tracking
- `announcements` for notices and SMS actions
- `weekly-programs` for recurring church schedules

### 4.4 Database Implementation

The project uses MySQL as the main relational database. A migration script ensures the required tables exist and also updates older schemas safely. The main tables are:

- `users`
- `members`
- `attendance`
- `events`
- `donations`
- `announcements`
- `weekly_programs`

This design supports relationships such as:

- users creating records
- members linked to attendance
- attendance records deleted automatically when related members are deleted

The migration process also seeds default weekly programs when none exist.

### 4.5 Frontend Implementation

The frontend was built as a multi-page browser application. Each page is dedicated to a specific part of the system such as:

- Welcome page
- Login and registration pages
- Dashboard
- Departments and members
- Attendance
- Events
- Announcements
- Contributions
- Reports
- Weekly programs

Recent styling improvements shifted the interface to a lighter portal-style design inspired by clean service platforms. Shared CSS now provides consistent cards, forms, tables, buttons, and responsive layouts across the system.

### 4.6 Authentication and Authorization

Authentication is implemented using JWT tokens stored on the client side after successful login. Authorization is role-based, meaning system features are displayed and controlled according to the user’s role.

The implemented roles include:

- **Admin**
- **User**
- **Normal User**

This ensures controlled access to sensitive operations such as user approval, attendance editing, and record deletion.

### 4.7 Core Functional Modules Implemented

#### Member Management

The system allows administrators and authorized users to:

- Add members
- Edit member information
- Delete members
- Organize members by departments
- View individual member records

#### Attendance Management

The attendance module supports:

- Marking attendance for members
- Filtering by department
- Viewing monthly summaries
- Editing attendance cells for administrators
- Viewing individual attendance reports
- Downloading attendance reports

#### Events Management

The events page allows authorized users to:

- Add church events
- View upcoming events
- Delete events where appropriate

#### Contributions Management

The contribution module supports:

- Viewing contribution categories
- Recording individual contributions
- Viewing totals
- Tracking contribution histories
- Editing and deleting contribution records for administrators

#### Announcements and SMS

The announcements module allows:

- Creating church announcements
- Listing recent announcements
- Sending SMS to all members or a selected member when permitted

#### Weekly Programs

The weekly programs module allows:

- Viewing recurring church activities
- Adding, editing, and deleting programs for authorized users

#### Dashboards and Reports

The project includes role-based dashboards and reporting pages that:

- summarize ministry activity
- show attendance trends
- display department statistics
- support report downloads

### 4.8 Deployment and Startup Flow

To run the project locally:

1. Configure the required environment variables in `.env`
2. Install dependencies in the backend directory
3. Start the Express server
4. Open the served public interface in a browser

At startup, the system:

- loads environment variables
- executes migrations
- creates the default admin account if missing
- serves the frontend pages

### 4.9 Testing and Validation

Implementation validation involved:

- schema checking and migration support
- seed scripts for test data
- API checks for major endpoints
- frontend page integration with backend APIs
- syntax checking of updated frontend JavaScript files

This provides a practical foundation for functional verification, though more advanced automated testing can still be added in future versions.

### 4.10 Benefits of the Implemented System

The implemented system provides several benefits:

- Better record organization
- Faster access to member and attendance information
- Improved communication through announcements and SMS
- Clearer monitoring of events and contributions
- Role-controlled access to reduce misuse
- Better reporting support for church leadership
- A cleaner and more modern user experience

### 4.11 Possible Future Improvements

The project can be extended further with:

- stronger audit logging
- exportable PDF reports
- richer analytics dashboards
- advanced search and filtering
- member self-service profile updates
- notification history
- cloud deployment and backup automation
- automated test suites for backend and frontend flows

## 5. Conclusion

The Church Management System successfully addresses major administrative and operational challenges that arise when church records are handled manually or through disconnected tools. Through analysis, planning, idealization, and implementation, the project produced a centralized digital platform that supports member management, attendance, contributions, events, announcements, weekly programs, and controlled user access.

The system therefore represents a practical and scalable solution for improving efficiency, organization, and informed leadership within a church environment.
