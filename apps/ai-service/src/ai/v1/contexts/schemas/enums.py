from enum import Enum


class Domain(str, Enum):
    WIKI_AGENT = "wiki_agent"
    CHAT_AGENT = "chat_agent"
    CALENDAR_AGENT = "calendar_agent"
    CONTACTS_AGENT = "contacts_agent"
    MAIL_AGENT = "mail_agent"
    SCHEDULE_AGENT = "schedule_agent"
    CHAT_ASSIST = "chat_assist"
