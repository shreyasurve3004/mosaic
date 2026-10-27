# Figma Prompt – Mosaic Faculty Workspace

Design a modern, responsive *Faculty Dashboard* for a web-based Smart Campus Management Platform called *Mosaic*. The design should match the existing Student Workspace without changing its visual identity, layout, navigation style, color palette, typography, spacing, or component library. The application follows a clean SaaS dashboard aesthetic inspired by Notion, Microsoft Teams, Canvas LMS, and Linear.

The Faculty Workspace should use the same persistent application shell consisting of:

* Left collapsible sidebar navigation
* Top navigation bar with global search, notifications, profile dropdown and dark mode toggle
* Main content workspace
* Card-based UI
* Rounded corners (12-16px)
* White cards on light gray background
* Blue primary color (#2563EB)
* Orange accent for alerts and deadlines
* Inter font
* Soft shadows and subtle hover animations

---

## Sidebar Navigation

Dashboard

My Courses

Attendance

Assignments

Lecture Resources

Student Performance

Events

Notices

Messages

Profile

Settings

Logout

---

## Faculty Dashboard

The dashboard should serve as the instructor's command center.

Top Greeting


Good Morning, Prof. Sharma

Computer Engineering Department

Semester 5 Coordinator


Below the greeting display four statistics cards.

* Courses Teaching
* Classes Today
* Assignments Pending Review
* Student Attendance Average

The main content should contain

### Today's Schedule

Timeline showing upcoming lectures

* DBMS
* Software Engineering
* Computer Graphics

Each card displays

Time

Room

Division

Quick "Take Attendance" button

---

### Pending Assignment Reviews

Display cards showing

Assignment Name

Subject

Submissions Received

Due Date

Review button

---

### Recent Student Activity

Feed displaying

Assignment submitted

Attendance shortage

Student query

Late submission

---

### Quick Actions

Large buttons

Create Assignment

Upload Notes

Publish Notice

Take Attendance

Schedule Event

---

## My Courses

Display all allocated subjects as modern cards.

Each card contains

Subject Name

Semester

Division

Number of Students

Progress Bar

Buttons

View Course

Manage

Clicking a course opens the Course Workspace.

---

## Course Workspace

Tabs

Overview

Attendance

Assignments

Resources

Grades

Students

Announcements

---

### Overview Tab

Subject Information

Faculty Details

Course Objectives

Today's Lecture

Upcoming Deadlines

Recent Activity

---

### Attendance Module

Professional attendance management interface.

Top controls

Date Picker

Lecture Number

Division Selector

Search Student

Attendance Table

Roll Number

Student Name

Present

Absent

Late

Remarks

Buttons

Save Attendance

Download Report

View Attendance Analytics

Display an attendance percentage chart on the right.

---

### Assignment Management

Button

Create Assignment

Assignment Form

Title

Description

Due Date

Maximum Marks

Attachment Upload

Assign to Division

Below display Assignment Cards

Assignment

Submission Count

Pending

Average Marks

Buttons

View

Edit

Delete

Evaluate

---

### Evaluation Page

Split layout

Left

Submitted PDF

Right

Marks Entry

Feedback

Rubric Checklist

Submit Evaluation

---

### Lecture Resources

Upload lecture notes, PPTs, PDFs, reference books and external links.

Display uploaded resources as file cards with

Preview

Download

Replace

Delete

Organize resources by Topic and Week.

---

### Student Performance

Analytics Dashboard

Charts

Average Class Performance

Assignment Completion Rate

Attendance Distribution

Top Performing Students

Students Requiring Attention

Searchable Student Table

Name

Attendance

Internal Marks

Assignment Status

Performance Indicator

View Student Profile

---

### Student Profile

Display

Photo

Roll Number

Department

Attendance

Assignment History

Internal Marks

Performance Trend

Faculty Remarks

Contact Information

---

### Notices

Create Notice button

Rich Text Editor

Priority

Department

Attachment Upload

Schedule Publish

Recent Notices displayed below.

---

### Events

Faculty can create

Workshop

Guest Lecture

Seminar

Hackathon

Industrial Visit

Event Form

Title

Description

Venue

Date

Time

Maximum Participants

Registration Deadline

Buttons

Publish

Save Draft

---

### Messages

Inbox layout similar to Microsoft Teams.

Student Queries

Unread

Resolved

Search Conversations

Reply

Attach Files

---

### Reports

Generate downloadable reports

Attendance Report

Assignment Report

Internal Marks

Student Performance

Course Completion

Export

PDF

Excel

CSV

---

## Header

Global Search

Search students, assignments, courses, notices or resources.

Notification Center

Assignment submissions

Student messages

Attendance reminders

System announcements

Profile Menu

My Profile

Department

Preferences

Help

Logout

---

## Overall Design

The interface should feel professional and enterprise-grade rather than like a college ERP. Use consistent spacing, modern cards, clean typography, subtle animations, responsive layouts, data visualizations, and reusable components. Maintain complete visual consistency with the Student Workspace while exposing instructor-specific functionality through Role-Based Access Control (RBAC).

---

### One suggestion

Don't think of the Faculty dashboard as "the student's dashboard with extra buttons." Think of it as a *workbench. Students **consume* information, whereas faculty *create, manage, evaluate, and monitor* information. If you keep that mindset while designing, the two interfaces will naturally feel distinct even though they share the same design system. That's exactly how professional platforms like Canvas and Moodle differentiate user roles.