import re
from langchain_core.tools import tool

@tool
def pii_regex_masker(text: str) -> str:
    """
    Identifies and masks Personally Identifiable Information (PII) such as email addresses,
    phone numbers, and Social Security Numbers (SSN) in the provided text.
    """
    # Mask Emails
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    text = re.sub(email_pattern, "[MASKED_EMAIL]", text)
    
    # Mask Phone Numbers
    phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    text = re.sub(phone_pattern, "[MASKED_PHONE]", text)
    
    # Mask SSNs
    ssn_pattern = r'\b\d{3}-\d{2}-\d{4}\b'
    text = re.sub(ssn_pattern, "[MASKED_SSN]", text)
    
    return text
