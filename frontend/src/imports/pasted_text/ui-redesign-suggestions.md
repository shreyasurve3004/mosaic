from apps.academics.models import Assignment

print([
    (f.name, f.get_internal_type(), f.choices)
    for f in Assignment._meta.fields
])
This is actually a **good starting point**. You already have the user flow figured out, which is the hardest part. But if you're converting this into a **web application**, I wouldn't simply stretch these mobile screens. That almost always ends up looking like a giant phone on a monitor.

Looking at your prototype, I noticed a few things:

**What's good:**

* Clean navigation flow.
* Good separation of modules.
* The card-based design is nice.
* The blue and orange color combination is pleasant.

**What needs improvement for a web application:**

* The dashboard feels cramped because it was designed for a phone.
* Too much vertical scrolling.
* Everything is stacked instead of utilizing horizontal space.
* Important information isn't prioritized.
* The navigation should move to a sidebar instead of a bottom navbar.

---

# I'd redesign the entire UI.

Not the features.

The **layout**.

Think of software like **Notion, Microsoft Teams, Jira, GitHub or Canvas LMS.**

---

# Landing Page

A proper SaaS landing page.

```
---------------------------------------------------------
Logo                     Features  About  Contact  Login

                Mosaic

      One Platform. Every Campus.

 A unified smart campus platform that brings academics,
 assignments, events, notices and student services together.

        [ Get Started ]   [ Learn More ]

---------------------------------------------------------

Features

Academic Resources

Assignments

Campus Events

Library

Student Dashboard

---------------------------------------------------------

Screenshots

---------------------------------------------------------

Footer
```

---

# Login

Split screen.

```
---------------------------------------------

Illustration          Login Form

                      Email

                      Password

                     Login

                 Continue with Google

---------------------------------------------
```

Very modern.

---

# Dashboard

This is where I think your project should shine.

```
--------------------------------------------------------------

☰ Mosaic

Dashboard

Academics

Assignments

Events

Notices

Library

Profile

Settings

--------------------------------------------------------------

Welcome Back, Shreya

Search Anything...

--------------------------------------------------------------

Attendance Card

Upcoming Assignment

Latest Notice

Next Event

--------------------------------------------------------------

Calendar

Today's Schedule

--------------------------------------------------------------

Recent Resources

Library Books

--------------------------------------------------------------
```

Notice how **nothing requires scrolling immediately**.

Everything important is visible.

---

# Sidebar

Always visible.

```
🏠 Dashboard

📚 Academics

📝 Assignments

📢 Notices

🎉 Events

📖 Library

👤 Student

⚙ Settings
```

---

# Academics

Instead of one long page

Tabs.

```
Attendance

Timetable

Resources

Subjects
```

Resources become cards.

```
Database Systems

Download

-------------------

Software Engineering

Download

-------------------

Operating Systems

Download
```

---

# Assignments

Kanban style.

```
Pending

In Progress

Completed
```

Much cleaner.

---

# Events

Cards.

```
AI Workshop

Date

Venue

Register

--------------------

Hackathon

Register

--------------------

Seminar

Register
```

---

# Notices

Exactly like Gmail.

Unread.

Read.

Pinned.

---

# Library

Search at top.

```
Search Book

---------------------------------

Database System Concepts

Available

Borrow

---------------------------------

Operating Systems

Issued

Due Tomorrow
```

---

# Student Profile

Professional.

```
Photo

Name

Department

Semester

Attendance

CGPA

Email

Achievements
```

---

# Color Palette

I wouldn't use the current bright blue.

I'd use

Primary

```
#2563EB
```

Accent

```
#F97316
```

Background

```
#F8FAFC
```

Cards

```
#FFFFFF
```

Text

```
#1E293B
```

Looks premium.

---

# Fonts

Inter.

Seriously.

Inter makes almost every dashboard look better.

---

# Icons

Lucide Icons.

They're clean and modern.

---

# Animations

Very subtle.

Hover elevation.

Sidebar slide.

Card fade.

No bouncing.

No spinning.

This isn't a gaming website.

---

# One feature I would definitely add

A **global search bar** at the top.

```
Search...
```

Typing **"Database"** should show:

* Database Notes
* Database Assignment
* Database Books
* Database Notices
* Database Seminar

That makes Mosaic feel like a single connected platform instead of separate pages.

## I also have one suggestion that could elevate the project significantly.

Don't build it like a college ERP. Build it like **Notion**.

Instead of every page feeling completely separate, keep a consistent layout with the same sidebar, top navigation, search bar, and content area. Every module should feel like a different workspace within the same application. Users should never feel like they're leaving one system and entering another. That consistency is what gives modern software products a polished, professional feel.

I think you should also **design it in Figma first** before writing any HTML, CSS, or JavaScript. For a project like Mosaic, spending two or three days perfecting the UI in Figma will probably save you a week of redesigning code later. The UI itself can become one of your project's strongest selling points.
