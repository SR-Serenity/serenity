import json
import os
from pathlib import Path

# Target directory
DATASETS_DIR = Path(__file__).resolve().parents[1] / "datasets"
os.makedirs(DATASETS_DIR, exist_ok=True)

workspace_qa_cases = [
    {
        "input": "Who are my contacts in the workspace?",
        "expected_output": "Here are the contacts in your workspace. [List of contacts from the workspace directory]",
        "retrieval_context": ["The workspace has a contacts directory with team members and external collaborators."]
    },
    {
        "input": "What meetings do I have this week?",
        "expected_output": "You have the following meetings this week. [Calendar events listed by date and time]",
        "retrieval_context": ["Calendar contains scheduled meetings, events, and tasks for the current week."]
    },
    {
        "input": "Search for wiki pages about onboarding",
        "expected_output": "I found the following wiki pages related to onboarding. [List of matching wiki pages with titles and summaries]",
        "retrieval_context": ["The wiki contains documentation pages organized by topic including onboarding guides."]
    },
    {
        "input": "Show me recent messages from the general channel",
        "expected_output": "Here are the recent messages from the general conversation. [List of recent messages with sender and content]",
        "retrieval_context": ["The workspace has chat conversations including a general channel for team-wide communication."]
    },
    {
        "input": "Find emails about the project deadline",
        "expected_output": "I found the following email threads mentioning project deadline. [Email threads with subject and snippet]",
        "retrieval_context": ["Mail threads are searchable by keyword across all connected mail accounts."]
    },
    {
        "input": "Who is the owner of serenity project?",
        "expected_output": "The owner of the serenity project is listed as Alex Vance in the project settings.",
        "retrieval_context": ["Project settings and workspace configuration identify Alex Vance as the lead owner of Serenity."]
    },
    {
        "input": "What is the email address of David?",
        "expected_output": "David's email address is david.miller@workspace.com.",
        "retrieval_context": ["The workspace user directory lists David Miller with email david.miller@workspace.com."]
    },
    {
        "input": "Find any messages mentioning key results",
        "expected_output": "Here are the messages mentioning key results: [List of chat history snippets containing 'key results']",
        "retrieval_context": ["Chat history indexes search queries for key phrases like 'key results' or 'OKRs'."]
    },
    {
        "input": "Summarize the latest meeting about sprint planning",
        "expected_output": "In the latest sprint planning meeting, the team agreed to focus on the evaluation module and set the release date to Friday.",
        "retrieval_context": ["Meeting transcript: Discussed evaluation module, assigned task to Huy, target deadline set to Friday."]
    },
    {
        "input": "Show me all team members in the Engineering department",
        "expected_output": "Here are the members of the Engineering team: Huy (Lead), David (Senior Dev), and Mary (QA).",
        "retrieval_context": ["The departments directory lists Engineering team members: Huy, David, Mary."]
    },
    {
        "input": "Are there any emails from client-abc?",
        "expected_output": "Yes, you received an email from support@client-abc.com yesterday regarding API access.",
        "retrieval_context": ["Email from support@client-abc.com: Requesting API token and credential setups."]
    },
    {
        "input": "Search the wiki for code guidelines",
        "expected_output": "I found a wiki page titled 'Code Styling and Linting Guidelines' last updated by David.",
        "retrieval_context": ["Wiki document: Code Styling Guidelines including eslint and prettier configurations."]
    },
    {
        "input": "Who is in charge of marketing?",
        "expected_output": "Sarah Connor is the head of the Marketing department.",
        "retrieval_context": ["Department list: Marketing is led by Sarah Connor."]
    },
    {
        "input": "What tasks are assigned to me?",
        "expected_output": "You have 3 active tasks assigned to you: Implement G-Eval, Fix CORS issues, and Create seed data.",
        "retrieval_context": ["Tasks list database contains items assigned to current user, filtering out completed tasks."]
    },
    {
        "input": "Find any files related to Q3 budget",
        "expected_output": "I found the file 'Q3_Budget_Draft.pdf' in the shared document drive.",
        "retrieval_context": ["File manager database indexes files by tags and titles including 'Q3', 'budget'."]
    },
    {
        "input": "Who sent the email about API design?",
        "expected_output": "The email about API design was sent by Alex Vance.",
        "retrieval_context": ["Email subject: 'Refined API Design Proposals', sender: Alex Vance."]
    },
    {
        "input": "Show me recent chat history with Sarah",
        "expected_output": "Here is your recent chat with Sarah: [Chat messages where Sarah asks about meeting time and you reply 2 PM]",
        "retrieval_context": ["Direct message channel history between current user and Sarah Connor."]
    },
    {
        "input": "Find a wiki page about security policy",
        "expected_output": "I found the wiki page 'Workspace Security Policy and Best Practices' under Guidelines.",
        "retrieval_context": ["Wiki directory contains a category for Policies containing Security Policy page."]
    },
    {
        "input": "What is the phone number of John Doe?",
        "expected_output": "John Doe's phone number is +1-555-0199.",
        "retrieval_context": ["Contact card for John Doe shows phone number as +1-555-0199."]
    },
    {
        "input": "Give me a summary of tasks due this Friday",
        "expected_output": "Here is the summary of tasks due this Friday: 1. Deploy Auth service. 2. Finish evaluation report.",
        "retrieval_context": ["Task database query filtering for tasks with due date matching upcoming Friday."]
    }
]

task_creator_cases = [
    {
        "input": "Create a task to review the Q3 report by Friday",
        "expected_output": "I'll create a task: Title: Review Q3 report, Due: this Friday. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Add a task for John to fix the login bug, high priority",
        "expected_output": "I'll create a task: Title: Fix login bug, Assignee: John, Priority: high. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Remind me to send the invoice to the client next Monday",
        "expected_output": "I'll create a task: Title: Send invoice to client, Due: next Monday. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "I need to update the API documentation",
        "expected_output": "I'll create a task: Title: Update API documentation. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Schedule a code review for the new feature with the team by end of week",
        "expected_output": "I'll create a task: Title: Code review for new feature, Due: end of this week. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Add a task: draft the press release, priority low",
        "expected_output": "I'll create a task: Title: Draft the press release, Priority: low. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Create a task for Mary to update onboarding guide",
        "expected_output": "I'll create a task: Title: Update onboarding guide, Assignee: Mary. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Remind me to buy groceries tonight at 8pm",
        "expected_output": "I'll create a task: Title: Buy groceries, Due: tonight at 8:00 PM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Add a high priority task: investigate server crash",
        "expected_output": "I'll create a task: Title: Investigate server crash, Priority: high. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Create a task to follow up with the design team next Thursday",
        "expected_output": "I'll create a task: Title: Follow up with design team, Due: next Thursday. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Set a task: prepare presentation for the board meeting, due tomorrow",
        "expected_output": "I'll create a task: Title: Prepare presentation for board meeting, Due: tomorrow. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Add a task for Sarah: write unit tests for core service",
        "expected_output": "I'll create a task: Title: Write unit tests for core service, Assignee: Sarah. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Remind me to call the landlord tomorrow morning",
        "expected_output": "I'll create a task: Title: Call the landlord, Due: tomorrow morning. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Create a todo: submit timesheet by end of day",
        "expected_output": "I'll create a task: Title: Submit timesheet, Due: end of day today. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Add task: schedule interview with candidate Alex",
        "expected_output": "I'll create a task: Title: Schedule interview with candidate Alex. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Remind me to check the database backups every Sunday",
        "expected_output": "I'll create a task: Title: Check database backups, Due: every Sunday. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Create task for David: fix layout bug on homepage",
        "expected_output": "I'll create a task: Title: Fix layout bug on homepage, Assignee: David. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Add high priority task: renew domain registration before next month",
        "expected_output": "I'll create a task: Title: Renew domain registration, Priority: high, Due: before next month. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Remind me to send status report to manager by Friday 5pm",
        "expected_output": "I'll create a task: Title: Send status report to manager, Due: this Friday at 5:00 PM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Create a task: clean up old docker volumes",
        "expected_output": "I'll create a task: Title: Clean up old docker volumes. Shall I confirm?",
        "retrieval_context": []
    }
]

meeting_scheduler_cases = [
    {
        "input": "Schedule a meeting with Sarah tomorrow at 2pm for 1 hour",
        "expected_output": "I'll schedule: Meeting with Sarah, tomorrow at 2:00 PM for 1 hour. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Book a room for the design review on Friday afternoon",
        "expected_output": "I'll book a room for: Design review, Friday afternoon. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Set up a weekly standup every Monday at 9am with the whole team",
        "expected_output": "I'll schedule: Weekly standup, every Monday at 9:00 AM, recurring. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Arrange a call with the client next Tuesday at 10am",
        "expected_output": "I'll schedule: Call with client, next Tuesday at 10:00 AM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "I want to meet with John and Mary for a sprint planning session next week",
        "expected_output": "I'll schedule: Sprint planning session with John and Mary, next week. Could you confirm the exact date and time?",
        "retrieval_context": []
    },
    {
        "input": "Book Room A for tomorrow from 10am to 11:30am",
        "expected_output": "I'll book Room A for tomorrow from 10:00 AM to 11:30 AM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Schedule a 30-minute sync with David at 4pm today",
        "expected_output": "I'll schedule a 30-minute sync with David at 4:00 PM today. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Set up a meeting: Project kickoff, next Wednesday at 9:00 AM",
        "expected_output": "I'll schedule: Project kickoff meeting on next Wednesday at 9:00 AM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Book a room for the engineering sync on Thursday morning",
        "expected_output": "I'll book a room for: Engineering sync, Thursday morning. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Arrange a coffee chat with Emily next Monday at 3pm",
        "expected_output": "I'll schedule: Coffee chat with Emily, next Monday at 3:00 PM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Schedule a recurring meeting every Friday at 11am for design sync",
        "expected_output": "I'll schedule: Design sync, every Friday at 11:00 AM, recurring. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Book the main conference room for a board meeting on Tuesday afternoon",
        "expected_output": "I'll book the Main Conference Room for: Board meeting, Tuesday afternoon. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Schedule a call with the QA team on Friday at 4pm",
        "expected_output": "I'll schedule: Call with QA team, Friday at 4:00 PM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Set up a 1-hour 1on1 meeting with my manager tomorrow morning at 10",
        "expected_output": "I'll schedule a 1-hour 1on1 meeting with your manager, tomorrow at 10:00 AM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Book Room B for a brainstorm session on Monday from 2pm to 4pm",
        "expected_output": "I'll book Room B for: Brainstorm session, Monday from 2:00 PM to 4:00 PM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Schedule a client presentation next Thursday at 3pm in the main hall",
        "expected_output": "I'll schedule: Client presentation, next Thursday at 3:00 PM in the Main Hall. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Set up a recurring weekly standup on Tuesdays at 9:30 AM",
        "expected_output": "I'll schedule: Weekly standup, Tuesdays at 9:30 AM, recurring. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Book a meeting room for a product demo with external partners on Wednesday afternoon",
        "expected_output": "I'll book a meeting room for: Product demo with external partners, Wednesday afternoon. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Schedule a 15-minute quick call with Tom today at 5pm",
        "expected_output": "I'll schedule a 15-minute call with Tom, today at 5:00 PM. Shall I confirm?",
        "retrieval_context": []
    },
    {
        "input": "Arrange a feedback session with the team next Friday at 2pm",
        "expected_output": "I'll schedule: Feedback session with team, next Friday at 2:00 PM. Shall I confirm?",
        "retrieval_context": []
    }
]

wiki_editor_cases = [
    {
        "input": "Rewrite this paragraph to make it sound more professional",
        "expected_output": "Our primary objective is to finalize the deployment checklist by Friday to ensure a smooth production release.",
        "page_title": "Release Procedures",
        "page_content_markdown": "Hey, we gotta get this deploy list done by Friday, ok guys?",
        "retrieval_context": []
    },
    {
        "input": "Summarize the main points of this document",
        "expected_output": "Summary:\n- Remote work hours are flexible.\n- Daily standups are at 10:00 AM.\n- Submit timesheets weekly.",
        "page_title": "Remote Working Guidelines",
        "page_content_markdown": "# Guidelines\nRemote work allows flexible scheduling. Standups occur daily at 10 AM. Timesheets are due weekly.",
        "retrieval_context": []
    },
    {
        "input": "Add a list of team guidelines to this page",
        "expected_output": "Here are the team guidelines:\n- Be respectful.\n- Document your code.\n- Communicate changes early.",
        "page_title": "Team Standards",
        "page_content_markdown": "# Standards\nWe strive for excellence.",
        "retrieval_context": []
    },
    {
        "input": "Improve the clarity and formatting of these release notes",
        "expected_output": "## Release Notes - v1.2.0\n### New Features\n- Added evaluation metrics dashboard\n### Bug Fixes\n- Resolved database connection leaks",
        "page_title": "Changelog",
        "page_content_markdown": "v1.2.0 is out. added evaluation metrics and fixed some DB memory leaks.",
        "retrieval_context": []
    },
    {
        "input": "Translate this wiki page to Vietnamese",
        "expected_output": "# Hướng dẫn cài đặt\nChạy `npm install` để bắt đầu.",
        "page_title": "Setup Guide",
        "page_content_markdown": "# Setup Instructions\nRun `npm install` to get started.",
        "retrieval_context": []
    },
    {
        "input": "Make the tone of this onboarding guide more friendly and welcoming",
        "expected_output": "Welcome to the team! We are absolutely thrilled to have you here. Let's make something amazing together.",
        "page_title": "Onboarding",
        "page_content_markdown": "This is the onboarding guide. Complete the checklist below to begin working.",
        "retrieval_context": []
    },
    {
        "input": "Add a standard FAQ section to the API guidelines page",
        "expected_output": "## Frequently Asked Questions\n**Q: What is the rate limit?**\n- A: 100 requests per minute.",
        "page_title": "API Guidelines",
        "page_content_markdown": "# API Specs\nWe use REST APIs.",
        "retrieval_context": []
    },
    {
        "input": "Correct the spelling and grammar in this draft",
        "expected_output": "We need to ensure that the server is updated with the latest security patches.",
        "page_title": "Maintenance Draft",
        "page_content_markdown": "we need to secure that server is update with the latest security patch.",
        "retrieval_context": []
    },
    {
        "input": "Formatting this raw text into Markdown sections",
        "expected_output": "# Project Goals\n- Goal 1\n- Goal 2",
        "page_title": "Goals Draft",
        "page_content_markdown": "Goals: Goal 1, Goal 2.",
        "retrieval_context": []
    },
    {
        "input": "Simplify the explanation of the deployment process",
        "expected_output": "To deploy:\n1. Build the project.\n2. Push the Docker image.\n3. Restart the service.",
        "page_title": "Deployment Instructions",
        "page_content_markdown": "First compile files, then compile docker assets, push it to docker registry and run docker stack deploy restart.",
        "retrieval_context": []
    },
    {
        "input": "Add a checklist for the code review process to this page",
        "expected_output": "# Review Checklist\n- [ ] Code compiles without errors\n- [ ] Unit tests pass\n- [ ] Clean styling formatting",
        "page_title": "Code Review Policy",
        "page_content_markdown": "# Code Review",
        "retrieval_context": []
    },
    {
        "input": "Update this security guidelines page to include a warning about API keys",
        "expected_output": "> [!WARNING]\n> Never commit raw API keys to repository.",
        "page_title": "Security Guidelines",
        "page_content_markdown": "# Security\nKeep passwords secure.",
        "retrieval_context": []
    },
    {
        "input": "Create a neat markdown table summarizing these project milestones",
        "expected_output": "| Milestone | Due Date | Owner |\n|---|---|---|\n| Kickoff | June 1 | Huy |\n| Demo | July 15 | David |",
        "page_title": "Milestones",
        "page_content_markdown": "Kickoff is June 1st owned by Huy, Demo is July 15th owned by David.",
        "retrieval_context": []
    },
    {
        "input": "Refactor the getting started section to be more step-by-step",
        "expected_output": "### Step 1: Run dev server\n### Step 2: Open localhost",
        "page_title": "Getting Started",
        "page_content_markdown": "Run npm run dev, then open browser on localhost.",
        "retrieval_context": []
    },
    {
        "input": "Summarize the troubleshooting steps in a bulleted list",
        "expected_output": "- Check server logs\n- Verify database credentials\n- Restart redis instance",
        "page_title": "Troubleshooting Guide",
        "page_content_markdown": "First check logs, then double check DB passwords, then restart redis cache.",
        "retrieval_context": []
    },
    {
        "input": "Make this feature description more concise",
        "expected_output": "The notification engine sends instant updates to users via email and chat alerts.",
        "page_title": "Notification Engine",
        "page_content_markdown": "The notification system is designed to provide immediate notifications to clients. It triggers mail sending processes as well as real-time messaging updates.",
        "retrieval_context": []
    },
    {
        "input": "Add a section explaining the project architecture",
        "expected_output": "## Architecture\nThe system uses a microservice architecture composed of NestJS services, a Python AI service, and a Next.js frontend.",
        "page_title": "Architecture Overview",
        "page_content_markdown": "# Architecture",
        "retrieval_context": []
    },
    {
        "input": "Change the tone of this page to be objective and technical",
        "expected_output": "The system processes incoming webhooks asynchronously using a Redis message queue.",
        "page_title": "Webhook Processing",
        "page_content_markdown": "Basically, our system does some pretty cool magic processing on webhooks using a fast Redis queue.",
        "retrieval_context": []
    },
    {
        "input": "Polish the summary of the team guidelines",
        "expected_output": "Guidelines Summary:\n1. Standups are mandatory.\n2. Create PRs for review.\n3. Keep documentation updated.",
        "page_title": "Guidelines Summary",
        "page_content_markdown": "standup are daily and you must attend. make pull request. write docs.",
        "retrieval_context": []
    },
    {
        "input": "Add a table of contents and clear headings to this doc",
        "expected_output": "## Table of Contents\n- [Introduction](#introduction)\n- [Prerequisites](#prerequisites)\n\n## Introduction\n...",
        "page_title": "Developer Manual",
        "page_content_markdown": "# Dev Manual\nthis manual covers prerequisites and introduction.",
        "retrieval_context": []
    }
]

chat_assistant_cases = [
    {
        "input": "Translate the last message to Vietnamese",
        "expected_output": "Chúng tôi cần cập nhật tài liệu API trước thứ Sáu.",
        "conversation_context": [
            {"role": "user", "content": "We need to update the API documentation by Friday."}
        ],
        "retrieval_context": []
    },
    {
        "input": "Suggest a polite reply to the manager's request",
        "expected_output": "Sure, I'll take a look at it right away and send you the feedback.",
        "conversation_context": [
            {"role": "assistant", "content": "Could you review the design draft by tomorrow morning?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Draft a response declining the meeting invitation nicely",
        "expected_output": "Hi Sarah, thank you for the invite. Unfortunately, I have a conflicting priority at that time and won't be able to attend. Let me know if we can reschedule.",
        "conversation_context": [
            {"role": "user", "content": "Hey, can you join the marketing alignment sync at 3pm today?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Rephrase my response to make it sound more professional",
        "expected_output": "I will inspect the report and provide an update shortly.",
        "conversation_context": [
            {"role": "user", "content": "i will check the report and let you know soon."}
        ],
        "retrieval_context": []
    },
    {
        "input": "Suggest a quick answer to: Are you available for a call in 10 minutes?",
        "expected_output": "Yes, I am available. Let's hop on the call.",
        "conversation_context": [
            {"role": "user", "content": "Are you available for a call in 10 minutes?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Translate: I will check the report and get back to you shortly, to French",
        "expected_output": "Je vais vérifier le rapport et je vous recontacterai sous peu.",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Draft an announcement message for the team about the upcoming release",
        "expected_output": "Hi team, we will deploy v1.3.0 tomorrow morning at 9am. Please ensure all PRs are merged by tonight.",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Suggest a reply to a client asking for a discount on services",
        "expected_output": "Thank you for reaching out. We offer highly tailored, premium solutions and cannot adjust our standard rates at this time. However, we'd love to review the scope with you.",
        "conversation_context": [
            {"role": "user", "content": "Can you offer a 20% discount on the premium plan?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Make my message more enthusiastic and positive",
        "expected_output": "That sounds absolutely fantastic! I'm super excited to collaborate on this project!",
        "conversation_context": [
            {"role": "user", "content": "Sounds good. Let's work on this project."}
        ],
        "retrieval_context": []
    },
    {
        "input": "Suggest a reply: Yes, the bug is fixed and deployed",
        "expected_output": "Yes, the bug has been resolved and the fix is now deployed to production.",
        "conversation_context": [
            {"role": "user", "content": "Is the login bug fixed yet?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Draft a thank you message for the team after successful deployment",
        "expected_output": "Thank you everyone for the hard work! The deployment was a great success. Have a wonderful weekend!",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Rephrase: Send me the document now, to be polite",
        "expected_output": "Could you please send me the document when you have a moment?",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Suggest an response to: What is the current status of the task?",
        "expected_output": "I am currently working on the API integration and expect to finish it by end of day.",
        "conversation_context": [
            {"role": "user", "content": "What is the status of the integration task?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Translate: Let's discuss this during our sync tomorrow, to Vietnamese",
        "expected_output": "Chúng ta hãy thảo luận vấn đề này trong buổi họp đồng bộ ngày mai.",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Draft a reminder message for the team to submit their timesheets",
        "expected_output": "Friendly reminder to submit your weekly timesheets by Friday afternoon. Thank you!",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Suggest a response to: Did we finish the security audit?",
        "expected_output": "Yes, the security audit has been completed. I will share the report with you shortly.",
        "conversation_context": [
            {"role": "user", "content": "Did we finish the security audit?"}
        ],
        "retrieval_context": []
    },
    {
        "input": "Make my draft reply to the user query more concise and clear",
        "expected_output": "Our support hours are 9 AM - 5 PM on weekdays. Let us know if you need help.",
        "conversation_context": [
            {"role": "user", "content": "Just to let you know, our support staff is generally available from Monday to Friday, starting from nine in the morning and going all the way until five in the evening. Don't hesitate to reach out if you have any questions."}
        ],
        "retrieval_context": []
    },
    {
        "input": "Suggest a message asking Sarah if she needs help with the task",
        "expected_output": "Hi Sarah, do you need any assistance with the wiki page update? I have some free time today.",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Draft a welcome message for a new team member joining the chat channel",
        "expected_output": "Welcome to the channel! Glad to have you join our team. Let us know if you have any questions as you set up.",
        "conversation_context": [],
        "retrieval_context": []
    },
    {
        "input": "Suggest a follow-up response to: I haven't received the invoice yet",
        "expected_output": "Apologies for the delay. I will resend the invoice to your email immediately.",
        "conversation_context": [
            {"role": "user", "content": "I checked my inbox but haven't received the invoice yet."}
        ],
        "retrieval_context": []
    }
]

datasets = {
    "workspace_qa": {
        "name": "Workspace QA — 20 Cases",
        "feature": "workspace_qa",
        "cases": workspace_qa_cases
    },
    "task_creator": {
        "name": "Task Creator — 20 Cases",
        "feature": "task_creator",
        "cases": task_creator_cases
    },
    "meeting_scheduler": {
        "name": "Meeting Scheduler — 20 Cases",
        "feature": "meeting_scheduler",
        "cases": meeting_scheduler_cases
    },
    "wiki_editor": {
        "name": "Wiki Editor — 20 Cases",
        "feature": "wiki_editor",
        "cases": wiki_editor_cases
    },
    "chat_assistant": {
        "name": "Chat Assistant — 20 Cases",
        "feature": "chat_assistant",
        "cases": chat_assistant_cases
    }
}

for filename, data in datasets.items():
    filepath = DATASETS_DIR / f"{filename}.json"
    filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {filepath} with {len(data['cases'])} cases.")
