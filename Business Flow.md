CareFlow Business Flow Specification
Version: 1.0

Overview
CareFlow is a hybrid Appointment and Queue Management platform designed for clinics and hospitals.
Patients can:
•	Book appointments
•	Join walk-in queues remotely
•	Track queue progress in real-time
•	Receive smart notifications
Clinics can:
•	Manage appointments
•	Manage queues
•	Manage doctor schedules
•	Improve patient experience

User Roles
Patient
Can:
•	Register
•	Login
•	Search Clinics
•	Book Appointments
•	Join Queue
•	Track Queue
•	Receive Notifications

Receptionist
Can:
•	Register Walk-In Patients
•	Check-In Patients
•	Manage Queue
•	Call Next Patient
•	Skip Patient
•	Emergency Override

Doctor
Can:
•	View Schedule
•	View Queue
•	Call Next Patient
•	Complete Consultation

Clinic Admin
Can:
•	Manage Doctors
•	Manage Schedules
•	Manage Clinic Settings
•	View Reports

Patient Journey
Patient opens CareFlow App
↓
Login via OTP
↓
Home Screen
↓
Search Clinic
↓
Select Clinic
↓
Choose:
•	Book Appointment OR
•	Join Queue

Appointment Booking Flow
Patient selects:
Clinic
↓
Doctor
↓
Date
↓
Available Time Slot
↓
Confirm Booking
↓
Appointment Created
↓
Notification Sent
Status:
CONFIRMED

Doctor Schedule Flow
Patient views doctor schedule.
Schedule displays:
🟢 Available
🔴 Booked
⚫ Break
🔵 Selected
Patients can only choose available slots.
Double booking is not allowed.

Appointment Status
PENDING
CONFIRMED
CHECKED_IN
COMPLETED
CANCELLED
NO_SHOW

Walk-In Queue Flow
Patient selects:
Join Queue
↓
Select Doctor
↓
System Calculates:
Current Queue
People Ahead
Estimated Wait Time
↓
Patient Confirms
↓
Queue Number Generated
Example:
Queue #7
↓
Queue Tracking Screen

Queue Tracking Flow
Patient sees:
Current Number
Your Number
People Ahead
Estimated Wait
Realtime Updates

Check-In Flow
Patient arrives at clinic.
Receptionist selects:
Check In
↓
Status Updated
ARRIVED
↓
Patient enters active queue

Consultation Flow
Receptionist presses:
Call Next
↓
Patient receives notification
↓
Doctor starts consultation
↓
Doctor presses:
Complete Consultation
↓
Queue advances automatically

Queue Priority Rules
Priority 1
Emergency Cases
Priority 2
Appointment Patients
Priority 3
Walk-In Patients
Example:
Walk-In Queue: #1 #2 #3
10:20 Appointment Arrives
Queue Becomes:
#1 Walk-In
10:20 Appointment
#2 Walk-In
#3 Walk-In

Queue Management Actions
Receptionist can:
Call Next
Skip Patient
Move To Top
Emergency Override
Mark Arrived
Remove From Queue

Notifications
Appointment Confirmed
Appointment Reminder
Queue Joined
Queue Position Updated
3 Patients Ahead
1 Patient Ahead
Called To Consultation
Doctor Delayed
Appointment Cancelled

Clinic Dashboard
Dashboard Metrics:
Appointments Today
Walk-In Patients
Average Waiting Time
No Show Rate
Completed Consultations
Current Queue

Queue Dashboard
Display:
Current Queue
Patients Waiting
Estimated Waiting Time
Current Patient
Next Patient
Actions:
Call Next
Skip
Move To Top
Emergency
Complete

Doctor Dashboard
Display:
Today’s Schedule
Current Queue
Current Patient
Upcoming Appointments
Actions:
Call Next
Complete Consultation
Pause Queue
Resume Queue

System Architecture
Patient Mobile App
↓
Supabase Backend
↓
PostgreSQL Database
↓
Realtime Queue Engine
↓
Firebase Notifications
↓
Clinic Dashboard

Phase 1 Scope
Included:
✓ Appointment Booking
✓ Queue Management
✓ Queue Tracking
✓ Notifications
✓ Clinic Dashboard
✓ Doctor Schedule
✓ Patient Mobile App
Not Included:
✗ EMR
✗ Billing
✗ Inventory
✗ Telemedicine
✗ Medicine Delivery

Future Roadmap
Phase 2
WhatsApp Integration
QR Check-In
Digital Registration
Phase 3
Telemedicine
Medicine Delivery
Phase 4
EMR
Billing
Inventory
Phase 5
AI Healthcare Assistant
Predictive Scheduling
Patient Journey Optimization

End of Document
